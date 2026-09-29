-- =====================================================================
-- CRM Rumëyart Criação — estrutura completa do banco (Supabase / Postgres)
-- Tabelas com prefixo rumeyart_. Pode rodar num projeto novo ou existente.
-- Comercial: pedidos do site, clientes, funil, propostas (PDF), contratos, tarefas
-- Operação: serviços, fornecedores, recursos, cotações, compras
-- Gestão: financeiro (contas, cartões, categorias, lançamentos, saldos, faturas)
-- =====================================================================

-- ---------- acesso ----------
create table if not exists public.rumeyart_admins (
  email text primary key check (email = lower(email)),
  papel text not null default 'admin' check (papel in ('admin','comercial','financeiro','dev')),
  criado_em timestamptz not null default now()
);
alter table public.rumeyart_admins enable row level security;

create or replace function public.rumeyart_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join public.rumeyart_admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.rumeyart_is_admin() from public, anon;
grant execute on function public.rumeyart_is_admin() to authenticated;

create or replace function public.rumeyart_eu()
returns text language sql stable set search_path = ''
as $$ select coalesce(nullif(auth.jwt()->>'email',''), 'sistema') $$;

create or replace function public.rumeyart_touch()
returns trigger language plpgsql set search_path = ''
as $$ begin new.atualizado_em := now(); return new; end; $$;

-- ---------- configuração ----------
create table if not exists public.rumeyart_config (
  id int primary key default 1 check (id = 1),
  proximo_numero int not null default 1 check (proximo_numero > 0),
  proximo_contrato int not null default 1 check (proximo_contrato > 0),
  proposta jsonb not null default '{}'::jsonb,   -- textos padrão da proposta
  empresa jsonb not null default '{}'::jsonb,    -- dados que aparecem nos documentos
  atualizado_em timestamptz not null default now()
);
insert into public.rumeyart_config (id) values (1) on conflict (id) do nothing;
alter table public.rumeyart_config enable row level security;

-- ---------- serviços (catálogo interno) ----------
create table if not exists public.rumeyart_servicos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null default 'app'
    check (categoria in ('app','sistema','site','jogo','documento','manutencao','hospedagem','consultoria','outro')),
  nome text not null check (char_length(nome) between 2 and 120),
  subtitulo text,
  descricao text,
  entregaveis text[] not null default '{}',
  prazo text,
  preco_base numeric(12,2) not null default 0 check (preco_base >= 0),
  mensal numeric(12,2) not null default 0 check (mensal >= 0),     -- valor recorrente (manutenção/hospedagem)
  ativo boolean not null default true,
  ordem int not null default 100,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.rumeyart_servicos enable row level security;

-- ---------- clientes ----------
create table if not exists public.rumeyart_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 160),
  marca text,
  whatsapp text,
  whatsapp_digits text generated always as (regexp_replace(coalesce(whatsapp,''), '\D', '', 'g')) stored,
  email text,
  cidade text,
  uf text check (uf is null or char_length(uf) <= 2),
  cpf_cnpj text,
  tipo text not null default 'pessoal' check (tipo in ('pessoal','empresa','projeto','presente','outro')),
  origem text not null default 'outro'
    check (origem in ('site','instagram','whatsapp','indicacao','google','cliente_antigo','evento','outro')),
  observacoes text,
  arquivado boolean not null default false,
  ultimo_contato_em timestamptz,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_clientes_whats_idx on public.rumeyart_clientes (whatsapp_digits);
alter table public.rumeyart_clientes enable row level security;

-- ---------- oportunidades (funil) ----------
create table if not exists public.rumeyart_oportunidades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.rumeyart_clientes(id) on delete restrict,
  titulo text not null check (char_length(titulo) between 2 and 160),
  servico_id uuid references public.rumeyart_servicos(id) on delete set null,
  etapa text not null default 'novo'
    check (etapa in ('novo','conversa','prototipo','proposta','negociacao','fechado','entregue','perdido')),
  valor numeric(12,2) not null default 0 check (valor >= 0),
  mensal numeric(12,2) not null default 0 check (mensal >= 0),
  origem text,
  motivo_perda text,
  proxima_acao text,
  proxima_acao_em timestamptz,
  fechado_em timestamptz,
  perdido_em timestamptz,
  entrega_prevista date,
  entregue_em date,
  suporte_ate date,
  link_app text,
  repositorio text,
  ultimo_contato_em timestamptz,
  arquivado boolean not null default false,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_oport_cliente_idx on public.rumeyart_oportunidades (cliente_id);
create index if not exists rumeyart_oport_etapa_idx on public.rumeyart_oportunidades (etapa);
alter table public.rumeyart_oportunidades enable row level security;

