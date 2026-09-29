// Administrativo: tarefas administrativas + cofre de acessos (PIN de 4 dígitos)
import {sb, q, T} from './db.js';
import {esc, dataBR, dataHoraBR, diaChave, hojeChave, aviso, traduzErro, janela, confirmar} from './util.js';
import {ICONES} from './icones.js';
import {listaTarefas, ligarTarefas} from './v-painel.js';
import * as forms from './forms.js';
import {ir, recarregar} from './app.js';

// sessão do cofre: só na memória desta aba, nunca gravada no aparelho
let token = null, timer = null;
const MINUTOS = 5;
function tocar(){ clearTimeout(timer); timer = setTimeout(() => trancar(true), MINUTOS * 60000); }
async function trancar(auto){
  clearTimeout(timer);
  const t = token; token = null;
  if(t) sb.rpc('rumeyart_cofre_fechar', {p_token: t}).then(() => {}, () => {});
  const box = document.getElementById('cofreBox');
  if(box){ if(auto) aviso('O cofre foi trancado por inatividade.'); telaPin(box); }
}
addEventListener('hashchange', () => { if(token && !location.hash.startsWith('#/administrativo')) trancar(false); });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && token) trancar(false); });

async function rpc(nome, args){
  const {data, error} = await sb.rpc(nome, args);
  if(error){ if(/cofre_fechado/.test(error.message)){ token = null; const b = document.getElementById('cofreBox'); if(b) telaPin(b); throw new Error('O cofre foi trancado. Digite o PIN de novo.'); } throw error; }
  if(args?.p_token) tocar();
  return data;
}

export async function render(el, {aba}){
  const a = aba === 'cofre' ? 'cofre' : 'tarefas';
  el.innerHTML = `
    <div class="cab"><h1>Administrativo</h1>
      <div class="dir">${a === 'tarefas' ? `<button class="btn prim" id="nova"><span class="ic">${ICONES.mais_novo}</span>Tarefa</button>` : ''}</div></div>
    <nav class="abas"><a href="#/administrativo" class="${a === 'tarefas' ? 'on' : ''}"><span class="ic">${ICONES.tarefas}</span>Tarefas administrativas</a>
      <a href="#/administrativo?aba=cofre" class="${a === 'cofre' ? 'on' : ''}"><span class="ic">${ICONES.cofre}</span>Cofre</a></nav>
    <div id="admCorpo"></div>`;
  const corpo = el.querySelector('#admCorpo');
  if(a === 'tarefas'){
    el.querySelector('#nova').onclick = async () => { if(await forms.tarefa({area: 'administrativo'})){ aviso('Tarefa criada.'); recarregar(); } };
    await tarefasAdm(corpo);
  } else {
    corpo.innerHTML = '<div id="cofreBox"></div>';
    const box = corpo.querySelector('#cofreBox');
    if(token) await listaCofre(box); else await telaPin(box);
  }
}

// ---------------- tarefas administrativas ----------------
async function tarefasAdm(el){
  const [abertas, feitas] = await Promise.all([
    q.lista(T.tarefas, '*, cliente:rumeyart_clientes(id,nome,whatsapp), oportunidade:rumeyart_oportunidades(id,titulo)', x => x.eq('area', 'administrativo').eq('concluida', false).order('vence_em')),
    q.lista(T.tarefas, 'id,titulo,concluida_em', x => x.eq('area', 'administrativo').eq('concluida', true).order('concluida_em', {ascending: false}).limit(15))
  ]);
  const hoje = hojeChave();
  const grupos = [['Atrasadas', abertas.filter(t => diaChave(t.vence_em) < hoje)], ['Hoje', abertas.filter(t => diaChave(t.vence_em) === hoje)], ['Próximas', abertas.filter(t => diaChave(t.vence_em) > hoje)]];
  el.innerHTML = `<div class="card limpo">
      ${grupos.filter(g => g[1].length).map(([n, l]) => `<div class="grupo-t"><h4>${n} · ${l.length}</h4>${listaTarefas(l, hoje)}</div>`).join('')
        || '<div class="vazio">Nenhuma tarefa administrativa pendente. Contas a pagar, documentos, renovações de domínio: anote aqui e o CRM avisa na hora.</div>'}
    </div>
    ${feitas.length ? `<details class="mais-itens"><summary>Concluídas recentemente · ${feitas.length}</summary><div class="card limpo">${feitas.map(t => `<div class="tarefa feita"><input type="checkbox" checked disabled aria-label="Concluída"><div class="tx"><b>${esc(t.titulo)}</b><span class="meta"><span class="pill">✓ ${dataHoraBR(t.concluida_em)}</span></span></div></div>`).join('')}</div></details>` : ''}`;
  ligarTarefas(el);
}

