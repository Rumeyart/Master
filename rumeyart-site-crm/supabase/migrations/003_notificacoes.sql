-- 003 — Notificações no celular/computador (Web Push)
--
-- Como funciona:
--   1. Cada aparelho que ativa as notificações no CRM grava uma "inscrição" (rumeyart_push_inscricoes).
--   2. Todo registro novo no histórico (ideia enviada pelo site, mudança de etapa, proposta, PDF, contato,
--      tarefa, anotação, contrato, financeiro) entra numa fila. No fim da transação, os registros da mesma ação viram
--      UMA notificação (ex.: um pedido do site gera vários registros, mas 1 aviso só).
--   3. A cada minuto, o pg_cron procura tarefas cujo horário chegou e avisa.
--   4. O envio é feito pela função rumeyart-push (Edge Function), chamada pelo pg_net.
--
-- As chaves VAPID e o segredo compartilhado NÃO ficam neste arquivo: são gravados direto no banco
-- (tabela rumeyart_push_config, que só o servidor lê). Veja o README, seção "Notificações".

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- configuração privada (só o servidor lê) ----------
create table if not exists public.rumeyart_push_config (
  id int primary key default 1 check (id = 1),
  vapid_publica text not null,
  vapid_privada text not null,
  segredo text not null,
  contato text not null default 'mailto:23caiocaio05@gmail.com',
  funcao_url text not null
);
alter table public.rumeyart_push_config enable row level security;
revoke all on public.rumeyart_push_config from anon, authenticated;

-- ---------- aparelhos inscritos ----------
create table if not exists public.rumeyart_push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  email text not null default public.rumeyart_eu(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  proprias boolean not null default false,   -- avisar também das ações feitas pela própria pessoa
  criado_em timestamptz not null default now(),
  usado_em timestamptz not null default now()
);
alter table public.rumeyart_push_inscricoes enable row level security;
revoke all on public.rumeyart_push_inscricoes from anon, authenticated;
grant select on public.rumeyart_push_inscricoes to authenticated;
drop policy if exists rumeyart_push_insc_ver on public.rumeyart_push_inscricoes;
create policy rumeyart_push_insc_ver on public.rumeyart_push_inscricoes for select to authenticated
  using (public.rumeyart_is_admin() and email = public.rumeyart_eu());

-- ---------- fila de eventos (agrupa por transação) ----------
create table if not exists public.rumeyart_push_fila (
  id bigserial primary key,
  txid bigint not null default txid_current(),
  tipo text, texto text, cliente_id uuid, autor text,
  criado_em timestamptz not null default now()
);
alter table public.rumeyart_push_fila enable row level security;
revoke all on public.rumeyart_push_fila from anon, authenticated;


-- ---------- envio (chama a Edge Function) ----------
create or replace function public.rumeyart_push_enviar(p_titulo text, p_corpo text, p_url text, p_tag text,
  p_excluir text default null, p_apenas text default null)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare cfg record; v_id bigint;
begin
  select * into cfg from public.rumeyart_push_config where id = 1;
  if not found then return null; end if;
  if not exists (select 1 from public.rumeyart_push_inscricoes i
                 where (p_apenas is null or i.email = p_apenas)
                   and (p_excluir is null or i.email <> p_excluir or i.proprias)) then
    return null;
  end if;
  select net.http_post(
    url := cfg.funcao_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rumeyart-segredo', cfg.segredo),
    body := jsonb_build_object('titulo', left(p_titulo, 120), 'corpo', left(coalesce(p_corpo, ''), 400),
                               'url', coalesce(p_url, '/crm/'), 'tag', p_tag, 'excluir', p_excluir, 'apenas', p_apenas),
    timeout_milliseconds := 20000) into v_id;
  return v_id;
end $$;

-- histórico → fila
create or replace function public.rumeyart_hist_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.rumeyart_push_fila (tipo, texto, cliente_id, autor) values (new.tipo, new.texto, new.cliente_id, new.autor);
  return null;
end $$;
drop trigger if exists rumeyart_hist_push on public.rumeyart_historico;
create trigger rumeyart_hist_push after insert on public.rumeyart_historico
  for each row execute function public.rumeyart_hist_push();

