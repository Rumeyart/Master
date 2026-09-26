// Ficha do cliente: briefing, projetos, propostas, contratos, financeiro e histórico
import {q, T} from './db.js';
import {esc, brl, brlC, ETAPAS, etapaNome, statusNome, TIPOS, ORIGENS, rot, dataBR, dataHoraBR, dataCurta, whatsLink, iniciais, primeiroNome, aviso, traduzErro, confirmar, autoAltura} from './util.js';
import {ICONES} from './icones.js';
import {CAMPOS_BRIEFING} from './proposta-doc.js';
import * as forms from './forms.js';
import {listaTarefas, ligarTarefas} from './v-painel.js';
import {ir, recarregar} from './app.js';

const TIPO_HIST = {nota: 'Anotação', contato: 'Contato', etapa: 'Funil', proposta: 'Proposta', pdf: 'PDF', tarefa: 'Tarefa', site: 'Site', contrato: 'Contrato', financeiro: 'Financeiro', sistema: 'Sistema'};

export async function render(el, {id, op: opFoco}){
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

  el.innerHTML = `
    <div class="ficha-cab">
      <div class="fc-topo">
        <div class="av">${esc(iniciais(c.nome))}</div>
        <div class="info">
          <div class="eyebrow">${c.arquivado ? 'Cliente arquivado' : 'Cliente'} · ${esc(rot(TIPOS, c.tipo))}</div>
          <h1>${esc(c.nome)}</h1>
          ${c.marca || c.cidade ? `<div class="fc-sub">${esc([c.marca, [c.cidade, c.uf].filter(Boolean).join('/')].filter(Boolean).join(' · '))}</div>` : ''}
        </div>
      </div>
      <div class="meta">
        ${c.whatsapp ? `<span class="tag">${esc(c.whatsapp)}</span>` : ''}
        <span class="tag">via ${esc(rot(ORIGENS, c.origem))}</span>
        <span class="tag">desde ${dataBR(c.criado_em)}</span>
        ${recebido ? `<span class="tag">recebido ${brlC(recebido)}</span>` : ''}
      </div>
      <div class="acoes">
        ${w ? `<a class="btn verde" href="${w}" target="_blank" rel="noopener"><span class="ic">${ICONES.whats}</span>WhatsApp</a>` : ''}
        <button class="btn prim" data-a="proposta"><span class="ic">${ICONES.propostas}</span>Proposta</button>
        <button class="btn linha" data-a="tarefa">Tarefa</button>
        <button class="btn linha" data-a="receita">Receita</button>
        <button class="btn fantasma" data-a="editar">Editar</button>
      </div>
    </div>
    <div class="cols-ficha">
      <div>
        ${ped ? `<div class="card"><h3>O que contou no site <span class="pill dir">pedido nº ${ped.numero} · ${dataBR(ped.criado_em)}</span></h3>
          <div class="briefing"><div class="bq ideia"><div class="k">A ideia</div><div class="v">${esc(ped.ideia)}</div></div>
          ${CAMPOS_BRIEFING.filter(([k]) => (ped.respostas || {})[k]).map(([k, t]) => `<div class="bq"><div class="k">${t}</div><div class="v">${esc(ped.respostas[k])}</div></div>`).join('')}</div>
          ${pedidos.length > 1 ? `<p class="muted" style="font-size:13px;">Mais ${pedidos.length - 1} ${pedidos.length === 2 ? 'pedido anterior' : 'pedidos anteriores'} na <a href="#/pedidos?f=todos">caixa de entrada</a>.</p>` : ''}</div>` : ''}
        <div class="card"><h3>Projetos <button class="btn linha peq dir" data-a="oport">Novo projeto</button></h3>
          ${ops.length ? ops.map(o => blocoOp(o, props.filter(p => p.oportunidade_id === o.id), contratos.filter(k => k.oportunidade_id === o.id), o.id === opFoco)).join('') : '<div class="vazio">Nenhum projeto. Crie um para acompanhar este cliente no funil.</div>'}</div>
        <div class="card"><h3>Próximas ações</h3>
          <div id="tarefas">${listaTarefas(tarefas) || '<div class="vazio">Nenhuma ação agendada. Marque o próximo passo para não esquecer deste cliente.</div>'}</div></div>
        <div class="card"><h3>Financeiro do cliente <a class="btn fantasma peq dir" href="#/financeiro?aba=lancamentos&cliente=${id}">Ver no financeiro</a></h3>
          <div class="resumo-mes"><div class="kpi" style="--c:var(--verde);box-shadow:none;"><div class="k"><i></i>Recebido</div><div class="v din" style="font-size:26px;">${brlC(recebido)}</div></div>
            <div class="kpi" style="--c:var(--laranja);box-shadow:none;"><div class="k"><i></i>A receber</div><div class="v din" style="font-size:26px;">${brlC(aReceber)}</div></div>
            <div class="kpi" style="--c:var(--azul);box-shadow:none;"><div class="k"><i></i>Lançamentos</div><div class="v" style="font-size:26px;">${lancs.length}</div></div></div>
          ${lancs.length ? lancs.slice(0, 8).map(l => `<div class="item-lista"><span class="lanc-tipo ${l.tipo}">${ICONES[l.tipo]}</span><div class="tx"><b>${esc(l.descricao)}</b><span>${dataCurta(l.data)} · <span class="tag ${l.status}">${l.status === 'pago' ? (l.tipo === 'receita' ? 'Recebido' : 'Pago') : 'Pendente'}</span></span></div><span class="vl ${l.tipo === 'receita' ? 'valor-pos' : 'valor-neg'}">${brlC(l.valor_centavos)}</span></div>`).join('')
            : '<div class="vazio">Nenhum recebimento ligado a este cliente. Ao marcar um projeto como fechado, as parcelas entram aqui.</div>'}</div>
        <div class="card"><h3>Dados do cliente <button class="btn fantasma peq dir" data-a="editar">Editar</button></h3>
          <div class="dados">
            ${dado('WhatsApp', c.whatsapp)}${dado('E-mail', c.email)}${dado('Cidade', [c.cidade, c.uf].filter(Boolean).join('/'))}${dado('CPF / CNPJ', c.cpf_cnpj)}
            ${dado('Marca', c.marca)}${dado('Tipo', rot(TIPOS, c.tipo))}${dado('Origem', rot(ORIGENS, c.origem))}${dado('Último contato', c.ultimo_contato_em ? dataHoraBR(c.ultimo_contato_em) : '')}
          </div>
          ${c.observacoes ? `<div style="margin-top:.9rem;" class="dados"><div style="grid-column:1/-1;"><div class="k">Observações</div><div class="v" style="white-space:pre-wrap;">${esc(c.observacoes)}</div></div></div>` : ''}
          <div style="margin-top:1rem;"><button class="btn ${c.arquivado ? 'linha' : 'perigo'} peq" data-a="arquivar">${c.arquivado ? 'Reativar cliente' : 'Arquivar cliente'}</button>
            <span class="muted" style="font-size:12.5px;margin-left:.4rem;">${c.arquivado ? '' : 'O histórico, as propostas e os lançamentos continuam guardados.'}</span></div>
        </div>
      </div>
      <div class="card"><h3>Histórico</h3>
        <form class="nova-nota" id="nota">
          <textarea id="notaTx" placeholder="Registrar o que aconteceu… ex.: Conversamos por vídeo; quer começar pela agenda." rows="2"></textarea>
          <div class="l"><select id="notaTipo" aria-label="Tipo"><option value="nota">Anotação</option><option value="contato">Contato com o cliente</option></select>
            <button class="btn prim peq" type="submit">Registrar</button></div>
        </form>
        <div class="timeline">${hist.map(h => `<div class="ev ev-${h.tipo}"><div class="dt">${dataHoraBR(h.criado_em)} · ${esc(TIPO_HIST[h.tipo] || h.tipo)}</div><div class="tx">${esc(h.texto)}</div><div class="au">${esc(h.autor || '')}</div></div>`).join('') || '<div class="vazio">Sem registros.</div>'}</div>
      </div>
    </div>`;

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
    ${posVenda ? `<div class="posvenda"><div class="eyebrow" style="margin-bottom:.4rem;">Construção e entrega</div>
      <div class="grade3"><div class="campo"><label class="rot">Entrega prevista</label><input type="date" data-pv="entrega_prevista" value="${o.entrega_prevista || ''}"></div>
      <div class="campo"><label class="rot">Entregue em</label><input type="date" data-pv="entregue_em" value="${o.entregue_em || ''}" ${o.etapa === 'entregue' ? '' : 'disabled'}></div>
      <div class="campo"><label class="rot">Suporte até</label><input type="date" data-pv="suporte_ate" value="${o.suporte_ate || ''}"></div></div>
      <div class="grade2"><div class="campo"><label class="rot">Link do app</label><input type="url" data-pv="link_app" value="${esc(o.link_app)}" placeholder="https://"></div>
      <div class="campo"><label class="rot">Repositório</label><input type="url" data-pv="repositorio" value="${esc(o.repositorio)}" placeholder="https://github.com/…"></div></div>
      ${o.link_app ? `<p style="margin:.6rem 0 0;font-size:13px;"><a href="${esc(o.link_app)}" target="_blank" rel="noopener">Abrir o app ↗</a></p>` : ''}</div>` : ''}
    <div class="rodape"><button class="btn linha peq" data-oa="proposta">Proposta</button>${['negociacao', 'fechado', 'entregue', 'proposta'].includes(o.etapa) ? '<button class="btn linha peq" data-oa="contrato">Contrato</button>' : ''}<button class="btn fantasma peq" data-oa="tarefa">Tarefa</button><button class="btn fantasma peq" data-oa="editar">Editar</button></div>
  </div>`;
}