-- ---------- pedidos (briefings do site) ----------
create table if not exists public.rumeyart_pedidos (
  id uuid primary key default gen_random_uuid(),
  numero int generated always as identity,
  cliente_id uuid references public.rumeyart_clientes(id) on delete restrict,
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  nome text not null,
  whatsapp text not null,
  ideia text not null,
  respostas jsonb not null default '{}'::jsonb,
  status text not null default 'novo' check (status in ('novo','lido','respondido','descartado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_pedidos_status_idx on public.rumeyart_pedidos (status, criado_em desc);
alter table public.rumeyart_pedidos enable row level security;

-- ---------- propostas ----------
create table if not exists public.rumeyart_propostas (
  id uuid primary key default gen_random_uuid(),
  numero int unique,
  oportunidade_id uuid not null references public.rumeyart_oportunidades(id) on delete restrict,
  cliente_id uuid not null references public.rumeyart_clientes(id) on delete restrict,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviada','negociacao','aprovada','recusada','expirada')),
  titulo text,
  dados jsonb not null default '{}'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  mensal numeric(12,2) not null default 0 check (mensal >= 0),
  validade_ate date,
  enviada_em timestamptz,
  aprovada_em timestamptz,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_prop_oport_idx on public.rumeyart_propostas (oportunidade_id);
create index if not exists rumeyart_prop_cliente_idx on public.rumeyart_propostas (cliente_id);
alter table public.rumeyart_propostas enable row level security;

create table if not exists public.rumeyart_proposta_pdfs (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.rumeyart_propostas(id) on delete restrict,
  versao int not null,
  caminho text not null,
  nome_arquivo text not null,
  total numeric(12,2) not null default 0,
  gerado_por text default public.rumeyart_eu(),
  gerado_em timestamptz not null default now(),
  unique (proposta_id, versao)
);
alter table public.rumeyart_proposta_pdfs enable row level security;

-- ---------- histórico e tarefas ----------
create table if not exists public.rumeyart_historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.rumeyart_clientes(id) on delete restrict,
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  proposta_id uuid references public.rumeyart_propostas(id) on delete set null,
  tipo text not null default 'nota'
    check (tipo in ('nota','contato','etapa','proposta','pdf','tarefa','site','contrato','financeiro','sistema')),
  texto text not null check (char_length(texto) between 1 and 6000),
  autor text default public.rumeyart_eu(),
  criado_em timestamptz not null default now()
);
create index if not exists rumeyart_hist_cliente_idx on public.rumeyart_historico (cliente_id, criado_em desc);
alter table public.rumeyart_historico enable row level security;

create table if not exists public.rumeyart_tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.rumeyart_clientes(id) on delete restrict,
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  titulo text not null check (char_length(titulo) between 2 and 200),
  area text not null default 'comercial' check (area in ('comercial','desenvolvimento','administrativo','financeiro')),
  vence_em timestamptz not null,
  concluida boolean not null default false,
  concluida_em timestamptz,
  notificada_em timestamptz,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_tarefas_vence_idx on public.rumeyart_tarefas (concluida, vence_em);
alter table public.rumeyart_tarefas enable row level security;

-- ---------- fornecedores, recursos, cotações e compras ----------
create table if not exists public.rumeyart_fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) >= 2),
  contato text, whatsapp text, email text, site text, cidade text,
  categorias text[] not null default '{}',
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_recursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) >= 2),
  unidade text not null default 'un',
  categoria text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists rumeyart_recursos_nome_uq on public.rumeyart_recursos (lower(btrim(nome)));

-- ---------- financeiro ----------
create table if not exists public.rumeyart_fin_contas (
  id uuid primary key default gen_random_uuid(),
  apelido text not null check (char_length(btrim(apelido)) >= 2),
  banco text,
  tipo text not null default 'corrente' check (tipo in ('corrente','digital','poupanca','caixa','investimento')),
  saldo_inicial_centavos bigint not null default 0,
  cor text,
  ordem int not null default 100,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_fin_cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) >= 2),
  banco text, final text,
  limite_centavos bigint not null default 0 check (limite_centavos >= 0),
  fatura_inicial_centavos bigint not null default 0 check (fatura_inicial_centavos >= 0),
  fechamento int check (fechamento between 1 and 31),
  vencimento int check (vencimento between 1 and 31),
  conta_pagamento_id uuid references public.rumeyart_fin_contas(id) on delete set null,
  arquivado boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_fin_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) >= 2),
  tipo text not null check (tipo in ('receita','despesa')),
  subs text[] not null default '{}',
  cor text,
  ordem int not null default 100,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now()
);
create unique index if not exists rumeyart_fin_categorias_uq on public.rumeyart_fin_categorias (tipo, lower(btrim(nome)));

