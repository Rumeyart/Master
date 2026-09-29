// Contratos: lista, modelos com variáveis e criação a partir da proposta
import {q, T, config} from './db.js';
import {esc, brl, dataBR, MESES, janela, aviso, traduzErro, confirmar, linhas} from './util.js';
import {calc} from './proposta-doc.js';
import {ICONES} from './icones.js';
import {htmlSeletorCliente, ligarSeletorCliente} from './forms.js';
import {ir, recarregar} from './app.js';

export const VARIAVEIS = [
  ['contrato.numero', 'Número do contrato'], ['cidade_data', 'Cidade e data de hoje'],
  ['empresa.nome', 'Nome da Rumëyart'], ['empresa.cnpj_txt', '", CNPJ …" (se houver)'], ['empresa.responsavel', 'Responsável'], ['empresa.whatsapp', 'WhatsApp da empresa'],
  ['cliente.nome', 'Nome do cliente'], ['cliente.doc_txt', '", CPF/CNPJ …" (se houver)'], ['cliente.marca_txt', '", pela marca …" (se houver)'], ['cliente.whatsapp', 'WhatsApp do cliente'], ['cliente.email', 'E-mail do cliente'],
  ['projeto.titulo', 'Nome do projeto'], ['proposta.numero', 'Número da proposta'], ['proposta.escopo', 'Entregas (lista)'], ['proposta.etapas', 'Etapas (lista)'],
  ['proposta.prazo', 'Prazo'], ['proposta.total', 'Valor total'], ['proposta.mensal_txt', '" Plano mensal: …" (se houver)'], ['proposta.pagamento', 'Forma de pagamento (lista)']
];

// Troca {{variavel}} pelos dados do cliente, projeto e proposta
export function preencher(corpo, {cfg, cliente, op, prop, numero}){
  const E = cfg?.empresa || {}, d = prop?.dados || {}, c = prop ? calc(d) : null;
  const lista = t => linhas(t).map(x => '• ' + x).join('\n') || '—';
  const hoje = new Date();
  const v = {
    'contrato.numero': numero ?? '{{contrato.numero}}',
    'cidade_data': `${E.cidade || 'Vargem Grande Paulista/SP'}, ${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}.`,
    'empresa.nome': E.nome || 'Rumëyart Criação', 'empresa.cnpj_txt': E.cnpj ? `, CNPJ ${E.cnpj}` : '', 'empresa.responsavel': E.responsavel || '', 'empresa.whatsapp': E.whatsapp || '',
    'cliente.nome': cliente?.nome || '', 'cliente.doc_txt': cliente?.cpf_cnpj ? `, CPF/CNPJ ${cliente.cpf_cnpj}` : '', 'cliente.marca_txt': cliente?.marca ? `, pela marca ${cliente.marca}` : '',
    'cliente.whatsapp': cliente?.whatsapp || '', 'cliente.email': cliente?.email || '',
    'projeto.titulo': d.titulo || op?.titulo || '',
    'proposta.numero': prop?.numero ?? '—', 'proposta.escopo': lista(d.escopo), 'proposta.etapas': lista(d.etapas), 'proposta.prazo': String(d.prazo || 'a combinar').replace(/[.\s]+$/, ''),
    'proposta.total': c ? brl(c.total) : (op ? brl(op.valor) : '—'),
    'proposta.mensal_txt': (c?.mensal || Number(op?.mensal)) ? ` Plano mensal (${d.mensal_desc || 'manutenção'}): ${brl(c?.mensal || op.mensal)} por mês, a partir da entrega.` : '',
    'proposta.pagamento': lista(d.pagamento) === '—' ? 'A combinar.' : lista(d.pagamento)
  };
  return String(corpo || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => k in v ? String(v[k]) : m);
}

