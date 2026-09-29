// App instalável + notificações no aparelho
import {sb} from './db.js';
import {aviso, traduzErro} from './util.js';

// chave pública do servidor de notificações (pode ficar no código; a privada fica só no servidor)
const VAPID = 'BEBUXKm2-pwNzd_iobbwcD_ElRz2bl7c9k-lzX9xXlx7sjaExri9I1z6QKMCDhXMpFYwpDI-TqSs1dwKYJuFNh0';

const ls = {
  get: k => { try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set: (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} }
};
const ss = {
  get: k => { try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
  set: (k, v) => { try{ sessionStorage.setItem(k, v); }catch(e){} }
};

const ua = navigator.userAgent;
export const ehIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const instalado = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
export const suportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

let convitePendente = null;   // evento beforeinstallprompt guardado
let registro = null;

// ---------- service worker ----------
export async function registrarSW(){
  if(!('serviceWorker' in navigator)) return null;
  try{
    registro = await navigator.serviceWorker.register('sw.js', {scope: './'});
    navigator.serviceWorker.addEventListener('message', ev => {
      if(ev.data?.ir){ location.href = ev.data.ir; }
      if(ev.data?.reinscrever){ garantirInscricao(true); }
    });
  }catch(e){ console.warn('SW', e); }
  return registro;
}
// espera o service worker ficar pronto (no máx. 6 s — se não registrar, segue sem ele)
const pronto = () => !('serviceWorker' in navigator) ? Promise.resolve(null)
  : Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 6000))]);

// ---------- convite de instalação ----------
window.addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault(); convitePendente = ev;
  if(document.body.dataset.convites) mostrarConvites(document.body.dataset.convites === 'logado');
});
window.addEventListener('appinstalled', () => { convitePendente = null; fecharFaixa(); aviso('App instalado ✓ Abra pelo ícone da Rumëyart.'); });

export const podeInstalar = () => !instalado() && (!!convitePendente || ehIOS);
export async function instalar(){
  if(convitePendente){
    convitePendente.prompt();
    const {outcome} = await convitePendente.userChoice.catch(() => ({}));
    convitePendente = null;
    if(outcome === 'accepted') fecharFaixa();
    return outcome === 'accepted';
  }
  if(ehIOS){ explicarIOS(); return false; }
  return false;
}

function explicarIOS(){
  faixa({ico: '📲', titulo: 'Instalar no iPhone', texto: 'No Safari, toque em <b>Compartilhar</b> <span class="ic-share" aria-hidden="true"></span> e depois em <b>Adicionar à Tela de Início</b>. Depois abra o CRM pelo ícone da Rumëyart.', botoes: [['Entendi', 'prim', () => { ss.set('conviteInstalar', 'fechado'); fecharFaixa(); }]]});
}