// ---------------- cofre: PIN ----------------
function caixasPin(onCompleto){
  const html = `<div class="pin" role="group" aria-label="PIN de 4 dígitos">${[0, 1, 2, 3].map(i => `<input type="password" inputmode="numeric" autocomplete="off" maxlength="1" pattern="[0-9]*" aria-label="Dígito ${i + 1}" data-p="${i}">`).join('')}</div>`;
  const ligar = raiz => {
    const cs = [...raiz.querySelectorAll('.pin input')];
    const valor = () => cs.map(c => c.value).join('');
    const limpar = () => { cs.forEach(c => { c.value = ''; }); cs[0].focus(); };
    cs.forEach((c, i) => {
      c.addEventListener('input', () => {
        c.value = c.value.replace(/\D/g, '').slice(-1);
        if(c.value && i < 3) cs[i + 1].focus();
        if(valor().length === 4) onCompleto(valor(), limpar);
      });
      c.addEventListener('keydown', e => { if(e.key === 'Backspace' && !c.value && i > 0){ cs[i - 1].focus(); cs[i - 1].value = ''; } });
      c.addEventListener('paste', e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4); if(t.length){ e.preventDefault(); cs.forEach((x, j) => { x.value = t[j] || ''; }); if(t.length === 4) onCompleto(t, limpar); else cs[t.length].focus(); } });
    });
    setTimeout(() => cs[0].focus(), 60);
    return {limpar};
  };
  return {html, ligar};
}