// Cria um contrato (janela: modelo, cliente, projeto, proposta)
export async function novoContrato({cliente_id, oportunidade_id, proposta_id} = {}){
  const [modelos, cfg] = await Promise.all([q.lista(T.modelos, '*', x => x.eq('ativo', true).order('nome')), config()]);
  if(!modelos.length){ aviso('Cadastre um modelo de contrato primeiro (Contratos → Modelos).'); return null; }
  const seletor = cliente_id ? null : await htmlSeletorCliente('k_cli');
  return janela({titulo: 'Novo contrato', corpo: `${seletor ? seletor.html : ''}
    <div class="campo"><label class="rot" for="k_mod">Modelo</label><select id="k_mod">${modelos.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')}</select></div>
    <div class="campo"><label class="rot" for="k_op">Projeto</label><select id="k_op"><option value="">—</option></select></div>
    <div class="campo"><label class="rot" for="k_prop">Proposta de referência</label><select id="k_prop"><option value="">— sem proposta —</option></select>
      <div class="muted" style="font-size:12.5px;margin-top:.35rem;">Escopo, etapas, prazo, valor e pagamento vêm da proposta. Você revisa o texto antes de gerar o PDF.</div></div>`,
    aoAbrir: ctx => {
      const carregar = async cid => {
        const so = ctx.el.querySelector('#k_op'), sp = ctx.el.querySelector('#k_prop');
        so.innerHTML = '<option value="">—</option>'; sp.innerHTML = '<option value="">— sem proposta —</option>';
        if(!cid || cid === '__novo') return;
        const [ops, props] = await Promise.all([
          q.lista(T.oport, 'id,titulo,etapa', x => x.eq('cliente_id', cid).order('criado_em', {ascending: false})),
          q.lista(T.propostas, 'id,numero,titulo,status,total,oportunidade_id', x => x.eq('cliente_id', cid).order('numero', {ascending: false}))
        ]);
        so.innerHTML += ops.map(o => `<option value="${o.id}">${esc(o.titulo)}</option>`).join('');
        const desenharProps = () => { const oid = so.value; sp.innerHTML = '<option value="">— sem proposta —</option>' + props.filter(p => !oid || p.oportunidade_id === oid).map(p => `<option value="${p.id}">Nº ${p.numero} · ${esc(p.titulo || '')} · ${brl(p.total)}${p.status === 'aprovada' ? ' · aprovada' : ''}</option>`).join('');
          const ap = props.find(p => p.id === proposta_id) || props.find(p => (!oid || p.oportunidade_id === oid) && p.status === 'aprovada') || props.find(p => !oid || p.oportunidade_id === oid); if(ap) sp.value = ap.id; };
        so.value = oportunidade_id || ops[0]?.id || ''; so.onchange = desenharProps; desenharProps();
      };
      if(seletor) ligarSeletorCliente(ctx.el, 'k_cli', seletor.cs, carregar); else carregar(cliente_id);
    },
    botoes: [{texto: 'Cancelar'}, {texto: 'Criar contrato', classe: 'prim', acao: async ctx => {
      const cid = cliente_id || ctx.valor('#k_cli');
      if(!cid || cid === '__novo'){ ctx.erro('Escolha o cliente.'); return false; }
      const mod = modelos.find(m => m.id === ctx.valor('#k_mod'));
      const [cliente, op, prop] = await Promise.all([q.um(T.clientes, cid), ctx.valor('#k_op') ? q.um(T.oport, ctx.valor('#k_op')) : null, ctx.valor('#k_prop') ? q.um(T.propostas, ctx.valor('#k_prop')) : null]);
      const titulo = prop?.titulo || op?.titulo || mod.nome;
      const k = await q.cria(T.contratos, {modelo_id: mod.id, cliente_id: cid, oportunidade_id: op?.id || null, proposta_id: prop?.id || null, titulo, corpo: preencher(mod.corpo, {cfg, cliente, op, prop})});
      return q.altera(T.contratos, k.id, {corpo: k.corpo.replace(/\{\{\s*contrato\.numero\s*\}\}/g, k.numero)});
    }}]});
}

