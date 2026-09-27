-- Atividade do CRM: registro automático de tudo o que muda (quem, o quê, quando) para a aba Notificações.
-- Só inserção por gatilho; o app apenas lê. Segredos do cofre nunca entram (só o nome do projeto).
create table if not exists public.rumeyart_atividade (
  id bigint generated always as identity primary key,
  tabela text not null,
  acao text not null check (acao in ('criou','alterou','apagou')),
  registro_id text,
  cliente_id uuid,
  titulo text,
  detalhe jsonb not null default '{}'::jsonb,
  autor text,
  criado_em timestamptz not null default now()
);
create index if not exists rumeyart_atividade_data_idx on public.rumeyart_atividade (criado_em desc);
alter table public.rumeyart_atividade enable row level security;
revoke all on public.rumeyart_atividade from anon, authenticated;
grant select on public.rumeyart_atividade to authenticated;
drop policy if exists "adm le" on public.rumeyart_atividade;
create policy "adm le" on public.rumeyart_atividade for select to authenticated using ((select public.rumeyart_is_admin()));

create or replace function public.rumeyart_registrar_atividade()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ignorar text[] := array['atualizado_em','notificada_em','ultimo_contato_em','whatsapp_digits','atualizado_por'];
  j jsonb; o jsonb; k text; mudou text[] := '{}'; det jsonb := '{}'::jsonb; tit text; acao text; tab text := replace(tg_table_name, 'rumeyart_', '');
begin
  if tg_op = 'DELETE' then j := to_jsonb(old); acao := 'apagou';
  else j := to_jsonb(new); acao := case when tg_op = 'INSERT' then 'criou' else 'alterou' end; end if;

  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    for k in select jsonb_object_keys(j) loop
      if not (k = any(ignorar)) and (j -> k) is distinct from (o -> k) then mudou := mudou || k; end if;
    end loop;
    if cardinality(mudou) = 0 then return null; end if;
    det := jsonb_build_object('campos', to_jsonb(mudou));
    if 'etapa' = any(mudou) then det := det || jsonb_build_object('etapa', jsonb_build_object('de', o->>'etapa', 'para', j->>'etapa')); end if;
    if 'status' = any(mudou) then det := det || jsonb_build_object('status', jsonb_build_object('de', o->>'status', 'para', j->>'status')); end if;
    if 'concluida' = any(mudou) then det := det || jsonb_build_object('concluida', (j->>'concluida')::boolean); end if;
    if 'arquivado' = any(mudou) or 'arquivada' = any(mudou) then det := det || jsonb_build_object('arquivado', coalesce(j->>'arquivado', j->>'arquivada')::boolean); end if;
    if 'assinado_em' = any(mudou) and j->>'assinado_em' is not null then det := det || jsonb_build_object('assinado', true); end if;
  end if;

  if tab = 'fin_lancamentos' then det := det || jsonb_build_object('tipo', j->>'tipo', 'valor', (j->>'valor_centavos')::bigint, 'pago', j->>'status', 'origem', j->>'origem'); end if;
  if tab = 'propostas' then det := det || jsonb_build_object('total', j->'total'); end if;

  tit := case tab
    when 'pedidos' then 'Pedido nº ' || coalesce(j->>'numero', '') || coalesce(' · ' || (j->>'nome'), '')
    when 'propostas' then 'Proposta nº ' || coalesce(j->>'numero', '') || coalesce(' · ' || nullif(j->>'titulo', ''), '')
    when 'contratos' then 'Contrato nº ' || coalesce(j->>'numero', '') || coalesce(' · ' || nullif(j->>'titulo', ''), '')
    when 'config' then 'Configurações'
    else coalesce(j->>'titulo', j->>'nome', j->>'descricao', j->>'apelido', j->>'projeto', j->>'email') end;

  insert into public.rumeyart_atividade (tabela, acao, registro_id, cliente_id, titulo, detalhe, autor)
  values (tab, acao, coalesce(j->>'id', j->>'email'), nullif(j->>'cliente_id', '')::uuid, left(tit, 160), det,
          nullif(coalesce((select auth.jwt()) ->> 'email', ''), ''));
  return null;
end $$;
revoke all on function public.rumeyart_registrar_atividade() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['clientes','oportunidades','pedidos','propostas','contratos','contrato_modelos','tarefas','servicos',
    'fin_lancamentos','fin_contas','fin_cartoes','fin_categorias','compras','fornecedores','recursos','cofre','config','admins'] loop
    execute format('drop trigger if exists rumeyart_atividade_t on public.%I', 'rumeyart_' || t);
    execute format('create trigger rumeyart_atividade_t after insert or update or delete on public.%I for each row execute function public.rumeyart_registrar_atividade()', 'rumeyart_' || t);
  end loop;
end $$;

-- guarda 180 dias
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'rumeyart-atividade-limpeza';
    perform cron.schedule('rumeyart-atividade-limpeza', '17 4 * * *', $c$delete from public.rumeyart_atividade where criado_em < now() - interval '180 days'$c$);
  end if;
end $$;