-- fila → 1 notificação por ação (roda no fim da transação)
create or replace function public.rumeyart_push_fila_envio()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_pri record; v_cli text; v_n int; v_titulo text; v_corpo text; v_excluir text;
begin
  if not exists (select 1 from public.rumeyart_push_fila where id = new.id) then return null; end if; -- já agrupado
  select f.* into v_pri from public.rumeyart_push_fila f where f.txid = new.txid
   order by case f.tipo when 'site' then 0 when 'etapa' then 1 when 'proposta' then 2 when 'pdf' then 3
                        when 'contato' then 4 when 'tarefa' then 5 when 'nota' then 6 else 7 end, f.id
   limit 1;
  select count(*) into v_n from public.rumeyart_push_fila f where f.txid = new.txid;
  delete from public.rumeyart_push_fila where txid = new.txid;
  select c.nome into v_cli from public.rumeyart_clientes c where c.id = v_pri.cliente_id;
  v_cli := coalesce(v_cli, 'Cliente');

  if v_pri.tipo = 'site' then
    v_titulo := '✨ Nova ideia pelo site';
    v_corpo := v_cli || ' — ' || regexp_replace(v_pri.texto, '^Enviou a ideia pelo site \(pedido nº [0-9]+\):\s*', '');
    v_excluir := null;
  else
    v_titulo := case v_pri.tipo
      when 'etapa' then '📊 Funil · ' when 'proposta' then '📄 Proposta · ' when 'pdf' then '📄 PDF gerado · '
      when 'contato' then '💬 Contato · ' when 'tarefa' then '🔔 Tarefa · ' when 'nota' then '📝 Anotação · ' when 'contrato' then '✍️ Contrato · ' when 'financeiro' then '💰 Financeiro · '
      else '✨ Movimentação · ' end || v_cli;
    v_corpo := v_pri.texto || case when v_n > 1 then ' (+' || (v_n - 1) || ')' else '' end;
    v_excluir := case when v_pri.autor like '%@%' then v_pri.autor else null end;
  end if;

  perform public.rumeyart_push_enviar(v_titulo, v_corpo,
    '/crm/#/' || case when v_pri.tipo = 'site' then 'pedidos' when v_pri.cliente_id is null then 'painel' else 'cliente/' || v_pri.cliente_id end,
    'cli-' || coalesce(v_pri.cliente_id::text, 'geral'), v_excluir, null);
  return null;
exception when others then
  raise warning 'rumeyart push: %', sqlerrm;  -- nunca impede a ação principal
  return null;
end $$;
drop trigger if exists rumeyart_push_fila_envio on public.rumeyart_push_fila;
create constraint trigger rumeyart_push_fila_envio after insert on public.rumeyart_push_fila
  deferrable initially deferred for each row execute function public.rumeyart_push_fila_envio();


-- a cada minuto: tarefas cujo horário chegou (só as agendadas para o futuro no momento em que foram criadas)
create or replace function public.rumeyart_push_tarefas()
returns void language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  delete from public.rumeyart_push_fila where criado_em < now() - interval '1 day';
  for r in
    select t.id, t.titulo, t.vence_em, t.cliente_id, c.nome
      from public.rumeyart_tarefas t left join public.rumeyart_clientes c on c.id = t.cliente_id
     where not t.concluida and t.notificada_em is null
       and t.vence_em <= now() and t.vence_em > now() - interval '15 minutes'
       and t.vence_em > t.criado_em
     for update of t skip locked
  loop
    perform public.rumeyart_push_enviar('⏰ ' || r.titulo,
      coalesce(r.nome || ' · ', '') || 'Agora, ' || to_char(r.vence_em at time zone 'America/Sao_Paulo', 'HH24:MI'),
      '/crm/#/' || case when r.cliente_id is null then 'tarefas' else 'cliente/' || r.cliente_id end,
      'tarefa-' || r.id, null, null);
    update public.rumeyart_tarefas set notificada_em = now() where id = r.id;
  end loop;
end $$;

-- ---------- chamadas do app ----------
create or replace function public.rumeyart_push_inscrever(p_endpoint text, p_p256dh text, p_auth text, p_aparelho text, p_proprias boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then raise exception 'inscricao_invalida'; end if;
  insert into public.rumeyart_push_inscricoes (email, endpoint, p256dh, auth, aparelho, proprias)
  values (public.rumeyart_eu(), p_endpoint, p_p256dh, p_auth, left(p_aparelho, 200), coalesce(p_proprias, false))
  on conflict (endpoint) do update set email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth,
    aparelho = excluded.aparelho, proprias = excluded.proprias, usado_em = now();
end $$;

create or replace function public.rumeyart_push_cancelar(p_endpoint text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  delete from public.rumeyart_push_inscricoes where endpoint = p_endpoint and email = public.rumeyart_eu();
end $$;

create or replace function public.rumeyart_push_teste()
returns bigint language plpgsql security definer set search_path = ''
as $$
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_acesso'; end if;
  return public.rumeyart_push_enviar('✅ Notificações ativadas', 'É assim que os avisos do CRM Rumëyart vão chegar neste aparelho.',
    '/crm/#/config', 'teste', null, public.rumeyart_eu());
end $$;

-- ---------- permissões ----------
revoke execute on function public.rumeyart_push_enviar(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.rumeyart_hist_push() from public, anon, authenticated;
revoke execute on function public.rumeyart_push_fila_envio() from public, anon, authenticated;
revoke execute on function public.rumeyart_push_tarefas() from public, anon, authenticated;
revoke execute on function public.rumeyart_push_inscrever(text, text, text, text, boolean) from public, anon;
revoke execute on function public.rumeyart_push_cancelar(text) from public, anon;
revoke execute on function public.rumeyart_push_teste() from public, anon;
grant execute on function public.rumeyart_push_inscrever(text, text, text, text, boolean) to authenticated;
grant execute on function public.rumeyart_push_cancelar(text) to authenticated;
grant execute on function public.rumeyart_push_teste() to authenticated;

-- ---------- agendamento ----------
select cron.unschedule(jobid) from cron.job where jobname = 'rumeyart-tarefas';
select cron.schedule('rumeyart-tarefas', '* * * * *', 'select public.rumeyart_push_tarefas()');
