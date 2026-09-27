// Utilidades gerais do CRM
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num = v => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
export const numInput = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
export const brl = v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const brlCurto = v => { const n = Number(v) || 0; return n >= 100000 ? 'R$ ' + (n/1000).toLocaleString('pt-BR', {maximumFractionDigits: 0}) + ' mil' : 'R$ ' + n.toLocaleString('pt-BR', {maximumFractionDigits: 0}); };

// ---- datas (fuso de São Paulo) ----
const TZ = 'America/Sao_Paulo';
export const dataBR = d => d ? new Date(d).toLocaleDateString('pt-BR', {timeZone: TZ}) : '';
export const dataHoraBR = d => d ? new Date(d).toLocaleString('pt-BR', {timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'}) : '';
export const horaBR = d => d ? new Date(d).toLocaleTimeString('pt-BR', {timeZone: TZ, hour: '2-digit', minute: '2-digit'}) : '';
export const diaChave = d => new Date(d).toLocaleDateString('en-CA', {timeZone: TZ}); // AAAA-MM-DD
export const hojeChave = () => diaChave(new Date());
export const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function quando(d){
  if(!d) return '';
  const k = diaChave(d), h = hojeChave();
  if(k === h) return 'hoje, ' + horaBR(d);
  if(k === diaChave(addDias(new Date(), 1))) return 'amanhã, ' + horaBR(d);
  if(k === diaChave(addDias(new Date(), -1))) return 'ontem, ' + horaBR(d);
  return dataBR(d) + ' ' + horaBR(d);
}
export function haQuanto(d){
  if(!d) return '—';
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if(dias <= 0) return 'hoje';
  if(dias === 1) return 'ontem';
  if(dias < 30) return `há ${dias} dias`;
  const m = Math.floor(dias / 30); return m === 1 ? 'há 1 mês' : `há ${m} meses`;
}
// valor para <input type="datetime-local"> no horário de SP
export function paraInputDataHora(d){
  const x = new Date(d);
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false}).formatToParts(x);
  const g = t => p.find(i => i.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
}
// "AAAA-MM-DDTHH:MM" digitado (horário de SP, UTC-3) → ISO
export const deInputDataHora = v => v ? new Date(v + ':00-03:00').toISOString() : null;

// ---- rótulos ----
export const ETAPAS = [
  ['novo', 'Novo pedido', '#2566A8'], ['conversa', 'Conversa', '#6A5A9C'], ['prototipo', 'Protótipo', '#7A4466'],
  ['proposta', 'Proposta enviada', '#E0703A'], ['negociacao', 'Negociação', '#A8741A'], ['fechado', 'Fechado · em construção', '#2F7D55'],
  ['entregue', 'Entregue', '#1E7A7A'], ['perdido', 'Perdido', '#B3401C']
];
export const etapaNome = e => (ETAPAS.find(x => x[0] === e) || [e, e])[1];
export const etapaCor = e => (ETAPAS.find(x => x[0] === e) || [e, e, '#838A99'])[2];
export const STATUS = [
  ['rascunho', 'Rascunho'], ['enviada', 'Enviada'], ['negociacao', 'Em negociação'],
  ['aprovada', 'Aprovada'], ['recusada', 'Recusada'], ['expirada', 'Expirada']
];
export const statusNome = s => (STATUS.find(x => x[0] === s) || [s, s])[1];
export const TIPOS = [['pessoal','Uso pessoal'],['empresa','Empresa'],['projeto','Projeto ou coletivo'],['presente','Presente'],['outro','Outro']];
export const ORIGENS = [['site','Site'],['instagram','Instagram'],['whatsapp','WhatsApp'],['indicacao','Indicação'],['google','Google'],['cliente_antigo','Cliente antigo'],['evento','Evento'],['outro','Outro']];
export const CATEGORIAS = [['app','App'],['sistema','Sistema / CRM'],['site','Site ou catálogo'],['jogo','Jogo'],['documento','Documento interativo'],['manutencao','Manutenção'],['hospedagem','Hospedagem'],['consultoria','Consultoria'],['outro','Outro']];
export const AREAS = [['comercial','Comercial'],['desenvolvimento','Desenvolvimento'],['administrativo','Administrativo'],['financeiro','Financeiro']];
export const rot = (lista, v) => (lista.find(x => x[0] === v) || [v, v || '—'])[1];
export const opcoes = (lista, sel, extras = []) => { const L = [...lista]; [...extras, sel].forEach(v => { if(v && !L.some(x => x[0] === v)) L.push([v, v]); }); return L.map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join(''); };

// ---- dinheiro em centavos (financeiro) ----
export const centavos = v => Math.round((typeof v === 'number' ? v : num(v)) * 100);
export const deCentavos = c => (Number(c) || 0) / 100;
export const brlC = c => brl(deCentavos(c));
export const inputValor = c => c ? (deCentavos(c)).toFixed(2).replace('.', ',') : '';
// "1.234,56" ou "1234.56" digitado → número
export const valorDigitado = v => { const s = String(v ?? '').trim(); if(!s) return 0; if(/,\d{1,2}$/.test(s)) return num(s); return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0; };

// ---- meses ----
export const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
export const mesChave = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
export const mesNome = k => { const [a, m] = k.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };
export const mesLimites = k => { const [a, m] = k.split('-').map(Number); const ini = `${a}-${String(m).padStart(2, '0')}-01`; const f = new Date(a, m, 1); return [ini, `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-01`]; };
export const somaMes = (k, n) => { const [a, m] = k.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return mesChave(d); };
export const dataCurta = iso => iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit'}) : '';

// ---- contato ----
export function whatsLink(tel, texto){
  let d = String(tel || '').replace(/\D/g, '');
  if(!d) return null;
  if(d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');
}
export const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || '';
export const iniciais = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// ---- imagens (caminho relativo ao site ou URL completa) ----
export const imgUrl = p => !p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : '../' + p.replace(/^\.?\//, '');

// ---- aviso rápido ----
let tAviso;
export function aviso(msg, acaoHtml, tempo){
  $('#avisoTx').textContent = msg; $('#avisoAc').innerHTML = acaoHtml || '';
  $('#aviso').classList.add('on'); clearTimeout(tAviso);
  tAviso = setTimeout(() => $('#aviso').classList.remove('on'), tempo || (acaoHtml ? 9000 : 3500));
}
export const fecharAviso = () => $('#aviso').classList.remove('on');

// ---- janela (modal) ----
let janelaHook = null;
export const setJanelaHook = fn => { janelaHook = fn; };
export function janela({titulo, corpo, botoes = [], larga = false, aoAbrir}){
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.className = 'janela-fundo';
    fundo.innerHTML = `<div class="janela ${larga ? 'larga' : ''}" role="dialog" aria-modal="true">
      <div class="jc"><h2>${esc(titulo)}</h2><button type="button" data-x aria-label="Fechar">×</button></div>
      <div class="jb">${corpo}<div class="erro" data-erro role="alert"></div></div>
      ${botoes.length ? `<div class="jr">${botoes.map((b, i) => `<button type="button" class="btn ${b.classe || 'fantasma'}" data-b="${i}">${esc(b.texto)}</button>`).join('')}</div>` : ''}
    </div>`;
    document.body.appendChild(fundo);
    const foco = document.activeElement;
    const fechar = v => { fundo.remove(); document.removeEventListener('keydown', tecla); if(foco && foco.focus) foco.focus(); resolve(v); };
    const tecla = e => { if(e.key === 'Escape') fechar(null); };
    document.addEventListener('keydown', tecla);
    fundo.addEventListener('mousedown', e => { if(e.target === fundo) fechar(null); });
    fundo.querySelector('[data-x]').onclick = () => fechar(null);
    const jan = fundo.querySelector('.janela');
    const ctx = {
      el: jan, fechar,
      erro: m => { jan.querySelector('[data-erro]').textContent = m || ''; },
      valor: sel => { const e = jan.querySelector(sel); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; }
    };
    botoes.forEach((b, i) => {
      jan.querySelector(`[data-b="${i}"]`).onclick = async ev => {
        const bt = ev.currentTarget;
        if(!b.acao){ fechar(b.valor ?? null); return; }
        bt.disabled = true; ctx.erro('');
        try{ const r = await b.acao(ctx); if(r !== false) fechar(r === undefined ? true : r); }
        catch(e){ ctx.erro(traduzErro(e)); }
        finally{ if(document.body.contains(bt)) bt.disabled = false; }
      };
    });
    if(aoAbrir) aoAbrir(ctx);
    if(janelaHook) try{ janelaHook(jan); }catch(e){ console.warn(e); }
    setTimeout(() => { if(jan.contains(document.activeElement)) return; const f = jan.querySelector('.jb input:not([type=hidden]):not([type=checkbox]):not(.combo-inp), .jb textarea'); if(f) f.focus(); }, 30);
  });
}
export const confirmar = (titulo, texto, sim = 'Confirmar', classe = 'prim') =>
  janela({titulo, corpo: `<p style="margin:0;line-height:1.55;">${texto}</p>`, botoes: [{texto: 'Cancelar'}, {texto: sim, classe, valor: true}]}).then(v => v === true);

export function traduzErro(e){
  const m = (e && (e.message || e.error_description || e.msg)) || String(e);
  if(/cliente_nao_pode_ser_apagado/.test(m)) return 'Cliente não pode ser apagado. Use Arquivar.';
  if(/nao_pode_remover_a_si_mesmo/.test(m)) return 'Você não pode remover o seu próprio acesso.';
  if(/ultimo_acesso/.test(m)) return 'É preciso manter pelo menos uma pessoa com acesso.';
  if(/fin_|check constraint/.test(m)) return 'Confira os campos do lançamento: conta, cartão e valores precisam combinar com o tipo.';
  if(/duplicate key|unique/.test(m)) return 'Esse registro já existe.';
  if(/proposta_aprovada_nao_pode_ser_apagada/.test(m)) return 'Proposta aprovada não pode ser apagada.';
  if(/foreign key|violates foreign/.test(m)) return 'Esse registro está ligado a outros (propostas, lançamentos, histórico) e não pode ser apagado.';
  if(/Failed to fetch|NetworkError/.test(m)) return 'Sem conexão. Confira a internet e tente de novo.';
  if(/JWT|not authenticated|permission denied|row-level/.test(m)) return 'Sua sessão expirou ou você não tem permissão. Entre de novo.';
  return m;
}

// ---- CSV ----
export function csv(linhas, colunas){
  const q = v => { const s = v == null ? '' : Array.isArray(v) ? v.join(' | ') : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [colunas.map(c => q(c[1])).join(';'), ...linhas.map(l => colunas.map(c => q(typeof c[0] === 'function' ? c[0](l) : l[c[0]])).join(';'))].join('\n');
}
export function baixar(nome, conteudo, tipo = 'text/csv;charset=utf-8'){
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], {type: tipo});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export function autoAltura(el){ if(!el || el.tagName !== 'TEXTAREA' || !el.offsetParent) return; el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
export const linhas = t => String(t || '').split('\n').map(x => x.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);

// ---- lista de itens bonita (substitui um textarea "um por linha"; o textarea continua guardando o valor) ----
export function listaBonita(ta, {placeholder = 'Adicionar item…'} = {}){
  if(!ta || ta.dataset.lista) return;
  ta.dataset.lista = '1'; ta.hidden = true;
  const box = document.createElement('div'); box.className = 'lista-ed';
  ta.after(box);
  if(ta.id){ const lb = document.querySelector(`label[for="${ta.id}"]`); if(lb) lb.htmlFor = ta.id + '_novo'; }
  let itens = linhas(ta.value);
  const travada = () => ta.disabled;
  const sync = () => { ta.value = itens.join('\n'); ta.dispatchEvent(new Event('input', {bubbles: true})); };
  const desenhar = foco => {
    const tv = travada();
    box.classList.toggle('travada-l', tv);
    box.innerHTML = itens.map((t, i) => `<div class="li" data-i="${i}"><textarea rows="1" aria-label="Item ${i + 1}" ${tv ? 'disabled' : ''}>${esc(t)}</textarea>
        <button type="button" class="mv" data-m="-1" title="Subir" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="mv" data-m="1" title="Descer" aria-label="Descer" ${i === itens.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="rm" title="Remover" aria-label="Remover">✕</button></div>`).join('')
      + `<div class="li novo"><input type="text" id="${ta.id ? ta.id + '_novo' : ''}" placeholder="${esc(placeholder)}" enterkeyhint="done" ${tv ? 'disabled' : ''}><button type="button" class="ad" title="Adicionar" aria-label="Adicionar">＋</button></div>`;
    requestAnimationFrame(() => box.querySelectorAll('textarea').forEach(crescerItem));
    if(foco != null){ const alvo = foco === 'novo' ? box.querySelector('.novo input') : box.querySelector(`.li[data-i="${foco}"] textarea`); if(alvo){ alvo.focus(); if(alvo.setSelectionRange) alvo.setSelectionRange(alvo.value.length, alvo.value.length); } }
  };
  const adicionar = (focar = true) => { const n = box.querySelector('.novo input'); const v = n.value.trim(); if(!v) return; itens.push(v); sync(); desenhar(focar ? 'novo' : null); };
  const crescerItem = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
  box.addEventListener('input', e => { const li = e.target.closest('.li[data-i]'); if(!li) return; crescerItem(e.target); itens[+li.dataset.i] = e.target.value.replace(/\n/g, ' '); sync(); });
  box.addEventListener('change', e => {
    if(e.target.closest('.novo')){ adicionar(false); return; }   // digitou e saiu do campo sem apertar ＋
    const li = e.target.closest('.li[data-i]'); if(!li) return;
    if(!e.target.value.trim()){ itens.splice(+li.dataset.i, 1); sync(); desenhar(); }
  });
  box.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return; e.preventDefault();
    if(e.target.closest('.novo')) adicionar(); else box.querySelector('.novo input').focus();
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if(!b || travada()) return;
    if(b.classList.contains('ad')){ adicionar(); return; }
    const i = +b.closest('.li').dataset.i;
    if(b.classList.contains('rm')){ itens.splice(i, 1); sync(); desenhar(); return; }
    const j = i + +b.dataset.m; if(j < 0 || j >= itens.length) return;
    [itens[i], itens[j]] = [itens[j], itens[i]]; sync(); desenhar(j);
  });
  // se o valor mudar por fora (ex.: trocar de produto), redesenha
  ta.addEventListener('lista:atualizar', () => { itens = linhas(ta.value); desenhar(); });
  desenhar();
}

export const slugify =s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