async function telaPin(box){
  let est;
  try{ est = await rpc('rumeyart_cofre_estado'); }
  catch(e){ box.innerHTML = `<div class="card"><div class="vazio">${esc(traduzErro(e))}</div></div>`; return; }
  const criar = !est.tem_pin;
  let primeiro = null;
  const msg = t => { const m = box.querySelector('#pinMsg'); m.textContent = t || ''; };
  const {html, ligar} = caixasPin(async (pin, limpar) => {
    if(criar){
      if(!primeiro){ primeiro = pin; box.querySelector('#pinTit').textContent = 'Confirme o PIN'; msg(''); limpar(); return; }
      if(pin !== primeiro){ primeiro = null; box.querySelector('#pinTit').textContent = 'Crie um PIN de 4 dígitos'; msg('Os PINs não bateram. Comece de novo.'); limpar(); return; }
      const r = await rpc('rumeyart_cofre_definir_pin', {p_novo: pin});
      if(r.ok){ token = r.token; tocar(); aviso('PIN criado. Guarde bem: ele não fica salvo em lugar nenhum além do banco, cifrado.'); listaCofre(box); } else { msg('Não foi possível criar o PIN.'); limpar(); }
      return;
    }
    box.querySelector('.cofre-porta').classList.add('abrindo');
    const r = await rpc('rumeyart_cofre_abrir', {p_pin: pin}).catch(e => ({ok: false, erro: traduzErro(e)}));
    box.querySelector('.cofre-porta')?.classList.remove('abrindo');
    if(r.ok){ token = r.token; tocar(); listaCofre(box); return; }
    box.querySelector('.cofre-porta').classList.add('errou'); setTimeout(() => box.querySelector('.cofre-porta')?.classList.remove('errou'), 500);
    if(r.erro === 'bloqueado') msg(`Muitas tentativas. O cofre libera às ${new Date(r.bloqueado_ate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.`);
    else if(r.erro === 'pin_incorreto') msg(`PIN incorreto. ${r.restam === 1 ? 'Resta 1 tentativa' : `Restam ${r.restam} tentativas`} antes de bloquear por 15 minutos.`);
    else msg(r.erro || 'Não foi possível abrir.');
    limpar();
  });
  box.innerHTML = `<div class="cofre-porta">
      <div class="cofre-ic">${ICONES.cadeado}</div>
      <h2 id="pinTit">${criar ? 'Crie um PIN de 4 dígitos' : 'Cofre trancado'}</h2>
      <p class="muted">${criar ? 'Ele protege os logins e senhas dos projetos. Você vai digitar duas vezes para confirmar.' : 'Digite o PIN para ver os acessos dos projetos.'}</p>
      ${html}
      <div class="msg" id="pinMsg" role="alert">${est.bloqueado_ate ? `Muitas tentativas. O cofre libera às ${new Date(est.bloqueado_ate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.` : ''}</div>
      <div class="cofre-nota">${ICONES.chave}<span>Logins e senhas ficam cifrados no banco. O cofre tranca sozinho depois de ${MINUTOS} minutos parado ou quando você sai desta tela.</span></div>
    </div>`;
  ligar(box);
}

// ---------------- cofre: lista ----------------
const PLATAFORMAS = ['Supabase', 'GitHub', 'Cloudflare', 'Google', 'Gmail', 'Vercel', 'Netlify', 'Registro.br', 'Hostinger', 'Instagram', 'Meta Business', 'Mercado Pago', 'Stripe', 'Apple', 'Play Console', 'OpenAI', 'Anthropic'];

// endereço de entrada de cada plataforma conhecida; se a Plataforma já for um link, ele é usado direto
const ENTRADAS = {supabase: 'https://supabase.com/dashboard', github: 'https://github.com/login', cloudflare: 'https://dash.cloudflare.com/login',
  google: 'https://accounts.google.com', gmail: 'https://mail.google.com', vercel: 'https://vercel.com/login', netlify: 'https://app.netlify.com',
  'registro.br': 'https://registro.br', hostinger: 'https://hpanel.hostinger.com', instagram: 'https://www.instagram.com/accounts/login/',
  'meta business': 'https://business.facebook.com', 'mercado pago': 'https://www.mercadopago.com.br', stripe: 'https://dashboard.stripe.com/login',
  apple: 'https://appleid.apple.com', 'play console': 'https://play.google.com/console', openai: 'https://platform.openai.com/login', anthropic: 'https://console.anthropic.com'};
export function linkDaPlataforma(p){
  const t = String(p || '').trim(); if(!t) return null;
  if(/^https?:\/\//i.test(t)) return t;
  if(ENTRADAS[t.toLowerCase()]) return ENTRADAS[t.toLowerCase()];
  if(/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return 'https://' + t;
  return null;
}
const nomePlataforma = p => { const t = String(p || '').trim(); if(!/^https?:\/\//i.test(t)) return t; try{ const u = new URL(t); return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : ''); }catch(e){ return t; } };

// "Usar": copia o login, abre a plataforma numa aba nova e deixa a senha pronta para copiar por 60 segundos.
// O navegador não deixa uma página preencher o formulário de outro site; por isso o preenchimento é por colar.
let passe = null;
function fecharPasse(){ if(!passe) return; clearInterval(passe.t); passe.el.remove(); passe = null; }
async function usarAcesso(i){
  const url = linkDaPlataforma(i.plataforma);
  if(!url){ aviso('Cadastre o link de entrada no campo Plataforma (ex.: https://…).'); return; }
  let senha = '';
  try{
    if(i.login) await navigator.clipboard.writeText(i.login).catch(() => {});
    if(i.tem_senha) senha = await rpc('rumeyart_cofre_revelar', {p_token: token, p_id: i.id}) || '';
  }catch(e){ aviso(traduzErro(e)); return; }
  window.open(url, '_blank', 'noopener');
  fecharPasse();
  const el = document.createElement('div');
  el.className = 'passe'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Acesso em uso');
  el.innerHTML = `<div class="passe-tx"><b>${esc(i.projeto)}</b><span>${i.login ? 'Login copiado. Cole no site e volte aqui para a senha.' : 'Site aberto.'}</span></div>
    <div class="passe-ac">${i.login ? `<button type="button" class="btn fantasma peq" data-p="login">Copiar login</button>` : ''}${senha ? `<button type="button" class="btn prim peq" data-p="senha">Copiar senha <span class="passe-s">60</span></button>` : ''}
    <button type="button" class="mini" data-p="x" aria-label="Fechar">×</button></div>`;
  document.body.appendChild(el);
  let resta = 60;
  passe = {el, t: setInterval(() => { resta--; const c = el.querySelector('.passe-s'); if(c) c.textContent = resta; if(resta <= 0){ senha = ''; fecharPasse(); } }, 1000)};
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if(!b) return;
    if(b.dataset.p === 'x'){ senha = ''; fecharPasse(); return; }
    try{ await navigator.clipboard.writeText(b.dataset.p === 'senha' ? senha : i.login); aviso(b.dataset.p === 'senha' ? 'Senha copiada. Cole no site.' : 'Login copiado.'); }
    catch(err){ aviso('Não foi possível copiar neste navegador.'); }
    if(b.dataset.p === 'senha'){ senha = ''; setTimeout(fecharPasse, 1500); }
  });
}

async function listaCofre(box){
  let itens;
  try{ itens = await rpc('rumeyart_cofre_listar', {p_token: token}); }catch(e){ aviso(traduzErro(e)); return; }
  const projetos = [...new Set(itens.map(i => i.projeto))];
  box.innerHTML = `
    <div class="cofre-barra">
      <div class="busca-local">${ICONES.busca}<input type="search" id="cBusca" placeholder="Buscar projeto, plataforma ou login"></div>
      <button class="btn prim" id="cNovo"><span class="ic">${ICONES.mais_novo}</span>Acesso</button>
      <button class="btn fantasma" id="cTrancar" title="Trancar o cofre"><span class="ic">${ICONES.cadeado}</span>Trancar</button>
    </div>
    ${itens.length ? `<div class="card limpo cofre-lista"><table class="tabela"><thead><tr><th>Projeto</th><th>Plataforma</th><th>Login</th><th>Senha</th><th>Alterado em</th><th></th></tr></thead><tbody>
      ${itens.map(i => `<tr data-id="${i.id}" data-busca="${esc(`${i.projeto} ${i.plataforma || ''} ${i.login || ''}`.toLowerCase())}">
        <td data-l=""><div class="nm">${esc(i.projeto)}</div></td>
        <td data-l="Plataforma">${i.plataforma ? `<span class="pill" title="${esc(i.plataforma)}">${esc(nomePlataforma(i.plataforma))}</span>` : '<span class="muted">—</span>'}</td>
        <td data-l="Login">${i.login ? `<span class="segredo"><span class="val">${esc(i.login)}</span><button type="button" class="mini" data-copiar-login="${i.id}" title="Copiar login" aria-label="Copiar login">${ICONES.copiar}</button></span>` : '<span class="muted">—</span>'}</td>
        <td data-l="Senha">${i.tem_senha ? `<span class="segredo"><span class="val senha" data-senha="${i.id}">••••••••</span><button type="button" class="mini" data-ver="${i.id}" title="Mostrar senha" aria-label="Mostrar senha">${ICONES.olho}</button><button type="button" class="mini" data-copiar="${i.id}" title="Copiar senha" aria-label="Copiar senha">${ICONES.copiar}</button></span>` : '<span class="muted">—</span>'}</td>
        <td data-l="Alterado em" class="sm" title="${esc(i.atualizado_por || '')}">${dataBR(i.atualizado_em)}</td>
        <td data-l=""><div class="cofre-ac">${linkDaPlataforma(i.plataforma) ? `<button type="button" class="btn azul peq" data-usar="${i.id}" title="Abrir ${esc(nomePlataforma(i.plataforma))} com o login copiado">Usar</button>` : ''}<button type="button" class="btn fantasma peq" data-editar="${i.id}">Editar</button></div></td></tr>`).join('')}
    </tbody></table></div>` : `<div class="vazio" style="padding:2.4rem 1rem;">O cofre está vazio. Guarde aqui os acessos de cada projeto: banco de dados, hospedagem, domínio, e-mails.</div>`}
    <p class="muted cofre-rodape">Tranca sozinho em ${MINUTOS} minutos sem uso · <button type="button" class="link" id="cPin">Trocar PIN</button></p>`;

  const $ = s => box.querySelector(s);
  $('#cTrancar').onclick = () => trancar(false);
  $('#cBusca')?.addEventListener('input', e => { const t = e.target.value.trim().toLowerCase(); box.querySelectorAll('tr[data-id]').forEach(r => r.classList.toggle('hidden', t && !r.dataset.busca.includes(t))); });
  $('#cNovo').onclick = async () => { if(await editar(null, projetos)){ aviso('Acesso guardado.'); listaCofre(box); } };
  $('#cPin').onclick = () => trocarPin();
  box.querySelectorAll('[data-editar]').forEach(b => b.onclick = async () => { const r = await editar(itens.find(i => i.id === b.dataset.editar), projetos); if(r){ aviso(r === 'apagado' ? 'Acesso apagado.' : 'Acesso atualizado.'); listaCofre(box); } });
  const copiar = async (txt, oque) => { try{ await navigator.clipboard.writeText(txt); aviso(`${oque} copiado.`); }catch(e){ aviso('Não foi possível copiar neste navegador.'); } };
  box.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => usarAcesso(itens.find(i => i.id === b.dataset.usar)));
  box.querySelectorAll('[data-copiar-login]').forEach(b => b.onclick = () => copiar(itens.find(i => i.id === b.dataset.copiarLogin).login, 'Login'));
  box.querySelectorAll('[data-copiar]').forEach(b => b.onclick = async () => { try{ copiar(await rpc('rumeyart_cofre_revelar', {p_token: token, p_id: b.dataset.copiar}) || '', 'Senha'); }catch(e){ aviso(traduzErro(e)); } });
  box.querySelectorAll('[data-ver]').forEach(b => b.onclick = async () => {
    const alvo = box.querySelector(`[data-senha="${b.dataset.ver}"]`);
    if(alvo.dataset.aberta){ alvo.textContent = '••••••••'; delete alvo.dataset.aberta; b.innerHTML = ICONES.olho; return; }
    try{
      alvo.textContent = await rpc('rumeyart_cofre_revelar', {p_token: token, p_id: b.dataset.ver}) || '';
      alvo.dataset.aberta = '1'; b.innerHTML = ICONES.olho_fechado;
      setTimeout(() => { if(alvo.isConnected && alvo.dataset.aberta){ alvo.textContent = '••••••••'; delete alvo.dataset.aberta; b.innerHTML = ICONES.olho; } }, 20000);
    }catch(e){ aviso(traduzErro(e)); }
  });
}

function gerarSenha(n = 16){
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
  const a = crypto.getRandomValues(new Uint32Array(n));
  return [...a].map(x => c[x % c.length]).join('');
}

async function editar(item, projetos){
  let ops = [];
  try{ ops = (await q.lista(T.oport, 'titulo', x => x.eq('arquivado', false).limit(200))).map(o => o.titulo); }catch(e){}
  const sugProj = [...new Set([...projetos, 'Rumëyart Criação', ...ops])];
  return janela({titulo: item ? 'Editar acesso' : 'Novo acesso', corpo: `
    <div class="campo"><label class="rot" for="v_proj">Nome do projeto *</label><input type="text" id="v_proj" list="v_projs" value="${esc(item?.projeto)}" maxlength="120" autocomplete="off"><datalist id="v_projs">${sugProj.map(p => `<option value="${esc(p)}">`).join('')}</datalist></div>
    <div class="campo"><label class="rot" for="v_plat">Plataforma</label><input type="text" id="v_plat" list="v_plats" value="${esc(item?.plataforma)}" placeholder="Link de entrada (https://…) ou nome: Supabase, GitHub…" autocomplete="off"><small class="muted" style="font-size:12px;">Com o link, o botão Usar abre o site já com o login copiado.</small><datalist id="v_plats">${PLATAFORMAS.map(p => `<option value="${p}">`).join('')}</datalist></div>
    <div class="campo"><label class="rot" for="v_login">Login</label><input type="text" id="v_login" value="${esc(item?.login)}" autocomplete="off" spellcheck="false" placeholder="e-mail ou usuário"></div>
    <div class="campo"><label class="rot" for="v_senha">Senha ${item?.tem_senha ? '<small>(deixe em branco para manter a atual)</small>' : ''}</label>
      <div class="senha-campo"><input type="password" id="v_senha" autocomplete="new-password" spellcheck="false">
        <button type="button" class="mini" id="v_ver" title="Mostrar" aria-label="Mostrar senha">${ICONES.olho}</button>
        <button type="button" class="btn fantasma peq" id="v_gerar">Gerar forte</button></div></div>
    ${item ? `<p class="muted" style="font-size:12.5px;margin:.8rem 0 0;">Alterado pela última vez em ${dataHoraBR(item.atualizado_em)}${item.atualizado_por ? ' · ' + esc(item.atualizado_por) : ''}.</p>` : ''}`,
    aoAbrir: ctx => {
      const s = ctx.el.querySelector('#v_senha');
      ctx.el.querySelector('#v_ver').onclick = e => { const v = s.type === 'password'; s.type = v ? 'text' : 'password'; e.currentTarget.innerHTML = v ? ICONES.olho_fechado : ICONES.olho; };
      ctx.el.querySelector('#v_gerar').onclick = () => { s.value = gerarSenha(); s.type = 'text'; ctx.el.querySelector('#v_ver').innerHTML = ICONES.olho_fechado; };
    },
    botoes: [...(item ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar acesso', `Apagar o acesso de <b>${esc(item.projeto)}</b>${item.plataforma ? ' · ' + esc(item.plataforma) : ''}? Não dá para desfazer.`, 'Apagar', 'perigo'))) return false; await rpc('rumeyart_cofre_apagar', {p_token: token, p_id: item.id}); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const proj = ctx.valor('#v_proj'); if(!proj){ ctx.erro('Informe o nome do projeto.'); return false; }
        const senha = ctx.el.querySelector('#v_senha').value;
        await rpc('rumeyart_cofre_salvar', {p_token: token, p_id: item?.id || null, p_projeto: proj, p_plataforma: ctx.valor('#v_plat'), p_login: ctx.valor('#v_login'), p_senha: item && !senha ? null : senha});
        return true;
      }}]});
}

async function trocarPin(){
  const {html: h1} = caixasPin(() => {});
  const r = await janela({titulo: 'Trocar PIN', corpo: `
    <div class="rot">PIN atual</div><div data-pin="atual">${h1}</div>
    <div class="rot" style="margin-top:1rem;">Novo PIN</div><div data-pin="novo">${h1}</div>`,
    aoAbrir: ctx => ctx.el.querySelectorAll('.pin input').forEach((c, i, all) => {
      c.addEventListener('input', () => { c.value = c.value.replace(/\D/g, '').slice(-1); if(c.value && all[i + 1]) all[i + 1].focus(); });
      c.addEventListener('keydown', e => { if(e.key === 'Backspace' && !c.value && i > 0){ all[i - 1].focus(); all[i - 1].value = ''; } });
    }),
    botoes: [{texto: 'Cancelar'}, {texto: 'Trocar', classe: 'prim', acao: async ctx => {
      const ler = k => [...ctx.el.querySelectorAll(`[data-pin="${k}"] input`)].map(x => x.value).join('');
      const atual = ler('atual'), novo = ler('novo');
      if(atual.length !== 4 || novo.length !== 4){ ctx.erro('Preencha os 4 dígitos dos dois PINs.'); return false; }
      const res = await rpc('rumeyart_cofre_definir_pin', {p_novo: novo, p_atual: atual});
      if(!res.ok){ ctx.erro(res.erro === 'pin_incorreto' ? `PIN atual incorreto. Restam ${res.restam} tentativas.` : res.erro === 'bloqueado' ? 'Muitas tentativas. Tente de novo em 15 minutos.' : 'Não foi possível trocar o PIN.'); return false; }
      token = res.token; tocar(); return true;
    }}]});
  if(r) aviso('PIN trocado.');
}