// ---------- faixa de convite (rodapé) ----------
function faixa({ico, titulo, texto, botoes}){
  let f = document.getElementById('convite');
  if(!f){ f = document.createElement('div'); f.id = 'convite'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-live', 'polite'); document.body.appendChild(f); }
  f.innerHTML = `<img src="icones/icone-192.png" alt="" class="cv-logo"><div class="cv-tx"><b>${ico} ${titulo}</b><span>${texto}</span></div>
    <div class="cv-bt">${botoes.map(([t, c], i) => `<button type="button" class="btn ${c} peq" data-cv="${i}">${t}</button>`).join('')}</div>
    <button type="button" class="cv-x" aria-label="Fechar">×</button>`;
  botoes.forEach(([, , fn], i) => f.querySelector(`[data-cv="${i}"]`).onclick = fn);
  f.querySelector('.cv-x').onclick = () => { const k = f.dataset.k; if(k) ss.set(k, 'fechado'); fecharFaixa(); };
  requestAnimationFrame(() => f.classList.add('on'));
  return f;
}
function fecharFaixa(){ const f = document.getElementById('convite'); if(f){ f.classList.remove('on'); setTimeout(() => f.remove(), 300); } }

// Mostra, na ordem: instalar o app → ativar notificações
export function mostrarConvites(logado = true){
  document.body.dataset.convites = logado ? 'logado' : 'login';
  if(!instalado() && ss.get('conviteInstalar') !== 'fechado'){
    if(convitePendente){
      const f = faixa({ico: '📲', titulo: 'Instale o app Rumëyart', texto: 'Abre direto pelo ícone, em tela cheia, e recebe os avisos de pedidos e tarefas.',
        botoes: [['Instalar', 'prim', () => instalar()]]});
      f.dataset.k = 'conviteInstalar'; return;
    }
    if(ehIOS){
      const f = faixa({ico: '📲', titulo: 'Instale o app Rumëyart', texto: 'No iPhone, os avisos no celular só funcionam com o app instalado na Tela de Início.',
        botoes: [['Como instalar', 'prim', explicarIOS]]});
      f.dataset.k = 'conviteInstalar'; return;
    }
  }
  if(logado && suportaPush() && Notification.permission === 'default' && ss.get('conviteNotif') !== 'fechado' && ls.get('notifRecusada') !== '1'){
    const f = faixa({ico: '🔔', titulo: 'Ativar notificações', texto: 'Receba um aviso quando chegar uma ideia pelo site, quando algo mudar no funil e na hora das tarefas.',
      botoes: [['Agora não', 'fantasma', () => { ss.set('conviteNotif', 'fechado'); fecharFaixa(); }], ['Ativar', 'prim', async () => { fecharFaixa(); await ativarNotificacoes(); }]]});
    f.dataset.k = 'conviteNotif';
  }
}

// ---------- notificações ----------
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function nomeAparelho(){
  const so = /Android/.test(ua) ? 'Android' : ehIOS ? (/iPad/.test(ua) || navigator.maxTouchPoints > 1 && !/iPhone/.test(ua) ? 'iPad' : 'iPhone') : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Aparelho';
  const nav = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return so + (nav ? ' · ' + nav : '') + (instalado() ? ' · app' : '');
}

async function assinaturaAtual(){
  const reg = await pronto(); if(!reg) return null;
  return reg.pushManager.getSubscription();
}
async function enviarInscricao(sub, proprias){
  const j = sub.toJSON();
  const {error} = await sb.rpc('rumeyart_push_inscrever', {p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh || b64u(sub.getKey('p256dh')), p_auth: j.keys.auth || b64u(sub.getKey('auth')), p_aparelho: nomeAparelho(), p_proprias: !!proprias});
  if(error) throw error;
}

// estado para a tela de Configurações
export async function estadoNotificacoes(){
  if(!suportaPush()) return {suporte: false, precisaInstalar: ehIOS && !instalado()};
  const sub = await assinaturaAtual().catch(() => null);
  let proprias = false;
  if(sub){ const {data} = await sb.from('rumeyart_push_inscricoes').select('proprias').eq('endpoint', sub.endpoint).maybeSingle(); proprias = !!data?.proprias; }
  return {suporte: true, permissao: Notification.permission, ativa: !!sub && Notification.permission === 'granted', proprias};
}

export async function ativarNotificacoes(proprias = false){
  if(!suportaPush()){
    aviso(ehIOS && !instalado() ? 'No iPhone, instale o app na Tela de Início primeiro (Compartilhar → Adicionar à Tela de Início).' : 'Este navegador não recebe notificações.', '', 7000);
    return false;
  }
  try{
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){
      if(perm === 'denied') ls.set('notifRecusada', '1');
      aviso(perm === 'denied' ? 'Notificações bloqueadas. Para liberar, ajuste nas permissões do site no navegador/celular.' : 'Notificações não ativadas.', '', 7000);
      return false;
    }
    ls.set('notifRecusada', '0');
    const reg = await pronto();
    if(!reg) throw new Error('O app ainda está carregando. Recarregue a página e tente de novo.');
    let sub = await reg.pushManager.getSubscription();
    if(!sub) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64(VAPID)});
    await enviarInscricao(sub, proprias);
    await sb.rpc('rumeyart_push_teste');
    aviso('Notificações ativadas ✓ Um aviso de teste deve chegar em instantes.');
    return true;
  }catch(e){
    console.warn(e); aviso('Não foi possível ativar: ' + traduzErro(e), '', 7000); return false;
  }
}

export async function desativarNotificacoes(){
  const sub = await assinaturaAtual().catch(() => null);
  if(sub){ await sb.rpc('rumeyart_push_cancelar', {p_endpoint: sub.endpoint}); await sub.unsubscribe().catch(() => {}); }
  aviso('Notificações desligadas neste aparelho.');
}
export async function mudarProprias(v){
  const sub = await assinaturaAtual(); if(sub) await enviarInscricao(sub, v);
}
export async function testarNotificacao(){
  const {error} = await sb.rpc('rumeyart_push_teste'); if(error) throw error;
}

// Ao entrar: se a permissão já foi dada, garante que este aparelho está inscrito para quem está logado.
export async function garantirInscricao(forcarNova){
  if(!suportaPush() || Notification.permission !== 'granted') return;
  try{
    const reg = await pronto(); if(!reg) return;
    let sub = await reg.pushManager.getSubscription();
    let proprias = false;
    if(sub && !forcarNova){ const {data} = await sb.from('rumeyart_push_inscricoes').select('proprias').eq('endpoint', sub.endpoint).maybeSingle(); proprias = !!data?.proprias; }
    if(!sub || forcarNova) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64(VAPID)});
    await enviarInscricao(sub, proprias);
  }catch(e){ console.warn('inscrição', e); }
}
