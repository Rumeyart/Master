// Listas suspensas abertas para digitação: filtra enquanto digita e, quando o item não existe,
// oferece "＋ Adicionar" (para os campos marcados com data-add="tipo").
// O <select> original continua existindo (escondido) e guarda o valor: o resto do CRM não muda nada.
import {esc, aviso, traduzErro} from './util.js';

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const CRIADORES = {};
export const registrarCriador = (tipo, fn) => { CRIADORES[tipo] = fn; };

export function combosEm(raiz){ raiz.querySelectorAll('select').forEach(combo); }

export function combo(sel){
  if(!sel || sel.dataset.combo || sel.multiple || 'fixo' in sel.dataset) return;
  sel.dataset.combo = '1';
  const podeAdd = () => !!(sel.dataset.add && CRIADORES[sel.dataset.add]);
  const wrap = document.createElement('div'); wrap.className = 'combo';
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
  sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'combo-inp'; inp.autocomplete = 'off'; inp.spellcheck = false;
  inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false');
  if(sel.id){
    inp.id = sel.id + '__c';
    const raiz = sel.closest('.janela, #vista') || document;
    const lb = raiz.querySelector(`label[for="${CSS.escape(sel.id)}"]`); if(lb) lb.htmlFor = inp.id;
  }
  const seta = document.createElement('button'); seta.type = 'button'; seta.className = 'combo-seta'; seta.tabIndex = -1; seta.setAttribute('aria-label', 'Abrir lista');
  seta.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
  const pop = document.createElement('div'); pop.className = 'combo-pop'; pop.setAttribute('role', 'listbox'); pop.hidden = true;
  wrap.append(inp, seta, pop);
  if(sel.style.width) wrap.style.width = sel.style.width;

  const opcoes = () => [...sel.options].filter(o => !o.hidden && !o.disabled && o.value !== '' && !(o.value === '__novo' && podeAdd()));
  const vazia = () => [...sel.options].find(o => o.value === '');
  const rotulo = o => o.textContent.replace(/^[＋+]\s*/, '').trim();
  let aberto = false, marcado = -1, itens = [], digitando = false;

  const sincronizar = () => {
    const o = sel.selectedOptions[0];
    if(!digitando) inp.value = o && o.value !== '' && o.value !== '__novo' ? rotulo(o) : '';
    const v = vazia();
    inp.placeholder = v ? v.textContent.replace(/^[—\-\s]+|[—\-\s]+$/g, '') || 'Escolha ou digite' : (podeAdd() ? 'Escolha ou digite um novo' : 'Escolha ou digite');
    inp.disabled = sel.disabled; seta.disabled = sel.disabled;
  };
  const desenhar = filtro => {
    const f = norm(filtro), os = opcoes();
    const lista = f ? os.filter(o => norm(rotulo(o)).includes(f)) : os;
    const exato = os.some(o => norm(rotulo(o)) === f);
    itens = lista.map(o => ({v: o.value, t: rotulo(o)}));
    const v = vazia(); if(v && !f && sel.value !== '') itens.unshift({v: '', t: v.textContent.trim(), limpar: true});
    if(f && !exato && podeAdd()) itens.push({novo: filtro.trim(), t: filtro.trim()});
    if(!f && podeAdd() && [...sel.options].some(o => o.value === '__novo')) itens.push({novo: '', t: ''});
    marcado = itens.findIndex(i => !i.limpar && !i.novo && f) ;
    if(marcado < 0 && itens.length === 1) marcado = 0;
    const realce = t => { if(!f) return esc(t); const i = norm(t).indexOf(f); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + f.length)) + '</mark>' + esc(t.slice(i + f.length)); };
    pop.innerHTML = itens.map((it, i) => it.novo !== undefined
      ? `<div class="combo-op add ${i === marcado ? 'on' : ''}" role="option" data-i="${i}"><span class="mais">＋</span><span>${it.novo ? `Adicionar “<b>${esc(it.novo)}</b>”` : 'Cadastrar novo…'}</span></div>`
      : `<div class="combo-op ${it.limpar ? 'limpar' : ''} ${it.v === sel.value && !it.limpar ? 'sel' : ''} ${i === marcado ? 'on' : ''}" role="option" data-i="${i}">${it.limpar ? esc(it.t) : realce(it.t)}</div>`).join('')
      || `<div class="combo-vazio">${f ? 'Nada encontrado' : 'Lista vazia'}${podeAdd() ? '' : ''}</div>`;
  };
  const abrir = () => { if(sel.disabled) return; aberto = true; pop.hidden = false; inp.setAttribute('aria-expanded', 'true'); wrap.classList.add('aberto'); desenhar(digitando ? inp.value : '');
    requestAnimationFrame(() => { const r = pop.getBoundingClientRect(); if(r.bottom > innerHeight - 8) pop.scrollIntoView({block: 'nearest'}); }); };
  const fechar = () => { aberto = false; pop.hidden = true; inp.setAttribute('aria-expanded', 'false'); wrap.classList.remove('aberto'); };
  const escolher = v => { digitando = false; if(sel.value !== v){ sel.value = v; sel.dispatchEvent(new Event('change', {bubbles: true})); sel.dispatchEvent(new Event('input', {bubbles: true})); } sincronizar(); fechar(); };
  const adicionar = async texto => {
    fechar(); digitando = false;
    const tipo = sel.dataset.add;
    try{
      inp.disabled = true;
      const r = await CRIADORES[tipo](texto, sel);
      inp.disabled = sel.disabled;
      if(!r){ sincronizar(); return; }
      let o = [...sel.options].find(x => x.value === String(r.value));
      if(!o){ o = new Option(r.label, r.value); const novo = [...sel.options].find(x => x.value === '__novo'); sel.insertBefore(o, novo || null); }
      escolher(String(r.value));
      if(r.aviso !== false) aviso(`“${r.label}” adicionado.`);
    }catch(e){ inp.disabled = sel.disabled; sincronizar(); aviso(traduzErro(e)); }
  };
  const confirmar = i => { const it = itens[i]; if(!it) return; if(it.novo !== undefined) adicionar(it.novo); else escolher(it.v); };

  inp.addEventListener('focus', () => { inp.select(); abrir(); });
  inp.addEventListener('click', () => { if(!aberto) abrir(); });
  inp.addEventListener('input', () => { digitando = true; if(!aberto) abrir(); desenhar(inp.value); });
  inp.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); if(!aberto) abrir(); if(!itens.length) return; marcado = (marcado + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
      pop.querySelectorAll('.combo-op').forEach((d, i) => d.classList.toggle('on', i === marcado)); pop.querySelector('.combo-op.on')?.scrollIntoView({block: 'nearest'}); }
    else if(e.key === 'Enter'){ if(aberto){ e.preventDefault(); e.stopPropagation(); if(marcado >= 0) confirmar(marcado); else if(digitando && inp.value.trim() && podeAdd()) adicionar(inp.value.trim()); } }
    else if(e.key === 'Escape'){ if(aberto){ e.stopPropagation(); digitando = false; sincronizar(); fechar(); } }
    else if(e.key === 'Tab'){ if(aberto && digitando && marcado >= 0 && itens[marcado]?.novo === undefined) confirmar(marcado); }
  });
  inp.addEventListener('blur', () => setTimeout(() => {
    if(wrap.contains(document.activeElement)) return;
    if(digitando){
      const t = norm(inp.value);
      if(!t){ const v = vazia(); if(v) escolher(''); else { digitando = false; sincronizar(); } }
      else { const o = opcoes().find(x => norm(rotulo(x)) === t); if(o) escolher(o.value); else { digitando = false; sincronizar(); } }
    }
    fechar();
  }, 160));
  pop.addEventListener('mousedown', e => e.preventDefault());
  pop.addEventListener('click', e => { const d = e.target.closest('[data-i]'); if(d) confirmar(+d.dataset.i); });
  seta.addEventListener('mousedown', e => e.preventDefault());
  seta.addEventListener('click', () => { if(aberto) fechar(); else { inp.focus(); } });
  sel.addEventListener('change', () => { if(!digitando) sincronizar(); });
  // quando o código muda o valor direto (sel.value = x), o campo visível acompanha
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', {configurable: true, get(){ return d.get.call(this); }, set(v){ d.set.call(this, v); if(!digitando) queueMicrotask(sincronizar); }});
  new MutationObserver(() => { sincronizar(); if(aberto) desenhar(digitando ? inp.value : ''); }).observe(sel, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled']});
  sincronizar();
}
