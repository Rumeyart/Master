// Ficha do cliente: briefing, projetos, propostas, contratos, financeiro e histórico
import {q, T} from './db.js';
import {esc, brl, brlC, ETAPAS, etapaNome, statusNome, TIPOS, ORIGENS, rot, dataBR, dataHoraBR, dataCurta, whatsLink, iniciais, primeiroNome, aviso, traduzErro, confirmar, autoAltura} from './util.js';
import {ICONES} from './icones.js';
import {CAMPOS_BRIEFING} from './proposta-doc.js';
import * as forms from './forms.js';
import {listaTarefas, ligarTarefas} from './v-painel.js';
import {ir, recarregar} from './app.js';

const ULTIMA = {};
const TIPO_HIST = {nota: 'Anotação', contato: 'Contato', etapa: 'Funil', proposta: 'Proposta', pdf: 'PDF', tarefa: 'Tarefa', site: 'Site', contrato: 'Contrato', financeiro: 'Financeiro', sistema: 'Sistema'};

export async function render(el, {id, op: opFoco, aba: abaQ}){
  const [c, ops, props, contratos, tarefas, hist, pedidos, lancs] = await Promise.all([
    q.um(T.clientes, id),
    q.lista(T.oport, '*', x => x.eq('cliente_id', id).order('criado_em', {ascending: false})),
    q.lista(T.propostas, 'id,numero,status,titulo,total,mensal,oportunidade_id,criado_em', x => x.eq('cliente_id', id).order('numero', {ascending: false})),
    q.lista(T.contratos, 'id,numero,titulo,oportunidade_id,assinado_em,criado_em', x => x.eq('cliente_id', id).order('numero', {ascending: false})),
    q.lista(T.tarefas, '*, oportunidade:rumeyart_oportunidades(id,titulo)', x => x.eq('cliente_id', id).eq('concluida', false).order('vence_em')),
    q.lista(T.hist, '*', x => x.eq('cliente_id', id).order('criado_em', {ascending: false}).limit(300)),
    q.lista(T.pedidos, '*', x => x.eq('cliente_id', id).order('criado_em', {ascending: false})),
    q.lista(T.lanc, 'id,tipo,descricao,valor_centavos,data,status,oportunidade_id', x => x.eq('cliente_id', id).order('data', {ascending: false}).limit(100))
  ]);
  if(!c){ el.innerHTML = '<div class="card"><h3>Cliente não encontrado</h3><a href="#/clientes">Voltar</a></div>'; return; }
  const w = whatsLink(c.whatsapp, `Olá, ${primeiroNome(c.nome)}! Aqui é da Rumëyart.`);
  const recebido = lancs.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor_centavos), 0);
  const aReceber = lancs.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor_centavos), 0);
  const ped = pedidos[0];

  const abas = [['projetos', 'Projetos'], ...(ped ? [['briefing', 'O que contou']] : []), ['financeiro', 'Financeiro'], ['historico', 'Histórico'], ['dados', 'Dados']];
  const pedida = abaQ || ULTIMA[id];
  const abaIni = abas.some(a => a[0] === pedida) ? pedida : 'projetos';
  el.innerHTML = `
    <div class="ficha-cab">
      <div class="fc-topo">
        <div class="av">${esc(iniciais(c.nome))}</div>
        <div class="info">
          <div class="eyebrow">${c.arquivado ? 'Cliente arquivado' : esc(rot(TIPOS, c.tipo))}</div>
          <h1>${esc(c.nome)}</h1>
          ${c.marca || c.whatsapp ? `<div class="fc-sub">${esc([c.marca, c.whatsapp].filter(Boolean).join(' · '))}</div>` : ''}
        </div>
      </div>
      <div class="acoes">
        ${w ? `<a class="btn verde" href="${w}" target="_blank" rel="noopener"><span class="ic">${ICONES.whats}</span>WhatsApp</a>` : ''}
        <button class="btn prim" data-a="proposta"><span class="ic">${ICONES.propostas}</span>Proposta</button>
        <button class="btn linha" data-a="tarefa">Tarefa</button>
      </div>
    </div>
    <nav class="abas" id="abasCli">${abas.map(([k, n]) => `<a href="#" data-aba="${k}" class="${k === abaIni ? 'on' : ''}">${n}</a>`).join('')}</nav>

    <section data-sec="projetos">
      ${ops.length ? ops.map(o => blocoOp(o, props.filter(p => p.oportunidade_id === o.id), contratos.filter(k => k.oportunidade_id === o.id), o.id === opFoco)).join('') : '<div class="vazio">Nenhum projeto. Crie um para acompanhar este cliente no funil.</div>'}
      <button class="btn linha peq" data-a="oport" style="margin-bottom:1rem;">＋ Novo projeto</button>
      <div class="card limpo"><h3>Próximas ações</h3>
        <div id="tarefas">${listaTarefas(tarefas) || '<div class="vazio">Nenhuma ação agendada. Marque o próximo passo para não esquecer deste cliente.</div>'}</div></div>
    </section>

    ${ped ? `<section data-sec="briefing"><div class="card limpo">
        <div class="briefing"><div class="bq ideia"><div class="k">A ideia · pedido nº ${ped.numero} · ${dataBR(ped.criado_em)}</div><div class="v">${esc(ped.ideia)}</div></div>
        ${CAMPOS_BRIEFING.filter(([k]) => (ped.respostas || {})[k]).map(([k, t]) => `<div class="bq"><div class="k">${t}</div><div class="v">${esc(ped.respostas[k])}</div></div>`).join('')}</div>
        ${pedidos.length > 1 ? `<p class="muted" style="font-size:13px;">Mais ${pedidos.length - 1} ${pedidos.length === 2 ? 'pedido anterior' : 'pedidos anteriores'} na <a href="#/pedidos?f=todos">caixa de entrada</a>.</p>` : ''}</div></section>` : ''}

    <section data-sec="financeiro">
      <div class="faixa-num" style="margin-bottom:1rem;"><a href="#/financeiro?aba=lancamentos&cliente=${id}"><span>Recebido</span><b class="din valor-pos">${brlC(recebido)}</b></a><a href="#/financeiro?aba=lancamentos&cliente=${id}"><span>A receber</span><b class="din">${brlC(aReceber)}</b></a></div>
      <div class="card limpo">
      ${lancs.length ? lancs.slice(0, 12).map(l => `<div class="item-lista"><span class="lanc-tipo ${l.tipo}">${ICONES[l.tipo]}</span><div class="tx"><b>${esc(l.descricao)}</b><span>${dataCurta(l.data)} · ${l.status === 'pago' ? (l.tipo === 'receita' ? 'recebido' : 'pago') : 'pendente'}</span></div><span class="vl ${l.tipo === 'receita' ? 'valor-pos' : 'valor-neg'}">${brlC(l.valor_centavos)}</span></div>`).join('')
        : '<div class="vazio">Nenhum lançamento ligado a este cliente. Ao marcar um projeto como fechado, as parcelas entram aqui.</div>'}
      <button class="btn linha peq" data-a="receita" style="margin-top:.8rem;">＋ Receita</button></div>
    </section>

    <section data-sec="historico"><div class="card limpo">
      <form class="nova-nota" id="nota">
        <textarea id="notaTx" placeholder="Registrar o que aconteceu…" rows="2"></textarea>
        <div class="l"><select id="notaTipo" aria-label="Tipo"><option value="nota">Anotação</option><option value="contato">Contato com o cliente</option></select>
          <button class="btn prim peq" type="submit">Registrar</button></div>
      </form>
      <div class="timeline">${hist.map(h => `<div class="ev ev-${h.tipo}"><div class="dt">${dataHoraBR(h.criado_em)} · ${esc(TIPO_HIST[h.tipo] || h.tipo)}</div><div class="tx">${esc(h.texto)}</div></div>`).join('') || '<div class="vazio">Sem registros.</div>'}</div>
    </div></section>

    <section data-sec="dados"><div class="card limpo">
      <div class="dados">
        ${dado('WhatsApp', c.whatsapp)}${dado('E-mail', c.email)}${dado('Cidade', [c.cidade, c.uf].filter(Boolean).join('/'))}${dado('CPF / CNPJ', c.cpf_cnpj)}
        ${dado('Marca', c.marca)}${dado('Tipo', rot(TIPOS, c.tipo))}${dado('Origem', rot(ORIGENS, c.origem))}${dado('Cliente desde', dataBR(c.criado_em))}
      </div>
      ${c.observacoes ? `<div style="margin-top:.9rem;" class="dados"><div style="grid-column:1/-1;"><div class="k">Observações</div><div class="v" style="white-space:pre-wrap;">${esc(c.observacoes)}</div></div></div>` : ''}
      <div style="margin-top:1.1rem;display:flex;gap:.5rem;flex-wrap:wrap;"><button class="btn linha peq" data-a="editar">Editar dados</button><button class="btn ${c.arquivado ? 'linha' : 'perigo'} peq" data-a="arquivar">${c.arquivado ? 'Reativar cliente' : 'Arquivar cliente'}</button></div>
    </div></section>`;

  const mostrarAba = k => { ULTIMA[id] = k; el.querySelectorAll('[data-sec]').forEach(s => s.hidden = s.dataset.sec !== k); el.querySelectorAll('#abasCli a').forEach(a => a.classList.toggle('on', a.dataset.aba === k)); };
  el.querySelectorAll('#abasCli a').forEach(a => a.onclick = e => { e.preventDefault(); mostrarAba(a.dataset.aba); });
  mostrarAba(abaIni);
  ligarTarefas(el.querySelector('#tarefas'));
  const ta = el.querySelector('#notaTx'); ta.addEventListener('input', () => autoAltura(ta));
  el.querySelector('#nota').addEventListener('submit', async e => {
    e.preventDefault(); const texto = ta.value.trim(); if(!texto) return;
    try{ await q.cria(T.hist, {cliente_id: id, tipo: el.querySelector('#notaTipo').value, texto}); aviso('Registrado no histórico.'); recarregar(); }
    catch(err){ aviso(traduzErro(err)); }
  });

  el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', async () => {
    const a = b.dataset.a;
    try{
      if(a === 'editar'){ if(await forms.cliente(c)){ aviso('Dados atualizados.'); recarregar(); } }
      if(a === 'oport'){ if(await forms.oportunidade({cliente_id: id})){ aviso('Projeto criado.'); recarregar(); } }
      if(a === 'tarefa'){ if(await forms.tarefa({cliente_id: id})){ aviso('Tarefa criada.'); recarregar(); } }
      if(a === 'proposta'){ const p = await forms.novaProposta({cliente_id: id}); if(p) ir('proposta/' + p.id); }
      if(a === 'receita'){ const {lancamento} = await import('./v-financeiro.js'); if(await lancamento({tipo: 'receita', cliente_id: id, oportunidade_id: ops[0]?.id})){ aviso('Lançamento salvo.'); recarregar(); } }
      if(a === 'arquivar'){
        if(!c.arquivado && !(await confirmar('Arquivar cliente', `${esc(c.nome)} sai das listas e do funil, mas todo o histórico continua guardado. Você pode reativar quando quiser.`, 'Arquivar', 'perigo'))) return;
        await q.altera(T.clientes, id, {arquivado: !c.arquivado});
        if(!c.arquivado) for(const o of ops.filter(o => !o.arquivado && !['fechado', 'entregue', 'perdido'].includes(o.etapa))) await q.altera(T.oport, o.id, {arquivado: true});
        else for(const o of ops.filter(o => o.arquivado)) await q.altera(T.oport, o.id, {arquivado: false});
        aviso(c.arquivado ? 'Cliente reativado.' : 'Cliente arquivado.'); recarregar();
      }
    }catch(err){ aviso(traduzErro(err)); }
  }));

  el.querySelectorAll('.oport').forEach(box => {
    const o = ops.find(x => x.id === box.dataset.id);
    box.querySelector('[data-etapa]').addEventListener('change', async e => {
      try{ const r = await forms.moverEtapa(o, e.target.value); if(r){ aviso('Etapa atualizada.'); recarregar(); } else e.target.value = o.etapa; }
      catch(err){ e.target.value = o.etapa; aviso(traduzErro(err)); }
    });
    box.querySelectorAll('[data-oa]').forEach(b => b.addEventListener('click', async () => {
      try{
        if(b.dataset.oa === 'editar'){ if(await forms.oportunidade({existente: o})){ aviso('Projeto atualizado.'); recarregar(); } }
        if(b.dataset.oa === 'proposta'){ const p = await forms.novaProposta({cliente_id: id, oportunidade_id: o.id}); if(p) ir('proposta/' + p.id); }
        if(b.dataset.oa === 'tarefa'){ if(await forms.tarefa({cliente_id: id, oportunidade_id: o.id})){ aviso('Tarefa criada.'); recarregar(); } }
        if(b.dataset.oa === 'contrato'){ const {novoContrato} = await import('./v-contratos.js'); const k = await novoContrato({cliente_id: id, oportunidade_id: o.id}); if(k) ir('contrato/' + k.id); }
      }catch(err){ aviso(traduzErro(err)); }
    }));
    box.querySelectorAll('[data-pv]').forEach(inp => inp.addEventListener('change', async () => {
      try{ await q.altera(T.oport, o.id, {[inp.dataset.pv]: inp.value || null}); aviso('Projeto atualizado.'); }catch(err){ aviso(traduzErro(err)); }
    }));
  });
  if(opFoco){ const f = el.querySelector(`.oport[data-id="${CSS.escape(opFoco)}"]`); if(f) setTimeout(() => f.scrollIntoView({block: 'center', behavior: 'smooth'}), 150); }
}

