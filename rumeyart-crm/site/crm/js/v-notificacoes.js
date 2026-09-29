// Notificações: novidades do CRM + atividade (tudo o que foi criado, alterado ou apagado)
import {q, T} from './db.js';
import {esc, diaChave, hojeChave, addDias, horaBR, dataBR, brlC, etapaNome, statusNome} from './util.js';
import {ICONES} from './icones.js';
import {NOVIDADES} from './novidades.js';
import {novidadesNaoVistas, atividadeVistaEm, marcarVisto} from './notif.js';
import {estado, atualizarContador} from './app.js';

// tabela → [nome, feminino?, plural, ícone, rota]
const TAB = {
  pedidos: ['Pedido do site', 0, 'pedidos do site', 'pedidos', () => 'pedidos'],
  contratos: ['Contrato', 0, 'contratos', 'contratos', r => r.acao !== 'apagou' ? 'contrato/' + r.registro_id : 'contratos'],
  propostas: ['Proposta', 1, 'propostas', 'propostas', r => r.acao !== 'apagou' ? 'proposta/' + r.registro_id : 'propostas'],
  oportunidades: ['Projeto', 0, 'projetos', 'funil', r => r.cliente_id && r.acao !== 'apagou' ? `cliente/${r.cliente_id}?op=${r.registro_id}` : 'funil'],
  clientes: ['Cliente', 0, 'clientes', 'clientes', r => r.acao !== 'apagou' ? 'cliente/' + r.registro_id : 'clientes'],
  tarefas: ['Tarefa', 1, 'tarefas', 'tarefas', () => 'tarefas'],
  fin_lancamentos: ['Lançamento', 0, 'lançamentos', 'financeiro', () => 'financeiro?aba=lancamentos'],
  compras: ['Item de compra', 0, 'itens de compra', 'compras', () => 'compras'],
  servicos: ['Serviço', 0, 'serviços', 'servicos', () => 'servicos'],
  contrato_modelos: ['Modelo de contrato', 0, 'modelos de contrato', 'contratos', () => 'contratos'],
  fin_contas: ['Conta', 1, 'contas', 'conta', () => 'financeiro'],
  fin_cartoes: ['Cartão', 0, 'cartões', 'cartao', () => 'financeiro'],
  fin_categorias: ['Categoria', 1, 'categorias', 'categorias', () => 'financeiro'],
  fornecedores: ['Fornecedor', 0, 'fornecedores', 'fornecedor', () => 'compras'],
  recursos: ['Recurso', 0, 'recursos', 'recurso', () => 'compras'],
  cofre: ['Acesso do cofre', 0, 'acessos do cofre', 'cofre', () => 'administrativo'],
  config: ['Configurações', 1, 'configurações', 'config', () => 'config'],
  admins: ['Acesso ao CRM', 0, 'acessos ao CRM', 'cadeado', () => 'config'],
  mkt_posts: ['Post', 0, 'posts', 'calendario', () => 'marketing?aba=calendario'],
  mkt_campanhas: ['Campanha', 1, 'campanhas', 'alvo', () => 'marketing?aba=campanhas'],
  mkt_aprendizados: ['Aprendizado', 0, 'aprendizados', 'lampada', () => 'marketing?aba=aprendizados'],
  mkt_marca: ['Marca', 1, 'marca', 'marca', () => 'marketing?aba=marca']
};
const ORDEM = Object.keys(TAB);
const CAMPOS = {titulo: 'título', vence_em: 'prazo', valor_centavos: 'valor', descricao: 'descrição', data: 'data', categoria_id: 'categoria', conta_id: 'conta',
  cartao_id: 'cartão', whatsapp: 'WhatsApp', observacoes: 'observações', dados: 'conteúdo', corpo: 'texto', area: 'área', preco_base: 'preço', total: 'total',
  valor: 'valor', proxima_acao: 'próxima ação', proxima_acao_em: 'data da próxima ação', entrega_prevista: 'entrega prevista', link_app: 'link do app',
  login_cifrado: 'login', senha_cifrada: 'senha', plataforma: 'plataforma', projeto: 'projeto', passos: 'textos dos próximos passos', proposta: 'textos da proposta',
  empresa: 'dados da empresa', papel: 'papel', quantidade: 'quantidade', prioridade: 'prioridade', precisa_ate: 'prazo', fornecedor_id: 'fornecedor', subs: 'subcategorias',
  cliente_id: 'cliente', oportunidade_id: 'projeto', validade_ate: 'validade', parcela: 'parcela', sub: 'subcategoria', limite_centavos: 'limite', entregaveis: 'entregáveis'};