create table if not exists public.rumeyart_fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita','despesa','transferencia','pagamento_fatura')),
  descricao text not null check (char_length(btrim(descricao)) >= 1),
  valor_centavos bigint not null check (valor_centavos > 0),
  data date not null,
  status text not null default 'pago' check (status in ('pago','pendente')),
  forma text,
  conta_id uuid references public.rumeyart_fin_contas(id) on delete restrict,
  cartao_id uuid references public.rumeyart_fin_cartoes(id) on delete restrict,
  conta_destino_id uuid references public.rumeyart_fin_contas(id) on delete restrict,
  categoria_id uuid references public.rumeyart_fin_categorias(id) on delete set null,
  sub text,
  fornecedor_id uuid references public.rumeyart_fornecedores(id) on delete set null,
  cliente_id uuid references public.rumeyart_clientes(id) on delete set null,
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  grupo_id uuid,
  parcela int, parcelas int,
  recorrente boolean not null default false,
  observacoes text,
  anexo_url text,
  id_externo text,
  origem text not null default 'manual' check (origem in ('manual','importacao','compra','venda')),
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fin_transferencia check (tipo <> 'transferencia' or (conta_id is not null and conta_destino_id is not null and conta_id <> conta_destino_id and cartao_id is null)),
  constraint fin_pag_fatura check (tipo <> 'pagamento_fatura' or (cartao_id is not null and conta_id is not null and conta_destino_id is null)),
  constraint fin_receita check (tipo <> 'receita' or (cartao_id is null and conta_destino_id is null)),
  constraint fin_despesa check (tipo <> 'despesa' or (conta_destino_id is null and not (conta_id is not null and cartao_id is not null))),
  constraint fin_pago_tem_conta check (status <> 'pago' or case tipo when 'receita' then conta_id is not null
                                                                  when 'despesa' then (conta_id is not null or cartao_id is not null)
                                                                  else true end),
  constraint fin_parcelas check (parcela is null or (parcela >= 1 and parcelas >= parcela))
);
create index if not exists rumeyart_fin_lanc_data on public.rumeyart_fin_lancamentos (data);
create index if not exists rumeyart_fin_lanc_conta on public.rumeyart_fin_lancamentos (conta_id);
create index if not exists rumeyart_fin_lanc_cartao on public.rumeyart_fin_lancamentos (cartao_id);
create index if not exists rumeyart_fin_lanc_grupo on public.rumeyart_fin_lancamentos (grupo_id);
create unique index if not exists rumeyart_fin_lanc_ext_conta on public.rumeyart_fin_lancamentos (conta_id, id_externo) where id_externo is not null and conta_id is not null;
create unique index if not exists rumeyart_fin_lanc_ext_cartao on public.rumeyart_fin_lancamentos (cartao_id, id_externo) where id_externo is not null and cartao_id is not null;

create table if not exists public.rumeyart_precos (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.rumeyart_recursos(id) on delete cascade,
  fornecedor_id uuid references public.rumeyart_fornecedores(id) on delete set null,
  preco_centavos bigint not null check (preco_centavos > 0),
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  data date not null default current_date,
  link text,
  observacao text,
  lancamento_id uuid references public.rumeyart_fin_lancamentos(id) on delete set null,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now()
);
create index if not exists rumeyart_precos_recurso on public.rumeyart_precos (recurso_id, data desc);

create table if not exists public.rumeyart_compras (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (char_length(btrim(descricao)) >= 2),
  recurso_id uuid references public.rumeyart_recursos(id) on delete set null,
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  unidade text,
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  prioridade text not null default 'normal' check (prioridade in ('baixa','normal','urgente')),
  status text not null default 'a_comprar' check (status in ('a_comprar','comprado','cancelado')),
  fornecedor_id uuid references public.rumeyart_fornecedores(id) on delete set null,
  preco_estimado_centavos bigint check (preco_estimado_centavos is null or preco_estimado_centavos >= 0),
  link text,
  precisa_ate date,
  comprado_em timestamptz,
  lancamento_id uuid references public.rumeyart_fin_lancamentos(id) on delete set null,
  observacoes text,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- contratos ----------
create table if not exists public.rumeyart_contrato_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) >= 2),
  descricao text,
  corpo text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_contratos (
  id uuid primary key default gen_random_uuid(),
  numero int unique,
  modelo_id uuid references public.rumeyart_contrato_modelos(id) on delete set null,
  cliente_id uuid not null references public.rumeyart_clientes(id),
  oportunidade_id uuid references public.rumeyart_oportunidades(id) on delete set null,
  proposta_id uuid references public.rumeyart_propostas(id) on delete set null,
  titulo text not null,
  corpo text not null,
  caminho text,
  assinado_em date,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now()
);

