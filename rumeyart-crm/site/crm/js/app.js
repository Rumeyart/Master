// CRM Rumëyart — entrada: login, menus, rotas
import {sb, T, limparCache} from './db.js';
import {$, $$, esc, aviso, traduzErro, iniciais, setJanelaHook} from './util.js';
import {combosEm} from './combo.js';
import './criadores.js';
import {carregarPassos} from './passos.js';
import * as forms from './forms.js';
import {ICONES} from './icones.js';
import {iniciarAparencia} from './aparencia.js';
import * as pwa from './pwa.js';
import {contarNotificacoes} from './notif.js';

iniciarAparencia();
setJanelaHook(combosEm);
pwa.registrarSW();

// Menu organizado em três grupos
const GRUPOS = [
  ['Comercial', [['painel', 'Painel'], ['pedidos', 'Pedidos do site'], ['funil', 'Funil'], ['clientes', 'Clientes'], ['propostas', 'Propostas'], ['contratos', 'Contratos']]],
  ['Operação', [['tarefas', 'Tarefas'], ['administrativo', 'Administrativo'], ['servicos', 'Serviços'], ['compras', 'Compras']]],
  ['Gestão', [['financeiro', 'Financeiro'], ['config', 'Configurações']]]
];
const MOBILE = [['painel', 'Painel'], ['pedidos', 'Pedidos'], ['funil', 'Funil'], ['financeiro', 'Finanças']];
const CONTADOR = {pedidos: 'pedidos', tarefas: 'tarefas'};

const VISTAS = {
  painel: () => import('./v-painel.js'), pedidos: () => import('./v-pedidos.js'), funil: () => import('./v-funil.js'),
  clientes: () => import('./v-clientes.js'), cliente: () => import('./v-cliente.js'),
  propostas: () => import('./v-propostas.js'), proposta: () => import('./v-proposta.js'),
  contratos: () => import('./v-contratos.js'), contrato: () => import('./v-contrato.js'),
  tarefas: () => import('./v-tarefas.js'), administrativo: () => import('./v-admin.js'), servicos: () => import('./v-servicos.js'), compras: () => import('./v-compras.js'),
  financeiro: () => import('./v-financeiro.js'), config: () => import('./v-config.js'), busca: () => import('./v-busca.js'),
  notificacoes: () => import('./v-notificacoes.js')
};
const PAI = {cliente: 'clientes', proposta: 'propostas', contrato: 'contratos', busca: '', notificacoes: ''};

export const estado = {usuario: null};

function mostrar(tela){ ['login', 'semacesso', 'app'].forEach(id => $('#' + id).classList.toggle('hidden', id !== tela)); }

// ---------- ícones fixos ----------
$('#icBusca').outerHTML = ICONES.busca;
$('#icNovo').innerHTML = ICONES.mais_novo;
$('#icSino').innerHTML = ICONES.sino;
$('#btnSair').innerHTML = `<span style="width:18px;height:18px;display:inline-flex">${ICONES.sair}</span>`;
$('#hoje').textContent = new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'});

// ---------- login ----------
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#lg_btn'), msg = $('#lg_msg'); btn.disabled = true; msg.className = 'msg'; msg.textContent = '';
  const {error} = await sb.auth.signInWithPassword({email: $('#lg_email').value.trim(), password: $('#lg_pw').value});
  btn.disabled = false;
  if(error){ msg.textContent = /Invalid login/i.test(error.message) ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar: ' + error.message; return; }
  iniciar();
});
$('#lg_esqueci').addEventListener('click', async () => {
  const email = $('#lg_email').value.trim(), msg = $('#lg_msg');
  if(!email){ msg.className = 'msg'; msg.textContent = 'Digite seu e-mail acima e clique de novo.'; return; }
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
  msg.className = error ? 'msg' : 'msg ok';
  msg.textContent = error ? 'Não foi possível enviar: ' + error.message : 'Enviamos um link para criar uma nova senha no seu e-mail.';
});
sb.auth.onAuthStateChange(async ev => {
  if(ev === 'PASSWORD_RECOVERY'){
    const nova = await forms.novaSenha();
    if(nova){ const {error} = await sb.auth.updateUser({password: nova}); aviso(error ? 'Não foi possível trocar a senha.' : 'Senha atualizada.'); }
  }
});
document.addEventListener('click', async e => {
  if(e.target.closest('[data-sair]')){
    try{ const reg = await navigator.serviceWorker?.getRegistration(); const sub = await reg?.pushManager?.getSubscription(); if(sub) await sb.rpc('rumeyart_push_cancelar', {p_endpoint: sub.endpoint}); }catch(err){}
    await sb.auth.signOut(); limparCache(); location.hash = ''; location.reload();
  }
  if(e.target.closest('[data-fechar-mais]') || e.target.closest('#sheetMais .grade a')) fecharMais();
});

