// Funil (kanban): arrastar entre etapas
import {oportunidades, tarefasAbertas} from './db.js';
import {esc, brl, brlCurto, ETAPAS, etapaNome, haQuanto, quando, hojeChave, diaChave, aviso, traduzErro, janela, dataBR} from './util.js';
import {ICONES} from './icones.js';
import * as forms from './forms.js';
import {ir, recarregar} from './app.js';

export async function render(el, {mostrar}){
  const [ops, tarefas] = await Promise.all([oportunidades(), tarefasAbertas()]);
  const prox = {}; tarefas.forEach(t => { if(t.oportunidade_id && !prox[t.oportunidade_id]) prox[t.oportunidade_id] = t; });
  const todas = mostrar === 'todas';
  const limite = new Date(Date.now() - 60 * 86400000);
  const visiveis = ops.filter(o => todas || !['entregue', 'perdido'].includes(o.etapa) || new Date(o.atualizado_em) > limite);
  const abertas = ops.filter(o => !['fechado', 'entregue', 'perdido'].includes(o.etapa));
  const hoje = hojeChave();

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Comercial</div><h1>Funil</h1>
      <div class="dir">
        <input type="search" id="fBusca" placeholder="Filtrar cliente ou projeto" style="width:15rem;border-radius:999px;">
        <button class="btn prim" id="novaOp"><span class="ic">${ICONES.mais_novo}</span>Oportunidade</button></div>
      <div class="sub">${abertas.length} em aberto · ${brl(abertas.reduce((s, o) => s + Number(o.valor || 0), 0))} em potencial. Arraste o cartão para mudar de etapa${'ontouchstart' in window ? ' (ou toque em ⇄)' : ''}. ${todas ? '<a href="#/funil">Mostrar só recentes</a>' : 'Entregues e perdidos: últimos 60 dias · <a href="#/funil?mostrar=todas">ver todos</a>'}</div></div>
    <div class="kanban" id="kanban">${ETAPAS.map(([k, n, c]) => {
      const l = visiveis.filter(o => o.etapa === k);
      return `<div class="coluna" data-etapa="${k}" style="--c:${c}"><div class="ch"><div class="t">${n}<span class="q">${l.length}</span></div><div class="s">${brlCurto(l.reduce((s, o) => s + Number(o.valor || 0), 0))}</div></div>
        <div class="cards">${l.map(o => cartao(o, prox[o.id], hoje)).join('')}</div></div>`;
    }).join('')}</div>`;

  el.querySelector('#novaOp').onclick = async () => { const o = await forms.oportunidade({}); if(o){ aviso('Oportunidade criada.'); recarregar(); } };
  el.querySelector('#fBusca').oninput = e => {
    const t = e.target.value.trim().toLowerCase();
    el.querySelectorAll('.cartao').forEach(c => c.classList.toggle('hidden', t && !c.dataset.busca.includes(t)));
  };

  const mover = async (id, etapa) => {
    const op = ops.find(o => o.id === id); if(!op || op.etapa === etapa) return;
    try{
      const r = await forms.moverEtapa(op, etapa);
      if(r){ aviso(`${op.cliente?.nome || op.titulo} → ${etapaNome(etapa)}`); recarregar(); }
    }catch(e){ aviso(traduzErro(e)); }
  };

  let arrastando = null;
  el.querySelectorAll('.cartao').forEach(c => {
    c.addEventListener('dragstart', e => { arrastando = c.dataset.id; c.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.dataset.id); });
    c.addEventListener('dragend', () => { c.classList.remove('arrastando'); el.querySelectorAll('.coluna').forEach(x => x.classList.remove('alvo')); });
    c.addEventListener('click', e => { if(e.target.closest('.mv')) return; ir('cliente/' + c.dataset.cli + '?op=' + c.dataset.id); });
  });
  el.querySelectorAll('.coluna').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('alvo'); });
    col.addEventListener('dragleave', e => { if(!col.contains(e.relatedTarget)) col.classList.remove('alvo'); });
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('alvo'); const id = e.dataTransfer.getData('text/plain') || arrastando; if(id) mover(id, col.dataset.etapa); });
  });
  el.querySelectorAll('.cartao .mv').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const id = b.closest('.cartao').dataset.id, op = ops.find(o => o.id === id);
    const etapa = await janela({titulo: 'Mover para…', corpo: `<p class="muted" style="margin-top:0;">${esc(op.cliente?.nome || '')} · ${esc(op.titulo)}</p><div style="display:grid;gap:.4rem;">${ETAPAS.map(([k, n, c]) => `<button type="button" class="btn ${k === op.etapa ? 'linha' : 'fantasma'}" data-e="${k}" style="justify-content:flex-start;"><span style="width:9px;height:9px;border-radius:50%;background:${c};"></span>${n}${k === op.etapa ? ' (atual)' : ''}</button>`).join('')}</div>`,
      aoAbrir: ctx => ctx.el.querySelectorAll('[data-e]').forEach(x => x.onclick = () => ctx.fechar(x.dataset.e))});
    if(etapa) mover(id, etapa);
  }));
}

function cartao(o, t, hoje){
  const acao = t ? `${esc(t.titulo)} · ${quando(t.vence_em)}` : o.proxima_acao ? esc(o.proxima_acao) : '';
  const atrasada = t && diaChave(t.vence_em) < hoje;
  return `<div class="cartao" draggable="true" data-id="${o.id}" data-cli="${o.cliente_id}" data-busca="${esc(`${o.cliente?.nome || ''} ${o.cliente?.marca || ''} ${o.titulo}`.toLowerCase())}">
    <button class="mv" type="button" title="Mover de etapa" aria-label="Mover de etapa">⇄</button>
    <div class="nm">${esc(o.cliente?.nome || '—')}</div>
    <div class="pj">${esc(o.titulo)}</div>
    ${Number(o.valor) || Number(o.mensal) ? `<div class="vl">${Number(o.valor) ? brl(o.valor) : ''}${Number(o.mensal) ? `${Number(o.valor) ? ' + ' : ''}${brl(o.mensal)}/mês` : ''}</div>` : ''}
    <div class="mt">${o.origem === 'site' ? '<span style="color:var(--laranja-2);">● veio pelo site</span>' : ''}<span>Último contato: ${haQuanto(o.ultimo_contato_em || o.atualizado_em)}</span>${acao ? `<span class="${atrasada ? 'atras' : ''}">→ ${acao}</span>` : ''}
      ${o.etapa === 'fechado' && o.entrega_prevista ? `<span>Entrega prevista: ${dataBR(o.entrega_prevista + 'T12:00:00')}</span>` : ''}
      ${o.etapa === 'perdido' && o.motivo_perda ? `<span>Motivo: ${esc(o.motivo_perda)}</span>` : ''}</div>
  </div>`;
}