-- ---------- carimbo de atualização ----------
do $$ declare t text; begin
  foreach t in array array['rumeyart_servicos','rumeyart_clientes','rumeyart_oportunidades','rumeyart_pedidos','rumeyart_propostas','rumeyart_tarefas',
                           'rumeyart_fornecedores','rumeyart_recursos','rumeyart_compras','rumeyart_contrato_modelos','rumeyart_fin_lancamentos'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.rumeyart_touch()', t, t);
  end loop;
end $$;

-- ---------- rótulos ----------
create or replace function public.rumeyart_rotulo_etapa(e text) returns text language sql immutable set search_path = '' as $$
  select case e when 'novo' then 'Novo pedido' when 'conversa' then 'Conversa' when 'prototipo' then 'Protótipo'
    when 'proposta' then 'Proposta enviada' when 'negociacao' then 'Negociação' when 'fechado' then 'Fechado · em construção'
    when 'entregue' then 'Entregue' when 'perdido' then 'Perdido' else e end $$;
create or replace function public.rumeyart_rotulo_status(s text) returns text language sql immutable set search_path = '' as $$
  select case s when 'rascunho' then 'Rascunho' when 'enviada' then 'Enviada' when 'negociacao' then 'Em negociação'
    when 'aprovada' then 'Aprovada' when 'recusada' then 'Recusada' when 'expirada' then 'Expirada' else s end $$;

-- ---------- cliente não se apaga, se arquiva ----------
create or replace function public.rumeyart_bloqueia_delete_cliente()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'cliente_nao_pode_ser_apagado: use arquivar'; end; $$;
drop trigger if exists rumeyart_clientes_nodelete on public.rumeyart_clientes;
create trigger rumeyart_clientes_nodelete before delete on public.rumeyart_clientes
  for each row execute function public.rumeyart_bloqueia_delete_cliente();

-- ---------- oportunidades: datas + histórico ----------
create or replace function public.rumeyart_oport_datas()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.etapa is distinct from old.etapa then
    if new.etapa = 'perdido' then new.perdido_em := now(); else new.perdido_em := null; end if;
    if new.etapa in ('fechado','entregue') then new.fechado_em := coalesce(new.fechado_em, now()); else new.fechado_em := null; end if;
    if new.etapa = 'entregue' then new.entregue_em := coalesce(new.entregue_em, current_date); end if;
  end if;
  return new;
end; $$;
drop trigger if exists rumeyart_oport_datas on public.rumeyart_oportunidades;
create trigger rumeyart_oport_datas before insert or update of etapa on public.rumeyart_oportunidades
  for each row execute function public.rumeyart_oport_datas();

create or replace function public.rumeyart_oport_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto, autor)
    values (new.cliente_id, new.id, 'sistema', 'Oportunidade criada: ' || new.titulo, coalesce(new.criado_por, public.rumeyart_eu()));
  elsif new.etapa is distinct from old.etapa then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto)
    values (new.cliente_id, new.id, 'etapa',
      new.titulo || ': ' || public.rumeyart_rotulo_etapa(old.etapa) || ' → ' || public.rumeyart_rotulo_etapa(new.etapa)
      || case when new.etapa = 'perdido' and coalesce(new.motivo_perda,'') <> '' then ' (motivo: ' || new.motivo_perda || ')' else '' end);
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_oport_log_ins on public.rumeyart_oportunidades;
drop trigger if exists rumeyart_oport_log_upd on public.rumeyart_oportunidades;
create trigger rumeyart_oport_log_ins after insert on public.rumeyart_oportunidades for each row execute function public.rumeyart_oport_log();
create trigger rumeyart_oport_log_upd after update of etapa on public.rumeyart_oportunidades for each row execute function public.rumeyart_oport_log();

-- ---------- histórico atualiza o "último contato" ----------
create or replace function public.rumeyart_hist_contato()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.rumeyart_clientes set ultimo_contato_em = new.criado_em where id = new.cliente_id;
  if new.oportunidade_id is not null then
    update public.rumeyart_oportunidades set ultimo_contato_em = new.criado_em where id = new.oportunidade_id;
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_hist_contato on public.rumeyart_historico;
create trigger rumeyart_hist_contato after insert on public.rumeyart_historico
  for each row execute function public.rumeyart_hist_contato();

-- ---------- propostas: número, histórico, bloqueio ----------
create or replace function public.rumeyart_proposta_numero()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.numero is null then
    update public.rumeyart_config set proximo_numero = proximo_numero + 1, atualizado_em = now()
      where id = 1 returning proximo_numero - 1 into new.numero;
  end if;
  return new;
end; $$;
drop trigger if exists rumeyart_prop_numero on public.rumeyart_propostas;
create trigger rumeyart_prop_numero before insert on public.rumeyart_propostas for each row execute function public.rumeyart_proposta_numero();