export async function render(el, {aba}){
  const ativa = aba === 'modelos' ? 'modelos' : 'contratos';
  const [ks, modelos] = await Promise.all([
    q.lista(T.contratos, 'id,numero,titulo,assinado_em,caminho,criado_em,cliente:rumeyart_clientes(id,nome)', x => x.order('numero', {ascending: false})),
    q.lista(T.modelos, '*', x => x.order('nome'))
  ]);
  el.innerHTML = `
    <div class="cab"><h1>Contratos</h1>
      <div class="dir">${ativa === 'modelos' ? `<button class="btn prim" id="novoMod"><span class="ic">${ICONES.mais_novo}</span>Modelo</button>` : `<button class="btn prim" id="novo"><span class="ic">${ICONES.mais_novo}</span>Contrato</button>`}</div>
</div>
    <nav class="abas"><a href="#/contratos" class="${ativa === 'contratos' ? 'on' : ''}"><span class="ic">${ICONES.contratos}</span>Contratos · ${ks.length}</a><a href="#/contratos?aba=modelos" class="${ativa === 'modelos' ? 'on' : ''}"><span class="ic">${ICONES.editar}</span>Modelos · ${modelos.length}</a></nav>
    ${ativa === 'contratos' ? `<div class="card" style="padding-top:6px;">${ks.length ? `<table class="tabela"><thead><tr><th>Nº</th><th>Cliente e projeto</th><th>Situação</th><th>Criado</th></tr></thead><tbody>
      ${ks.map(k => `<tr class="link" data-id="${k.id}"><td data-l="Nº"><b style="font-family:var(--f-mono);color:#1E7A7A;">${k.numero}</b></td>
        <td data-l=""><div class="nm">${esc(k.cliente?.nome || '')}</div><div class="sm">${esc(k.titulo)}</div></td>
        <td data-l="Situação">${k.assinado_em ? `<span class="tag aprovada">Assinado em ${dataBR(k.assinado_em + 'T12:00:00')}</span>` : `<span class="tag ${k.caminho ? 'enviada' : 'rascunho'}">${k.caminho ? 'PDF gerado' : 'Rascunho'}</span>`}</td>
        <td data-l="Criado" class="sm">${dataBR(k.criado_em)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="vazio">Nenhum contrato ainda. Crie a partir de uma proposta aprovada ou pelo botão Contrato.</div>'}</div>`
    : `<div class="cols">${modelos.map(m => `<div class="card"><h3>${esc(m.nome)} ${m.ativo ? '' : '<span class="tag expirada">inativo</span>'}<button class="btn fantasma peq dir" data-mod="${m.id}">Editar</button></h3>
        <p class="muted" style="margin-top:-.4rem;">${esc(m.descricao || '')}</p><div style="max-height:180px;overflow:hidden;white-space:pre-wrap;font-size:13px;color:var(--tinta-2);-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent);">${esc(m.corpo.slice(0, 900))}</div></div>`).join('') || '<div class="vazio">Nenhum modelo.</div>'}</div>`}`;

  el.querySelectorAll('tr[data-id]').forEach(r => r.onclick = () => ir('contrato/' + r.dataset.id));
  el.querySelector('#novo')?.addEventListener('click', async () => { try{ const k = await novoContrato(); if(k) ir('contrato/' + k.id); }catch(e){ aviso(traduzErro(e)); } });
  el.querySelector('#novoMod')?.addEventListener('click', async () => { if(await editarModelo()){ aviso('Modelo criado.'); recarregar(); } });
  el.querySelectorAll('[data-mod]').forEach(b => b.onclick = async () => { const r = await editarModelo(modelos.find(m => m.id === b.dataset.mod)); if(r){ aviso(r === 'apagado' ? 'Modelo apagado.' : 'Modelo salvo.'); recarregar(); } });
}

function editarModelo(m){
  return janela({titulo: m ? 'Editar modelo' : 'Novo modelo de contrato', larga: true, corpo: `
    <div class="grade2"><div class="campo"><label class="rot" for="m_nome">Nome</label><input type="text" id="m_nome" value="${esc(m?.nome)}"></div>
      <div class="campo"><label class="rot" for="m_desc">Quando usar</label><input type="text" id="m_desc" value="${esc(m?.descricao)}"></div></div>
    <div class="campo"><label class="rot" for="m_corpo">Texto do contrato</label><textarea id="m_corpo" style="min-height:340px;font-family:var(--f-mono);font-size:13px;">${esc(m?.corpo || 'CONTRATO DE …\n\n1. OBJETO\n…')}</textarea></div>
    <details style="margin-top:.7rem;"><summary style="cursor:pointer;color:var(--azul);font-size:13.5px;">Variáveis disponíveis (clique para inserir)</summary>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem;">${VARIAVEIS.map(([k, n]) => `<button type="button" class="pill" data-var="${k}" title="${esc(n)}" style="border:0;cursor:pointer;">{{${k}}}</button>`).join('')}</div></details>
    ${m ? `<label class="chk"><input type="checkbox" id="m_ativo" ${m.ativo ? 'checked' : ''}> Modelo ativo</label>` : ''}`,
    aoAbrir: ctx => { const ta = ctx.el.querySelector('#m_corpo'); ctx.el.querySelectorAll('[data-var]').forEach(b => b.onclick = () => { const s = ta.selectionStart ?? ta.value.length; ta.setRangeText(`{{${b.dataset.var}}}`, s, ta.selectionEnd ?? s, 'end'); ta.focus(); }); },
    botoes: [...(m ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar modelo', 'Os contratos já gerados com ele continuam guardados.', 'Apagar', 'perigo'))) return false; await q.apaga(T.modelos, m.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {nome: ctx.valor('#m_nome'), descricao: ctx.valor('#m_desc') || null, corpo: ctx.el.querySelector('#m_corpo').value};
        if(row.nome.length < 2){ ctx.erro('Dê um nome ao modelo.'); return false; }
        if(row.corpo.trim().length < 20){ ctx.erro('Escreva o texto do contrato.'); return false; }
        if(m){ row.ativo = ctx.valor('#m_ativo'); return q.altera(T.modelos, m.id, row); }
        return q.cria(T.modelos, row);
      }}]});
}
