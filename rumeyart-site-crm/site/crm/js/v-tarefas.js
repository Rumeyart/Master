// Tarefas por área, agrupadas por prazo
import {q, T, tarefasAbertas} from './db.js';
import {esc, diaChave, hojeChave, addDias, dataHoraBR, aviso, AREAS, rot} from './util.js';
import {ICONES} from './icones.js';
import {listaTarefas, ligarTarefas} from './v-painel.js';
import * as forms from './forms.js';
import {ir, recarregar} from './app.js';

export async function render(el, {area}){
  const filtro = area && area !== 'administrativo' ? area : '';
  const [todas, feitas] = await Promise.all([
    tarefasAbertas(),
    q.lista(T.tarefas, '*, cliente:rumeyart_clientes(id,nome)', x => { x = x.eq('concluida', true).neq('area', 'administrativo').order('concluida_em', {ascending: false}).limit(20); return filtro ? x.eq('area', filtro) : x; })
  ]);
  const semAdm = todas.filter(t => t.area !== 'administrativo');
  const areas = [...AREAS.filter(a => a[0] !== 'administrativo'), ...[...new Set(semAdm.map(t => t.area))].filter(a => !AREAS.some(x => x[0] === a)).map(a => [a, a])];
  const abertas = semAdm.filter(t => !filtro || t.area === filtro);
  const hoje = hojeChave(), amanha = diaChave(addDias(new Date(), 1)), semana = addDias(new Date(), 7);
  const grupos = [
    ['Atrasadas', abertas.filter(t => diaChave(t.vence_em) < hoje)],
    ['Hoje', abertas.filter(t => diaChave(t.vence_em) === hoje)],
    ['Amanhã', abertas.filter(t => diaChave(t.vence_em) === amanha)],
    ['Próximos 7 dias', abertas.filter(t => diaChave(t.vence_em) > amanha && new Date(t.vence_em) <= semana)],
    ['Mais adiante', abertas.filter(t => new Date(t.vence_em) > semana)]
  ];
  const n = a => semAdm.filter(t => !a || t.area === a).length;

  el.innerHTML = `
    <div class="cab"><h1>Tarefas</h1>
      <div class="dir"><button class="btn prim" id="nova"><span class="ic">${ICONES.mais_novo}</span>Tarefa</button></div>
      <div class="sub">${abertas.length} pendentes · as administrativas ficam em <a href="#/administrativo">Administrativo</a></div></div>
    <div class="filtros"><div class="pilulas"><button type="button" data-a="" class="${!filtro ? 'on' : ''}">Todas</button>${areas.map(([k, t]) => `<button type="button" data-a="${esc(k)}" class="${k === filtro ? 'on' : ''}">${esc(t)}${n(k) ? ' · ' + n(k) : ''}</button>`).join('')}</div></div>
    <div class="card limpo col-unica">${grupos.filter(g => g[1].length).map(([t, l]) => `<div class="grupo-t"><h4>${t} · ${l.length}</h4>${listaTarefas(l, hoje)}</div>`).join('') || '<div class="vazio">Nenhuma tarefa pendente aqui.</div>'}</div>
    ${feitas.length ? `<details class="mais-itens col-unica"><summary>Concluídas recentemente · ${feitas.length}</summary><div class="card limpo">${feitas.map(t => `<div class="tarefa feita"><input type="checkbox" checked disabled aria-label="Concluída"><div class="tx"><b>${esc(t.titulo)}</b><span class="meta"><span class="pill">✓ ${dataHoraBR(t.concluida_em)}</span>${t.cliente?.nome ? `<a href="#/cliente/${t.cliente_id}">${esc(t.cliente.nome)}</a>` : ''}</span></div></div>`).join('')}</div></details>` : ''}`;
  ligarTarefas(el);
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ir('tarefas' + (b.dataset.a ? '?area=' + encodeURIComponent(b.dataset.a) : '')));
  el.querySelector('#nova').onclick = async () => { if(await forms.tarefa({area: filtro || undefined})){ aviso('Tarefa criada.'); recarregar(); } };
}