create or replace function public.rumeyart_proposta_datas()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'enviada' and new.enviada_em is null then new.enviada_em := now(); end if;
    if new.status = 'aprovada' then new.aprovada_em := coalesce(new.aprovada_em, now()); end if;
  end if;
  return new;
end; $$;
drop trigger if exists rumeyart_prop_datas on public.rumeyart_propostas;
create trigger rumeyart_prop_datas before update of status on public.rumeyart_propostas for each row execute function public.rumeyart_proposta_datas();

create or replace function public.rumeyart_proposta_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, proposta_id, tipo, texto, autor)
    values (new.cliente_id, new.oportunidade_id, new.id, 'proposta',
      'Proposta Nº ' || new.numero || ' criada' || coalesce(' — ' || new.titulo, ''), coalesce(new.criado_por, public.rumeyart_eu()));
  elsif new.status is distinct from old.status then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, proposta_id, tipo, texto)
    values (new.cliente_id, new.oportunidade_id, new.id, 'proposta',
      'Proposta Nº ' || new.numero || ': ' || public.rumeyart_rotulo_status(old.status) || ' → ' || public.rumeyart_rotulo_status(new.status));
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_prop_log_ins on public.rumeyart_propostas;
drop trigger if exists rumeyart_prop_log_upd on public.rumeyart_propostas;
create trigger rumeyart_prop_log_ins after insert on public.rumeyart_propostas for each row execute function public.rumeyart_proposta_log();
create trigger rumeyart_prop_log_upd after update of status on public.rumeyart_propostas for each row execute function public.rumeyart_proposta_log();

create or replace function public.rumeyart_bloqueia_delete_proposta()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'aprovada' then raise exception 'proposta_aprovada_nao_pode_ser_apagada'; end if;
  return old;
end; $$;
drop trigger if exists rumeyart_prop_nodelete on public.rumeyart_propostas;
create trigger rumeyart_prop_nodelete before delete on public.rumeyart_propostas for each row execute function public.rumeyart_bloqueia_delete_proposta();

create or replace function public.rumeyart_pdf_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  select numero, cliente_id, oportunidade_id into p from public.rumeyart_propostas where id = new.proposta_id;
  insert into public.rumeyart_historico (cliente_id, oportunidade_id, proposta_id, tipo, texto, autor)
  values (p.cliente_id, p.oportunidade_id, new.proposta_id, 'pdf',
    'PDF da Proposta Nº ' || p.numero || ' gerado (versão ' || new.versao || ') — R$ ' || to_char(new.total, 'FM999G999G990D00'),
    coalesce(new.gerado_por, public.rumeyart_eu()));
  return null;
end; $$;
drop trigger if exists rumeyart_pdf_log on public.rumeyart_proposta_pdfs;
create trigger rumeyart_pdf_log after insert on public.rumeyart_proposta_pdfs for each row execute function public.rumeyart_pdf_log();

-- ---------- tarefas: histórico (só quando ligadas a um cliente) ----------
create or replace function public.rumeyart_tarefa_datas()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.concluida and not old.concluida then new.concluida_em := now();
  elsif not new.concluida and old.concluida then new.concluida_em := null; end if;
  if new.vence_em is distinct from old.vence_em then new.notificada_em := null; end if;
  return new;
end; $$;
drop trigger if exists rumeyart_tarefa_datas on public.rumeyart_tarefas;
create trigger rumeyart_tarefa_datas before update on public.rumeyart_tarefas for each row execute function public.rumeyart_tarefa_datas();

create or replace function public.rumeyart_tarefa_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cliente_id is null then return null; end if;
  if tg_op = 'INSERT' then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto, autor)
    values (new.cliente_id, new.oportunidade_id, 'tarefa',
      'Próxima ação: ' || new.titulo || ' (para ' || to_char(new.vence_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ')',
      coalesce(new.criado_por, public.rumeyart_eu()));
  elsif new.concluida and not old.concluida then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto)
    values (new.cliente_id, new.oportunidade_id, 'tarefa', 'Concluído: ' || new.titulo);
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_tarefa_log_ins on public.rumeyart_tarefas;
drop trigger if exists rumeyart_tarefa_log_upd on public.rumeyart_tarefas;
create trigger rumeyart_tarefa_log_ins after insert on public.rumeyart_tarefas for each row execute function public.rumeyart_tarefa_log();
create trigger rumeyart_tarefa_log_upd after update of concluida on public.rumeyart_tarefas for each row execute function public.rumeyart_tarefa_log();

-- ---------- contratos: número + histórico ----------
create or replace function public.rumeyart_contrato_numero()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.numero is null then
    update public.rumeyart_config set proximo_contrato = proximo_contrato + 1, atualizado_em = now()
      where id = 1 returning proximo_contrato - 1 into new.numero;
  end if;
  return new;
