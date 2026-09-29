-- Marketing: social media e Meta Ads dentro do CRM.
-- Plano de ação, calendário de posts com resultados, campanhas com resultados por período,
-- diário de aprendizados e a marca (posicionamento, tom, públicos, pilares, cores, textos).
-- Mesmas regras do resto do CRM: só admin lê e altera, touch em atualizado_em, atividade registrada.

-- ---------- tabelas ----------
create table if not exists public.rumeyart_mkt_marca (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_mkt_acoes (
  id uuid primary key default gen_random_uuid(),
  etapa text not null default 'geral',
  ordem int not null default 0,
  titulo text not null check (char_length(titulo) between 2 and 200),
  descricao text,
  passos text,                       -- um passo por linha
  dica text,
  prazo date,
  concluida boolean not null default false,
  concluida_em timestamptz,
  notas text,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_mkt_acoes_etapa_idx on public.rumeyart_mkt_acoes (etapa, ordem);

create table if not exists public.rumeyart_mkt_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 160),
  plataforma text not null default 'meta',
  objetivo text not null default 'cadastros',
  destino text not null default 'whatsapp',
  status text not null default 'planejada' check (status in ('planejada','ativa','pausada','encerrada')),
  publico text,
  verba_diaria_centavos bigint check (verba_diaria_centavos is null or verba_diaria_centavos >= 0),
  inicio date,
  fim date,
  codigo text,                       -- utm_campaign usado no link do site
  hipotese text,
  criativos text,
  copy text,
  observacoes text,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rumeyart_mkt_posts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 2 and 200),
  data date,
  rede text not null default 'instagram',
  formato text not null default 'estatico',
  pilar text,
  publico text,
  status text not null default 'ideia' check (status in ('ideia','producao','agendado','publicado','cancelado')),
  canva_url text,
  post_url text,
  roteiro text,
  legenda text,
  campanha_id uuid references public.rumeyart_mkt_campanhas(id) on delete set null,
  alcance int, impressoes int, reproducoes int, curtidas int, comentarios int, salvamentos int,
  compartilhamentos int, visitas_perfil int, cliques_link int, seguidores int,
  metricas_em timestamptz,
  observacoes text,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists rumeyart_mkt_posts_data_idx on public.rumeyart_mkt_posts (data);

create table if not exists public.rumeyart_mkt_resultados (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.rumeyart_mkt_campanhas(id) on delete cascade,
  inicio date not null,
  fim date not null,
  conjunto text,
  investido_centavos bigint not null default 0 check (investido_centavos >= 0),
  impressoes int, alcance int, cliques int, conversas int, orcamentos int, vendas int,
  valor_vendas_centavos bigint check (valor_vendas_centavos is null or valor_vendas_centavos >= 0),
  frequencia numeric(6,2),
  observacoes text,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim >= inicio)
);
create index if not exists rumeyart_mkt_resultados_camp_idx on public.rumeyart_mkt_resultados (campanha_id, inicio);

