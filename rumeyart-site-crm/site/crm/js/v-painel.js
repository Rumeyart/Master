// Painel: só o essencial, em forma de atalho para agir
import {q, T, config, tarefasAbertas} from './db.js';
import {esc, brlC, brlCurto, quando, diaChave, hojeChave, whatsLink, haQuanto, aviso, traduzErro, primeiroNome, mesChave, mesLimites, rot, AREAS} from './util.js';
import {ICONES} from './icones.js';
import {mensagemDoPasso} from './passos.js';
import {ir, recarregar, atualizarContador} from './app.js';

export async function render(el){
  const hoje = hojeChave(), [ini, fim] = mesLimites(mesChave());
  const [tarefas, pedidos, props, receber, saldos, ops, cfg] = await Promise.all([
    tarefasAbertas(),
    q.lista(T.pedidos, 'id,numero,nome,whatsapp,ideia,status,criado_em,cliente_id,oportunidade_id', x => x.in('status', ['novo', 'lido']).order('criado_em', {ascending: false}).limit(20)),
    q.lista(T.propostas, 'id,status,enviada_em', x => x.in('status', ['enviada', 'negociacao'])),
    q.lista(T.lanc, 'valor_centavos,data', x => x.eq('tipo', 'receita').eq('status', 'pendente').lt('data', fim)),
    q.lista(T.saldos, 'saldo_centavos,arquivada'),
    q.lista(T.oport, 'valor,etapa,fechado_em', x => x.eq('arquivado', false).in('etapa', ['proposta', 'negociacao', 'fechado', 'entregue'])),
    config()
  ]);

  const novos = pedidos.filter(p => p.status === 'novo');
  const atras = tarefas.filter(t => diaChave(t.vence_em) < hoje), deHoje = tarefas.filter(t => diaChave(t.vence_em) === hoje);
  const semRetorno = props.filter(p => p.status === 'enviada' && p.enviada_em && Date.now() - new Date(p.enviada_em) > 3 * 86400000);
  const vencidos = receber.filter(l => l.data < hoje);
  const aReceber = receber.reduce((s, l) => s + Number(l.valor_centavos), 0);
  const saldo = saldos.filter(c => !c.arquivada).reduce((s, c) => s + Number(c.saldo_centavos), 0);
  const emNeg = ops.filter(o => ['proposta', 'negociacao'].includes(o.etapa)).reduce((s, o) => s + Number(o.valor || 0), 0);
  const fechado = ops.filter(o => o.fechado_em && diaChave(o.fechado_em) >= ini && diaChave(o.fechado_em) < fim).reduce((s, o) => s + Number(o.valor || 0), 0);
  const eu = primeiroNome(cfg?.empresa?.responsavel) || '';
  const h = new Date().getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  const atalhos = [
    {k: 'pedidos', href: '#/pedidos?f=novo', n: novos.length, rot: 'Responder ideias', sub: novos.length ? `a mais recente ${haQuanto(novos[0].criado_em)}` : 'nenhuma ideia esperando', c: 'var(--laranja)'},
    {k: 'tarefas', href: '#/tarefas', n: atras.length + deHoje.length, rot: 'Tarefas de hoje', sub: atras.length ? `${atras.length} ${atras.length === 1 ? 'atrasada' : 'atrasadas'}` : deHoje.length ? 'no prazo' : 'agenda livre', c: 'var(--azul)', alerta: atras.length > 0},
    {k: 'propostas', href: '#/propostas?status=abertas', n: semRetorno.length, rot: 'Cobrar propostas', sub: semRetorno.length ? 'enviadas há mais de 3 dias' : `${props.length} em aberto`, c: 'var(--ameixa)'},
    {k: 'receita', href: '#/financeiro?aba=lancamentos', n: receber.length, valor: aReceber, rot: 'Receber este mês', sub: vencidos.length ? `${vencidos.length} ${vencidos.length === 1 ? 'vencido' : 'vencidos'}` : receber.length ? `${receber.length} ${receber.length === 1 ? 'parcela' : 'parcelas'}` : 'nada pendente', c: 'var(--verde)', alerta: vencidos.length > 0}
  ];
  const destaque = atalhos.find(a => a.n > 0);

  const agenda = [...atras, ...deHoje];
  const agendaTit = agenda.length ? 'Para hoje' : 'Próximas tarefas';
  const lista = agenda.length ? agenda.slice(0, 6) : tarefas.slice(0, 4);

  el.innerHTML = `
    <div class="cab cab-painel"><div><div class="eyebrow">${saud}${eu ? ', ' + esc(eu) : ''}</div><h1>${destaque ? 'O próximo passo está aqui.' : 'Tudo em dia por aqui.'}</h1></div></div>

    <div class="atalhos">${atalhos.map(a => `<a class="atalho ${a === destaque ? 'foco' : ''} ${a.n ? '' : 'zerado'} ${a.alerta ? 'alerta-a' : ''}" href="${a.href}" style="--c:${a.c}">
      <span class="at-topo"><span class="at-ic">${ICONES[a.k]}</span><span class="at-ir">${ICONES.seta}</span></span>
      <span class="at-num din">${a.valor !== undefined ? (a.valor ? brlCurto(a.valor / 100) : '—') : (a.n || '—')}</span>
      <span class="at-rot">${a.rot}</span><span class="at-sub">${a.sub}</span></a>`).join('')}</div>

    <div class="criar-rapido" role="group" aria-label="Criar rapidamente">
      <span class="eyebrow">Criar</span>
      ${[['cliente', 'clientes', 'Cliente'], ['proposta', 'propostas', 'Proposta'], ['tarefa', 'tarefas', 'Tarefa'], ['receita', 'receita', 'Receita'], ['despesa', 'despesa', 'Despesa']].map(([k, ic, n]) => `<button type="button" class="chip-acao" data-criar="${k}"><span class="ic">${ICONES[ic]}</span>${n}</button>`).join('')}
    </div>

    <div class="painel-duo">
      <section class="card bloco-p"><h3>${agendaTit}<a class="ver dir" href="#/tarefas">Ver todas</a></h3>
        ${listaTarefas(lista, hoje) || '<div class="vazio">Nenhuma tarefa marcada. Quando você agenda um retorno, ele aparece aqui.</div>'}</section>
      <section class="card bloco-p"><h3>Ideias do site<a class="ver dir" href="#/pedidos">Caixa de entrada</a></h3>
        ${pedidos.length ? pedidos.slice(0, 4).map(p => { const w = whatsLink(p.whatsapp, mensagemDoPasso('Responder pedido do site', {nome: p.nome}) || `Olá, ${primeiroNome(p.nome)}! Aqui é ${eu || 'a equipe'}, da Rumëyart. Recebi a sua ideia e quero entender melhor. Podemos conversar esta semana?`);
          return `<div class="ideia-l ${p.status}"><a class="tx" href="#/pedidos?id=${p.id}"><b>${esc(p.nome)}${p.status === 'novo' ? ' <span class="tag novo">Novo</span>' : ''}</b><span>${esc(String(p.ideia).slice(0, 88))}${String(p.ideia).length > 88 ? '…' : ''}</span></a>
            ${w ? `<a class="wpp" href="${w}" target="_blank" rel="noopener" data-resp="${p.id}" title="Responder no WhatsApp" aria-label="Responder ${esc(p.nome)} no WhatsApp">${ICONES.whats}</a>` : ''}</div>`; }).join('')
          : '<div class="vazio">Quando alguém preencher o formulário do site, a ideia aparece aqui.</div>'}</section>
    </div>

    <div class="faixa-num">
      <a href="#/funil"><span>Em negociação</span><b class="din">${brlCurto(emNeg)}</b></a>
      <a href="#/funil"><span>Fechado no mês</span><b class="din">${brlCurto(fechado)}</b></a>
      <a href="#/financeiro?aba=contas"><span>Saldo em contas</span><b class="din ${saldo < 0 ? 'valor-neg' : ''}">${brlCurto(saldo / 100)}</b></a>
    </div>`;

  ligarTarefas(el);
  el.querySelectorAll('[data-resp]').forEach(a => a.addEventListener('click', () => {
    const p = pedidos.find(x => x.id === a.dataset.resp); if(!p || p.status === 'respondido') return;
    q.altera(T.pedidos, p.id, {status: 'respondido'}).then(() => { atualizarContador(); if(p.cliente_id) q.cria(T.hist, {cliente_id: p.cliente_id, oportunidade_id: p.oportunidade_id, tipo: 'contato', texto: `Respondeu o pedido nº ${p.numero} pelo WhatsApp.`}).catch(() => {}); }).catch(() => {});
  }));
  el.querySelectorAll('[data-criar]').forEach(b => b.addEventListener('click', async () => {
    const k = b.dataset.criar;
    try{
      const forms = await import('./forms.js');
      if(k === 'cliente'){ const c = await forms.cliente(); if(c) ir('cliente/' + c.id); }
      if(k === 'proposta'){ const p = await forms.novaProposta({}); if(p) ir('proposta/' + p.id); }
      if(k === 'tarefa'){ if(await forms.tarefa({})){ aviso('Tarefa criada.'); recarregar(); } }
      if(k === 'receita' || k === 'despesa'){ const {lancamento} = await import('./v-financeiro.js'); if(await lancamento({tipo: k})){ aviso('Lançamento salvo.'); recarregar(); } }
    }catch(e){ aviso(traduzErro(e)); }
  }));
}