end; $$;
drop trigger if exists rumeyart_contrato_numero on public.rumeyart_contratos;
create trigger rumeyart_contrato_numero before insert on public.rumeyart_contratos for each row execute function public.rumeyart_contrato_numero();

create or replace function public.rumeyart_contrato_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, proposta_id, tipo, texto)
    values (new.cliente_id, new.oportunidade_id, new.proposta_id, 'contrato', 'Contrato Nº ' || new.numero || ' gerado: ' || new.titulo);
  elsif new.assinado_em is not null and old.assinado_em is null then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, proposta_id, tipo, texto)
    values (new.cliente_id, new.oportunidade_id, new.proposta_id, 'contrato', 'Contrato Nº ' || new.numero || ' assinado em ' || to_char(new.assinado_em, 'DD/MM/YYYY'));
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_contrato_log on public.rumeyart_contratos;
drop trigger if exists rumeyart_contrato_log_upd on public.rumeyart_contratos;
create trigger rumeyart_contrato_log after insert on public.rumeyart_contratos for each row execute function public.rumeyart_contrato_log();
create trigger rumeyart_contrato_log_upd after update of assinado_em on public.rumeyart_contratos for each row execute function public.rumeyart_contrato_log();

-- ---------- financeiro: receita/despesa ligada a cliente vai para o histórico ----------
create or replace function public.rumeyart_fin_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cliente_id is not null and new.tipo in ('receita','despesa') then
    insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto)
    values (new.cliente_id, new.oportunidade_id, 'financeiro',
      case new.tipo when 'receita' then 'Recebimento ' else 'Despesa ' end
      || case new.status when 'pago' then '' else '(previsto) ' end
      || 'de R$ ' || to_char(new.valor_centavos / 100.0, 'FM999G999G990D00') || ' — ' || new.descricao
      || case when new.parcelas > 1 then ' (' || new.parcela || '/' || new.parcelas || ')' else '' end);
  end if;
  return null;
end; $$;
drop trigger if exists rumeyart_fin_log on public.rumeyart_fin_lancamentos;
create trigger rumeyart_fin_log after insert on public.rumeyart_fin_lancamentos for each row execute function public.rumeyart_fin_log();

-- ---------- saldos e faturas ----------
create or replace view public.rumeyart_fin_saldos with (security_invoker = true) as
select c.id, c.apelido, c.banco, c.tipo, c.cor, c.ordem, c.arquivada, c.saldo_inicial_centavos,
  c.saldo_inicial_centavos + coalesce(sum(case when l.status = 'pago' then
      case
        when l.tipo = 'receita' and l.conta_id = c.id then l.valor_centavos
        when l.tipo = 'despesa' and l.conta_id = c.id and l.cartao_id is null then -l.valor_centavos
        when l.tipo = 'transferencia' and l.conta_destino_id = c.id then l.valor_centavos
        when l.tipo = 'transferencia' and l.conta_id = c.id then -l.valor_centavos
        when l.tipo = 'pagamento_fatura' and l.conta_id = c.id then -l.valor_centavos
        else 0 end else 0 end), 0)::bigint as saldo_centavos,
  c.saldo_inicial_centavos + coalesce(sum(
      case
        when l.tipo = 'receita' and l.conta_id = c.id then l.valor_centavos
        when l.tipo = 'despesa' and l.conta_id = c.id and l.cartao_id is null then -l.valor_centavos
        when l.tipo = 'transferencia' and l.conta_destino_id = c.id then l.valor_centavos
        when l.tipo = 'transferencia' and l.conta_id = c.id then -l.valor_centavos
        when l.tipo = 'pagamento_fatura' and l.conta_id = c.id then -l.valor_centavos
        else 0 end), 0)::bigint as saldo_previsto_centavos
from public.rumeyart_fin_contas c
left join public.rumeyart_fin_lancamentos l on (l.conta_id = c.id or l.conta_destino_id = c.id)
group by c.id;

create or replace view public.rumeyart_fin_faturas with (security_invoker = true) as
select k.id, k.nome, k.banco, k.final, k.limite_centavos, k.fechamento, k.vencimento, k.conta_pagamento_id, k.arquivado,
  (k.fatura_inicial_centavos
    + coalesce(sum(case when l.status = 'pago' and l.tipo = 'despesa' then l.valor_centavos
                        when l.status = 'pago' and l.tipo = 'pagamento_fatura' then -l.valor_centavos else 0 end), 0))::bigint as fatura_centavos
from public.rumeyart_fin_cartoes k
left join public.rumeyart_fin_lancamentos l on l.cartao_id = k.id
group by k.id;

