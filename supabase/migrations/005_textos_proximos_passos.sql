-- Textos prontos de cada "próximo passo" (lista O que fazer). Vazio = o CRM usa os textos originais (js/passos.js).
-- Formato: [{"titulo": "Enviar proposta", "texto": "Oi, {nome}! ..."}]
alter table public.rumeyart_config add column if not exists passos jsonb not null default '[]'::jsonb;
