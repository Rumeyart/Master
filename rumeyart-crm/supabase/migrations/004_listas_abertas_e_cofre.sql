-- 004 · Listas abertas para novos itens + cofre de acessos (PIN de 4 dígitos)

-- ---------- listas abertas: tipo/origem do cliente, área da tarefa e categoria do serviço aceitam valores novos ----------
alter table public.rumeyart_clientes drop constraint if exists rumeyart_clientes_tipo_check;
alter table public.rumeyart_clientes drop constraint if exists rumeyart_clientes_origem_check;
alter table public.rumeyart_tarefas drop constraint if exists rumeyart_tarefas_area_check;
alter table public.rumeyart_servicos drop constraint if exists rumeyart_servicos_categoria_check;
alter table public.rumeyart_clientes add constraint rumeyart_clientes_tipo_txt check (char_length(btrim(tipo)) between 1 and 60);
alter table public.rumeyart_clientes add constraint rumeyart_clientes_origem_txt check (char_length(btrim(origem)) between 1 and 60);
alter table public.rumeyart_tarefas add constraint rumeyart_tarefas_area_txt check (char_length(btrim(area)) between 1 and 60);
alter table public.rumeyart_servicos add constraint rumeyart_servicos_categoria_txt check (char_length(btrim(categoria)) between 1 and 60);

-- ---------- cofre ----------
-- Logins e senhas ficam cifrados (pgcrypto) com uma chave que nunca sai do banco.
-- Nada disso é lido direto pelo app: só pelas funções abaixo, que exigem acesso ao CRM + sessão aberta com o PIN.
create table if not exists public.rumeyart_cofre_config (
  id int primary key default 1 check (id = 1),
  chave text not null,
  pin_hash text,
  tentativas int not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);
