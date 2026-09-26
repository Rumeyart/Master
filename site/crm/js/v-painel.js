// Painel: o mês em números + o que fazer agora
import {sb, T, q, oportunidades, tarefasAbertas} from './db.js';
import {esc, brl, brlCurto, brlC, ETAPAS, quando, diaChave, hojeChave, addDias, whatsLink, haQuanto, dataBR, aviso, primeiroNome, mesChave, mesNome, mesLimites, somaMes, rot, AREAS} from './util.js';
import {ICONES} from './icones.js';
import {ir, recarregar, atualizarContador} from './app.js';

export async function render(el, {mes}){
  const k = /^\d{4}-\d{2}$/.test(mes || '') ? mes : mesChave();
  const [ini, fim] = mesLimites(k);
  const noMes = d => d && diaChave(d) >= ini && diaChave(d) < fim;

  const [ops, tarefas, props, pedidos, lancs, saldos] = await Promise.all([
    oportunidades(), tarefasAbertas(),
    q.lista(T.propostas, 'id,numero,status,total,enviada_em,titulo,cliente_id,cliente:rumeyart_clientes(nome,whatsapp)', x => x.in('status', ['enviada', 'negociacao']).order('enviada_em')),
    q.lista(T.pedidos, 'id,numero,nome,ideia,status,criado_em,cliente_id', x => x.order('criado_em', {ascending: false}).limit(6)),
    q.lista(T.lanc, 'tipo,valor_centavos,status,data', x => x.in('tipo', ['receita', 'despesa']).gte('data', ini).lt('data', fim)),
    q.lista(T.saldos, 'saldo_centavos,arquivada')
  ]);

  const novosSite = pedidos.filter(p => p.status === 'novo');
  const emNeg = ops.filter(o => ['proposta', 'negociacao'].includes(o.etapa));
  const fechadas = ops.filter(o => ['fechado', 'entregue'].includes(o.etapa) && noMes(o.fechado_em));
  const soma = l => l.reduce((s, o) => s + (Number(o.valor) || 0), 0);
  const recebido = lancs.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor_centavos), 0);
  const aReceber = lancs.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor_centavos), 0);
  const gasto = lancs.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor_centavos), 0);
  const saldo = saldos.filter(s => !s.arquivada).reduce((s, c) => s + Number(c.saldo_centavos), 0);

  const hoje = hojeChave();
  const atras = tarefas.filter(t => diaChave(t.vence_em) < hoje);
  const deHoje = tarefas.filter(t => diaChave(t.vence_em) === hoje);
  const proximas = tarefas.filter(t => diaChave(t.vence_em) > hoje && new Date(t.vence_em) < addDias(new Date(), 8));
  const semRetorno = props.filter(p => p.status === 'enviada' && p.enviada_em && (Date.now() - new Date(p.enviada_em)) > 3 * 86400000);
  const construindo = ops.filter(o => o.etapa === 'fechado').sort((a, b) => String(a.entrega_prevista || '9').localeCompare(String(b.entrega_prevista || '9')));
  const porEtapa = Object.fromEntries(ETAPAS.map(([e]) => [e, ops.filter(o => o.etapa === e).length]));
  const agir = atras.length + deHoje.length;
  const meses = [...Array(12)].map((_, i) => somaMes(mesChave(), -i));
  const saud = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">${saud}</div><h1>O que pede a sua atenção</h1>
      <div class="dir"><select id="mes" aria-label="Mês" style="width:auto;border-radius:999px;">${meses.map(m => `<option value="${m}" ${m === k ? 'selected' : ''}>${mesNome(m)}</option>`).join('')}</select></div></div>
    ${novosSite.length ? `<a class="alerta" href="#/pedidos" style="text-decoration:none;color:inherit;"><span class="ic">${ICONES.pedidos}</span><div><b>${novosSite.length} ${novosSite.length === 1 ? 'ideia nova chegou' : 'ideias novas chegaram'} pelo site.</b> Responda enquanto a pessoa ainda está com a ideia quente.</div></a>` : ''}
    ${agir ? `<div class="alerta"><span class="ic">${ICONES.sino}</span><div>Você tem <b>${agir} ${agir === 1 ? 'tarefa' : 'tarefas'}</b> para hoje${atras.length ? ` (${atras.length} ${atras.length === 1 ? 'atrasada' : 'atrasadas'})` : ''}.</div></div>`
      : `<div class="alerta ok"><span class="ic">${ICONES.ok}</span><div>Nenhuma tarefa pendente para hoje.</div></div>`}
    <div class="kpis">
      <a class="kpi destaque" href="#/pedidos"><div class="k"><i></i>Pedidos do site</div><div class="v">${novosSite.length}</div><div class="d">aguardando resposta</div></a>
      <a class="kpi" href="#/funil" style="--c:var(--laranja)"><div class="k"><i></i>Em negociação</div><div class="v din">${brlCurto(soma(emNeg))}</div><div class="d">${emNeg.length} ${emNeg.length === 1 ? 'projeto' : 'projetos'} com proposta</div></a>
      <a class="kpi" href="#/funil" style="--c:var(--verde)"><div class="k"><i></i>Fechado no mês</div><div class="v din">${brlCurto(soma(fechadas))}</div><div class="d">${fechadas.length} ${fechadas.length === 1 ? 'projeto' : 'projetos'} em ${mesNome(k).split(' ')[0]}</div></a>
      <a class="kpi" href="#/financeiro?mes=${k}" style="--c:var(--azul)"><div class="k"><i></i>Recebido no mês</div><div class="v din">${brlCurto(recebido / 100)}</div><div class="d">${aReceber ? `+ ${brlC(aReceber)} a receber` : `gastos: ${brlC(gasto)}`}</div></a>
      <a class="kpi" href="#/financeiro?aba=contas" style="--c:var(--ameixa)"><div class="k"><i></i>Saldo em contas</div><div class="v din ${saldo < 0 ? 'valor-neg' : ''}">${brlCurto(saldo / 100)}</div><div class="d">todas as contas ativas</div></a>
    </div>
    <div class="card"><h3>Funil agora <a class="btn linha peq dir" href="#/funil">Abrir funil</a></h3>
      <div class="funilbar">${ETAPAS.map(([e, n, c]) => `<a href="#/funil" style="--c:${c}"><b>${porEtapa[e]}</b>${n}</a>`).join('')}</div></div>
    <div class="cols">
      <div>
        <div class="card"><h3>Próximas tarefas <a class="btn linha peq dir" href="#/tarefas">Ver todas</a></h3>
          ${listaTarefas([...atras, ...deHoje, ...proximas].slice(0, 12), hoje) || '<div class="vazio">Nada agendado para os próximos dias. Que tal marcar um retorno com quem está em negociação?</div>'}</div>
        <div class="card"><h3>Em construção</h3>
          ${construindo.length ? construindo.slice(0, 8).map(o => `<div class="item-lista"><div class="tx"><a href="#/cliente/${o.cliente_id}?op=${o.id}"><b>${esc(o.titulo)}</b></a><span>${esc(o.cliente?.nome || '')}${o.entrega_prevista ? ` · entrega prevista ${dataBR(o.entrega_prevista + 'T12:00:00')}` : ''}</span></div><span class="vl">${brl(o.valor)}</span></div>`).join('')
            : '<div class="vazio">Nenhum projeto em construção agora.</div>'}</div>
      </div>
      <div>
        <div class="card"><h3>Chegou pelo site <a class="btn linha peq dir" href="#/pedidos">Caixa de entrada</a></h3>
          ${pedidos.length ? pedidos.map(p => `<div class="item-lista"><div class="tx"><a href="#/pedidos?id=${p.id}"><b>${esc(p.nome)}</b></a><span>${esc(String(p.ideia).slice(0, 90))}${String(p.ideia).length > 90 ? '…' : ''}</span></div><span class="tag ${p.status}">${p.status === 'novo' ? 'Novo' : haQuanto(p.criado_em)}</span></div>`).join('')
            : '<div class="vazio">Quando alguém preencher o formulário do site, a ideia aparece aqui.</div>'}</div>
        <div class="card"><h3>Propostas sem retorno</h3>
          ${semRetorno.length ? semRetorno.slice(0, 8).map(p => `<div class="item-lista"><div class="tx"><a href="#/proposta/${p.id}"><b>Nº ${p.numero} · ${esc(p.cliente?.nome)}</b></a><span>${esc(p.titulo || '')} · ${brl(p.total)} · enviada ${haQuanto(p.enviada_em)}</span></div>
            ${whatsLink(p.cliente?.whatsapp) ? `<a class="btn verde peq" target="_blank" rel="noopener" href="${whatsLink(p.cliente.whatsapp, `Olá, ${primeiroNome(p.cliente.nome)}! Tudo bem? Passando para saber se conseguiu olhar a proposta da Rumëyart. Posso esclarecer alguma coisa?`)}">WhatsApp</a>` : ''}</div>`).join('')
            : '<div class="vazio">Nenhuma proposta enviada há mais de 3 dias sem resposta.</div>'}</div>
      </div>
    </div>`;

  el.querySelector('#mes').onchange = e => ir('painel?mes=' + e.target.value);
  ligarTarefas(el);
}

export function listaTarefas(ts, hoje = hojeChave()){
  if(!ts.length) return '';
  return ts.map(t => {
    const k = diaChave(t.vence_em), est = k < hoje ? 'atras' : k === hoje ? 'hoje' : '';
    const w = whatsLink(t.cliente?.whatsapp);
    return `<div class="tarefa ${est}" data-t="${t.id}"><input type="checkbox" aria-label="Concluir: ${esc(t.titulo)}">
      <div class="tx"><b>${esc(t.titulo)}</b>
        <span class="meta"><span class="pill quando">${quando(t.vence_em)}</span><span class="area-tag ${t.area}">${rot(AREAS, t.area)}</span>${t.cliente?.nome ? `<a href="#/cliente/${t.cliente_id}">${esc(t.cliente.nome)}</a>` : ''}${t.oportunidade ? `<span>${esc(t.oportunidade.titulo)}</span>` : ''}</span></div>
      <button type="button" class="btn fantasma peq" data-editar-t="${t.id}" aria-label="Editar tarefa" title="Editar" style="min-height:34px;width:34px;padding:0;"><span class="ic">${ICONES.editar}</span></button>
      ${w ? `<a class="wpp" target="_blank" rel="noopener" href="${w}" title="Abrir WhatsApp" aria-label="Abrir WhatsApp">${ICONES.whats}</a>` : ''}</div>`;
  }).join('');
}
export function ligarTarefas(el, aoConcluir){
  el.querySelectorAll('[data-editar-t]').forEach(b => b.addEventListener('click', async () => {
    const t = await q.um(T.tarefas, b.dataset.editarT);
    const {tarefa} = await import('./forms.js');
    const r = await tarefa({existente: t});
    if(r){ aviso(r === 'apagada' ? 'Tarefa apagada.' : 'Tarefa atualizada.'); recarregar(); }
  }));
  el.querySelectorAll('.tarefa[data-t] input[type=checkbox]').forEach(cb => cb.addEventListener('change', async () => {
    const linha = cb.closest('.tarefa'); cb.disabled = true;
    try{
      await q.altera(T.tarefas, linha.dataset.t, {concluida: cb.checked});
      linha.classList.toggle('feita', cb.checked);
      aviso(cb.checked ? 'Tarefa concluída. Quer marcar o próximo passo?' : 'Tarefa reaberta.', cb.checked ? `<button class="btn prim peq" id="prox_${linha.dataset.t}">Próximo passo</button>` : '');
      const b = document.getElementById('prox_' + linha.dataset.t);
      if(b) b.onclick = async () => {
        const t = await q.um(T.tarefas, linha.dataset.t);
        const {tarefa} = await import('./forms.js');
        const nova = await tarefa({cliente_id: t.cliente_id, oportunidade_id: t.oportunidade_id, area: t.area});
        if(nova){ aviso('Próximo passo marcado.'); recarregar(); }
      };
      atualizarContador();
      if(aoConcluir) aoConcluir();
    }catch(e){ cb.checked = !cb.checked; aviso('Não foi possível salvar.'); }
    finally{ cb.disabled = false; }
  }));
}