const ST = {novo: 'Novo', respondido: 'Respondido', arquivado: 'Arquivado', pago: 'Pago', pendente: 'Pendente', comprar: 'A comprar', comprado: 'Comprado', cancelado: 'Cancelado'};
const TIPO_L = {receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferência', pagamento_fatura: 'Pagamento de fatura', ajuste: 'Ajuste'};

const part = (f, acao) => ({criou: f ? 'criada' : 'criado', alterou: f ? 'alterada' : 'alterado', apagou: f ? 'apagada' : 'apagado'})[acao];
const quem = (a, r) => !a ? (r.tabela === 'pedidos' && r.acao === 'criou' ? 'pelo site' : 'automático') : a === estado.usuario?.email ? 'você' : a.split('@')[0];
const nomeStatus = (tab, s) => tab === 'propostas' ? statusNome(s) : (ST[s] || (s ? s[0].toUpperCase() + s.slice(1) : '—'));

// frase principal de uma linha de atividade
function frase(r){
  const [nome, f] = TAB[r.tabela] || [r.tabela, 0], d = r.detalhe || {};
  if(r.acao === 'alterou'){
    if(d.concluida === true) return 'Tarefa concluída';
    if(d.concluida === false) return 'Tarefa reaberta';
    if(d.assinado) return 'Contrato assinado';
    if(d.etapa) return `${nome}: ${etapaNome(d.etapa.de)} → ${etapaNome(d.etapa.para)}`;
    if(d.status) return `${nome}: ${nomeStatus(r.tabela, d.status.de)} → ${nomeStatus(r.tabela, d.status.para)}`;
    if(d.arquivado !== undefined) return `${nome} ${d.arquivado ? (f ? 'arquivada' : 'arquivado') : (f ? 'reativada' : 'reativado')}`;
    const c = (d.campos || []).filter(k => !/_em$|^id$|criado|grupo_id|id_externo|numero/.test(k) || k === 'vence_em' || k === 'proxima_acao_em').map(k => CAMPOS[k] || k.replace(/_/g, ' '));
    return `${nome} ${part(f, 'alterou')}${c.length ? ': ' + [...new Set(c)].slice(0, 3).join(', ') + (c.length > 3 ? '…' : '') : ''}`;
  }
  return `${nome} ${part(f, r.acao)}`;
}
function extra(r){
  const d = r.detalhe || {};
  if(r.tabela === 'fin_lancamentos' && d.valor != null) return `${TIPO_L[d.tipo] || d.tipo || ''} ${brlC(d.valor)}${d.pago === 'pendente' ? ' · pendente' : ''}`;
  if(r.tabela === 'propostas' && d.total && r.acao === 'criou') return '';
  return '';
}

// junta o que aconteceu junto (mesma pessoa, poucos segundos): um pedido do site cria cliente, projeto e tarefa de uma vez
function agrupar(rows){
  const grupos = [];
  for(const r of rows){
    const g = grupos[grupos.length - 1];
    if(g && g.autor === r.autor && Math.abs(new Date(g.ultimo) - new Date(r.criado_em)) <= 4000){ g.itens.push(r); g.ultimo = r.criado_em; }
    else grupos.push({autor: r.autor, ultimo: r.criado_em, itens: [r]});
  }
  return grupos.map(g => {
    const tipos = new Map();
    g.itens.forEach(r => { const k = r.tabela + '|' + r.acao; tipos.set(k, (tipos.get(k) || 0) + 1); });
    if(tipos.size === 1 && g.itens.length > 1){
      const r = g.itens[0], [, f, plural] = TAB[r.tabela] || [r.tabela, 0, r.tabela];
      const soma = r.tabela === 'fin_lancamentos' ? g.itens.reduce((s, x) => s + (Number(x.detalhe?.valor) || 0) * (x.detalhe?.tipo === 'despesa' ? -1 : 1), 0) : null;
      return {r, texto: `${g.itens.length} ${plural} ${part(f, r.acao).replace(/o$/, 'os').replace(/a$/, 'as')}`, titulo: g.itens.slice(0, 3).map(x => x.titulo).filter(Boolean).join(', ') + (g.itens.length > 3 ? '…' : ''), extra: soma != null ? 'Saldo do grupo ' + brlC(soma) : '', junto: ''};
    }
    const principal = [...g.itens].sort((a, b) => ORDEM.indexOf(a.tabela) - ORDEM.indexOf(b.tabela))[0];
    const resto = g.itens.filter(x => x !== principal);
    const cont = {}; resto.forEach(x => { const n = (TAB[x.tabela] || [x.tabela])[0].toLowerCase(); cont[n] = (cont[n] || 0) + 1; });
    const junto = Object.entries(cont).map(([n, c]) => c > 1 ? `${c} × ${n}` : n).join(', ');
    return {r: principal, texto: frase(principal), titulo: principal.titulo, extra: extra(principal), junto};
  });
}

const rotuloDia = k => { const h = hojeChave(); if(k === h) return 'Hoje'; if(k === diaChave(addDias(new Date(), -1))) return 'Ontem'; const [a, m, d] = k.split('-'); return new Date(+a, +m - 1, +d).toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'}); };

let ABA = 'tudo';
export async function render(el, {aba}){
  if(aba) ABA = aba;
  const vistoEm = atividadeVistaEm(), naoVistas = new Set(novidadesNaoVistas().map(n => n.id));
  let rows = [], fim = false, carregando = false;
  const PAG = 150;
  const buscar = async () => {
    carregando = true;
    const novos = await q.lista(T.atividade, '*', x => x.order('criado_em', {ascending: false}).range(rows.length, rows.length + PAG - 1));
    rows = rows.concat(novos); fim = novos.length < PAG; carregando = false;
  };
  await buscar();

  el.innerHTML = `
    <div class="cab"><h1>Notificações</h1>
      <div class="sub">Novidades do CRM e tudo o que mudou por aqui.</div></div>
    <div class="filtros"><div class="pilulas" id="abasNotif">${[['tudo', 'Tudo'], ['novidades', 'Novidades'], ['atividade', 'Atividade']].map(([k, n]) => `<button type="button" data-aba="${k}" class="${k === ABA ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="col-unica" id="notifLista"></div>`;
  const lista = el.querySelector('#notifLista');

  const blocoNovidade = n => `<div class="nov-bloco ${n.novo ? 'nao-visto' : ''}">
      <div class="nov-cab"><span class="nov-ic">${ICONES.sino}</span><b>Novidades do CRM</b>${n.novo ? '<span class="tag-novo">novo</span>' : ''}<span class="nov-data">${dataBR(n.data + 'T12:00:00')}</span></div>
      <ul>${n.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
  const linhaAtv = g => {
    const r = g.r, [, , , ic, rota] = TAB[r.tabela] || [r.tabela, 0, '', 'nota', () => ''];
    const novo = r.criado_em > vistoEm && r.autor !== estado.usuario?.email;
    const destino = rota(r);
    return `<a class="atv ${novo ? 'nao-visto' : ''} ${r.acao === 'apagou' ? 'apagado' : ''}" href="#/${esc(destino)}">
      <span class="atv-ic">${ICONES[ic] || ICONES.nota}</span>
      <span class="atv-tx"><b>${esc(g.texto)}</b>${g.titulo ? `<span class="atv-tit">${esc(g.titulo)}</span>` : ''}
        <span class="atv-meta">${esc(quem(r.autor, r))} · ${horaBR(r.criado_em)}${g.extra ? ' · ' + esc(g.extra) : ''}${g.junto ? ' · junto: ' + esc(g.junto) : ''}</span></span>
      ${novo ? '<span class="ponto-novo" aria-label="Novo"></span>' : ''}</a>`;
  };

  const desenhar = () => {
    el.querySelectorAll('#abasNotif [data-aba]').forEach(b => b.classList.toggle('on', b.dataset.aba === ABA));
    const dias = new Map();
    const add = (k, tipo, item) => { if(!dias.has(k)) dias.set(k, {nov: [], atv: []}); dias.get(k)[tipo].push(item); };
    // entregas do mesmo dia viram um bloco só
    if(ABA !== 'atividade') NOVIDADES.forEach(n => { const d = dias.get(n.data); const ja = d?.nov[0]; if(ja){ ja.itens = [...ja.itens, ...n.itens]; ja.novo = ja.novo || naoVistas.has(n.id); } else add(n.data, 'nov', {...n, novo: naoVistas.has(n.id)}); });
    if(ABA !== 'novidades') agrupar(rows).forEach(g => add(diaChave(g.r.criado_em), 'atv', g));
    const chaves = [...dias.keys()].sort().reverse();
    // sem "ver mais", a lista de novidades antigas não deve passar da atividade carregada
    const limite = !fim && ABA === 'tudo' && rows.length ? diaChave(rows[rows.length - 1].criado_em) : null;
    const html = chaves.filter(k => !limite || k >= limite).map(k => {
      const {nov, atv} = dias.get(k);
      return `<section class="notif-dia"><h4>${esc(rotuloDia(k))}</h4>${nov.map(blocoNovidade).join('')}${atv.length ? `<div class="card limpo atv-lista">${atv.map(linhaAtv).join('')}</div>` : ''}</section>`;
    }).join('');
    const vazio = ABA === 'atividade' ? '<div class="vazio">Ainda não há atividade registrada. A partir de agora, tudo o que for criado, alterado ou apagado no CRM aparece aqui.</div>' : '<div class="vazio">Nada por aqui ainda.</div>';
    lista.innerHTML = (html || vazio) + (ABA !== 'novidades' && !fim ? '<div style="text-align:center;margin-top:1rem;"><button class="btn linha peq" id="maisAtv">Ver mais antigas</button></div>' : '');
    lista.querySelector('#maisAtv')?.addEventListener('click', async e => { if(carregando) return; e.currentTarget.disabled = true; await buscar(); desenhar(); });
  };
  el.querySelectorAll('#abasNotif [data-aba]').forEach(b => b.onclick = () => { ABA = b.dataset.aba; desenhar(); });
  desenhar();
  marcarVisto();
  atualizarContador();
}
