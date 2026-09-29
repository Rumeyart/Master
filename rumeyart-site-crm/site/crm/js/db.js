// Acesso ao banco (Supabase)
export const SB_URL = 'https://uotxnchfvrgpxwimmefd.supabase.co';
export const SB_KEY = 'sb_publishable_wopZQEqU4NERsq2wqCJMXQ_hg53O5VA'; // chave pública; o acesso real é controlado pelas regras do banco
export const sb = window.supabase.createClient(SB_URL, SB_KEY, {auth: {persistSession: true, autoRefreshToken: true, storageKey: 'rumeyart-crm'}});

export const T = {
  clientes: 'rumeyart_clientes', oport: 'rumeyart_oportunidades', pedidos: 'rumeyart_pedidos', propostas: 'rumeyart_propostas', pdfs: 'rumeyart_proposta_pdfs',
  hist: 'rumeyart_historico', tarefas: 'rumeyart_tarefas', servicos: 'rumeyart_servicos', config: 'rumeyart_config', admins: 'rumeyart_admins',
  fornecedores: 'rumeyart_fornecedores', recursos: 'rumeyart_recursos', precos: 'rumeyart_precos', compras: 'rumeyart_compras',
  modelos: 'rumeyart_contrato_modelos', contratos: 'rumeyart_contratos',
  contas: 'rumeyart_fin_contas', cartoes: 'rumeyart_fin_cartoes', categorias: 'rumeyart_fin_categorias', lanc: 'rumeyart_fin_lancamentos',
  saldos: 'rumeyart_fin_saldos', faturas: 'rumeyart_fin_faturas', atividade: 'rumeyart_atividade',
  mktMarca: 'rumeyart_mkt_marca', mktAcoes: 'rumeyart_mkt_acoes', mktPosts: 'rumeyart_mkt_posts', mktCampanhas: 'rumeyart_mkt_campanhas',
  mktResultados: 'rumeyart_mkt_resultados', mktAprendizados: 'rumeyart_mkt_aprendizados'
};

function ok({data, error}){ if(error) throw error; return data; }
export const q = {
  lista: (t, sel = '*', f = x => x) => f(sb.from(t).select(sel)).then(ok),
  um: (t, id, sel = '*') => sb.from(t).select(sel).eq('id', id).maybeSingle().then(ok),
  cria: (t, row) => sb.from(t).insert(row).select().single().then(ok),
  criaVarios: (t, rows) => sb.from(t).insert(rows).select().then(ok),
  altera: (t, id, row) => sb.from(t).update(row).eq('id', id).select().single().then(ok),
  apaga: (t, id) => sb.from(t).delete().eq('id', id).then(ok),
};

// ---- cache leve (muda pouco) ----
const cache = {};
async function lembrar(k, f, forcar){ if(!cache[k] || forcar) cache[k] = await f(); return cache[k]; }
export const servicos = forcar => lembrar('servicos', () => q.lista(T.servicos, '*', x => x.order('ordem').order('nome')), forcar);
export const categorias = forcar => lembrar('categorias', () => q.lista(T.categorias, '*', x => x.order('tipo').order('ordem').order('nome')), forcar);
export const contas = forcar => lembrar('contas', () => q.lista(T.contas, '*', x => x.order('ordem').order('apelido')), forcar);
export const cartoes = forcar => lembrar('cartoes', () => q.lista(T.cartoes, '*', x => x.order('nome')), forcar);
export const fornecedores = forcar => lembrar('fornecedores', () => q.lista(T.fornecedores, '*', x => x.order('nome')), forcar);
export async function config(forcar){
  const c = await lembrar('config', () => q.um(T.config, 1), forcar);
  if(c){ c.proposta = c.proposta || {}; c.empresa = c.empresa || {}; }
  return c;
}
export const limparCache = (k) => { if(k) delete cache[k]; else Object.keys(cache).forEach(x => delete cache[x]); };

// ---- consultas usadas em várias telas ----
export const clientes = (incluirArquivados) => q.lista(T.clientes, '*', x => { x = x.order('nome'); return incluirArquivados ? x : x.eq('arquivado', false); });
export const oportunidades = () => q.lista(T.oport, '*, cliente:rumeyart_clientes(id,nome,whatsapp,marca,arquivado)', x => x.eq('arquivado', false).order('atualizado_em', {ascending: false}));
export const propostas = () => q.lista(T.propostas, 'id,numero,status,titulo,total,mensal,validade_ate,enviada_em,aprovada_em,criado_em,atualizado_em,cliente_id,oportunidade_id,cliente:rumeyart_clientes(id,nome,marca,whatsapp)', x => x.order('numero', {ascending: false}));
export const tarefasAbertas = () => q.lista(T.tarefas, '*, cliente:rumeyart_clientes(id,nome,whatsapp), oportunidade:rumeyart_oportunidades(id,titulo)', x => x.eq('concluida', false).order('vence_em'));

// busca tudo (paginando de 1000 em 1000)
export async function tudo(t, sel = '*', f = x => x){
  let out = [], de = 0;
  for(;;){ const {data, error} = await f(sb.from(t).select(sel)).range(de, de + 999); if(error) throw error; out = out.concat(data); if(data.length < 1000) break; de += 1000; }
  return out;
}

// ---- arquivos ----
export async function arquivarPdf(proposta, blob, nomeArquivo, total){
  const existentes = await q.lista(T.pdfs, 'versao', x => x.eq('proposta_id', proposta.id).order('versao', {ascending: false}).limit(1));
  const versao = (existentes[0]?.versao || 0) + 1;
  const caminho = `${proposta.numero}/v${versao}-${Date.now()}.pdf`;
  const {error} = await sb.storage.from('rumeyart-propostas').upload(caminho, blob, {contentType: 'application/pdf', upsert: false});
  if(error) throw error;
  return q.cria(T.pdfs, {proposta_id: proposta.id, versao, caminho, nome_arquivo: nomeArquivo, total});
}
export async function enviarDoc(pasta, blob, nome, tipo = 'application/pdf'){
  const caminho = `${pasta}/${Date.now()}-${nome.replace(/[^\w.\-]+/g, '_')}`;
  const {error} = await sb.storage.from('rumeyart-docs').upload(caminho, blob, {contentType: tipo, upsert: false});
  if(error) throw error;
  return caminho;
}
export async function linkArquivo(caminho, bucket = 'rumeyart-propostas'){
  const {data, error} = await sb.storage.from(bucket).createSignedUrl(caminho, 300);
  if(error) throw error; return data.signedUrl;
}
