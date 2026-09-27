# Rumëyart Criação — site + CRM

Site da Rumëyart (formulário "Nos conte sua ideia") e o CRM que recebe cada ideia enviada.
Tudo é estático (HTML, CSS e JavaScript, sem etapa de build) e o banco é o Supabase.

```
site/                  ← pasta publicada no Cloudflare Pages
  index.html           ← site da Rumëyart
  img/                 ← logo e telas dos projetos
  crm/                 ← CRM (app instalável no celular e no computador)
    index.html
    crm.css            ← identidade visual do CRM (tema Areia e tema Noite)
    documento.css      ← proposta e contrato em A4 (PDF)
    js/                ← telas do CRM, uma por arquivo (v-*.js)
    sw.js, manifest.webmanifest, icones/
  _headers, _redirects ← regras do Cloudflare
supabase/
  migrations/          ← estrutura do banco (já aplicada no projeto)
  functions/rumeyart-push/ ← envio das notificações no celular (já publicada)
docs/ARQUITETURA.md    ← como as peças se conectam
extras/backup-github-actions.yml ← backup diário opcional do banco (ver abaixo)
```

## Publicar

### 1. GitHub
1. Crie um repositório (pode ser privado), por exemplo `rumeyart`.
2. Envie o conteúdo desta pasta. Pelo site do GitHub: **Add file → Upload files** e arraste tudo
   (inclusive as pastas `site`, `supabase`, `docs` e `.github`).

### 2. Cloudflare Pages
1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
2. Configuração do build:
   - **Framework preset:** None
   - **Build command:** (deixe vazio)
   - **Build output directory:** `site`
3. Salve. Cada envio novo ao GitHub publica sozinho.
4. (Opcional) **Custom domains** → adicione o domínio da Rumëyart.

O site fica em `https://SEU-DOMINIO/` e o CRM em `https://SEU-DOMINIO/crm/`
(`/admin` também leva ao CRM).

### 3. Supabase (uma vez, depois de ter o endereço final)
Supabase → **Authentication → URL Configuration → Redirect URLs** → adicione
`https://SEU-DOMINIO/crm/` para o link de "Esqueci minha senha" voltar para o CRM.

## Entrar no CRM
Use o e-mail `23caiocaio05@gmail.com` com a mesma senha que você já usa nos outros apps
desse projeto Supabase. Se não lembrar, clique em **Esqueci minha senha** na tela de entrada.
Para liberar outra pessoa: CRM → Configurações → Quem acessa o CRM.

## O que o CRM faz
- **Pedidos do site** — cada envio do formulário vira cliente (reaproveita pelo WhatsApp), projeto
  no funil em "Novo pedido", tarefa "Responder pedido do site" e fica guardado com todas as respostas.
  Aviso no celular na hora.
- **Funil** (arrastar entre etapas), **Clientes** (ficha com briefing, projetos, propostas,
  contratos, financeiro e histórico), **Tarefas** por área com lembrete no celular.
- **Propostas** — editor com prévia ao vivo, PDF na identidade da Rumëyart, numeração automática,
  cada PDF arquivado por versão, travamento depois de aprovada, duplicar.
- **Contratos** — modelos com variáveis que se preenchem a partir do cliente e da proposta,
  PDF guardado, marcar como assinado.
- **Administrativo** — tarefas administrativas e o **cofre** de acessos dos projetos (nome do projeto, plataforma,
  login, senha e data da última alteração), protegido por um PIN de 4 dígitos.
- **Listas abertas** — os campos de lista aceitam digitação: filtra enquanto você digita e, se o item não existir,
  oferece "＋ Adicionar" (categorias e subcategorias do financeiro, fornecedores, recursos, serviços, contas,
  clientes, áreas de tarefa, tipo e origem do cliente).
- **Próximos passos com mensagem pronta** — cada passo da lista "O que fazer" (responder pedido, enviar proposta,
  cobrar entrada, pedir depoimento…) tem um texto para o cliente, já com o nome dele e em linguagem neutra.
  Aparece ao criar a tarefa ("Ver e enviar") e nos botões de WhatsApp. Edite em Configurações → Próximos passos.
- **Serviços** — catálogo que alimenta as propostas.
- **Compras** — lista de compras, recursos com cotações (melhor preço), fornecedores.
- **Financeiro** — visão do mês, lançamentos (receita, despesa, transferência, pagamento de fatura),
  parcelado e mensal, contas e cartões com saldo e fatura, categorias com subcategorias,
  importação de extrato OFX/CSV sem duplicar. Fechar um projeto lança as parcelas a receber.
- **Configurações** — tema e zoom, notificações, numeração, textos padrão, textos dos próximos passos, dados da empresa,
  acesso, exportação em CSV e cópia completa em JSON.

## Cofre
- Na primeira vez que abrir **Administrativo → Cofre**, o CRM pede para criar o PIN (digitado duas vezes).
- Logins e senhas ficam cifrados no banco (pgcrypto) com uma chave que o app nunca lê; só as funções do cofre,
  com uma sessão aberta pelo PIN, conseguem decifrar.
- 5 PINs errados seguidos bloqueiam o cofre por 15 minutos. Ele tranca sozinho após 5 minutos parado,
  ao trocar de tela ou ao minimizar o app.
- Esqueceu o PIN? No Supabase → SQL Editor rode `update rumeyart_cofre_config set pin_hash = null;` e crie um novo
  no CRM. Os acessos guardados continuam lá.

## Backup automático (opcional)
No GitHub: **Add file → Create new file**, nome `.github/workflows/backup.yml`, e cole o conteúdo de
`extras/backup-github-actions.yml`. Depois:
GitHub → Settings → Secrets and variables → Actions → **New repository secret**
`SUPABASE_DB_URL` = connection string do Supabase (Connect → Session pooler, com a senha do banco).
O backup roda todo dia às 3h e fica 30 dias em Actions → Artifacts.

## Segurança
A chave que aparece em `site/crm/js/db.js` e no `site/index.html` é a **chave pública** do Supabase —
é feita para ficar no navegador. Quem protege os dados são as regras do banco (RLS): só e-mails
cadastrados em `rumeyart_admins` leem ou alteram qualquer coisa; o site só consegue chamar
`rumeyart_novo_pedido`. Chaves privadas (notificações) ficam só dentro do banco, nunca neste repositório.
