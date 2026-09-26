# Arquitetura

## Visão geral
```
Site (index.html)  ──POST /rest/v1/rpc/rumeyart_novo_pedido──►  Supabase (Postgres + RLS)
                                                                   │  gatilhos: histórico, numeração,
CRM (/crm, PWA)    ──supabase-js (login e-mail/senha)────────────►  │  datas, notificações
                                                                   ▼
                                                  pg_net → Edge Function rumeyart-push → Web Push
```

## Banco (prefixo `rumeyart_`)
| Tabela | Para quê |
|---|---|
| `admins` | e-mails com acesso (função `rumeyart_is_admin()` usada em todas as regras) |
| `config` | próximo nº de proposta e de contrato, textos padrão da proposta, dados da empresa |
| `servicos` | catálogo base das propostas |
| `clientes` | não se apagam (arquivar); WhatsApp normalizado em `whatsapp_digits` |
| `oportunidades` | projetos no funil: novo → conversa → protótipo → proposta → negociação → fechado → entregue / perdido |
| `pedidos` | cada envio do formulário do site, com `respostas` (jsonb) |
| `propostas`, `proposta_pdfs` | proposta em `dados` (jsonb) + cada PDF gerado (bucket privado `rumeyart-propostas`) |
| `contrato_modelos`, `contratos` | texto com variáveis `{{...}}`; PDF no bucket `rumeyart-docs` |
| `historico` | linha do tempo do cliente (só inserção) |
| `tarefas` | lembretes por área; `notificada_em` controla o aviso |
| `fin_contas`, `fin_cartoes`, `fin_categorias`, `fin_lancamentos` | financeiro; views `fin_saldos` e `fin_faturas` |
| `fornecedores`, `recursos`, `precos`, `compras` | compras e cotações |
| `push_config`, `push_inscricoes`, `push_fila` | notificações |

### Formulário do site
`rumeyart_novo_pedido(p_nome, p_whatsapp, p_ideia, p_respostas)` é a única função liberada para
visitantes. Ela valida os campos, bloqueia envio repetido do mesmo WhatsApp por 2 minutos,
reaproveita o cliente pelo WhatsApp, cria o projeto, o pedido, o registro no histórico e a tarefa,
e devolve o número do pedido. Chaves de `p_respostas`: `para, marca, tipo, dor, desejo, quem, onde, prazo, invest, whats`.

### Financeiro
Valores em centavos (`valor_centavos`). Tipos: `receita`, `despesa`, `transferencia`,
`pagamento_fatura`. Parcelas e repetições mensais compartilham `grupo_id`. Importação de extrato
grava `id_externo` (FITID do OFX ou data+valor+descrição do CSV) com índice único por conta/cartão.

## Front-end (`site/crm/js`)
- `app.js` — login, menus (lateral no computador, barra inferior + "Mais" no celular), rotas `#/...`.
- `db.js` — cliente Supabase, nomes das tabelas, consultas comuns.
- `util.js` — formatação, datas (fuso de São Paulo), janelas, avisos.
- `forms.js` — janelas de cadastro usadas em várias telas (cliente, projeto, tarefa, proposta, mudar etapa).
- `proposta-doc.js` + `documento.css` — documento A4 da proposta e do contrato e geração do PDF (html2pdf.js).
- `v-*.js` — uma tela por arquivo.
- `pwa.js`, `sw.js` — instalação e notificações.

## Migrações
Já aplicadas no projeto Supabase `uotxnchfvrgpxwimmefd`. Os arquivos em `supabase/migrations`
servem de registro e para recriar o banco em outro projeto (rodar em ordem 001 → 003; a 003
precisa das chaves VAPID e do segredo, preenchidos direto na tabela `rumeyart_push_config`).