const dado = (k, v) => `<div><div class="k">${k}</div><div class="v">${v ? esc(v) : '<span class="muted">—</span>'}</div></div>`;

function blocoOp(o, props, contratos, foco){
  const valor = [Number(o.valor) ? brl(o.valor) : '', Number(o.mensal) ? brl(o.mensal) + '/mês' : ''].filter(Boolean).join(' + ');
  const posVenda = ['fechado', 'entregue'].includes(o.etapa);
  return `<div class="oport" data-id="${o.id}" style="${foco ? 'border-color:var(--laranja);box-shadow:0 0 0 3px var(--laranja-suave);' : ''}">
    <div class="l1"><b>${esc(o.titulo)}</b>${o.origem === 'site' ? '<span class="pill">site</span>' : ''}${valor ? `<span class="vl">${valor}</span>` : ''}</div>
    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.55rem;">
      <select data-etapa aria-label="Etapa" style="width:auto;">${ETAPAS.map(([k, n]) => `<option value="${k}" ${k === o.etapa ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${o.proxima_acao ? `<span class="muted" style="font-size:13px;">→ ${esc(o.proxima_acao)}</span>` : ''}
      ${o.etapa === 'perdido' && o.motivo_perda ? `<span class="muted" style="font-size:13px;">Motivo: ${esc(o.motivo_perda)}</span>` : ''}
    </div>
    ${props.length || contratos.length ? `<div class="props">${props.map(p => `<a href="#/proposta/${p.id}"><span class="num">Proposta ${p.numero}</span>${esc(p.titulo || '')}<span class="tag ${p.status}">${statusNome(p.status)}</span><span class="tt">${brl(p.total)}</span></a>`).join('')}
      ${contratos.map(k => `<a href="#/contrato/${k.id}"><span class="num" style="color:#1E7A7A;">Contrato ${k.numero}</span>${esc(k.titulo)}<span class="tag ${k.assinado_em ? 'aprovada' : 'rascunho'}">${k.assinado_em ? 'Assinado' : 'Aguardando assinatura'}</span></a>`).join('')}</div>` : ''}
    ${posVenda ? `<details class="mais-itens"${o.link_app ? '' : ''}><summary>Entrega e links${o.entrega_prevista ? ' · prevista ' + dataBR(o.entrega_prevista + 'T12:00:00') : ''}</summary><div class="posvenda">
      <div class="grade3"><div class="campo"><label class="rot">Entrega prevista</label><input type="date" data-pv="entrega_prevista" value="${o.entrega_prevista || ''}"></div>
      <div class="campo"><label class="rot">Entregue em</label><input type="date" data-pv="entregue_em" value="${o.entregue_em || ''}" ${o.etapa === 'entregue' ? '' : 'disabled'}></div>
      <div class="campo"><label class="rot">Suporte até</label><input type="date" data-pv="suporte_ate" value="${o.suporte_ate || ''}"></div></div>
      <div class="grade2"><div class="campo"><label class="rot">Link do app</label><input type="url" data-pv="link_app" value="${esc(o.link_app)}" placeholder="https://"></div>
      <div class="campo"><label class="rot">Repositório</label><input type="url" data-pv="repositorio" value="${esc(o.repositorio)}" placeholder="https://github.com/…"></div></div>
      </div></details>` : ''}
    ${o.link_app ? `<p style="margin:.5rem 0 0;font-size:13px;"><a href="${esc(o.link_app)}" target="_blank" rel="noopener">Abrir o app ↗</a></p>` : ''}
    <div class="rodape"><button class="btn linha peq" data-oa="proposta">Proposta</button>${['negociacao', 'fechado', 'entregue', 'proposta'].includes(o.etapa) ? '<button class="btn linha peq" data-oa="contrato">Contrato</button>' : ''}<button class="btn fantasma peq" data-oa="tarefa">Tarefa</button><button class="btn fantasma peq" data-oa="editar">Editar</button></div>
  </div>`;
}
