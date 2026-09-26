// Pedidos do site: caixa de entrada com o briefing completo de cada ideia
import {T, q, config} from './db.js';
import {esc, dataHoraBR, haQuanto, whatsLink, primeiroNome, aviso, traduzErro, confirmar} from './util.js';
import {CAMPOS_BRIEFING} from './proposta-doc.js';
import {ICONES} from './icones.js';
import * as forms from './forms.js';
import {ir, recarregar, atualizarContador} from './app.js';

const FILTROS = [['novo', 'Novos'], ['abertos', 'Em andamento'], ['todos', 'Todos'], ['descartado', 'Descartados']];

export async function render(el, {f, id}){
  const filtro = FILTROS.some(x => x[0] === f) ? f : 'abertos';
  const [lista, cfg] = await Promise.all([
    q.lista(T.pedidos, '*, cliente:rumeyart_clientes(id,nome,whatsapp,marca), oportunidade:rumeyart_oportunidades(id,titulo,etapa)', x => x.order('criado_em', {ascending: false}).limit(300)),
    config()
  ]);
  const visiveis = lista.filter(p => filtro === 'todos' ? true : filtro === 'abertos' ? ['novo', 'lido'].includes(p.status) : p.status === filtro);
  const n = s => lista.filter(p => s === 'abertos' ? ['novo', 'lido'].includes(p.status) : s === 'todos' ? true : p.status === s).length;
  const eu = primeiroNome(cfg?.empresa?.responsavel) || 'Caio';

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Formulário do site</div><h1>Pedidos do site</h1>
      <div class="dir"><input type="search" id="fBusca" placeholder="Filtrar por nome ou palavra" style="width:15rem;border-radius:999px;"></div>
      <div class="sub">Cada ideia enviada pelo site vira um cliente, um projeto no funil e uma tarefa de resposta, com todas as respostas guardadas aqui.</div></div>
    <div class="filtros"><div class="pilulas">${FILTROS.map(([k, t]) => `<button type="button" data-f="${k}" class="${k === filtro ? 'on' : ''}">${t} · ${n(k)}</button>`).join('')}</div></div>
    <div id="lista">${visiveis.map(p => cartao(p, eu)).join('') || `<div class="vazio">${filtro === 'novo' ? 'Nenhuma ideia nova esperando resposta.' : 'Nada por aqui ainda. Quando alguém preencher o formulário do site, a ideia chega nesta caixa.'}</div>`}</div>`;

  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => ir('pedidos?f=' + b.dataset.f));
  el.querySelector('#fBusca').oninput = e => {
    const t = e.target.value.trim().toLowerCase();
    el.querySelectorAll('.pedido').forEach(c => c.classList.toggle('hidden', t && !c.textContent.toLowerCase().includes(t)));
  };

  const mudar = async (pid, status, msg) => {
    try{ await q.altera(T.pedidos, pid, {status}); if(msg) aviso(msg); atualizarContador(); recarregar(); }
    catch(e){ aviso(traduzErro(e)); }
  };
  el.querySelectorAll('.pedido').forEach(card => {
    const p = lista.find(x => x.id === card.dataset.id);
    card.querySelector('details')?.addEventListener('toggle', ev => { if(ev.target.open && p.status === 'novo'){ p.status = 'lido'; q.altera(T.pedidos, p.id, {status: 'lido'}).then(atualizarContador).catch(() => {}); card.classList.remove('novo'); card.querySelector('.st').outerHTML = '<span class="tag lido st">Lido</span>'; } });
    card.querySelector('[data-a=whats]')?.addEventListener('click', () => { if(p.status !== 'respondido') q.altera(T.pedidos, p.id, {status: 'respondido'}).then(() => { atualizarContador(); q.cria(T.hist, {cliente_id: p.cliente_id, oportunidade_id: p.oportunidade_id, tipo: 'contato', texto: `Respondeu o pedido nº ${p.numero} pelo WhatsApp.`}).catch(() => {}); }).catch(() => {}); });
    card.querySelector('[data-a=lido]')?.addEventListener('click', () => mudar(p.id, p.status === 'respondido' ? 'lido' : 'respondido', p.status === 'respondido' ? 'Pedido reaberto.' : 'Pedido marcado como respondido.'));
    card.querySelector('[data-a=desc]')?.addEventListener('click', async () => {
      if(p.status === 'descartado') return mudar(p.id, 'lido', 'Pedido recuperado.');
      if(await confirmar('Descartar pedido?', 'Ele sai da caixa de entrada, mas continua guardado em "Descartados" e na ficha do cliente.', 'Descartar', 'perigo')) mudar(p.id, 'descartado', 'Pedido descartado.');
    });
    card.querySelector('[data-a=prop]')?.addEventListener('click', async () => {
      try{ const r = await forms.novaProposta({cliente_id: p.cliente_id, oportunidade_id: p.oportunidade_id}); if(r) ir('proposta/' + r.id); }catch(e){ aviso(traduzErro(e)); }
    });
    card.querySelector('[data-a=tarefa]')?.addEventListener('click', async () => { if(await forms.tarefa({cliente_id: p.cliente_id, oportunidade_id: p.oportunidade_id})){ aviso('Tarefa criada.'); } });
  });

  if(id){ const alvo = el.querySelector(`.pedido[data-id="${CSS.escape(id)}"]`); if(alvo){ alvo.querySelector('details')?.setAttribute('open', ''); setTimeout(() => alvo.scrollIntoView({behavior: 'smooth', block: 'center'}), 60); } }
}

function cartao(p, eu){
  const r = p.respostas || {};
  const resumo = String(p.ideia).length > 80 ? String(p.ideia).slice(0, 78).replace(/\s+\S*$/, '') + '…' : p.ideia;
  const msg = `Olá, ${primeiroNome(p.nome)}! Aqui é ${eu}, da Rumëyart. Recebi a sua ideia (“${resumo}”) e quero entender melhor. Podemos marcar uma conversa rápida esta semana?`;
  const w = whatsLink(p.whatsapp, msg);
  const chips = ['para', 'tipo', 'prazo', 'invest'].map(k => r[k]).filter(Boolean);
  const stTag = p.status === 'novo' ? '<span class="tag novo st">Novo</span>' : `<span class="tag ${p.status} st">${{lido: 'Lido', respondido: 'Respondido', descartado: 'Descartado'}[p.status]}</span>`;
  return `<article class="pedido ${p.status === 'novo' ? 'novo' : ''}" data-id="${p.id}">
    <div class="n">Nº<b>${p.numero}</b></div>
    <div style="min-width:0;">
      <h3>${esc(p.nome)} ${stTag}</h3>
      <div class="muted" style="font-size:13px;margin-bottom:.5rem;">${dataHoraBR(p.criado_em)} · ${haQuanto(p.criado_em)} · ${esc(p.whatsapp)}${r.marca ? ' · ' + esc(r.marca) : ''}</div>
      <div class="ideia">“${esc(p.ideia)}”</div>
      ${chips.length ? `<div class="chips">${chips.map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>` : ''}
      <details><summary>Ver todas as respostas</summary>
        <div class="briefing" style="margin-top:.7rem;">${CAMPOS_BRIEFING.filter(([k]) => r[k]).map(([k, t]) => `<div class="bq"><div class="k">${t}</div><div class="v">${esc(r[k])}</div></div>`).join('') || '<div class="vazio">Só a ideia foi preenchida.</div>'}</div>
        ${p.oportunidade ? `<p class="muted" style="font-size:13px;margin-top:.7rem;">No funil como <a href="#/cliente/${p.cliente_id}?op=${p.oportunidade.id}">${esc(p.oportunidade.titulo)}</a>.</p>` : ''}
      </details>
    </div>
    <div class="acoes">
      ${w ? `<a class="btn verde peq" data-a="whats" target="_blank" rel="noopener" href="${w}"><span class="ic">${ICONES.whats}</span>Responder</a>` : ''}
      ${p.cliente_id ? `<a class="btn linha peq" href="#/cliente/${p.cliente_id}${p.oportunidade_id ? '?op=' + p.oportunidade_id : ''}">Abrir cliente</a>` : ''}
      ${p.cliente_id && p.oportunidade_id ? `<button class="btn fantasma peq" data-a="prop" type="button">Criar proposta</button>` : ''}
      ${p.cliente_id ? `<button class="btn fantasma peq" data-a="tarefa" type="button">Agendar retorno</button>` : ''}
      <button class="btn fantasma peq" data-a="lido" type="button">${p.status === 'respondido' ? 'Reabrir' : 'Marcar respondido'}</button>
      <button class="btn ${p.status === 'descartado' ? 'linha' : 'perigo'} peq" data-a="desc" type="button">${p.status === 'descartado' ? 'Recuperar' : 'Descartar'}</button>
    </div>
  </article>`;
}