export function listaTarefas(ts, hoje = hojeChave()){
  if(!ts.length) return '';
  return ts.map(t => {
    const k = diaChave(t.vence_em), est = k < hoje ? 'atras' : k === hoje ? 'hoje' : '';
    const msg = mensagemDoPasso(t.titulo, {nome: t.cliente?.nome, projeto: t.oportunidade?.titulo});
    const w = whatsLink(t.cliente?.whatsapp, msg || undefined);
    return `<div class="tarefa ${est}" data-t="${t.id}"><input type="checkbox" aria-label="Concluir: ${esc(t.titulo)}">
      <div class="tx"><b>${esc(t.titulo)}</b>
        <span class="meta"><span class="pill quando">${quando(t.vence_em)}</span><span class="area-tag ${t.area}">${rot(AREAS, t.area)}</span>${t.cliente?.nome ? `<a href="#/cliente/${t.cliente_id}">${esc(t.cliente.nome)}</a>` : ''}${t.oportunidade ? `<span class="op">${esc(t.oportunidade.titulo)}</span>` : ''}</span></div>
      <button type="button" class="btn fantasma peq" data-editar-t="${t.id}" aria-label="Editar tarefa" title="Editar" style="min-height:34px;width:34px;padding:0;"><span class="ic">${ICONES.editar}</span></button>
      ${w ? `<a class="wpp" target="_blank" rel="noopener" href="${w}" title="${msg ? 'Abrir WhatsApp com a mensagem pronta' : 'Abrir WhatsApp'}" aria-label="Abrir WhatsApp">${ICONES.whats}</a>` : ''}</div>`;
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