// fios em movimento na tela de login
function fiosLogin(){
  const cv = $('#fiosLogin'); if(!cv) return;
  const ctx = cv.getContext('2d'); let W, H, raf;
  const tam = () => { const r = cv.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  const cores = ['224,112,58', '122,68,102', '124,196,240', '245,239,230'];
  const L = Array.from({length: 14}, (_, i) => ({y: .08 + i * .065, a: 10 + (i % 5) * 7, f: .0018 + (i % 4) * .0006, ph: i * 1.7, sp: .00016 + (i % 3) * .00008, c: cores[i % 4], al: [.45, .3, .4, .08][i % 4]}));
  const t0 = performance.now();
  const passo = now => {
    if($('#login').classList.contains('hidden')){ cancelAnimationFrame(raf); return; }
    ctx.clearRect(0, 0, W, H); const t = now - t0;
    L.forEach(l => { ctx.beginPath(); for(let x = -10; x <= W + 10; x += 12){ const y = l.y * H + Math.sin(x * l.f + l.ph + t * l.sp) * l.a + Math.sin(x * l.f * 2.3 + t * l.sp * 1.7) * l.a * .35; x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = `rgba(${l.c},${l.al})`; ctx.lineWidth = 1; ctx.stroke(); });
    raf = requestAnimationFrame(passo);
  };
  tam(); addEventListener('resize', tam);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) passo(t0 + 1000), cancelAnimationFrame(raf); else raf = requestAnimationFrame(passo);
}

// ---------- menus ----------
const cont = k => CONTADOR[k] ? `<span class="n hidden" data-contador="${CONTADOR[k]}"></span>` : '';
function montarMenu(){
  $('#menu').innerHTML = GRUPOS.map(([g, itens]) => `<div class="grupo-menu">${g}</div>` +
    itens.map(([k, n]) => `<a href="#/${k}" data-k="${k}"><span class="ic">${ICONES[k]}</span>${n}${cont(k)}</a>`).join('')).join('');
  $('#menuMob').innerHTML = MOBILE.map(([k, n]) => `<a href="#/${k}" data-k="${k}" aria-label="${n}"><span class="ic">${ICONES[k]}</span><span>${n}</span>${cont(k)}</a>`).join('')
    + `<button type="button" id="btnMais" aria-label="Todos os menus"><span class="ic">${ICONES.mais}</span><span>Mais</span><span class="n hidden" data-contador="tarefas"></span></button>`;
  $('#maisCorpo').innerHTML = GRUPOS.map(([g, itens]) => `<div class="grupo-menu">${g}</div><div class="grade">${itens.map(([k, n]) => `<a href="#/${k}" data-k="${k}"><span class="ic">${ICONES[k]}</span>${n}</a>`).join('')}</div>`).join('')
    + `<div class="pe"><span class="av">${esc(iniciais(estado.usuario?.email || 'R'))}</span><span class="quem">${esc(estado.usuario?.email || '')}</span><button data-sair class="btn linha peq">Sair</button></div>`;
  $('#btnMais').onclick = abrirMais;
}
function abrirMais(){ $('#sheetMais').classList.add('on'); $('#sheetMais').setAttribute('aria-hidden', 'false'); }
function fecharMais(){ $('#sheetMais').classList.remove('on'); $('#sheetMais').setAttribute('aria-hidden', 'true'); }
function marcarMenu(k){
  const alvo = PAI[k] !== undefined ? PAI[k] : k;
  $$('#menu a, #menuMob a, #maisCorpo a').forEach(a => a.classList.toggle('on', a.dataset.k === alvo));
  $('#btnSino')?.classList.toggle('on', k === 'notificacoes');
  const noMob = MOBILE.some(([m]) => m === alvo);
  $('#btnMais')?.classList.toggle('on', !noMob && !!alvo);
}
export async function atualizarContador(){
  try{
    const fim = new Date(); fim.setHours(23, 59, 59, 999);
    const [t, p] = await Promise.all([
      sb.from(T.tarefas).select('id', {count: 'exact', head: true}).eq('concluida', false).lte('vence_em', fim.toISOString()),
      sb.from(T.pedidos).select('id', {count: 'exact', head: true}).eq('status', 'novo')
    ]);
    const n = {tarefas: t.count || 0, pedidos: p.count || 0};
    $$('[data-contador]').forEach(s => { const v = n[s.dataset.contador]; s.textContent = v || ''; s.classList.toggle('hidden', !v); });
  }catch(e){}
  try{
    const {total} = await contarNotificacoes(estado.usuario?.email);
    const b = $('#nSino'); b.textContent = total > 9 ? '9+' : total || ''; b.classList.toggle('hidden', !total);
    $('#btnSino').setAttribute('aria-label', total ? `Notificações: ${total} nova${total > 1 ? 's' : ''}` : 'Notificações');
  }catch(e){}
}

// ---------- rotas ----------
let rotaAtual = null;
async function rotear(){
  const h = location.hash.replace(/^#\/?/, '') || 'painel';
  const [caminho, busca] = h.split('?');
  const [k, id] = caminho.split('/');
  const params = Object.fromEntries(new URLSearchParams(busca || ''));
  const carregar = VISTAS[k] || VISTAS.painel;
  marcarMenu(VISTAS[k] ? k : 'painel');
  fecharMais();
  const vista = $('#vista');
  const token = rotaAtual = Symbol();
  vista.innerHTML = '<div class="carregando">Carregando…</div>';
  try{
    const mod = await carregar();
    if(token !== rotaAtual) return;
    await mod.render(vista, {id, ...params});
  }catch(e){
    console.error(e);
    if(token === rotaAtual) vista.innerHTML = `<div class="card"><h3>Algo deu errado</h3><p class="muted">${esc(traduzErro(e))}</p><button class="btn linha" onclick="location.reload()">Recarregar</button></div>`;
  }
  window.scrollTo(0, 0);
  atualizarContador();
}
window.addEventListener('hashchange', rotear);
export const ir = rota => { if(location.hash === '#/' + rota) rotear(); else location.hash = '#/' + rota; };
export const recarregar = () => rotear();

// ---------- busca e botão Novo ----------
$('#buscaForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#buscaTopo').value.trim(); if(v) ir('busca?q=' + encodeURIComponent(v)); });
$('#btnNovo').addEventListener('click', async () => {
  try{
    const k = await forms.escolherNovo();
    if(k === 'cliente'){ const c = await forms.cliente(); if(c) ir('cliente/' + c.id); }
    if(k === 'oportunidade'){ const o = await forms.oportunidade({}); if(o) ir('cliente/' + o.cliente_id + '?op=' + o.id); }
    if(k === 'proposta'){ const p = await forms.novaProposta({}); if(p) ir('proposta/' + p.id); }
    if(k === 'tarefa'){ if(await forms.tarefa({})){ aviso('Tarefa criada.'); recarregar(); } }
    if(k === 'nota'){ if(await forms.notaRapida()){ aviso('Anotação salva no histórico.'); recarregar(); } }
    if(k === 'receita' || k === 'despesa'){ const {lancamento} = await import('./v-financeiro.js'); if(await lancamento({tipo: k})){ aviso('Lançamento salvo.'); recarregar(); } }
    if(k === 'compra'){ const {itemCompra} = await import('./v-compras.js'); if(await itemCompra({})){ aviso('Item adicionado à lista de compras.'); recarregar(); } }
  }catch(e){ aviso(traduzErro(e)); }
});

// ---------- início ----------
async function iniciar(){
  const {data: {session}} = await sb.auth.getSession();
  if(!session){ mostrar('login'); fiosLogin(); setTimeout(() => pwa.mostrarConvites(false), 1400); return; }
  const {data: ok, error} = await sb.rpc('rumeyart_is_admin');
  if(error || !ok){ $('#sa_email').textContent = session.user.email; mostrar('semacesso'); return; }
  estado.usuario = session.user;
  $('#eu').textContent = session.user.email;
  $('#euAv').textContent = iniciais(session.user.email.split('@')[0].replace(/[._\d]+/g, ' ')) || 'R';
  await carregarPassos();
  montarMenu(); mostrar('app'); rotear();
  setInterval(atualizarContador, 120000);
  pwa.garantirInscricao();
  setTimeout(() => pwa.mostrarConvites(true), 1400);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') atualizarContador(); });
}
iniciar();
