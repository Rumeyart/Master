// Compras: lista do que comprar, recursos com cotações e fornecedores
import {q, T, fornecedores as cFornecedores, limparCache} from './db.js';
import {esc, brlC, centavos, inputValor, valorDigitado, dataCurta, dataBR, hojeChave, janela, aviso, traduzErro, confirmar, whatsLink, csv, baixar, numInput} from './util.js';
import {ICONES} from './icones.js';
import {ir, recarregar} from './app.js';

const ABAS = [['lista', 'Lista de compras', 'compras'], ['recursos', 'Recursos e cotações', 'recurso'], ['fornecedores', 'Fornecedores', 'fornecedor']];
const PRIOR = [['urgente', 'Urgente'], ['normal', 'Normal'], ['baixa', 'Baixa']];

export async function render(el, {aba}){
  const a = ABAS.some(x => x[0] === aba) ? aba : 'lista';
  el.innerHTML = `
    <div class="cab"><h1>Compras</h1>
      <div class="dir"><button class="btn prim" id="novo"><span class="ic">${ICONES.mais_novo}</span>${a === 'lista' ? 'Item' : a === 'recursos' ? 'Recurso' : 'Fornecedor'}</button></div>
</div>
    <nav class="abas">${ABAS.map(([k, n, ic]) => `<a href="#/compras?aba=${k}" class="${k === a ? 'on' : ''}"><span class="ic">${ICONES[ic]}</span>${n}</a>`).join('')}</nav>
    <div id="cp"><div class="carregando">Carregando…</div></div>`;
  const alvo = el.querySelector('#cp');
  if(a === 'lista'){ await lista(alvo); el.querySelector('#novo').onclick = async () => { if(await itemCompra({})){ aviso('Item adicionado.'); recarregar(); } }; }
  if(a === 'recursos'){ await recursos(alvo); el.querySelector('#novo').onclick = async () => { if(await editarRecurso()){ aviso('Recurso criado.'); recarregar(); } }; }
  if(a === 'fornecedores'){ await fornecedoresAba(alvo); el.querySelector('#novo').onclick = async () => { if(await editarFornecedor()){ limparCache('fornecedores'); aviso('Fornecedor criado.'); recarregar(); } }; }
}