create table if not exists public.rumeyart_mkt_aprendizados (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  titulo text not null check (char_length(titulo) between 2 and 200),
  tipo text not null default 'teste',
  hipotese text,
  acao text,
  resultado text,
  decisao text,
  post_id uuid references public.rumeyart_mkt_posts(id) on delete set null,
  campanha_id uuid references public.rumeyart_mkt_campanhas(id) on delete set null,
  criado_por text default public.rumeyart_eu(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- regras de acesso ----------
do $$ declare t text; begin
  foreach t in array array['mkt_marca','mkt_acoes','mkt_campanhas','mkt_posts','mkt_resultados','mkt_aprendizados'] loop
    execute format('alter table public.%I enable row level security', 'rumeyart_' || t);
    execute format('revoke all on public.%I from anon', 'rumeyart_' || t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', 'rumeyart_' || t);
    execute format('drop policy if exists "adm le" on public.%I', 'rumeyart_' || t);
    execute format('drop policy if exists "adm cria" on public.%I', 'rumeyart_' || t);
    execute format('drop policy if exists "adm altera" on public.%I', 'rumeyart_' || t);
    execute format('drop policy if exists "adm apaga" on public.%I', 'rumeyart_' || t);
    execute format('create policy "adm le" on public.%I for select to authenticated using ((select public.rumeyart_is_admin()))', 'rumeyart_' || t);
    execute format('create policy "adm cria" on public.%I for insert to authenticated with check ((select public.rumeyart_is_admin()))', 'rumeyart_' || t);
    execute format('create policy "adm altera" on public.%I for update to authenticated using ((select public.rumeyart_is_admin())) with check ((select public.rumeyart_is_admin()))', 'rumeyart_' || t);
    execute format('create policy "adm apaga" on public.%I for delete to authenticated using ((select public.rumeyart_is_admin()))', 'rumeyart_' || t);
    execute format('drop trigger if exists %I on public.%I', 'rumeyart_' || t || '_touch', 'rumeyart_' || t);
    execute format('create trigger %I before update on public.%I for each row execute function public.rumeyart_touch()', 'rumeyart_' || t || '_touch', 'rumeyart_' || t);
  end loop;
end $$;

-- data de conclusão automática
create or replace function public.rumeyart_mkt_acao_concluir()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.concluida then new.concluida_em := null;
  elsif tg_op = 'INSERT' then new.concluida_em := coalesce(new.concluida_em, now());
  elsif not old.concluida then new.concluida_em := now();
  end if;
  return new;
end $$;
drop trigger if exists rumeyart_mkt_acoes_concluir on public.rumeyart_mkt_acoes;
create trigger rumeyart_mkt_acoes_concluir before insert or update on public.rumeyart_mkt_acoes for each row execute function public.rumeyart_mkt_acao_concluir();

-- ---------- conteúdo inicial (só se ainda estiver vazio) ----------
insert into public.rumeyart_mkt_marca (id, dados) values (1, $j${
  "frase_guia": "Transformamos ideias em ferramentas que funcionam.",
  "promessa": "Você traz a necessidade; nós estruturamos, desenhamos e entregamos pronto para usar no celular e no computador.",
  "provas": "Método: as perguntas certas vêm antes do código.\nClareza: o cliente testa as primeiras telas antes do investimento maior.\nContinuidade: a ferramenta evolui com o uso, sem perder dados.",
  "inimigo": "A rotina espalhada em cinco apps, três planilhas e um grupo de WhatsApp. Todo post aponta esse caos e mostra o ambiente único como saída.",
  "bio": "Apps, sistemas e jogos sob medida.\nA ferramenta do tamanho da sua rotina.\nConte sua ideia ↓",
  "tom": "Uma ideia por peça. Título com até 8 palavras; legenda com até 5 linhas antes do convite.\nAbrir com uma pergunta concreta ou uma cena reconhecível, nunca com a marca.\nNúmeros e situações reais no lugar de adjetivos.\nConvite sereno no fim: “Conte sua ideia”. Nada de “COMPRE JÁ”.\nSem jargão técnico: o cliente compra a rotina resolvida, não a tecnologia.\nNo máximo um sinal gráfico por legenda (→ ↓ ·).",
  "faz": "Quantos apps você abre para organizar um único dia?\nSeu CRM, com os campos que o seu negócio usa.\nVocê testa as primeiras telas antes de decidir.\nConte sua ideia. A gente devolve um caminho claro.",
  "nao_faz": "Chega de bagunça!!! Temos a solução perfeita\nCRM revolucionário com IA de última geração\nGarantia de sucesso ou seu dinheiro de volta\nClique agora antes que acabe!",
  "hashtags": "#apppersonalizado #sistemasobmedida #gestaodenegocios #produtividade #rumeyart",
  "publicos": [
    {"nome": "Empreendedor", "dor": "Negócio e rotina em apps soltos", "gancho": "Quantos apps você abre para organizar um único dia?", "prova": "Grana a Dois"},
    {"nome": "Estudante", "dor": "Material espalhado, revisão esquecida", "gancho": "Seu material de estudo está em quantos lugares?", "prova": "Acervo dos Rezos"},
    {"nome": "Pequena empresa", "dor": "Pedidos, orçamentos e cobranças à mão", "gancho": "Quanto tempo se perde repassando pedidos?", "prova": "Simbiosys"},
    {"nome": "Consultor", "dor": "Clientes e contratos em planilha e WhatsApp", "gancho": "Em quantos lugares está o histórico do seu melhor cliente?", "prova": "CRM da Rumëyart"},
    {"nome": "Qualquer pessoa", "dor": "Uma tarefa que se repete toda semana", "gancho": "Se se repete toda semana, pode virar uma ferramenta.", "prova": "Caçadores de Monstros"}
  ],
  "pilares": [
    {"nome": "Espelho", "peso": 35, "mostra": "A dor do público em uma cena reconhecível", "formatos": "Estático, Reels de 10–20 s"},
    {"nome": "Prova", "peso": 30, "mostra": "Projetos reais: telas, antes e depois", "formatos": "Carrossel, tela gravada"},
    {"nome": "Método", "peso": 20, "mostra": "Escuta, desenho, construção, evolução", "formatos": "Carrossel, bastidores"},
    {"nome": "Convite", "peso": 15, "mostra": "Formulário, caixinha, perguntas", "formatos": "Stories, estático com convite"}
  ],
  "cores": [
    {"nome": "Papel", "hex": "#FBF8F3", "uso": "Fundo principal (70% das peças)"},
    {"nome": "Areia", "hex": "#F5EFE6", "uso": "Cards e carrosséis"},
    {"nome": "Tinta", "hex": "#16213A", "uso": "Títulos e peças de contraste"},
    {"nome": "Laranja", "hex": "#E0703A", "uso": "Uma palavra-chave por peça"},
    {"nome": "Azul", "hex": "#2566A8", "uso": "Linhas, números, ícones"},
    {"nome": "Céu", "hex": "#7CC4F0", "uso": "Só sobre fundo Tinta"}
  ],
  "fontes": "Instrument Serif nos títulos (palavra-chave em itálico laranja) · Geist no texto · Geist Mono nos rótulos em caixa alta",
  "formatos": "Post e carrossel: 1080 × 1350 (4:5), texto dentro da faixa central de ~1012 px (recorte 3:4 do perfil).\nStories, Reels e capa: 1080 × 1920 (9:16), nada de texto nos 250 px de cima e de baixo.\nCarrossel: até 20 lâminas, ideal 5 a 8.",
  "textos": [
    {"titulo": "Convite padrão", "texto": "Conte sua ideia pelo link na bio. A gente devolve um caminho claro para tirar do papel."},
    {"titulo": "Mensagem inicial do WhatsApp (anúncio)", "texto": "Oi! Vi o anúncio e quero contar minha ideia."},
    {"titulo": "Copy · Pequena empresa", "texto": "Pedidos no WhatsApp, orçamentos no caderno, clientes na planilha. E se tudo estivesse num lugar só, com os campos que o seu negócio usa? Você testa as primeiras telas antes de investir.\n\nTítulo: Seu sistema, sob medida"},
    {"titulo": "Copy · Consultor", "texto": "O histórico do seu melhor cliente está em quantos lugares? Um CRM desenhado para o seu jeito de atender: clientes, contratos e follow-ups numa tela.\n\nTítulo: Um CRM do seu tamanho"},
    {"titulo": "Copy · Empreendedor", "texto": "Quantos apps você abre para organizar um único dia? A gente cria a ferramenta do tamanho da sua rotina, no celular e no computador.\n\nTítulo: A sua rotina num app só"},
    {"titulo": "Copy · Retomada", "texto": "Você já viu o que fazemos. Conte sua ideia em 5 minutos e receba um caminho claro para tirar do papel.\n\nTítulo: Conte sua ideia"}
  ]
}$j$::jsonb) on conflict (id) do nothing;

do $$ begin
if not exists (select 1 from public.rumeyart_mkt_acoes) then
  insert into public.rumeyart_mkt_acoes (etapa, ordem, titulo, descricao, passos, dica, prazo) values
  ('base', 1, 'Aprovar o posicionamento', 'Frase-guia, promessa e as três provas', E'Leia a frase-guia e a promessa em voz alta (aba Marca).\nSe alguma palavra não soa como você, edite ali mesmo.\nA versão salva na aba Marca passa a valer para todos os posts e anúncios.', null, '2026-09-29'),
  ('base', 2, 'Escrever 10 perguntas-gancho', 'O banco que abastece títulos e anúncios', E'Pense em 2 perguntas para cada público.\nCada pergunta precisa de um número ou cena concreta (ex.: “Cadê aquele orçamento de terça?”).\nGuarde em Marca → Textos-base ou como ideia no Calendário.', 'As perguntas do formulário do site são um bom ponto de partida.', '2026-09-30'),
  ('base', 3, 'Fixar as hashtags da marca', '3 a 5 por post', E'Use as fixas da aba Marca.\nTroque uma delas por uma do tema do post quando fizer sentido.\nNunca passe de 5.', null, '2026-09-30'),

  ('perfil', 1, 'Mudar para conta profissional', 'Configurações do Instagram', E'No perfil, abra o menu ☰ → Tipo de conta e ferramentas.\nEscolha Mudar para conta profissional → Empresa.\nSelecione a categoria mais próxima de desenvolvimento de software ou apps.', null, '2026-09-29'),
  ('perfil', 2, 'Atualizar nome, bio e link', 'Texto pronto na aba Marca', E'Nome do perfil: Rumëyart Criação · Apps sob medida.\nCole a bio da aba Marca.\nEm Links, adicione o site com rastreio (Campanhas → Link do site).\nAdicione o botão de contato do WhatsApp da marca.', null, '2026-09-29'),
  ('perfil', 3, 'Trocar a foto de perfil', 'Símbolo sobre fundo Papel', E'No Canva, quadrado 1080 × 1080 com fundo #FBF8F3.\nCentralize o símbolo (já está nos Uploads do Canva) ocupando ~70% do círculo.\nExporte em PNG e troque a foto.', null, '2026-09-30'),
  ('perfil', 4, 'Ligar Página do Facebook e WhatsApp Business', 'Pré-requisito dos anúncios', E'Crie (ou use) a Página do Facebook “Rumëyart Criação”.\nNo Instagram: Central de Contas → ligue o Instagram à Página.\nNo WhatsApp Business: Ferramentas comerciais → Facebook e Instagram → conecte a Página.\nConfirme que você é administrador da Página.', 'Anúncios de conversa no WhatsApp exigem o número ligado à Página.', '2026-10-01'),
  ('perfil', 5, 'Criar 4 capas de destaque', 'Projetos · Como funciona · Conte sua ideia · Perguntas', E'Canva, formato Story, fundo Areia #F5EFE6.\nUm ícone de linha fina azul no centro, sem texto.\nSuba como capas quando criar os destaques.', null, '2026-10-02'),

  ('visual', 1, 'Conferir os logos no Canva', 'Já enviados: “Rumëyart - marca completa” e “Rumëyart - símbolo”', E'Abra o Canva → Uploads.\nConfirme os dois arquivos.\nSe quiser alta resolução, suba o original da pasta Rumëyart Criação.', null, '2026-09-29'),
  ('visual', 2, 'Criar o Kit de Marca no Canva', 'Se o plano do Canva tiver Kit de Marca', E'Canva → Marca → Criar kit “Rumëyart”.\nAdicione as cores da aba Marca.\nFontes: Título = Instrument Serif; Corpo = Geist (ou Inter).\nAdicione os dois logos.', 'Sem Kit de Marca? Crie um design “Rumëyart · Base” com cores e fontes e duplique sempre a partir dele.', '2026-09-30'),
  ('visual', 3, 'Escolher o post de apresentação', '4 opções já geradas no seu Canva', E'Abra as quatro opções (links no post de 28/09 do Calendário).\nEscolha a que mais respira e tem menos elementos.\nAjuste: título em Instrument Serif, “funcionam” em itálico laranja, fundo #FBF8F3.\nApague as outras três.', null, '2026-09-29'),
  ('visual', 4, 'Criar 3 modelos-base', 'Post claro, post escuro e story', E'Post claro 1080 × 1350: rótulo mono no topo, título serifado, linha-degradê, logo no rodapé.\nPost escuro: mesmo layout com fundo Tinta #16213A.\nStory 1080 × 1920: título no terço central.\nGuarde numa pasta “Rumëyart · Modelos”.', null, '2026-10-01'),
  ('visual', 5, 'Criar a capa-modelo de Reels', '9:16 pensada para o recorte 3:4', E'Formato 1080 × 1920.\nTítulo curto no centro, dentro de 1080 × 1440.\nSalve na pasta de modelos.', null, '2026-10-01'),

  ('conteudo', 1, 'Separar prints dos projetos', '5 telas de cada projeto-prova', E'Capture telas de Simbiosys, Grana a Dois, Acervo dos Rezos, Caçadores de Monstros e do CRM.\nUse dados de exemplo: nenhum nome ou valor real de cliente.\nSuba numa pasta do Canva “Rumëyart · Telas”.', null, '2026-10-02'),
  ('conteudo', 2, 'Criar os destaques fixos', 'Projetos · Como funciona · Conte sua ideia · Perguntas', E'Poste 1 a 3 stories para cada tema.\nAdicione cada um ao destaque com a capa criada.\nOrdem: Projetos primeiro, Conte sua ideia por último.', null, '2026-10-03'),
  ('conteudo', 3, 'Rodar a primeira enquete', 'Qual tarefa você repete toda semana?', E'Story com fundo Areia e a pergunta.\nUse a caixinha de perguntas.\nRegistre as respostas em Aprendizados: viram posts e copies.', null, '2026-10-01'),
  ('conteudo', 4, 'Gravar o Reels “Da primeira conversa ao app instalado”', 'Roteiro no post de 02/10', E'Grave as 5 cenas (celular na vertical, luz natural).\nMonte com cortes nos tempos do roteiro.\nTextos no modelo de Reels; trilha instrumental.\nCapa própria pensada para o recorte 3:4.', null, '2026-10-01'),
  ('conteudo', 5, 'Gravar o Reels “Cadê aquele orçamento?”', 'Roteiro no post de 07/10', E'Use WhatsApp e planilha de exemplo, sem dados reais.\nGrave a tela do Simbiosys com a busca.\nMonte e revise os textos.', null, '2026-10-06'),
  ('conteudo', 6, 'Gravar o Reels “Grana a Dois”', 'Roteiro no post de 19/10', E'Cena das duas mãos com dois celulares.\nGrave a tela do Grana a Dois com valores de exemplo.\nMonte, revise e agende.', null, '2026-10-16'),

  ('ads', 1, 'Preparar a conta de anúncios', 'Meta Business Suite', E'Abra business.facebook.com e confirme Página, Instagram e WhatsApp ligados.\nConfigurações → Contas de anúncios: crie em reais (BRL), fuso de São Paulo.\nAdicione a forma de pagamento.\nVerifique se a conta não tem restrição.', null, '2026-10-05'),
  ('ads', 2, 'Criar a Campanha 1 · Captação', 'Objetivo Cadastros → WhatsApp', E'Gerenciador de Anúncios → Criar → objetivo Cadastros (Leads).\nNome: RUM · Captação · WhatsApp.\nLocal da conversão: Apps de mensagem → WhatsApp.\nMeta: maximizar conversas.\nOrçamento: R$ 15/dia na fase de teste.\nMude o status da campanha para Ativa na aba Campanhas.', null, '2026-10-06'),
  ('ads', 3, 'Montar os conjuntos A e B', 'Interesses contra público aberto', E'Conjunto A: Brasil, 24–55 anos, português; interesses de gestão, CRM, consultoria, empreendedorismo.\nDuplique como Conjunto B e remova os interesses (Advantage+ aberto).\nDivida a verba igualmente.', null, '2026-10-06'),
  ('ads', 4, 'Subir 3 anúncios por conjunto', 'Estático, carrossel e Reels', E'Use os posts com mais salvamentos (veja o Calendário).\nCole as copies da aba Marca → Textos-base.\nBotão: Enviar mensagem.\nMensagem inicial: “Oi! Vi o anúncio e quero contar minha ideia.”', null, '2026-10-06'),
  ('ads', 5, 'Criar o público de retomada', 'Público personalizado', E'Públicos → Criar público → Público personalizado → Instagram.\nQuem interagiu com o perfil nos últimos 30 dias.\nOutro com quem assistiu a 50% dos Reels.', 'Visitantes do site só entram depois de instalar o Pixel. Fica para uma segunda fase.', '2026-10-12'),
  ('ads', 6, 'Criar a Campanha 2 · Retomada', 'Objetivo Tráfego → site com rastreio', E'Criar → Tráfego. Nome: RUM · Retomada · Site.\nPúblico: os personalizados da tarefa anterior.\nDestino: o link com rastreio da campanha (aba Campanhas → Link do site).\nBotão Saiba mais; 20% da verba.', null, '2026-10-13'),
  ('ads', 7, 'Revisão do 7º dia', 'Redistribuir a verba', E'Registre os números da semana na campanha (Campanhas → Registrar resultado).\nCompare o custo por conversa de A e B.\nMova a verba para o mais barato e pause o criativo mais fraco.\nAnote a decisão em Aprendizados.', null, '2026-10-13'),

  ('rotina', 1, 'Revisão de sexta · semana 1', '30 minutos', E'Preencha os resultados dos posts publicados na semana.\nRegistre o resultado das campanhas.\nUma decisão só, anotada em Aprendizados.', null, '2026-10-02'),
  ('rotina', 2, 'Revisão de sexta · semana 2', '30 minutos', E'Mesmos números da semana 1.\nCompare na Visão geral.\nUma decisão.', null, '2026-10-09'),
  ('rotina', 3, 'Revisão de sexta · semana 3', '30 minutos', E'Mesmos números.\nDecida se sobe para R$ 30/dia (fase de validação).', null, '2026-10-16'),
  ('rotina', 4, 'Fechamento do mês', 'Planejar os próximos 30 dias', E'Quais pilares tiveram mais salvamentos?\nQuantas conversas, orçamentos e projetos fechados vieram de anúncio?\nMonte o calendário do próximo mês a partir dos aprendizados.', null, '2026-10-23');
end if;
end $$;

do $$ declare c1 uuid; begin
if not exists (select 1 from public.rumeyart_mkt_campanhas) then
  insert into public.rumeyart_mkt_campanhas (nome, objetivo, destino, status, publico, verba_diaria_centavos, codigo, hipotese, copy)
  values ('RUM · Captação · WhatsApp', 'cadastros', 'whatsapp', 'planejada',
          'Conjunto A: Brasil, 24–55, interesses de gestão, CRM, consultoria, empreendedorismo. Conjunto B: público aberto (Advantage+).',
          1500, 'captacao',
          'Pequenas empresas e consultores respondem melhor a “seu sistema sob medida” do que ao público aberto.',
          'Pedidos no WhatsApp, orçamentos no caderno, clientes na planilha. E se tudo estivesse num lugar só, com os campos que o seu negócio usa?')
  returning id into c1;
  insert into public.rumeyart_mkt_campanhas (nome, objetivo, destino, status, publico, verba_diaria_centavos, codigo, hipotese, copy)
  values ('RUM · Retomada · Site', 'trafego', 'site', 'planejada',
          'Quem interagiu com o perfil ou assistiu 50% dos Reels nos últimos 30 dias.',
          400, 'retomada',
          'Quem já conhece a marca preenche o formulário do site com mais facilidade.',
          'Você já viu o que fazemos. Conte sua ideia em 5 minutos e receba um caminho claro para tirar do papel.');
end if;
end $$;

do $$ begin
if not exists (select 1 from public.rumeyart_mkt_posts) then
  insert into public.rumeyart_mkt_posts (data, titulo, pilar, formato, publico, status, roteiro, legenda, canva_url) values
  ('2026-09-28', 'Transformamos ideias em ferramentas que funcionam.', 'convite', 'estatico', 'Todos', 'producao',
   E'Post de apresentação. Depois de publicar, fixe no topo do perfil.\nOpções no Canva:\n1. https://www.canva.com/d/VTDl18IW13ol0-s\n2. https://www.canva.com/d/IN5RcvF8ShHS2F8\n3. https://www.canva.com/d/-zlrL5c7xAwYYr8\n4. https://www.canva.com/d/PJG_voPiXYYE91L',
   E'Aplicativos, sistemas, jogos e documentos criados a partir da sua rotina ou do seu negócio.\n\nVocê traz a necessidade. Nós estruturamos, desenhamos e entregamos pronto para usar no celular e no computador.\n\nConte sua ideia pelo link na bio →\n\n#apppersonalizado #sistemasobmedida #rumeyart',
   'https://www.canva.com/d/VTDl18IW13ol0-s'),
  ('2026-09-30', 'Sua rotina cabe em quantos apps?', 'espelho', 'carrossel', 'Empreendedor', 'ideia',
   E'L1: “Sua rotina cabe em quantos apps?”\nL2: agenda, banco, planilha, WhatsApp, notas (ícones soltos).\nL3: “Cada um guarda um pedaço do seu dia.”\nL4: esquema antes → depois convergindo para um app.\nL5: “Uma ferramenta do tamanho da sua rotina.”\nL6: logo + “Conte sua ideia → link na bio”.',
   E'Agenda num app, gastos em outro, clientes na planilha, recados no WhatsApp.\n\nCada um guarda um pedaço do seu dia, e nenhum conversa com o outro.\n\nE se tudo coubesse numa ferramenta feita para a sua rotina?\n\nConte sua ideia → link na bio', null),
  ('2026-10-02', 'Da primeira conversa ao app instalado', 'metodo', 'reels', 'Todos', 'ideia',
   E'20 s\n0–3 s · caderno rabiscado · “Toda ferramenta começa como uma ideia solta.”\n3–7 s · conversa de WhatsApp (sem dados reais) · “01 · Escuta: entendemos a rotina e o problema.”\n7–11 s · protótipo tocado no celular · “02 · Desenho: você testa as telas antes.”\n11–15 s · app funcionando · “03 · Construção: no celular e no computador.”\n15–20 s · logo + linha-degradê · “04 · Evolução. Conte sua ideia → link na bio”',
   E'Da primeira conversa ao app instalado, em quatro etapas claras.\n\nVocê decide a cada entrega.\n\nConte sua ideia pelo link na bio →', null),
  ('2026-10-05', 'Simbiosys: do orçamento no caderno à proposta em PDF', 'prova', 'carrossel', 'Pequena empresa', 'ideia',
   E'L1: foto de caderno com orçamento.\nL2–L4: telas do catálogo, do pedido e da proposta em PDF.\nL5: o que mudou na rotina (pergunte ao Pablo o que ele sente que ganhou; sem números inventados).\nL6: convite.', null, null),
  ('2026-10-07', 'Cadê aquele orçamento?', 'espelho', 'reels', 'Pequena empresa', 'ideia',
   E'15 s\n0–4 s · rolagem num WhatsApp cheio · “Cadê aquele orçamento de terça?”\n4–8 s · planilha com dezenas de abas · “…e aquela planilha de clientes?”\n8–12 s · painel do Simbiosys, busca instantânea · “Tudo num lugar só, com os campos do seu negócio.”\n12–15 s · logo · “Seu sistema, sob medida. Rumëyart.”', null, null),
  ('2026-10-09', 'Se é uma tarefa que se repete toda semana, ela pode virar uma ferramenta.', 'convite', 'estatico', 'Todos', 'ideia',
   'Modelo escuro (Tinta). “ferramenta” em itálico laranja.', 'Legenda chama para a caixinha: qual é a sua tarefa repetida?', null),
  ('2026-10-12', 'Jogo da turma com as regras da casa', 'prova', 'carrossel', 'Qualquer pessoa', 'ideia',
   E'Dia das Crianças. Telas do Caçadores de Monstros.\nMensagem: cartas, tabuleiro ou quiz com regras próprias, cada um no seu celular.\nConvite: “Qual jogo a sua turma inventaria?”', null, null),
  ('2026-10-14', 'Seu CRM tem os campos que o seu negócio usa?', 'espelho', 'estatico', 'Consultor', 'ideia',
   'Metade: planilha genérica com colunas vazias. Outra metade: tela do CRM da Rumëyart com campos específicos.', 'Legenda fala de clientes, contratos e follow-ups.', null),
  ('2026-10-16', 'Você testa as telas antes de investir', 'metodo', 'carrossel', 'Todos', 'ideia',
   E'L1: “Você testa antes de decidir.”\nL2–L5: Escuta, Desenho, Construção, Evolução (numeração mono).\nL6: “Você decide a cada entrega, sem pacote fechado.”', null, null),
  ('2026-10-19', 'Grana a Dois: o mês do casal numa tela só', 'prova', 'reels', 'Empreendedor', 'ideia',
   E'30 s\n0–5 s · duas mãos, dois celulares · “Você sabe quanto entrou e quanto saiu no último mês?”\n5–15 s · lançar uma conta, ver saldo · “Contas, cartões e metas do casal numa tela só.”\n15–25 s · tela de metas · “Feito para a rotina de quem usa.”\n25–30 s · logo · “A sua ferramenta pode ser a próxima. Conte sua ideia.”', null, null),
  ('2026-10-21', 'Estudar com o material num lugar só', 'espelho', 'carrossel', 'Estudante', 'ideia',
   E'L1: “Seu material de estudo está em quantos lugares?”\nL2–L4: matérias, revisões, flashcards, metas.\nL5: lembrete na hora certa.\nL6: convite.', null, null),
  ('2026-10-23', '9 perguntas que transformam sua ideia em escopo', 'convite', 'estatico', 'Todos', 'ideia',
   'Peça única com as 9 etapas do formulário do site (só os títulos). Stories com link direto para o site.', 'Legenda: leva cerca de 5 minutos.', null);
end if;
end $$;

-- atividade (sino): criada depois do conteúdo inicial, para ele não aparecer como novidade.
-- Posts, campanhas, aprendizados e marca. Ações do plano e resultados ficam de fora para não poluir.
do $$ declare t text; begin
  foreach t in array array['mkt_marca','mkt_campanhas','mkt_posts','mkt_aprendizados'] loop
    execute format('drop trigger if exists rumeyart_atividade_t on public.%I', 'rumeyart_' || t);
    execute format('create trigger rumeyart_atividade_t after insert or update or delete on public.%I for each row execute function public.rumeyart_registrar_atividade()', 'rumeyart_' || t);
  end loop;
end $$;
