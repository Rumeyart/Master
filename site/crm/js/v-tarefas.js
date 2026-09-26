// Tarefas por área, agrupadas por prazo
import {q, T, tarefasAbertas} from './db.js';
import {esc, diaChave, hojeChave, addDias, dataHoraBR, aviso, AREAS, rot} from './util.js';
import {ICONES} from './icones.js';
import {listaTarefas, ligarTarefas} from './v-painel.js';
import * as forms from './forms.js';
import {ir, recarregar} from './app.js';

export async function render(el, {area}){
  const filtro = AREAS.some(a => a[0] === area) ? area : '';
  const [todas, feitas] = await Promise.all([
    tarefasAbertas(),
    q.lista(T.tarefas, '*, cliente:rumeyart_clientes(id,nome)', x => { x = x.eq('concluida', true).order('concluida_em', {ascending: false}).limit(30); return filtro ? x.eq('area', filtro) : x; })
  ]);
  const abertas = todas.filter(t => !filtro || t.area === filtro);
  const hoje = hojeChave(), amanha = diaChave(addDias(new Date(), 1)), semana = addDias(new Date(), 7);
  const grupos = [
    ['Atrasadas', abertas.filter(t => diaChave(t.vence_em) < hoje)],
    ['Hoje', abertas.filter(t => diaChave(t.vence_em) === hoje)],
    ['Amanhã', abertas.filter(t => diaChave(t.vence_em) === amanha)],
    ['Próximos 7 dias', abertas.filter(t => diaChave(t.vence_em) > amanha && new Date(t.vence_em) <= semana)],
    ['Mais adiante', abertas.filter(t => new Date(t.vence_em) > semana)]
  ];
  const n = a => todas.filter(t => !a || t.area === a).length;

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Operação</div><h1>Tarefas</h1>
      <div class="dir"><button class="btn prim" id="nova"><span class="ic">${ICONES.mais_novo}</span>Tarefa</button></div>
      <div class="sub">${abertas.length} pendentes${filtro ? ' em ' + rot(AREAS, filtro).toLowerCase() : ''}. Você recebe um aviso no celular na hora de cada uma (ative em Configurações).</div></div>
    <div class="filtros"><div class="pilulas"><button type="button" data-a="" class="${!filtro ? 'on' : ''}">Todas · ${n('')}</button>${AREAS.map(([k, t]) => `<button type="button" data-a="${k}" class="${k === filtro ? 'on' : ''}">${t} · ${n(k)}</button>`).join('')}</div></div>
    <div class="cols">
      <div class="card">${grupos.filter(g => g[1].length).map(([t, l]) => `<div class="grupo-t"><h4>${t} · ${l.length}</h4>${listaTarefas(l, hoje)}</div>`).join('') || '<div class="vazio">Nenhuma tarefa pendente aqui.</div>'}</div>
      <div class="card"><h3>Concluídas recentemente</h3>
        ${feitas.length ? feitas.map(t => `<div class="tarefa feita"><input type="checkbox" checked disabled aria-label="Concluída"><div class="tx"><b>${esc(t.titulo)}</b><span class="meta"><span class="pill">✓ ${dataHoraBR(t.concluida_em)}</span><span class="area-tag ${t.area}">${rot(AREAS, t.area)}</span>${t.cliente?.nome ? `<a href="#/cliente/${t.cliente_id}">${esc(t.cliente.nome)}</a>` : ''}</span></div></div>`).join('') : '<div class="vazio">Nada concluído ainda.</div>'}</div>
    </div>`;
  ligarTarefas(el);
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ir('tarefas' + (b.dataset.a ? '?area=' + b.dataset.a : '')));
  el.querySelector('#nova').onclick = async () => { if(await forms.tarefa({area: filtro || undefined})){ aviso('Tarefa criada.'); recarregar(); } };
}