insert into public.rumeyart_cofre_config (id, chave)
values (1, encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;

create table if not exists public.rumeyart_cofre_sessoes (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  expira_em timestamptz not null
);

create table if not exists public.rumeyart_cofre (
  id uuid primary key default gen_random_uuid(),
  projeto text not null check (char_length(btrim(projeto)) between 1 and 120),
  plataforma text,
  login_cifrado bytea,
  senha_cifrada bytea,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

alter table public.rumeyart_cofre_config enable row level security;
alter table public.rumeyart_cofre_sessoes enable row level security;
alter table public.rumeyart_cofre enable row level security;
revoke all on public.rumeyart_cofre_config, public.rumeyart_cofre_sessoes, public.rumeyart_cofre from anon, authenticated;

-- sessão válida? (renova por mais 10 minutos a cada uso)
create or replace function public.rumeyart_cofre_sessao(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.rumeyart_is_admin() then return false; end if;
  update public.rumeyart_cofre_sessoes set expira_em = now() + interval '10 minutes'
   where token = p_token and email = public.rumeyart_eu() and expira_em > now();
  get diagnostics n = row_count;
  return n > 0;
end; $$;

create or replace function public.rumeyart_cofre_nova_sessao()
returns uuid language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  delete from public.rumeyart_cofre_sessoes where expira_em < now() or email = public.rumeyart_eu();
  insert into public.rumeyart_cofre_sessoes (email, expira_em) values (public.rumeyart_eu(), now() + interval '10 minutes') returning token into t;
  return t;
end; $$;

create or replace function public.rumeyart_cofre_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c record;
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  select * into c from public.rumeyart_cofre_config where id = 1;
  return jsonb_build_object('tem_pin', c.pin_hash is not null, 'bloqueado_ate', case when c.bloqueado_ate > now() then c.bloqueado_ate end);
end; $$;

-- abrir com o PIN: 5 erros seguidos bloqueiam por 15 minutos
create or replace function public.rumeyart_cofre_abrir(p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record; restam int;
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  select * into c from public.rumeyart_cofre_config where id = 1 for update;
  if c.pin_hash is null then return jsonb_build_object('ok', false, 'erro', 'sem_pin'); end if;
  if c.bloqueado_ate > now() then return jsonb_build_object('ok', false, 'erro', 'bloqueado', 'bloqueado_ate', c.bloqueado_ate); end if;
  if coalesce(p_pin, '') ~ '^\d{4}$' and extensions.crypt(p_pin, c.pin_hash) = c.pin_hash then
    update public.rumeyart_cofre_config set tentativas = 0, bloqueado_ate = null where id = 1;
    return jsonb_build_object('ok', true, 'token', public.rumeyart_cofre_nova_sessao());
  end if;
  if c.tentativas + 1 >= 5 then
    update public.rumeyart_cofre_config set tentativas = 0, bloqueado_ate = now() + interval '15 minutes' where id = 1;
    return jsonb_build_object('ok', false, 'erro', 'bloqueado', 'bloqueado_ate', now() + interval '15 minutes');
  end if;
  update public.rumeyart_cofre_config set tentativas = c.tentativas + 1 where id = 1;
  restam := 5 - (c.tentativas + 1);
  return jsonb_build_object('ok', false, 'erro', 'pin_incorreto', 'restam', restam);
end; $$;

-- criar o PIN (primeira vez) ou trocar (exige o PIN atual)
create or replace function public.rumeyart_cofre_definir_pin(p_novo text, p_atual text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record; r jsonb;
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  if coalesce(p_novo, '') !~ '^\d{4}$' then return jsonb_build_object('ok', false, 'erro', 'pin_invalido'); end if;
  select * into c from public.rumeyart_cofre_config where id = 1;
  if c.pin_hash is not null then
    r := public.rumeyart_cofre_abrir(p_atual);
    if not (r->>'ok')::boolean then return r; end if;
  end if;
  update public.rumeyart_cofre_config set pin_hash = extensions.crypt(p_novo, extensions.gen_salt('bf', 10)), tentativas = 0, bloqueado_ate = null, atualizado_em = now() where id = 1;
  return jsonb_build_object('ok', true, 'token', public.rumeyart_cofre_nova_sessao());
end; $$;

create or replace function public.rumeyart_cofre_listar(p_token uuid)
returns table (id uuid, projeto text, plataforma text, login text, tem_senha boolean, atualizado_em timestamptz, atualizado_por text)
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  if not public.rumeyart_cofre_sessao(p_token) then raise exception 'cofre_fechado'; end if;
  select chave into k from public.rumeyart_cofre_config where rumeyart_cofre_config.id = 1;
  return query select c.id, c.projeto, c.plataforma,
    case when c.login_cifrado is null then null else extensions.pgp_sym_decrypt(c.login_cifrado, k) end,
    c.senha_cifrada is not null, c.atualizado_em, c.atualizado_por
  from public.rumeyart_cofre c order by lower(c.projeto), lower(coalesce(c.plataforma, ''));
end; $$;

create or replace function public.rumeyart_cofre_revelar(p_token uuid, p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare k text; v bytea;
begin
  if not public.rumeyart_cofre_sessao(p_token) then raise exception 'cofre_fechado'; end if;
  select chave into k from public.rumeyart_cofre_config where id = 1;
  select senha_cifrada into v from public.rumeyart_cofre where id = p_id;
  return case when v is null then null else extensions.pgp_sym_decrypt(v, k) end;
end; $$;

-- cria (p_id nulo) ou altera; p_senha nula = mantém a senha atual. A data só muda se algo mudou de fato.
create or replace function public.rumeyart_cofre_salvar(p_token uuid, p_id uuid, p_projeto text, p_plataforma text, p_login text, p_senha text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare k text; atual record; novo_id uuid; mudou boolean;
begin
  if not public.rumeyart_cofre_sessao(p_token) then raise exception 'cofre_fechado'; end if;
  p_projeto := btrim(coalesce(p_projeto, '')); p_plataforma := nullif(btrim(coalesce(p_plataforma, '')), ''); p_login := nullif(btrim(coalesce(p_login, '')), '');
  if char_length(p_projeto) < 1 then raise exception 'projeto_obrigatorio'; end if;
  select chave into k from public.rumeyart_cofre_config where id = 1;
  if p_id is null then
    insert into public.rumeyart_cofre (projeto, plataforma, login_cifrado, senha_cifrada, atualizado_por)
    values (p_projeto, p_plataforma,
      case when p_login is null then null else extensions.pgp_sym_encrypt(p_login, k) end,
      case when coalesce(p_senha, '') = '' then null else extensions.pgp_sym_encrypt(p_senha, k) end,
      public.rumeyart_eu()) returning id into novo_id;
    return novo_id;
  end if;
  select projeto, plataforma,
    case when login_cifrado is null then null else extensions.pgp_sym_decrypt(login_cifrado, k) end as login,
    case when senha_cifrada is null then null else extensions.pgp_sym_decrypt(senha_cifrada, k) end as senha
  into atual from public.rumeyart_cofre where id = p_id;
  if not found then raise exception 'nao_encontrado'; end if;
  mudou := atual.projeto is distinct from p_projeto or atual.plataforma is distinct from p_plataforma or atual.login is distinct from p_login
           or (p_senha is not null and atual.senha is distinct from nullif(p_senha, ''));
  if mudou then
    update public.rumeyart_cofre set projeto = p_projeto, plataforma = p_plataforma,
      login_cifrado = case when p_login is null then null else extensions.pgp_sym_encrypt(p_login, k) end,
      senha_cifrada = case when p_senha is null then senha_cifrada when p_senha = '' then null else extensions.pgp_sym_encrypt(p_senha, k) end,
      atualizado_em = now(), atualizado_por = public.rumeyart_eu()
    where id = p_id;
  end if;
  return p_id;
end; $$;

create or replace function public.rumeyart_cofre_apagar(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.rumeyart_cofre_sessao(p_token) then raise exception 'cofre_fechado'; end if;
  delete from public.rumeyart_cofre where id = p_id;
end; $$;

create or replace function public.rumeyart_cofre_fechar(p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rumeyart_cofre_sessoes where token = p_token or expira_em < now();
end; $$;

-- permissões: só quem entra no CRM chama as funções do cofre; as internas ninguém chama direto
revoke all on function public.rumeyart_cofre_sessao(uuid), public.rumeyart_cofre_nova_sessao() from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['rumeyart_cofre_estado()','rumeyart_cofre_abrir(text)','rumeyart_cofre_definir_pin(text,text)','rumeyart_cofre_listar(uuid)',
                           'rumeyart_cofre_revelar(uuid,uuid)','rumeyart_cofre_salvar(uuid,uuid,text,text,text,text)','rumeyart_cofre_apagar(uuid,uuid)','rumeyart_cofre_fechar(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
