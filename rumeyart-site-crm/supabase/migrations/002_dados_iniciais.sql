-- Dados iniciais do CRM Rumëyart (pode rodar de novo sem duplicar)

-- quem acessa
insert into public.rumeyart_admins (email, papel) values ('23caiocaio05@gmail.com', 'admin') on conflict (email) do nothing;

-- textos padrão da proposta e dados da empresa
update public.rumeyart_config set
  proposta = case when proposta = '{}'::jsonb then jsonb_build_object(
    'validade_dias', 15,
    'prazo_padrao', 'Protótipo navegável em até 10 dias úteis após o aceite; versão 1 publicada em até 30 dias.',
    'pagamento_padrao', E'50% no aceite da proposta (Pix)\n50% na entrega da versão 1\nOu em até 3x sem juros no cartão',
    'incluso_padrao', E'Conversa de levantamento e desenho das telas\nProtótipo para você testar antes da construção\nApp instalável no celular e no computador\nLogin e dados protegidos\nPublicação no ar com seu nome e sua marca\n30 dias de ajustes após a entrega',
    'nao_incluso_padrao', E'Domínio próprio (registro anual)\nCustos de serviços de terceiros acima dos planos gratuitos\nFuncionalidades fora do escopo descrito',
    'etapas_padrao', E'Escuta: conversa de levantamento\nDesenho: telas e protótipo navegável\nConstrução: versão 1 funcionando\nEntrega: publicação, treinamento e ajustes',
    'condicoes_padrao', 'Valores válidos pelo prazo desta proposta. Funcionalidades novas pedidas depois do aceite são orçadas à parte. O código e os dados pertencem ao cliente após a quitação.'
  ) else proposta end,
  empresa = case when empresa = '{}'::jsonb then jsonb_build_object(
    'nome', 'Rumëyart Criação', 'cnpj', '', 'whatsapp', '+55 11 99023-4473', 'email', '23caiocaio05@gmail.com',
    'endereco', '', 'responsavel', 'Caio Oliveira', 'site', ''
  ) else empresa end
where id = 1;

-- serviços
insert into public.rumeyart_servicos (categoria, nome, subtitulo, descricao, entregaveis, prazo, preco_base, mensal, ordem)
select * from (values
  ('app', 'App sob medida', 'Aplicativo instalável no celular e no computador',
   'Aplicativo criado a partir da sua rotina, com login, dados na nuvem e instalação direto pelo navegador.',
   array['Levantamento e desenho das telas','Protótipo navegável','App instalável (PWA)','Login e dados protegidos','Publicação no ar'], '30 a 45 dias', 3500.00, 0.00, 10),
  ('sistema', 'Sistema de gestão / CRM', 'Painel para organizar clientes, pedidos e finanças',
   'Sistema para o seu negócio: clientes, pedidos, propostas em PDF, tarefas e financeiro num só lugar.',
   array['Mapeamento do processo atual','Painel com indicadores','Cadastro de clientes e funil','Propostas e documentos em PDF','Acesso para a equipe'], '45 a 60 dias', 5500.00, 0.00, 20),
  ('site', 'Site ou catálogo', 'Página com pedido de orçamento integrado',
   'Site responsivo com apresentação da marca, catálogo e formulário que envia os pedidos direto para o seu sistema.',
   array['Estrutura e textos','Design responsivo','Formulário integrado','Publicação e domínio'], '15 a 30 dias', 1800.00, 0.00, 30),
  ('jogo', 'Jogo online', 'Jogo de cartas, tabuleiro ou quiz com regras próprias',
   'Jogo para jogar com amigos, cada um no seu aparelho, com as regras aplicadas pelo sistema.',
   array['Regras e fluxo do jogo','Salas e contas de jogador','Interface para celular','Testes com a turma'], '30 a 60 dias', 4000.00, 0.00, 40),
  ('documento', 'Documento interativo', 'Planilha inteligente, simulador ou relatório vivo',
   'Documento que calcula, organiza e se atualiza sozinho: simuladores, orçamentos, relatórios e planilhas inteligentes.',
   array['Modelo com cálculos','Visual com a sua marca','Versão para celular'], '7 a 15 dias', 800.00, 0.00, 50),
  ('manutencao', 'Manutenção e evolução', 'Plano mensal de ajustes e melhorias',
   'Correções, pequenas melhorias e acompanhamento mensal do seu app ou sistema.',
   array['Correções prioritárias','Até 4 h de melhorias por mês','Backup e monitoramento'], 'Mensal', 0.00, 250.00, 60),
  ('hospedagem', 'Hospedagem e banco de dados', 'Infraestrutura para manter o app no ar',
   'Configuração e acompanhamento da hospedagem, do banco de dados e do domínio.',
   array['Hospedagem','Banco de dados','Certificado HTTPS'], 'Mensal', 0.00, 80.00, 70)
) as v(categoria, nome, subtitulo, descricao, entregaveis, prazo, preco_base, mensal, ordem)
where not exists (select 1 from public.rumeyart_servicos);

