// Lista de propostas
import {propostas} from './db.js';
import {esc, brl, brlCurto, STATUS, statusNome, dataBR, haQuanto} from './util.js';
import {ICONES} from './icones.js';
import * as forms from './forms.js';
import {ir} from './app.js';

export async function render(el, {status}){
  const todas = await propostas();
  const filtro = status || 'todas';
  const abertas = todas.filter(p => ['enviada', 'negociacao'].includes(p.status));
  const aprovadas = todas.filter(p => p.status === 'aprovada');
  const decididas = todas.filter(p => ['aprovada', 'recusada', 'expirada'].includes(p.status));
  const taxa = decididas.length ? Math.round(aprovadas.length / decididas.length * 100) : null;
  const vis = todas.filter(p => filtro === 'todas' ? true : filtro === 'abertas' ? ['enviada', 'negociacao'].includes(p.status) : p.status === filtro);

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Comercial</div><h1>Propostas</h1>
      <div class="dir"><button class="btn prim" id="nova"><span class="ic">${ICONES.mais_novo}</span>Proposta</button></div>
      <div class="sub">PDF padronizado com a identidade da Rumëyart, numeração automática e cópia de cada versão enviada.</div></div>
    <div class="kpis">
      <a class="kpi" href="#/propostas?status=abertas" style="--c:var(--laranja)"><div class="k"><i></i>Em aberto</div><div class="v">${abertas.length}</div><div class="d">${brl(abertas.reduce((s, p) => s + Number(p.total), 0))}</div></a>
      <a class="kpi" href="#/propostas?status=aprovada" style="--c:var(--verde)"><div class="k"><i></i>Aprovadas</div><div class="v">${aprovadas.length}</div><div class="d">${brlCurto(aprovadas.reduce((s, p) => s + Number(p.total), 0))} no total</div></a>
      <div class="kpi" style="--c:var(--azul)"><div class="k"><i></i>Taxa de aprovação</div><div class="v">${taxa == null ? '—' : taxa + '%'}</div><div class="d">entre as já decididas</div></div>
      <a class="kpi" href="#/propostas?status=rascunho" style="--c:var(--ameixa)"><div class="k"><i></i>Rascunhos</div><div class="v">${todas.filter(p => p.status === 'rascunho').length}</div><div class="d">ainda não enviados</div></a>
    </div>
    <div class="filtros"><div class="pilulas">${[['todas', 'Todas'], ['abertas', 'Em aberto'], ...STATUS].map(([k, n]) => `<button type="button" data-s="${k}" class="${k === filtro ? 'on' : ''}">${n}</button>`).join('')}</div>
      <input type="search" id="fBusca" placeholder="Cliente, número ou projeto"></div>
    <div class="card" style="padding-top:6px;">
      ${vis.length ? `<table class="tabela"><thead><tr><th>Nº</th><th>Cliente e projeto</th><th>Status</th><th>Criada</th><th class="num">Valor</th></tr></thead><tbody>
        ${vis.map(p => `<tr class="link" data-id="${p.id}" data-busca="${esc(`${p.numero} ${p.cliente?.nome || ''} ${p.cliente?.marca || ''} ${p.titulo || ''}`.toLowerCase())}">
          <td data-l="Nº"><b style="font-family:var(--f-mono);color:var(--laranja-2);">${p.numero}</b></td>
          <td data-l=""><div class="nm">${esc(p.cliente?.nome || '—')}</div><div class="sm">${esc(p.titulo || '')}</div></td>
          <td data-l="Status"><span class="tag ${p.status}">${statusNome(p.status)}</span>${p.status === 'enviada' && p.enviada_em ? `<div class="sm">enviada ${haQuanto(p.enviada_em)}</div>` : ''}</td>
          <td data-l="Criada" class="sm">${dataBR(p.criado_em)}</td>
          <td data-l="Valor" class="num">${brl(p.total)}${Number(p.mensal) ? `<div class="sm">+ ${brl(p.mensal)}/mês</div>` : ''}</td></tr>`).join('')}
      </tbody></table>` : '<div class="vazio">Nenhuma proposta neste filtro.</div>'}
    </div>`;

  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => ir('propostas' + (b.dataset.s === 'todas' ? '' : '?status=' + b.dataset.s)));
  el.querySelector('#fBusca').oninput = e => { const t = e.target.value.trim().toLowerCase(); el.querySelectorAll('tr[data-id]').forEach(r => r.classList.toggle('hidden', t && !r.dataset.busca.includes(t))); };
  el.querySelectorAll('tr[data-id]').forEach(r => r.onclick = () => ir('proposta/' + r.dataset.id));
  el.querySelector('#nova').onclick = async () => { const p = await forms.novaProposta({}); if(p) ir('proposta/' + p.id); };
}