// ---------------- lista de compras ----------------
async function lista(el){
  const itens = await q.lista(T.compras, '*, fornecedor:rumeyart_fornecedores(id,nome,whatsapp), oportunidade:rumeyart_oportunidades(id,titulo,cliente_id)', x => x.order('status').order('precisa_ate', {nullsFirst: false}).order('criado_em', {ascending: false}).limit(300));
  const abertos = itens.filter(i => i.status === 'a_comprar').sort((a, b) => PRIOR.findIndex(p => p[0] === a.prioridade) - PRIOR.findIndex(p => p[0] === b.prioridade));
  const feitos = itens.filter(i => i.status !== 'a_comprar').slice(0, 30);
  const previsto = abertos.reduce((s, i) => s + Number(i.preco_estimado_centavos || 0) * Number(i.quantidade || 1), 0);
  const hoje = hojeChave();
  el.innerHTML = `
    <div class="col-unica">
      <div class="card limpo"><h3>A comprar${previsto ? `<span class="muted dir" style="font:500 13px var(--f-corpo);">estimado ${brlC(previsto)}</span>` : ''}</h3>
        ${abertos.length ? abertos.map(i => `<div class="item-lista" data-id="${i.id}"><input type="checkbox" data-comprar="${i.id}" aria-label="Marcar como comprado" style="width:20px;height:20px;">
          <div class="tx"><b>${esc(i.descricao)}${Number(i.quantidade) !== 1 ? ` <span class="pill">${Number(i.quantidade)} ${esc(i.unidade || '')}</span>` : ''}</b>
            <span>${[i.prioridade !== 'normal' ? `<span class="tag ${i.prioridade === 'urgente' ? 'urgente' : 'expirada'}">${i.prioridade}</span>` : '', i.precisa_ate ? `<span class="${i.precisa_ate < hoje ? 'valor-neg' : ''}">até ${dataCurta(i.precisa_ate)}</span>` : '', i.fornecedor ? esc(i.fornecedor.nome) : '', i.oportunidade ? esc(i.oportunidade.titulo) : '', i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener" data-stop>link ↗</a>` : ''].filter(Boolean).join(' · ')}</span></div>
          ${i.preco_estimado_centavos ? `<span class="vl">${brlC(i.preco_estimado_centavos * Number(i.quantidade || 1))}</span>` : ''}
          <button class="btn fantasma peq" data-editar="${i.id}">Editar</button></div>`).join('') : '<div class="vazio">Nada para comprar agora.</div>'}</div>
      ${feitos.length ? `<details class="mais-itens"><summary>Comprados recentemente · ${feitos.length}</summary><div class="card limpo">${feitos.map(i => `<div class="item-lista"><div class="tx"><b style="${i.status === 'cancelado' ? 'text-decoration:line-through;' : ''}">${esc(i.descricao)}</b><span><span class="tag ${i.status}">${i.status === 'comprado' ? 'Comprado' : 'Cancelado'}</span>${i.comprado_em ? ' ' + dataBR(i.comprado_em) : ''}${i.lancamento_id ? ' · no financeiro' : ''}</span></div><button class="btn fantasma peq" data-editar="${i.id}">Ver</button></div>`).join('')}</div></details>` : ''}
    </div>`;
  el.querySelectorAll('[data-editar]').forEach(b => b.onclick = async () => { const r = await itemCompra({existente: itens.find(i => i.id === b.dataset.editar)}); if(r){ aviso(r === 'apagado' ? 'Item apagado.' : 'Item salvo.'); recarregar(); } });
  el.querySelectorAll('[data-comprar]').forEach(cb => cb.onchange = async () => { const r = await comprar(itens.find(i => i.id === cb.dataset.comprar)); if(r) recarregar(); else cb.checked = false; });
}

// marcar como comprado: registra o preço pago e (opcional) a despesa no financeiro
async function comprar(i){
  const est = Number(i.preco_estimado_centavos || 0) * Number(i.quantidade || 1);
  const r = await janela({titulo: 'Comprado!', corpo: `<p class="muted" style="margin-top:0;">${esc(i.descricao)}</p>
    <div class="grade2"><div class="campo"><label class="rot" for="c_v">Valor pago (R$)</label><input type="text" inputmode="decimal" id="c_v" value="${inputValor(est)}" placeholder="0,00"></div>
      <div class="campo"><label class="rot" for="c_d">Data</label><input type="date" id="c_d" value="${hojeChave()}"></div></div>
    <label class="chk"><input type="checkbox" id="c_fin" checked> Lançar a despesa no financeiro</label>`,
    botoes: [{texto: 'Cancelar'}, {texto: 'Confirmar', classe: 'prim', acao: ctx => ({v: centavos(valorDigitado(ctx.valor('#c_v'))), d: ctx.valor('#c_d') || hojeChave(), fin: ctx.valor('#c_fin')})}]});
  if(!r) return null;
  try{
    let lanc = null;
    if(r.fin && r.v > 0){
      const {lancamento} = await import('./v-financeiro.js');
      lanc = await lancamento({tipo: 'despesa', descricao: i.descricao, valor_centavos: r.v, data: r.d, fornecedor_id: i.fornecedor_id, oportunidade_id: i.oportunidade_id, origem: 'compra'});
      if(!lanc) return null;
    }
    await q.altera(T.compras, i.id, {status: 'comprado', comprado_em: new Date(r.d + 'T12:00:00').toISOString(), lancamento_id: lanc?.id || null});
    if(i.recurso_id && r.v > 0) await q.cria(T.precos, {recurso_id: i.recurso_id, fornecedor_id: i.fornecedor_id, preco_centavos: Math.round(r.v / Number(i.quantidade || 1)), quantidade: 1, data: r.d, link: i.link, observacao: 'Compra realizada', lancamento_id: lanc?.id || null});
    aviso('Compra registrada.'); return true;
  }catch(e){ aviso(traduzErro(e)); return null; }
}

export async function itemCompra({existente}){
  const [rs, fs, ops] = await Promise.all([q.lista(T.recursos, '*', x => x.eq('ativo', true).order('nome')), cFornecedores(), q.lista(T.oport, 'id,titulo,cliente:rumeyart_clientes(nome)', x => x.eq('arquivado', false).in('etapa', ['fechado', 'negociacao', 'proposta', 'prototipo']).order('atualizado_em', {ascending: false}))]);
  const x = existente || {quantidade: 1, prioridade: 'normal', status: 'a_comprar'};
  return janela({titulo: existente ? 'Item de compra' : 'Adicionar à lista de compras', corpo: `
    <div class="campo"><label class="rot" for="i_rec">Recurso cadastrado <small>(opcional)</small></label><select id="i_rec" data-add="recurso"><option value="">— item avulso —</option>${rs.map(r => `<option value="${r.id}" data-u="${esc(r.unidade)}" ${r.id === x.recurso_id ? 'selected' : ''}>${esc(r.nome)}</option>`).join('')}</select></div>
    <div class="campo"><label class="rot" for="i_desc">O que comprar *</label><input type="text" id="i_desc" value="${esc(x.descricao)}"></div>
    <div class="grade3"><div class="campo"><label class="rot" for="i_q">Quantidade</label><input type="number" id="i_q" min="0.001" step="any" value="${Number(x.quantidade) || 1}"></div>
      <div class="campo"><label class="rot" for="i_u">Unidade</label><input type="text" id="i_u" value="${esc(x.unidade)}" placeholder="un, mês, ano"></div>
      <div class="campo"><label class="rot" for="i_p">Preço estimado (un.)</label><input type="text" inputmode="decimal" id="i_p" value="${inputValor(x.preco_estimado_centavos)}" placeholder="0,00"></div></div>
    <div class="grade3"><div class="campo"><label class="rot" for="i_pr">Prioridade</label><select id="i_pr">${PRIOR.map(([k, n]) => `<option value="${k}" ${k === x.prioridade ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="campo"><label class="rot" for="i_ate">Precisa até</label><input type="date" id="i_ate" value="${x.precisa_ate || ''}"></div>
      <div class="campo"><label class="rot" for="i_st">Situação</label><select id="i_st"><option value="a_comprar" ${x.status === 'a_comprar' ? 'selected' : ''}>A comprar</option><option value="comprado" ${x.status === 'comprado' ? 'selected' : ''}>Comprado</option><option value="cancelado" ${x.status === 'cancelado' ? 'selected' : ''}>Cancelado</option></select></div></div>
    <div class="grade2"><div class="campo"><label class="rot" for="i_f">Fornecedor</label><select id="i_f" data-add="fornecedor"><option value="">—</option>${fs.filter(f => f.ativo || f.id === x.fornecedor_id).map(f => `<option value="${f.id}" ${f.id === x.fornecedor_id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></div>
      <div class="campo"><label class="rot" for="i_op">Para o projeto</label><select id="i_op"><option value="">— uso geral —</option>${ops.map(o => `<option value="${o.id}" ${o.id === x.oportunidade_id ? 'selected' : ''}>${esc(o.titulo)} · ${esc(o.cliente?.nome || '')}</option>`).join('')}</select></div></div>
    <div class="campo"><label class="rot" for="i_l">Link</label><input type="url" id="i_l" value="${esc(x.link)}" placeholder="https://"></div>
    <div class="campo"><label class="rot" for="i_o">Observações</label><textarea id="i_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>`,
    aoAbrir: ctx => ctx.el.querySelector('#i_rec').addEventListener('change', e => { const o = e.target.selectedOptions[0]; if(!e.target.value) return; if(!ctx.valor('#i_desc')) ctx.el.querySelector('#i_desc').value = o.textContent; if(!ctx.valor('#i_u')) ctx.el.querySelector('#i_u').value = o.dataset.u; }),
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { await q.apaga(T.compras, existente.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {recurso_id: ctx.valor('#i_rec') || null, descricao: ctx.valor('#i_desc'), quantidade: numInput(ctx.valor('#i_q')) || 1, unidade: ctx.valor('#i_u') || null,
          preco_estimado_centavos: centavos(valorDigitado(ctx.valor('#i_p'))) || null, prioridade: ctx.valor('#i_pr'), precisa_ate: ctx.valor('#i_ate') || null, status: ctx.valor('#i_st'),
          fornecedor_id: ctx.valor('#i_f') || null, oportunidade_id: ctx.valor('#i_op') || null, link: ctx.valor('#i_l') || null, observacoes: ctx.valor('#i_o') || null};
        if(row.descricao.length < 2){ ctx.erro('Diga o que comprar.'); return false; }
        if(row.status === 'comprado' && x.status !== 'comprado') row.comprado_em = new Date().toISOString();
        return existente ? q.altera(T.compras, existente.id, row) : q.cria(T.compras, row);
      }}]});
}

// ---------------- recursos e cotações ----------------
async function recursos(el){
  const [rs, precos] = await Promise.all([q.lista(T.recursos, '*', x => x.order('categoria').order('nome')), q.lista(T.precos, '*, fornecedor:rumeyart_fornecedores(id,nome)', x => x.order('data', {ascending: false}).limit(1000))]);
  const de = id => precos.filter(p => p.recurso_id === id);
  const unit = p => Number(p.preco_centavos) / Number(p.quantidade || 1);
  el.innerHTML = `<div class="filtros"><input type="search" id="fBusca" placeholder="Filtrar recursos"><button class="btn linha peq" id="exp" style="margin-left:auto;">Exportar cotações</button></div>
    <div class="cols3">${rs.map(r => { const ps = de(r.id), melhor = ps.length ? ps.reduce((a, b) => unit(a) <= unit(b) ? a : b) : null;
      return `<div class="card" data-busca="${esc(`${r.nome} ${r.categoria || ''}`.toLowerCase())}" style="${r.ativo ? '' : 'opacity:.55;'}"><h3 style="font-size:19px;">${esc(r.nome)}<button class="btn fantasma peq dir" data-rec="${r.id}">Editar</button></h3>
        <div class="muted" style="font-size:12.5px;margin-top:-.5rem;">${esc(r.categoria || 'Sem categoria')} · por ${esc(r.unidade)}</div>
        ${melhor ? `<div style="margin:.7rem 0;padding:.6rem .8rem;border-radius:12px;background:var(--verde-suave);"><div class="eyebrow" style="color:var(--verde);">Melhor preço</div><b class="din" style="font-size:20px;">${brlC(unit(melhor))}</b> <span class="muted" style="font-size:12.5px;">/${esc(r.unidade)} · ${esc(melhor.fornecedor?.nome || 'sem fornecedor')} · ${dataCurta(melhor.data)}</span></div>` : '<div class="vazio" style="margin:.7rem 0;">Nenhuma cotação ainda.</div>'}
        ${ps.slice(0, 5).map(p => `<div class="item-lista" style="padding:.45rem 0;"><div class="tx"><span>${esc(p.fornecedor?.nome || '—')} · ${dataCurta(p.data)}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener">link</a>` : ''}</span></div><span class="vl">${brlC(unit(p))}</span><button class="btn fantasma peq" data-apaga-preco="${p.id}" aria-label="Apagar cotação" title="Apagar" style="width:30px;min-height:30px;padding:0;">✕</button></div>`).join('')}
        <div style="display:flex;gap:.4rem;margin-top:.7rem;flex-wrap:wrap;"><button class="btn linha peq" data-cot="${r.id}">＋ Cotação</button><button class="btn fantasma peq" data-lista="${r.id}">Pôr na lista</button></div></div>`; }).join('') || '<div class="vazio">Nenhum recurso cadastrado.</div>'}</div>`;
  el.querySelector('#fBusca').oninput = e => { const t = e.target.value.trim().toLowerCase(); el.querySelectorAll('[data-busca]').forEach(c => c.classList.toggle('hidden', t && !c.dataset.busca.includes(t))); };
  el.querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => { const r = await editarRecurso(rs.find(x => x.id === b.dataset.rec)); if(r){ aviso(r === 'apagado' ? 'Recurso apagado.' : 'Recurso salvo.'); recarregar(); } });
  el.querySelectorAll('[data-cot]').forEach(b => b.onclick = async () => { if(await cotacao(rs.find(x => x.id === b.dataset.cot))){ aviso('Cotação registrada.'); recarregar(); } });
  el.querySelectorAll('[data-lista]').forEach(b => b.onclick = async () => { const r = rs.find(x => x.id === b.dataset.lista), ps = de(r.id), m = ps.length ? ps.reduce((a, c) => unit(a) <= unit(c) ? a : c) : null;
    try{ await q.cria(T.compras, {recurso_id: r.id, descricao: r.nome, unidade: r.unidade, quantidade: 1, preco_estimado_centavos: m ? Math.round(unit(m)) : null, fornecedor_id: m?.fornecedor_id || null, link: m?.link || null}); aviso('Adicionado à lista de compras.', '<a class="btn prim peq" href="#/compras">Ver lista</a>'); }catch(e){ aviso(traduzErro(e)); } });
  el.querySelectorAll('[data-apaga-preco]').forEach(b => b.onclick = async () => { if(await confirmar('Apagar cotação', 'Remover este preço do histórico?', 'Apagar', 'perigo')){ await q.apaga(T.precos, b.dataset.apagaPreco); recarregar(); } });
  el.querySelector('#exp').onclick = () => { baixar('cotacoes-rumeyart.csv', csv(precos.map(p => ({...p, recurso: rs.find(r => r.id === p.recurso_id)?.nome, forn: p.fornecedor?.nome, un: (unit(p) / 100).toFixed(2).replace('.', ',')})), [['recurso', 'Recurso'], ['forn', 'Fornecedor'], ['un', 'Preço unitário'], ['data', 'Data'], ['link', 'Link'], ['observacao', 'Observação']])); aviso('Planilha baixada.'); };
}

async function cotacao(r){
  const fs = await cFornecedores();
  return janela({titulo: `Cotação · ${r.nome}`, corpo: `
    <div class="grade3"><div class="campo"><label class="rot" for="p_v">Preço (R$)</label><input type="text" inputmode="decimal" id="p_v" placeholder="0,00"></div>
      <div class="campo"><label class="rot" for="p_q">Pela quantidade de</label><input type="number" id="p_q" min="0.001" step="any" value="1"></div>
      <div class="campo"><label class="rot" for="p_d">Data</label><input type="date" id="p_d" value="${hojeChave()}"></div></div>
    <div class="campo"><label class="rot" for="p_f">Fornecedor</label><select id="p_f" data-add="fornecedor"><option value="">—</option>${fs.filter(f => f.ativo).map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></div>
    <div class="campo"><label class="rot" for="p_l">Link</label><input type="url" id="p_l" placeholder="https://"></div>
    <div class="campo"><label class="rot" for="p_o">Observação</label><input type="text" id="p_o" placeholder="Ex.: preço anual à vista"></div>`,
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
      const v = centavos(valorDigitado(ctx.valor('#p_v'))); if(!(v > 0)){ ctx.erro('Informe o preço.'); return false; }
      return q.cria(T.precos, {recurso_id: r.id, preco_centavos: v, quantidade: numInput(ctx.valor('#p_q')) || 1, data: ctx.valor('#p_d') || hojeChave(), fornecedor_id: ctx.valor('#p_f') || null, link: ctx.valor('#p_l') || null, observacao: ctx.valor('#p_o') || null});
    }}]});
}

function editarRecurso(r){
  const x = r || {unidade: 'un', ativo: true};
  return janela({titulo: r ? 'Editar recurso' : 'Novo recurso', corpo: `
    <div class="campo"><label class="rot" for="r_n">Nome *</label><input type="text" id="r_n" value="${esc(x.nome)}" placeholder="Ex.: Plano Supabase Pro"></div>
    <div class="grade2"><div class="campo"><label class="rot" for="r_u">Unidade</label><input type="text" id="r_u" value="${esc(x.unidade)}" list="r_us"><datalist id="r_us"><option value="un"><option value="mês"><option value="ano"><option value="hora"><option value="licença"></datalist></div>
      <div class="campo"><label class="rot" for="r_c">Categoria</label><input type="text" id="r_c" value="${esc(x.categoria)}" list="r_cs"><datalist id="r_cs"><option value="Infraestrutura"><option value="Ferramentas"><option value="Equipamentos"><option value="Serviços"></datalist></div></div>
    <div class="campo"><label class="rot" for="r_o">Observações</label><textarea id="r_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>
    ${r ? `<label class="chk"><input type="checkbox" id="r_a" ${x.ativo ? 'checked' : ''}> Ativo</label>` : ''}`,
    botoes: [...(r ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar recurso', 'As cotações dele também são apagadas.', 'Apagar', 'perigo'))) return false; await q.apaga(T.recursos, r.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {nome: ctx.valor('#r_n'), unidade: ctx.valor('#r_u') || 'un', categoria: ctx.valor('#r_c') || null, observacoes: ctx.valor('#r_o') || null};
        if(row.nome.length < 2){ ctx.erro('Dê um nome.'); return false; }
        if(r){ row.ativo = ctx.valor('#r_a'); return q.altera(T.recursos, r.id, row); }
        return q.cria(T.recursos, row);
      }}]});
}

// ---------------- fornecedores ----------------
async function fornecedoresAba(el){
  const fs = await cFornecedores(true);
  el.innerHTML = `<div class="card" style="padding-top:6px;">${fs.length ? `<table class="tabela"><thead><tr><th>Fornecedor</th><th>Contato</th><th>Categorias</th><th></th></tr></thead><tbody>
    ${fs.map(f => { const w = whatsLink(f.whatsapp); return `<tr class="link" data-id="${f.id}" style="${f.ativo ? '' : 'opacity:.55;'}"><td data-l=""><div class="nm">${esc(f.nome)}</div><div class="sm">${esc([f.contato, f.cidade].filter(Boolean).join(' · '))}</div></td>
      <td data-l="Contato" class="sm">${[f.email ? esc(f.email) : '', f.site ? `<a href="${esc(f.site)}" target="_blank" rel="noopener" data-stop>site ↗</a>` : ''].filter(Boolean).join(' · ') || '—'}</td>
      <td data-l="Categorias">${(f.categorias || []).map(c => `<span class="pill">${esc(c)}</span>`).join(' ') || '<span class="muted">—</span>'}</td>
      <td data-l="">${w ? `<a class="btn verde peq" href="${w}" target="_blank" rel="noopener" data-stop>WhatsApp</a>` : ''}</td></tr>`; }).join('')}</tbody></table>`
    : '<div class="vazio">Nenhum fornecedor. Cadastre quem vende as ferramentas, os equipamentos e os serviços que você usa.</div>'}</div>`;
  el.querySelectorAll('tr[data-id]').forEach(r => r.onclick = async e => { if(e.target.closest('[data-stop]')) return; const x = await editarFornecedor(fs.find(f => f.id === r.dataset.id)); if(x){ limparCache('fornecedores'); aviso(x === 'apagado' ? 'Fornecedor apagado.' : 'Fornecedor salvo.'); recarregar(); } });
}

function editarFornecedor(f){
  const x = f || {ativo: true, categorias: []};
  return janela({titulo: f ? 'Editar fornecedor' : 'Novo fornecedor', corpo: `
    <div class="grade2"><div class="campo"><label class="rot" for="f_n">Nome *</label><input type="text" id="f_n" value="${esc(x.nome)}"></div>
      <div class="campo"><label class="rot" for="f_c">Pessoa de contato</label><input type="text" id="f_c" value="${esc(x.contato)}"></div></div>
    <div class="grade2"><div class="campo"><label class="rot" for="f_w">WhatsApp</label><input type="tel" id="f_w" value="${esc(x.whatsapp)}"></div>
      <div class="campo"><label class="rot" for="f_e">E-mail</label><input type="email" id="f_e" value="${esc(x.email)}"></div></div>
    <div class="grade2"><div class="campo"><label class="rot" for="f_s">Site</label><input type="url" id="f_s" value="${esc(x.site)}" placeholder="https://"></div>
      <div class="campo"><label class="rot" for="f_ci">Cidade</label><input type="text" id="f_ci" value="${esc(x.cidade)}"></div></div>
    <div class="campo"><label class="rot" for="f_cat">Categorias <small>(separadas por vírgula)</small></label><input type="text" id="f_cat" value="${esc((x.categorias || []).join(', '))}" placeholder="Ex.: Hospedagem, Domínios"></div>
    <div class="campo"><label class="rot" for="f_o">Observações</label><textarea id="f_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>
    ${f ? `<label class="chk"><input type="checkbox" id="f_a" ${x.ativo ? 'checked' : ''}> Ativo</label>` : ''}`,
    botoes: [...(f ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar fornecedor', 'Compras e lançamentos ligados a ele continuam, só perdem o vínculo.', 'Apagar', 'perigo'))) return false; await q.apaga(T.fornecedores, f.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {nome: ctx.valor('#f_n'), contato: ctx.valor('#f_c') || null, whatsapp: ctx.valor('#f_w') || null, email: ctx.valor('#f_e') || null, site: ctx.valor('#f_s') || null, cidade: ctx.valor('#f_ci') || null,
          categorias: ctx.valor('#f_cat').split(',').map(s => s.trim()).filter(Boolean), observacoes: ctx.valor('#f_o') || null};
        if(row.nome.length < 2){ ctx.erro('Dê um nome.'); return false; }
        if(f){ row.ativo = ctx.valor('#f_a'); return q.altera(T.fornecedores, f.id, row); }
        return q.cria(T.fornecedores, row);
      }}]});
}