-- categorias do financeiro
insert into public.rumeyart_fin_categorias (nome, tipo, subs, cor, ordem) values
  ('Projetos', 'receita', array['Sinal / entrada','Parcela','Quitação'], '#2566A8', 10),
  ('Planos mensais', 'receita', array['Manutenção','Hospedagem','Suporte'], '#3B7BC0', 20),
  ('Documentos e sites', 'receita', array['Site','Documento interativo','Outros'], '#5A92CC', 30),
  ('Consultoria', 'receita', array['Diagnóstico','Treinamento','Mentoria'], '#7AA8D8', 40),
  ('Outras receitas', 'receita', array['Rendimentos','Reembolso','Outros'], '#9DBEE2', 90),
  ('Ferramentas e assinaturas', 'despesa', array['IA e assistentes','Design','Produtividade','Outros'], '#E0703A', 10),
  ('Infraestrutura', 'despesa', array['Hospedagem','Banco de dados','Domínios','E-mail'], '#C95F2E', 20),
  ('Equipamentos', 'despesa', array['Computador','Celular de testes','Periféricos','Manutenção'], '#B9531F', 30),
  ('Terceirizados', 'despesa', array['Design','Desenvolvimento','Redação','Fotos e vídeos'], '#9E4A22', 40),
  ('Marketing', 'despesa', array['Anúncios','Conteúdo','Eventos','Brindes'], '#7A4466', 50),
  ('Estrutura', 'despesa', array['Internet e telefone','Energia','Espaço de trabalho'], '#6A5A76', 60),
  ('Impostos e taxas', 'despesa', array['DAS / MEI','Tarifas bancárias','Taxas de cartão','Contador'], '#5C6477', 70),
  ('Estudos', 'despesa', array['Cursos','Livros','Eventos'], '#8A7A5A', 80),
  ('Outras despesas', 'despesa', array['Outros'], '#77694F', 190)
on conflict do nothing;

-- conta inicial
insert into public.rumeyart_fin_contas (apelido, banco, tipo, cor, ordem)
select 'Conta principal', '', 'digital', '#2566A8', 10 where not exists (select 1 from public.rumeyart_fin_contas);

-- recursos comuns
insert into public.rumeyart_recursos (nome, unidade, categoria) values
  ('Domínio .com.br', 'ano', 'Infraestrutura'),
  ('Plano de banco de dados', 'mês', 'Infraestrutura'),
  ('Assinatura de IA', 'mês', 'Ferramentas'),
  ('Celular de testes', 'un', 'Equipamentos')
on conflict do nothing;

-- modelo de contrato
insert into public.rumeyart_contrato_modelos (nome, descricao, corpo)
select 'Prestação de serviços — desenvolvimento sob medida', 'Contrato padrão para apps, sistemas, sites e jogos',
E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO Nº {{contrato.numero}}\n\nCONTRATADA: {{empresa.nome}}{{empresa.cnpj_txt}}, representada por {{empresa.responsavel}}, WhatsApp {{empresa.whatsapp}}.\nCONTRATANTE: {{cliente.nome}}{{cliente.doc_txt}}{{cliente.marca_txt}}, WhatsApp {{cliente.whatsapp}}.\n\n1. OBJETO\nDesenvolvimento de {{projeto.titulo}}, conforme a Proposta Nº {{proposta.numero}}, que faz parte deste contrato.\n\n2. ESCOPO\n{{proposta.escopo}}\n\n3. ETAPAS E PRAZO\n{{proposta.etapas}}\nPrazo estimado: {{proposta.prazo}}. O prazo corre a partir do pagamento da entrada e do envio das informações necessárias pelo CONTRATANTE.\n\n4. INVESTIMENTO E PAGAMENTO\nValor total: {{proposta.total}}.{{proposta.mensal_txt}}\nForma de pagamento:\n{{proposta.pagamento}}\n\n5. AJUSTES E NOVAS FUNCIONALIDADES\nEstão incluídos ajustes dentro do escopo por 30 dias após a entrega. Funcionalidades novas serão orçadas à parte, mediante aprovação do CONTRATANTE.\n\n6. RESPONSABILIDADES DO CONTRATANTE\nFornecer textos, imagens, acessos e informações necessárias, e validar cada etapa em até 5 dias úteis.\n\n7. PROPRIEDADE E DADOS\nApós a quitação, o código-fonte, o conteúdo e os dados produzidos pertencem ao CONTRATANTE. A CONTRATADA pode citar o projeto em seu portfólio, sem expor dados pessoais.\n\n8. CONFIDENCIALIDADE\nAs partes mantêm sigilo sobre informações do negócio uma da outra, inclusive após o término deste contrato.\n\n9. RESCISÃO\nQualquer parte pode rescindir com aviso por escrito. Os valores das etapas já entregues são devidos.\n\n10. FORO\nFica eleito o foro da comarca do CONTRATANTE para dirimir dúvidas deste contrato.\n\n{{cidade_data}}\n\n\n_______________________________\n{{empresa.nome}}\n\n\n_______________________________\n{{cliente.nome}}'
where not exists (select 1 from public.rumeyart_contrato_modelos);