-- ---------- permissões (RLS) ----------
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'rumeyart\_%' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['rumeyart_admins','rumeyart_config','rumeyart_servicos','rumeyart_clientes','rumeyart_oportunidades','rumeyart_pedidos',
                           'rumeyart_propostas','rumeyart_proposta_pdfs','rumeyart_historico','rumeyart_tarefas',
                           'rumeyart_fornecedores','rumeyart_recursos','rumeyart_precos','rumeyart_compras','rumeyart_contrato_modelos','rumeyart_contratos',
                           'rumeyart_fin_contas','rumeyart_fin_cartoes','rumeyart_fin_categorias','rumeyart_fin_lancamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "adm le" on public.%I for select to authenticated using ((select public.rumeyart_is_admin()))', t);
  end loop;
  -- tabelas com escrita completa
  foreach t in array array['rumeyart_servicos','rumeyart_oportunidades','rumeyart_pedidos','rumeyart_propostas','rumeyart_tarefas',
                           'rumeyart_fornecedores','rumeyart_recursos','rumeyart_precos','rumeyart_compras','rumeyart_contrato_modelos','rumeyart_contratos',
                           'rumeyart_fin_contas','rumeyart_fin_cartoes','rumeyart_fin_categorias','rumeyart_fin_lancamentos'] loop
    execute format('create policy "adm cria" on public.%I for insert to authenticated with check ((select public.rumeyart_is_admin()))', t);
    execute format('create policy "adm altera" on public.%I for update to authenticated using ((select public.rumeyart_is_admin())) with check ((select public.rumeyart_is_admin()))', t);
    execute format('create policy "adm apaga" on public.%I for delete to authenticated using ((select public.rumeyart_is_admin()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
-- clientes: cria e altera (apagar = arquivar)
create policy "adm cria" on public.rumeyart_clientes for insert to authenticated with check ((select public.rumeyart_is_admin()));
create policy "adm altera" on public.rumeyart_clientes for update to authenticated using ((select public.rumeyart_is_admin())) with check ((select public.rumeyart_is_admin()));
grant select, insert, update on public.rumeyart_clientes to authenticated;
-- histórico e PDFs: só inserção
create policy "adm cria" on public.rumeyart_historico for insert to authenticated with check ((select public.rumeyart_is_admin()));
create policy "adm cria" on public.rumeyart_proposta_pdfs for insert to authenticated with check ((select public.rumeyart_is_admin()));
grant select, insert on public.rumeyart_historico, public.rumeyart_proposta_pdfs to authenticated;
-- configuração e acesso
create policy "adm altera" on public.rumeyart_config for update to authenticated using ((select public.rumeyart_is_admin())) with check ((select public.rumeyart_is_admin()));
grant select, update on public.rumeyart_config to authenticated;
grant select on public.rumeyart_admins to authenticated;
revoke all on public.rumeyart_fin_saldos, public.rumeyart_fin_faturas from anon;
grant select on public.rumeyart_fin_saldos, public.rumeyart_fin_faturas to authenticated;

-- funções internas de gatilho: ninguém chama direto
do $$ declare f text; begin
  foreach f in array array['rumeyart_touch()','rumeyart_bloqueia_delete_cliente()','rumeyart_oport_datas()','rumeyart_oport_log()','rumeyart_hist_contato()',
                           'rumeyart_proposta_numero()','rumeyart_proposta_datas()','rumeyart_proposta_log()','rumeyart_bloqueia_delete_proposta()','rumeyart_pdf_log()',
                           'rumeyart_tarefa_datas()','rumeyart_tarefa_log()','rumeyart_contrato_numero()','rumeyart_contrato_log()','rumeyart_fin_log()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------- acesso: adicionar e remover (só quem já tem acesso) ----------
create or replace function public.rumeyart_adicionar_acesso(p_email text, p_papel text default 'admin')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_permissao'; end if;
  insert into public.rumeyart_admins (email, papel) values (lower(btrim(p_email)), coalesce(p_papel,'admin'))
  on conflict (email) do update set papel = excluded.papel;
end; $$;
create or replace function public.rumeyart_remover_acesso(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.rumeyart_is_admin() then raise exception 'sem_permissao'; end if;
  if lower(btrim(p_email)) = lower(public.rumeyart_eu()) then raise exception 'nao_pode_remover_a_si_mesmo'; end if;
  if (select count(*) from public.rumeyart_admins) <= 1 then raise exception 'ultimo_acesso'; end if;
  delete from public.rumeyart_admins where email = lower(btrim(p_email));
end; $$;
revoke all on function public.rumeyart_adicionar_acesso(text,text) from public, anon;
revoke all on function public.rumeyart_remover_acesso(text) from public, anon;
grant execute on function public.rumeyart_adicionar_acesso(text,text) to authenticated;
grant execute on function public.rumeyart_remover_acesso(text) to authenticated;

-- ---------- pedido vindo do site (formulário "Nos conte sua ideia") ----------
create or replace function public.rumeyart_novo_pedido(p_nome text, p_whatsapp text, p_ideia text, p_respostas jsonb)
returns int language plpgsql security definer set search_path = ''
as $$
declare
  v_digits text; v_cli uuid; v_op uuid; v_ped int; v_titulo text; v_tipo text; v_marca text; v_formatos text; v_resumo text;
  r jsonb := coalesce(p_respostas, '{}'::jsonb);
begin
  p_nome := left(btrim(coalesce(p_nome,'')), 160);
  p_whatsapp := left(btrim(coalesce(p_whatsapp,'')), 40);
  p_ideia := left(btrim(coalesce(p_ideia,'')), 3000);
  v_digits := regexp_replace(p_whatsapp, '\D', '', 'g');
  if char_length(p_nome) < 2 or char_length(v_digits) < 10 or char_length(p_ideia) < 10 then raise exception 'dados_invalidos'; end if;
  if jsonb_typeof(r) <> 'object' or length(r::text) > 12000 then r := '{}'::jsonb; end if;

  -- trava contra envio repetido
  if exists (select 1 from public.rumeyart_pedidos where regexp_replace(whatsapp, '\D', '', 'g') = v_digits and criado_em > now() - interval '2 minutes') then
    raise exception 'pedido_repetido';
  end if;

  v_marca := nullif(left(btrim(coalesce(r->>'marca','')), 120), '');
  v_tipo := case r->>'para' when 'Para minha empresa' then 'empresa' when 'Para um projeto ou coletivo' then 'projeto'
                            when 'Para presentear alguém' then 'presente' when 'Para mim (uso pessoal)' then 'pessoal' else 'outro' end;
  v_formatos := nullif(left(btrim(coalesce(r->>'tipo','')), 200), '');
  v_resumo := case when char_length(p_ideia) > 70 then left(p_ideia, 67) || '…' else p_ideia end;
  v_titulo := left(coalesce(v_formatos || ' · ', '') || v_resumo, 160);
  if char_length(v_titulo) < 2 then v_titulo := 'Pedido do site'; end if;

  -- cliente: reaproveita pelo WhatsApp
  select id into v_cli from public.rumeyart_clientes where whatsapp_digits = v_digits and not arquivado order by criado_em limit 1;
  if v_cli is null then
    insert into public.rumeyart_clientes (nome, whatsapp, marca, tipo, origem, criado_por)
    values (p_nome, p_whatsapp, v_marca, v_tipo, 'site', 'site') returning id into v_cli;
  elsif v_marca is not null then
    update public.rumeyart_clientes set marca = coalesce(marca, v_marca) where id = v_cli;
  end if;

  insert into public.rumeyart_oportunidades (cliente_id, titulo, origem, proxima_acao, proxima_acao_em, criado_por)
  values (v_cli, v_titulo, 'site', 'Responder pedido do site', now(), 'site') returning id into v_op;

  insert into public.rumeyart_pedidos (cliente_id, oportunidade_id, nome, whatsapp, ideia, respostas)
  values (v_cli, v_op, p_nome, p_whatsapp, p_ideia, r) returning numero into v_ped;

  insert into public.rumeyart_historico (cliente_id, oportunidade_id, tipo, texto, autor)
  values (v_cli, v_op, 'site', 'Enviou a ideia pelo site (pedido nº ' || v_ped || '): ' || p_ideia, 'site');

  insert into public.rumeyart_tarefas (cliente_id, oportunidade_id, titulo, area, vence_em, criado_por)
  values (v_cli, v_op, 'Responder pedido do site', 'comercial', now(), 'site');

  return v_ped;
end; $$;
revoke all on function public.rumeyart_novo_pedido(text,text,text,jsonb) from public;
grant execute on function public.rumeyart_novo_pedido(text,text,text,jsonb) to anon, authenticated;

-- ---------- arquivos (Storage) ----------
insert into storage.buckets (id, name, public) values ('rumeyart-propostas', 'rumeyart-propostas', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('rumeyart-docs', 'rumeyart-docs', false) on conflict (id) do nothing;
drop policy if exists "rumeyart arquivos le" on storage.objects;
drop policy if exists "rumeyart arquivos envia" on storage.objects;
create policy "rumeyart arquivos le" on storage.objects for select to authenticated
  using (bucket_id in ('rumeyart-propostas','rumeyart-docs') and (select public.rumeyart_is_admin()));
create policy "rumeyart arquivos envia" on storage.objects for insert to authenticated
  with check (bucket_id in ('rumeyart-propostas','rumeyart-docs') and (select public.rumeyart_is_admin()));
-- PDFs arquivados não são substituídos nem apagados (sem update/delete).
