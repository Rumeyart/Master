// Financeiro: visão do mês, lançamentos, contas e cartões, categorias e importação de extrato
import {sb, q, T, tudo, contas as cContas, cartoes as cCartoes, categorias as cCategorias, fornecedores as cFornecedores, clientes as listarClientes, limparCache} from './db.js';
import {esc, brl, brlC, centavos, inputValor, valorDigitado, dataCurta, dataBR, hojeChave, mesChave, mesNome, mesLimites, somaMes, MESES, janela, aviso, traduzErro, confirmar, csv, baixar, opcoes} from './util.js';
import {ICONES} from './icones.js';
import {ir, recarregar} from './app.js';

const ABAS = [['visao', 'Visão geral', 'visao'], ['lancamentos', 'Lançamentos', 'financeiro'], ['contas', 'Contas e cartões', 'cartao'], ['categorias', 'Categorias', 'categorias'], ['importar', 'Importar extrato', 'importar']];
const TIPO_NOME = {receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferência', pagamento_fatura: 'Pagamento de fatura'};
const TIPOS_CONTA = [['corrente', 'Conta corrente'], ['digital', 'Conta digital'], ['poupanca', 'Poupança'], ['caixa', 'Dinheiro / caixa'], ['investimento', 'Investimento']];
const CORES = ['#2566A8', '#16213A', '#E0703A', '#7A4466', '#1E7A7A', '#2F7D55', '#A8741A', '#5C6477'];

export async function render(el, params){
  const aba = ABAS.some(a => a[0] === params.aba) ? params.aba : 'visao';
  const mes = /^\d{4}-\d{2}$/.test(params.mes || '') ? params.mes : mesChave();
  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Gestão</div><h1>Financeiro</h1>
      <div class="dir">${['visao', 'lancamentos'].includes(aba) ? `<div class="seg" style="align-items:center;"><button type="button" data-mes="${somaMes(mes, -1)}" aria-label="Mês anterior">‹</button><button type="button" class="on" data-mes="${mesChave()}" title="Voltar para este mês">${mesNome(mes)}</button><button type="button" data-mes="${somaMes(mes, 1)}" aria-label="Próximo mês">›</button></div>` : ''}
        <button class="btn linha" data-novo="despesa"><span class="ic">${ICONES.despesa}</span>Despesa</button><button class="btn prim" data-novo="receita"><span class="ic">${ICONES.receita}</span>Receita</button></div></div>
    <nav class="abas">${ABAS.map(([k, n, ic]) => `<a href="#/financeiro?aba=${k}${['visao', 'lancamentos'].includes(k) && mes !== mesChave() ? '&mes=' + mes : ''}" class="${k === aba ? 'on' : ''}"><span class="ic">${ICONES[ic]}</span>${n}</a>`).join('')}</nav>
    <div id="fin"><div class="carregando">Carregando…</div></div>`;
  el.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => ir(`financeiro?aba=${aba}&mes=${b.dataset.mes}${params.cliente ? '&cliente=' + params.cliente : ''}`));
  el.querySelectorAll('[data-novo]').forEach(b => b.onclick = async () => { if(await lancamento({tipo: b.dataset.novo})){ aviso('Lançamento salvo.'); recarregar(); } });
  const alvo = el.querySelector('#fin');
  if(aba === 'visao') await visao(alvo, mes);
  if(aba === 'lancamentos') await lancamentos(alvo, mes, params);
  if(aba === 'contas') await contasCartoes(alvo);
  if(aba === 'categorias') await categoriasAba(alvo);
  if(aba === 'importar') await importar(alvo);
}

// ================= visão geral =================
async function visao(el, mes){
  const [ini, fim] = mesLimites(mes), ini6 = mesLimites(somaMes(mes, -5))[0];
  const [lancs, hist, saldos, faturas, cats, pend] = await Promise.all([
    q.lista(T.lanc, '*', x => x.gte('data', ini).lt('data', fim).order('data')),
    q.lista(T.lanc, 'tipo,valor_centavos,data,status', x => x.in('tipo', ['receita', 'despesa']).gte('data', ini6).lt('data', fim)),
    q.lista(T.saldos, '*', x => x.eq('arquivada', false).order('ordem')),
    q.lista(T.faturas, '*', x => x.eq('arquivado', false).order('nome')),
    cCategorias(),
    q.lista(T.lanc, '*, cliente:rumeyart_clientes(nome)', x => x.eq('status', 'pendente').lte('data', mesLimites(somaMes(mesChave(), 1))[1]).order('data').limit(20))
  ]);
  const soma = (l, f) => l.filter(f).reduce((s, x) => s + Number(x.valor_centavos), 0);
  const rec = soma(lancs, l => l.tipo === 'receita' && l.status === 'pago'), recP = soma(lancs, l => l.tipo === 'receita');
  const des = soma(lancs, l => l.tipo === 'despesa' && l.status === 'pago'), desP = soma(lancs, l => l.tipo === 'despesa');
  const porCat = {};
  lancs.filter(l => l.tipo === 'despesa').forEach(l => { porCat[l.categoria_id || '_'] = (porCat[l.categoria_id || '_'] || 0) + Number(l.valor_centavos); });
  const catsDes = Object.entries(porCat).map(([id, v]) => { const c = cats.find(x => x.id === id); return {nome: c?.nome || 'Sem categoria', cor: c?.cor || '#838A99', v}; }).sort((a, b) => b.v - a.v);
  const maxCat = Math.max(1, ...catsDes.map(c => c.v));
  const meses = [...Array(6)].map((_, i) => somaMes(mes, i - 5));
  const serie = meses.map(m => { const [a, b] = mesLimites(m); const l = hist.filter(x => x.data >= a && x.data < b); return {m, r: soma(l, x => x.tipo === 'receita'), d: soma(l, x => x.tipo === 'despesa')}; });
  const hoje = hojeChave();

  el.innerHTML = `
    <div class="resumo-mes">
      <div class="kpi" style="--c:var(--verde)"><div class="k"><i></i>Receitas de ${MESES[+mes.slice(5) - 1]}</div><div class="v din valor-pos">${brlC(rec)}</div><div class="d">${recP > rec ? `+ ${brlC(recP - rec)} previsto` : 'tudo recebido'}</div></div>
      <div class="kpi" style="--c:var(--vermelho)"><div class="k"><i></i>Despesas</div><div class="v din valor-neg">${brlC(des)}</div><div class="d">${desP > des ? `+ ${brlC(desP - des)} a pagar` : 'nada pendente'}</div></div>
      <div class="kpi destaque"><div class="k"><i></i>Resultado do mês</div><div class="v din">${brlC(rec - des)}</div><div class="d">previsto: ${brlC(recP - desP)}</div></div>
    </div>
    <div class="cols">
      <div>
        <div class="card"><h3>Receitas e despesas · 6 meses</h3><div class="grafico">${grafico(serie)}</div>
          <div class="legenda"><span><i style="background:var(--azul)"></i>Receitas</span><span><i style="background:var(--laranja)"></i>Despesas</span></div></div>
        <div class="card"><h3>Para onde foi o dinheiro</h3>
          ${catsDes.length ? catsDes.map(c => `<div class="cat-linha" style="--c:${c.cor}"><div class="nm"><i></i>${esc(c.nome)}</div><div class="vl">${brlC(c.v)}</div><div class="br"><i style="width:${Math.round(c.v / maxCat * 100)}%"></i></div></div>`).join('') : '<div class="vazio">Nenhuma despesa neste mês.</div>'}</div>
      </div>
      <div>
        <div class="card"><h3>Contas <a class="btn fantasma peq dir" href="#/financeiro?aba=contas">Gerenciar</a></h3>
          <div class="contas-grade">${saldos.map(c => `<div class="conta-card" style="--cc:${c.cor || '#2566A8'}" data-conta="${c.id}"><div><div class="t">${esc(c.banco || tipoConta(c.tipo))}</div><div class="nm">${esc(c.apelido)}</div></div><div><div class="v">${brlC(c.saldo_centavos)}</div>${c.saldo_previsto_centavos !== c.saldo_centavos ? `<div class="p">previsto ${brlC(c.saldo_previsto_centavos)}</div>` : ''}</div></div>`).join('')}
          ${faturas.map(k => `<div class="conta-card cartao-card" data-cartao="${k.id}"><div><div class="t">Cartão${k.final ? ' •••• ' + esc(k.final) : ''}</div><div class="nm">${esc(k.nome)}</div></div><div><div class="v">${brlC(k.fatura_centavos)}</div><div class="p">${k.vencimento ? 'vence dia ' + k.vencimento : 'fatura em aberto'}${k.limite_centavos ? ' · limite ' + brlC(k.limite_centavos) : ''}</div></div></div>`).join('')}</div></div>
        <div class="card"><h3>A receber e a pagar</h3>
          ${pend.length ? pend.map(l => `<div class="item-lista"><span class="lanc-tipo ${l.tipo}">${ICONES[l.tipo]}</span><div class="tx"><b>${esc(l.descricao)}</b><span class="${l.data < hoje ? 'valor-neg' : ''}">${l.data < hoje ? 'venceu ' : ''}${dataCurta(l.data)}${l.cliente?.nome ? ' · ' + esc(l.cliente.nome) : ''}${l.parcelas > 1 ? ` · ${l.parcela}/${l.parcelas}` : ''}</span></div><span class="vl ${l.tipo === 'receita' ? 'valor-pos' : 'valor-neg'}">${brlC(l.valor_centavos)}</span><button class="btn verde peq" data-pagar="${l.id}">${l.tipo === 'receita' ? 'Recebi' : 'Paguei'}</button></div>`).join('')
            : '<div class="vazio">Nada pendente até o fim do próximo mês.</div>'}</div>
      </div>
    </div>`;
  el.querySelectorAll('[data-pagar]').forEach(b => b.onclick = () => marcarPago(pend.find(l => l.id === b.dataset.pagar)));
  el.querySelectorAll('[data-conta]').forEach(c => c.onclick = () => ir('financeiro?aba=lancamentos&conta=' + c.dataset.conta));
  el.querySelectorAll('[data-cartao]').forEach(c => c.onclick = () => ir('financeiro?aba=lancamentos&cartao=' + c.dataset.cartao));
}
const tipoConta = t => (TIPOS_CONTA.find(x => x[0] === t) || [t, t])[1];

function grafico(serie){
  const W = 560, H = 190, P = 26, max = Math.max(1, ...serie.flatMap(s => [s.r, s.d]));
  const bw = (W - P * 2) / serie.length, b = Math.min(22, bw / 3);
  const y = v => H - 22 - (v / max) * (H - 40);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de receitas e despesas">
    ${[0, .5, 1].map(f => `<line x1="${P}" x2="${W - P}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="currentColor" stroke-opacity=".1"/>`).join('')}
    ${serie.map((s, i) => { const cx = P + bw * i + bw / 2; return `
      <rect x="${cx - b - 2}" y="${y(s.r)}" width="${b}" height="${Math.max(0, H - 22 - y(s.r))}" rx="5" fill="var(--azul)"><title>Receitas: ${brlC(s.r)}</title></rect>
      <rect x="${cx + 2}" y="${y(s.d)}" width="${b}" height="${Math.max(0, H - 22 - y(s.d))}" rx="5" fill="var(--laranja)"><title>Despesas: ${brlC(s.d)}</title></rect>
      <text x="${cx}" y="${H - 5}" text-anchor="middle">${MESES[+s.m.slice(5) - 1].slice(0, 3)}</text>`; }).join('')}
  </svg>`;
}

async function marcarPago(l){
  if(!l) return;
  try{
    const row = {status: 'pago'};
    if(l.tipo === 'receita' && !l.conta_id){ const cs = await cContas(); row.conta_id = cs.find(c => !c.arquivada)?.id; }
    await q.altera(T.lanc, l.id, row);
    aviso(l.tipo === 'receita' ? 'Recebimento confirmado.' : 'Pagamento confirmado.'); recarregar();
  }catch(e){ aviso(traduzErro(e)); }
}

// ================= lançamentos =================
async function lancamentos(el, mes, {conta, cartao, cliente}){
  const [ini, fim] = mesLimites(mes);
  const [lista, cs, ks, cats] = await Promise.all([
    q.lista(T.lanc, '*, cliente:rumeyart_clientes(id,nome), fornecedor:rumeyart_fornecedores(id,nome)', x => {
      x = cliente ? x.eq('cliente_id', cliente) : x.gte('data', ini).lt('data', fim);
      if(conta) x = x.or(`conta_id.eq.${conta},conta_destino_id.eq.${conta}`);
      if(cartao) x = x.eq('cartao_id', cartao);
      return x.order('data', {ascending: false}).order('criado_em', {ascending: false}).limit(1000);
    }),
    cContas(), cCartoes(), cCategorias()
  ]);
  const nomeConta = id => cs.find(c => c.id === id)?.apelido || '';
  const nomeCartao = id => ks.find(c => c.id === id)?.nome || '';
  const nomeCat = id => cats.find(c => c.id === id)?.nome || '';
  const filtroTxt = conta ? `Conta: ${nomeConta(conta)}` : cartao ? `Cartão: ${nomeCartao(cartao)}` : cliente ? `Cliente: ${lista[0]?.cliente?.nome || ''} (todos os meses)` : '';
  const sinal = l => l.tipo === 'receita' || (l.tipo === 'transferencia' && conta && l.conta_destino_id === conta) ? 1 : l.tipo === 'transferencia' && !conta ? 0 : -1;
  const total = lista.reduce((s, l) => s + sinal(l) * Number(l.valor_centavos), 0);
  const hoje = hojeChave();

  el.innerHTML = `
    ${filtroTxt ? `<div class="alerta" style="background:var(--azul-suave);border-color:transparent;"><span class="ic" style="color:var(--azul)">${ICONES.visao}</span><div>${esc(filtroTxt)} · <a href="#/financeiro?aba=lancamentos&mes=${mes}">tirar filtro</a></div></div>` : ''}
    <div class="filtros">
      <input type="search" id="fBusca" placeholder="Descrição, cliente, fornecedor">
      <select id="fTipo"><option value="">Todos os tipos</option>${Object.entries(TIPO_NOME).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <select id="fStatus"><option value="">Pagos e pendentes</option><option value="pago">Só pagos</option><option value="pendente">Só pendentes</option></select>
      <select id="fCat"><option value="">Todas as categorias</option>${cats.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select>
      <button class="btn linha peq" id="exp" style="margin-left:auto;">Exportar CSV</button>
    </div>
    <div class="card" style="padding-top:6px;">
      ${lista.length ? `<table class="tabela"><thead><tr><th></th><th>Descrição</th><th>Data</th><th>Onde</th><th>Situação</th><th class="num">Valor</th></tr></thead><tbody>
        ${lista.map(l => `<tr class="link" data-id="${l.id}" data-t="${l.tipo}" data-s="${l.status}" data-c="${l.categoria_id || ''}" data-busca="${esc(`${l.descricao} ${l.cliente?.nome || ''} ${l.fornecedor?.nome || ''} ${l.sub || ''}`.toLowerCase())}">
          <td data-l=""><span class="lanc-tipo ${l.tipo}">${ICONES[l.tipo]}</span></td>
          <td data-l=""><div class="nm">${esc(l.descricao)}${l.parcelas > 1 ? ` <span class="pill">${l.parcela}/${l.parcelas}</span>` : ''}${l.recorrente ? ' <span class="pill">mensal</span>' : ''}</div>
            <div class="sm">${[nomeCat(l.categoria_id), l.sub, l.cliente?.nome, l.fornecedor?.nome].filter(Boolean).map(esc).join(' · ') || TIPO_NOME[l.tipo]}</div></td>
          <td data-l="Data" class="sm">${dataCurta(l.data)}</td>
          <td data-l="Onde" class="sm">${esc(l.tipo === 'transferencia' ? `${nomeConta(l.conta_id)} → ${nomeConta(l.conta_destino_id)}` : l.tipo === 'pagamento_fatura' ? `${nomeConta(l.conta_id)} → ${nomeCartao(l.cartao_id)}` : l.cartao_id ? nomeCartao(l.cartao_id) : nomeConta(l.conta_id))}</td>
          <td data-l="Situação">${l.status === 'pago' ? `<span class="tag pago">${l.tipo === 'receita' ? 'Recebido' : 'Pago'}</span>` : `<button class="btn ${l.data < hoje ? 'perigo' : 'fantasma'} peq" data-pagar="${l.id}" title="Marcar como ${l.tipo === 'receita' ? 'recebido' : 'pago'}">${l.data < hoje ? 'Atrasado · ' : ''}${l.tipo === 'receita' ? 'Recebi' : 'Paguei'}</button>`}</td>
          <td data-l="Valor" class="num ${sinal(l) > 0 ? 'valor-pos' : sinal(l) < 0 ? 'valor-neg' : ''}">${sinal(l) < 0 ? '−' : sinal(l) > 0 ? '+' : ''}${brlC(l.valor_centavos)}</td></tr>`).join('')}
      </tbody></table>
      <div style="display:flex;justify-content:flex-end;gap:.6rem;padding:.8rem .7rem 0;border-top:1px solid var(--linha);font-size:14px;"><span class="muted">Saldo do período</span><b class="din ${total < 0 ? 'valor-neg' : 'valor-pos'}">${brlC(total)}</b></div>`
      : `<div class="vazio">Nenhum lançamento em ${mesNome(mes)}. Use os botões Receita e Despesa ou importe o extrato do banco.</div>`}
    </div>`;

  const filtrar = () => {
    const t = el.querySelector('#fBusca').value.trim().toLowerCase(), ti = el.querySelector('#fTipo').value, st = el.querySelector('#fStatus').value, ca = el.querySelector('#fCat').value;
    el.querySelectorAll('tr[data-id]').forEach(r => r.classList.toggle('hidden', (t && !r.dataset.busca.includes(t)) || (ti && r.dataset.t !== ti) || (st && r.dataset.s !== st) || (ca && r.dataset.c !== ca)));
  };
  ['#fBusca', '#fTipo', '#fStatus', '#fCat'].forEach(s => el.querySelector(s).addEventListener('input', filtrar));
  el.querySelectorAll('[data-pagar]').forEach(b => b.onclick = e => { e.stopPropagation(); marcarPago(lista.find(l => l.id === b.dataset.pagar)); });
  el.querySelectorAll('tr[data-id]').forEach(r => r.onclick = async () => { const r2 = await lancamento({existente: lista.find(l => l.id === r.dataset.id)}); if(r2){ aviso(r2 === 'apagado' ? 'Lançamento apagado.' : 'Lançamento salvo.'); recarregar(); } });
  el.querySelector('#exp').onclick = () => {
    baixar(`financeiro-rumeyart-${cliente ? 'cliente' : mes}.csv`, csv(lista, [['data', 'Data'], [l => TIPO_NOME[l.tipo], 'Tipo'], ['descricao', 'Descrição'], [l => nomeCat(l.categoria_id), 'Categoria'], ['sub', 'Subcategoria'],
      [l => (sinal(l) < 0 ? '-' : '') + (l.valor_centavos / 100).toFixed(2).replace('.', ','), 'Valor'], ['status', 'Situação'], [l => l.cartao_id ? nomeCartao(l.cartao_id) : nomeConta(l.conta_id), 'Conta/cartão'],
      [l => l.cliente?.nome || '', 'Cliente'], [l => l.fornecedor?.nome || '', 'Fornecedor'], [l => l.parcelas > 1 ? `${l.parcela}/${l.parcelas}` : '', 'Parcela'], ['observacoes', 'Observações']]));
    aviso('Planilha baixada.');
  };
}

// ================= janela de lançamento =================
// lancamento({tipo, existente, descricao, valor_centavos, cliente_id, oportunidade_id, fornecedor_id, cartao_id, conta_id, origem, data})
export async function lancamento(o = {}){
  const [cs, ks, cats, fs, cls] = await Promise.all([cContas(), cCartoes(), cCategorias(), cFornecedores(), listarClientes(false)]);
  const e = o.existente;
  const L = e ? {...e} : {tipo: o.tipo || 'despesa', descricao: o.descricao || '', valor_centavos: o.valor_centavos || 0, data: o.data || hojeChave(), status: 'pago',
    conta_id: o.conta_id || cs.find(c => !c.arquivada)?.id, cartao_id: o.cartao_id || null, cliente_id: o.cliente_id || null, oportunidade_id: o.oportunidade_id || null,
    fornecedor_id: o.fornecedor_id || null, origem: o.origem || 'manual'};
  if(o.conta_destino_id) L.conta_destino_id = o.conta_destino_id;
  const contasAt = cs.filter(c => !c.arquivada || c.id === L.conta_id || c.id === L.conta_destino_id);
  const cartoesAt = ks.filter(k => !k.arquivado || k.id === L.cartao_id);
  const optContas = sel => contasAt.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.apelido)}</option>`).join('');
  const optOnde = () => contasAt.map(c => `<option value="c:${c.id}" ${!L.cartao_id && c.id === L.conta_id ? 'selected' : ''}>Conta · ${esc(c.apelido)}</option>`).join('') + cartoesAt.map(k => `<option value="k:${k.id}" ${k.id === L.cartao_id ? 'selected' : ''}>Cartão · ${esc(k.nome)}</option>`).join('');
  const grupo = e?.grupo_id ? (await q.lista(T.lanc, 'id,parcela,status,data', x => x.eq('grupo_id', e.grupo_id).order('data'))) : [];

  const corpo = `
    ${e ? '' : `<div class="tipo-escolha" id="l_tipos">${Object.entries(TIPO_NOME).map(([k, n]) => `<button type="button" data-t="${k}" class="${k === L.tipo ? 'on' : ''}">${n}</button>`).join('')}</div>`}
    <div class="grade2">
      <div class="campo"><label class="rot" for="l_val">Valor (R$) *</label><input type="text" id="l_val" inputmode="decimal" value="${inputValor(L.valor_centavos)}" placeholder="0,00" style="font-size:20px;font-family:var(--f-mono);"></div>
      <div class="campo"><label class="rot" for="l_data">Data *</label><input type="date" id="l_data" value="${L.data}"></div>
    </div>
    <div class="campo"><label class="rot" for="l_desc">Descrição *</label><input type="text" id="l_desc" value="${esc(L.descricao)}" list="l_sug" maxlength="160"><datalist id="l_sug"></datalist></div>
    <div data-so="receita despesa" class="grade2">
      <div class="campo"><label class="rot" for="l_cat">Categoria</label><select id="l_cat"></select></div>
      <div class="campo"><label class="rot" for="l_sub">Subcategoria</label><select id="l_sub"></select></div>
    </div>
    <div data-so="receita" class="campo"><label class="rot" for="l_conta_r">Conta que recebe</label><select id="l_conta_r">${optContas(L.conta_id)}</select></div>
    <div data-so="despesa" class="campo"><label class="rot" for="l_onde">Pago com</label><select id="l_onde">${optOnde()}</select></div>
    <div data-so="transferencia" class="grade2">
      <div class="campo"><label class="rot" for="l_de">De</label><select id="l_de">${optContas(L.conta_id)}</select></div>
      <div class="campo"><label class="rot" for="l_para">Para</label><select id="l_para">${optContas(L.conta_destino_id || contasAt.find(c => c.id !== L.conta_id)?.id)}</select></div>
    </div>
    <div data-so="pagamento_fatura" class="grade2">
      <div class="campo"><label class="rot" for="l_cartao">Cartão</label><select id="l_cartao">${cartoesAt.map(k => `<option value="${k.id}" ${k.id === L.cartao_id ? 'selected' : ''}>${esc(k.nome)}</option>`).join('') || '<option value="">Cadastre um cartão</option>'}</select></div>
      <div class="campo"><label class="rot" for="l_conta_p">Conta que paga</label><select id="l_conta_p">${optContas(L.conta_id)}</select></div>
    </div>
    <div data-so="receita" class="campo"><label class="rot" for="l_cli">Cliente <small>(opcional)</small></label><select id="l_cli"><option value="">—</option>${cls.map(c => `<option value="${c.id}" ${c.id === L.cliente_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
    <div data-so="despesa" class="campo"><label class="rot" for="l_forn">Fornecedor <small>(opcional)</small></label><select id="l_forn"><option value="">—</option>${fs.filter(f => f.ativo || f.id === L.fornecedor_id).map(f => `<option value="${f.id}" ${f.id === L.fornecedor_id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></div>
    <label class="chk"><input type="checkbox" id="l_pago" ${L.status === 'pago' ? 'checked' : ''}> <span id="l_pago_t">Já foi pago</span></label>
    ${e ? (grupo.length > 1 ? `<p class="muted" style="font-size:12.5px;margin-top:.8rem;">Parte de um grupo de ${grupo.length} lançamentos (${e.recorrente ? 'repetição mensal' : 'parcelas'}). As mudanças valem só para este.</p>` : '') : `
    <div data-so="receita despesa" style="margin-top:.9rem;padding:.8rem .9rem;border-radius:14px;background:var(--areia-2);">
      <div class="seg" id="l_rep"><button type="button" data-r="1" class="on">Uma vez</button><button type="button" data-r="parc">Parcelado</button><button type="button" data-r="mes">Todo mês</button></div>
      <div id="l_rep_n" class="grade2 hidden"><div class="campo"><label class="rot" for="l_n" id="l_n_rot">Parcelas</label><input type="number" id="l_n" min="2" max="36" value="3"></div><div class="campo"><div class="rot">&nbsp;</div><div class="muted" id="l_rep_info" style="font-size:12.5px;padding-top:.6rem;"></div></div></div>
    </div>`}
    <div class="campo"><label class="rot" for="l_obs">Observações</label><textarea id="l_obs" style="min-height:60px;">${esc(L.observacoes)}</textarea></div>`;

  return janela({titulo: e ? `Editar ${TIPO_NOME[e.tipo].toLowerCase()}` : 'Novo lançamento', corpo,
    aoAbrir: ctx => {
      const $ = s => ctx.el.querySelector(s);
      let tipo = L.tipo, rep = '1';
      const mostrar = () => {
        ctx.el.querySelectorAll('[data-so]').forEach(x => x.classList.toggle('hidden', !x.dataset.so.split(' ').includes(tipo)));
        $('#l_pago_t').textContent = tipo === 'receita' ? 'Já foi recebido' : tipo === 'transferencia' ? 'Já foi feita' : 'Já foi pago';
        const cs2 = cats.filter(c => c.tipo === tipo && (!c.arquivada || c.id === L.categoria_id));
        if(['receita', 'despesa'].includes(tipo)){
          $('#l_cat').innerHTML = '<option value="">— sem categoria —</option>' + cs2.map(c => `<option value="${c.id}" ${c.id === L.categoria_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
          subs();
        }
        $('#l_sug').innerHTML = '';
        if(!e && !$('#l_desc').value){ if(tipo === 'transferencia') $('#l_desc').value = 'Transferência entre contas'; if(tipo === 'pagamento_fatura') $('#l_desc').value = 'Pagamento da fatura'; }
      };
      const subs = () => { const c = cats.find(x => x.id === $('#l_cat').value); $('#l_sub').innerHTML = '<option value="">—</option>' + (c?.subs || []).map(s => `<option ${s === L.sub ? 'selected' : ''}>${esc(s)}</option>`).join(''); };
      $('#l_cat').addEventListener('change', subs);
      ctx.el.querySelectorAll('#l_tipos [data-t]').forEach(b => b.onclick = () => { tipo = b.dataset.t; ctx.el.querySelectorAll('#l_tipos button').forEach(x => x.classList.toggle('on', x === b)); mostrar(); });
      const infoRep = () => {
        if(rep === '1') return; const n = Math.max(2, parseInt($('#l_n').value, 10) || 2), v = centavos(valorDigitado($('#l_val').value));
        $('#l_rep_info').textContent = rep === 'parc' ? `${n}× de ${brlC(Math.floor(v / n))}${v % n ? ' (a última ajusta os centavos)' : ''}` : `${n} lançamentos de ${brlC(v)}, um por mês`;
      };
      ctx.el.querySelectorAll('#l_rep [data-r]').forEach(b => b.onclick = () => { rep = b.dataset.r; ctx.el.querySelectorAll('#l_rep button').forEach(x => x.classList.toggle('on', x === b)); $('#l_rep_n').classList.toggle('hidden', rep === '1'); $('#l_n_rot').textContent = rep === 'parc' ? 'Parcelas' : 'Por quantos meses'; if(rep === 'mes' && +$('#l_n').value < 12) $('#l_n').value = 12; infoRep(); });
      $('#l_n')?.addEventListener('input', infoRep); $('#l_val').addEventListener('input', infoRep);
      // escolher categoria sozinho a partir de lançamentos parecidos
      $('#l_desc').addEventListener('change', async () => {
        if($('#l_cat').value || !['receita', 'despesa'].includes(tipo)) return;
        const t = $('#l_desc').value.trim(); if(t.length < 3) return;
        const {data} = await sb.from(T.lanc).select('categoria_id,sub').eq('tipo', tipo).ilike('descricao', t.replace(/[%_]/g, '') + '%').not('categoria_id', 'is', null).limit(1);
        if(data?.[0]){ L.categoria_id = data[0].categoria_id; L.sub = data[0].sub; mostrar(); }
      });
      ctx._tipo = () => tipo; ctx._rep = () => rep;
      mostrar();
    },
    botoes: [...(e ? [{texto: 'Apagar', classe: 'perigo', acao: async ctx => {
        const futuros = grupo.filter(g => g.data >= e.data && g.status === 'pendente' && g.id !== e.id);
        const r = await janela({titulo: 'Apagar lançamento', corpo: `<p style="margin:0;">Apagar <b>${esc(e.descricao)}</b> de ${brlC(e.valor_centavos)}?</p>`, botoes: [{texto: 'Cancelar'}, ...(futuros.length ? [{texto: `Este e os ${futuros.length} próximos pendentes`, classe: 'perigo', valor: 'todos'}] : []), {texto: 'Só este', classe: 'perigo', valor: 'um'}]});
        if(!r) return false;
        if(r === 'todos') for(const g of futuros) await q.apaga(T.lanc, g.id);
        await q.apaga(T.lanc, e.id); return 'apagado';
      }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const tipo = ctx._tipo(), v = centavos(valorDigitado(ctx.valor('#l_val')));
        const row = {tipo, descricao: ctx.valor('#l_desc'), valor_centavos: v, data: ctx.valor('#l_data'), status: ctx.valor('#l_pago') ? 'pago' : 'pendente', observacoes: ctx.valor('#l_obs') || null,
          conta_id: null, cartao_id: null, conta_destino_id: null, categoria_id: null, sub: null, cliente_id: null, fornecedor_id: null};
        if(!(v > 0)){ ctx.erro('Informe o valor.'); return false; }
        if(!row.data){ ctx.erro('Informe a data.'); return false; }
        if(!row.descricao){ ctx.erro('Escreva uma descrição.'); return false; }
        if(tipo === 'receita'){ row.conta_id = ctx.valor('#l_conta_r') || null; row.cliente_id = ctx.valor('#l_cli') || null; row.oportunidade_id = row.cliente_id === L.cliente_id ? L.oportunidade_id || null : null; }
        if(tipo === 'despesa'){ const w = ctx.valor('#l_onde'); if(w.startsWith('k:')) row.cartao_id = w.slice(2); else row.conta_id = w.slice(2) || null; row.fornecedor_id = ctx.valor('#l_forn') || null; }
        if(['receita', 'despesa'].includes(tipo)){ row.categoria_id = ctx.valor('#l_cat') || null; row.sub = ctx.valor('#l_sub') || null; }
        if(tipo === 'transferencia'){ row.conta_id = ctx.valor('#l_de'); row.conta_destino_id = ctx.valor('#l_para'); if(!row.conta_id || row.conta_id === row.conta_destino_id){ ctx.erro('Escolha duas contas diferentes.'); return false; } }
        if(tipo === 'pagamento_fatura'){ row.cartao_id = ctx.valor('#l_cartao'); row.conta_id = ctx.valor('#l_conta_p'); if(!row.cartao_id){ ctx.erro('Cadastre um cartão primeiro.'); return false; } }
        if(row.status === 'pago' && tipo === 'receita' && !row.conta_id){ ctx.erro('Escolha a conta que recebeu.'); return false; }
        if(e) return q.altera(T.lanc, e.id, row);
        row.origem = L.origem || 'manual'; if(tipo === 'despesa' && L.oportunidade_id) row.oportunidade_id = L.oportunidade_id;
        const rep = ctx._rep();
        if(rep === '1' || !['receita', 'despesa'].includes(tipo)) return q.cria(T.lanc, row);
        const n = Math.min(36, Math.max(2, parseInt(ctx.valor('#l_n'), 10) || 2)), grupo_id = crypto.randomUUID(), base = Math.floor(v / n);
        const [a, m, d] = row.data.split('-').map(Number);
        const linhas = [...Array(n)].map((_, i) => {
          const dt = new Date(a, m - 1 + i, 1); dt.setDate(Math.min(d, new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()));
          const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          return {...row, data: iso, status: i === 0 ? row.status : 'pendente', grupo_id,
            ...(rep === 'parc' ? {valor_centavos: i === n - 1 ? v - base * (n - 1) : base, parcela: i + 1, parcelas: n} : {recorrente: true})};
        });
        const r = await q.criaVarios(T.lanc, linhas); return r[0];
      }}]});
}

// ================= contas e cartões =================
async function contasCartoes(el){
  const [saldos, faturas, cs] = await Promise.all([q.lista(T.saldos, '*', x => x.order('ordem')), q.lista(T.faturas, '*', x => x.order('nome')), cContas(true)]);
  el.innerHTML = `
    <div class="card"><h3>Contas <button class="btn linha peq dir" id="novaConta">＋ Conta</button></h3>
      <div class="contas-grade">${saldos.map(c => `<div class="conta-card" style="--cc:${c.cor || '#2566A8'};${c.arquivada ? 'opacity:.5;' : ''}" data-conta="${c.id}"><div><div class="t">${esc(c.banco || tipoConta(c.tipo))}${c.arquivada ? ' · arquivada' : ''}</div><div class="nm">${esc(c.apelido)}</div></div><div><div class="v">${brlC(c.saldo_centavos)}</div><div class="p">previsto ${brlC(c.saldo_previsto_centavos)} · toque para editar</div></div></div>`).join('') || '<div class="vazio">Nenhuma conta.</div>'}</div></div>
    <div class="card"><h3>Cartões de crédito <button class="btn linha peq dir" id="novoCartao">＋ Cartão</button></h3>
      <div class="contas-grade">${faturas.map(k => `<div class="conta-card cartao-card" style="${k.arquivado ? 'opacity:.5;' : ''}" data-cartao="${k.id}"><div><div class="t">${esc(k.banco || 'Cartão')}${k.final ? ' •••• ' + esc(k.final) : ''}</div><div class="nm">${esc(k.nome)}</div></div>
        <div><div class="v">${brlC(k.fatura_centavos)}</div><div class="p">${[k.fechamento ? 'fecha dia ' + k.fechamento : '', k.vencimento ? 'vence dia ' + k.vencimento : ''].filter(Boolean).join(' · ') || 'fatura em aberto'}</div>
        ${k.limite_centavos ? `<div class="barra" style="margin-top:.5rem;background:rgba(255,255,255,.15);"><i style="width:${Math.min(100, Math.round(k.fatura_centavos / k.limite_centavos * 100))}%"></i></div>` : ''}</div></div>`).join('') || '<div class="vazio">Nenhum cartão cadastrado. Cadastre para lançar compras no crédito e acompanhar a fatura.</div>'}</div></div>
    <p class="muted" style="font-size:13px;">O saldo de cada conta = saldo inicial + tudo que foi recebido − tudo que foi pago por ela (transferências e pagamentos de fatura incluídos). A fatura do cartão soma as compras pagas com ele menos os pagamentos de fatura.</p>`;
  el.querySelector('#novaConta').onclick = async () => { if(await editarConta()){ limparCache('contas'); aviso('Conta criada.'); recarregar(); } };
  el.querySelector('#novoCartao').onclick = async () => { if(await editarCartao(null, cs)){ limparCache('cartoes'); aviso('Cartão criado.'); recarregar(); } };
  el.querySelectorAll('[data-conta]').forEach(c => c.onclick = async () => { const r = await editarConta(cs.find(x => x.id === c.dataset.conta)); if(r){ limparCache('contas'); aviso(r === 'apagado' ? 'Conta apagada.' : 'Conta salva.'); recarregar(); } });
  el.querySelectorAll('[data-cartao]').forEach(c => c.onclick = async () => {
    const k = (await cCartoes(true)).find(x => x.id === c.dataset.cartao), f = faturas.find(x => x.id === c.dataset.cartao);
    const acao = await janela({titulo: k.nome, corpo: `<p class="muted" style="margin-top:0;">Fatura em aberto: <b>${brlC(f.fatura_centavos)}</b></p><div style="display:grid;gap:.45rem;">
      <button class="btn prim" data-ac="pagar">Pagar fatura</button><button class="btn fantasma" data-ac="ver">Ver lançamentos do cartão</button><button class="btn fantasma" data-ac="editar">Editar cartão</button></div>`,
      aoAbrir: ctx => ctx.el.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => ctx.fechar(b.dataset.ac))});
    if(acao === 'pagar' && await lancamento({tipo: 'pagamento_fatura', cartao_id: k.id, conta_id: k.conta_pagamento_id || undefined, valor_centavos: Math.max(0, f.fatura_centavos), descricao: `Fatura ${k.nome}`})){ aviso('Pagamento registrado.'); recarregar(); }
    if(acao === 'ver') ir('financeiro?aba=lancamentos&cartao=' + k.id);
    if(acao === 'editar'){ const r = await editarCartao(k, cs); if(r){ limparCache('cartoes'); aviso(r === 'apagado' ? 'Cartão apagado.' : 'Cartão salvo.'); recarregar(); } }
  });
}

function seletorCor(id, atual){ return `<div style="display:flex;gap:.4rem;flex-wrap:wrap;">${CORES.map(c => `<label style="cursor:pointer;"><input type="radio" name="${id}" value="${c}" ${c === atual ? 'checked' : ''} hidden><span style="display:block;width:30px;height:30px;border-radius:9px;background:${c};box-shadow:${c === atual ? '0 0 0 3px var(--laranja-suave),0 0 0 1px var(--laranja)' : 'none'};"></span></label>`).join('')}</div>`; }
function ligarCor(ctx, id){ ctx.el.querySelectorAll(`input[name=${id}]`).forEach(r => r.onchange = () => ctx.el.querySelectorAll(`input[name=${id}] + span`).forEach(s => s.style.boxShadow = s.previousElementSibling.checked ? '0 0 0 3px var(--laranja-suave),0 0 0 1px var(--laranja)' : 'none')); }

function editarConta(c){
  const x = c || {tipo: 'digital', cor: '#2566A8', ordem: 100, saldo_inicial_centavos: 0};
  return janela({titulo: c ? 'Editar conta' : 'Nova conta', corpo: `
    <div class="grade2"><div class="campo"><label class="rot" for="c_ap">Apelido *</label><input type="text" id="c_ap" value="${esc(x.apelido)}" placeholder="Ex.: Nubank PJ"></div>
      <div class="campo"><label class="rot" for="c_bc">Banco</label><input type="text" id="c_bc" value="${esc(x.banco)}"></div></div>
    <div class="grade2"><div class="campo"><label class="rot" for="c_tp">Tipo</label><select id="c_tp">${opcoes(TIPOS_CONTA, x.tipo)}</select></div>
      <div class="campo"><label class="rot" for="c_si">Saldo inicial (R$)</label><input type="text" inputmode="decimal" id="c_si" value="${inputValor(x.saldo_inicial_centavos)}" placeholder="0,00"></div></div>
    <div class="campo"><div class="rot">Cor</div>${seletorCor('c_cor', x.cor)}</div>
    ${c ? `<label class="chk"><input type="checkbox" id="c_arq" ${x.arquivada ? 'checked' : ''}> Arquivada (some das escolhas, o histórico continua)</label>` : ''}`,
    aoAbrir: ctx => ligarCor(ctx, 'c_cor'),
    botoes: [...(c ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar conta', 'Só é possível apagar uma conta sem lançamentos. Se ela tem histórico, prefira arquivar.', 'Apagar', 'perigo'))) return false; await q.apaga(T.contas, c.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const neg = /^\s*-/.test(ctx.valor('#c_si'));
        const row = {apelido: ctx.valor('#c_ap'), banco: ctx.valor('#c_bc') || null, tipo: ctx.valor('#c_tp'), saldo_inicial_centavos: (neg ? -1 : 1) * Math.abs(centavos(valorDigitado(ctx.valor('#c_si')))), cor: ctx.el.querySelector('input[name=c_cor]:checked')?.value || '#2566A8'};
        if(row.apelido.length < 2){ ctx.erro('Dê um apelido para a conta.'); return false; }
        if(c){ row.arquivada = ctx.valor('#c_arq'); return q.altera(T.contas, c.id, row); }
        return q.cria(T.contas, row);
      }}]});
}

function editarCartao(k, cs){
  const x = k || {};
  return janela({titulo: k ? 'Editar cartão' : 'Novo cartão de crédito', corpo: `
    <div class="grade2"><div class="campo"><label class="rot" for="k_nm">Nome *</label><input type="text" id="k_nm" value="${esc(x.nome)}" placeholder="Ex.: Nubank Ultravioleta"></div>
      <div class="campo"><label class="rot" for="k_bc">Banco</label><input type="text" id="k_bc" value="${esc(x.banco)}"></div></div>
    <div class="grade3"><div class="campo"><label class="rot" for="k_fn">Final</label><input type="text" id="k_fn" maxlength="4" inputmode="numeric" value="${esc(x.final)}"></div>
      <div class="campo"><label class="rot" for="k_fe">Fecha dia</label><input type="number" id="k_fe" min="1" max="31" value="${x.fechamento || ''}"></div>
      <div class="campo"><label class="rot" for="k_ve">Vence dia</label><input type="number" id="k_ve" min="1" max="31" value="${x.vencimento || ''}"></div></div>
    <div class="grade2"><div class="campo"><label class="rot" for="k_li">Limite (R$)</label><input type="text" inputmode="decimal" id="k_li" value="${inputValor(x.limite_centavos)}"></div>
      <div class="campo"><label class="rot" for="k_fi">Fatura já em aberto (R$)</label><input type="text" inputmode="decimal" id="k_fi" value="${inputValor(x.fatura_inicial_centavos)}" placeholder="0,00"></div></div>
    <div class="campo"><label class="rot" for="k_cp">Conta que paga a fatura</label><select id="k_cp"><option value="">—</option>${cs.filter(c => !c.arquivada).map(c => `<option value="${c.id}" ${c.id === x.conta_pagamento_id ? 'selected' : ''}>${esc(c.apelido)}</option>`).join('')}</select></div>
    ${k ? `<label class="chk"><input type="checkbox" id="k_arq" ${x.arquivado ? 'checked' : ''}> Arquivado</label>` : ''}`,
    botoes: [...(k ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar cartão', 'Só é possível apagar um cartão sem lançamentos. Se ele tem histórico, prefira arquivar.', 'Apagar', 'perigo'))) return false; await q.apaga(T.cartoes, k.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {nome: ctx.valor('#k_nm'), banco: ctx.valor('#k_bc') || null, final: ctx.valor('#k_fn') || null, fechamento: parseInt(ctx.valor('#k_fe'), 10) || null, vencimento: parseInt(ctx.valor('#k_ve'), 10) || null,
          limite_centavos: centavos(valorDigitado(ctx.valor('#k_li'))), fatura_inicial_centavos: centavos(valorDigitado(ctx.valor('#k_fi'))), conta_pagamento_id: ctx.valor('#k_cp') || null};
        if(row.nome.length < 2){ ctx.erro('Dê um nome ao cartão.'); return false; }
        if(k){ row.arquivado = ctx.valor('#k_arq'); return q.altera(T.cartoes, k.id, row); }
        return q.cria(T.cartoes, row);
      }}]});
}

// ================= categorias =================
async function categoriasAba(el){
  const cats = await cCategorias(true);
  const bloco = tipo => cats.filter(c => c.tipo === tipo).map(c => `<div class="item-lista" style="${c.arquivada ? 'opacity:.5;' : ''}"><span style="width:14px;height:14px;border-radius:4px;background:${c.cor || '#838A99'};flex:none;"></span>
    <div class="tx"><b>${esc(c.nome)}</b><span>${(c.subs || []).map(esc).join(' · ') || 'sem subcategorias'}</span></div><button class="btn fantasma peq" data-cat="${c.id}">Editar</button></div>`).join('') || '<div class="vazio">Nenhuma.</div>';
  el.innerHTML = `<div class="cols">
    <div class="card"><h3>Receitas <button class="btn linha peq dir" data-nova="receita">＋ Categoria</button></h3>${bloco('receita')}</div>
    <div class="card"><h3>Despesas <button class="btn linha peq dir" data-nova="despesa">＋ Categoria</button></h3>${bloco('despesa')}</div></div>`;
  const pronto = r => { if(r){ limparCache('categorias'); aviso(r === 'apagado' ? 'Categoria apagada.' : 'Categoria salva.'); recarregar(); } };
  el.querySelectorAll('[data-nova]').forEach(b => b.onclick = async () => pronto(await editarCategoria({tipo: b.dataset.nova})));
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = async () => pronto(await editarCategoria(cats.find(c => c.id === b.dataset.cat), true)));
}
function editarCategoria(c, existe){
  return janela({titulo: existe ? 'Editar categoria' : `Nova categoria de ${c.tipo}`, corpo: `
    <div class="campo"><label class="rot" for="g_nm">Nome *</label><input type="text" id="g_nm" value="${esc(c.nome)}"></div>
    <div class="campo"><label class="rot" for="g_sub">Subcategorias <small>(separadas por vírgula)</small></label><input type="text" id="g_sub" value="${esc((c.subs || []).join(', '))}"></div>
    <div class="campo"><div class="rot">Cor</div>${seletorCor('g_cor', c.cor || CORES[0])}</div>
    ${existe ? `<label class="chk"><input type="checkbox" id="g_arq" ${c.arquivada ? 'checked' : ''}> Arquivada</label>` : ''}`,
    aoAbrir: ctx => ligarCor(ctx, 'g_cor'),
    botoes: [...(existe ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar categoria', 'Os lançamentos dessa categoria ficam "sem categoria".', 'Apagar', 'perigo'))) return false; await q.apaga(T.categorias, c.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {nome: ctx.valor('#g_nm'), subs: ctx.valor('#g_sub').split(',').map(s => s.trim()).filter(Boolean), cor: ctx.el.querySelector('input[name=g_cor]:checked')?.value || CORES[0]};
        if(row.nome.length < 2){ ctx.erro('Dê um nome.'); return false; }
        if(existe){ row.arquivada = ctx.valor('#g_arq'); return q.altera(T.categorias, c.id, row); }
        return q.cria(T.categorias, {...row, tipo: c.tipo});
      }}]});
}

// ================= importar extrato (CSV ou OFX) =================
async function importar(el){
  const [cs, ks, cats] = await Promise.all([cContas(), cCartoes(), cCategorias()]);
  el.innerHTML = `
    <div class="card"><h3>Importar extrato do banco</h3>
      <p class="muted" style="margin-top:-.3rem;">Aceita <b>OFX</b> (o formato "Money" que quase todo banco exporta) e <b>CSV</b> (Nubank, Inter, planilhas). Lançamentos repetidos são ignorados, então pode importar o mesmo período de novo sem medo.</p>
      <div class="grade2"><div class="campo"><label class="rot" for="i_onde">Para onde vão os lançamentos</label><select id="i_onde">${cs.filter(c => !c.arquivada).map(c => `<option value="c:${c.id}">Conta · ${esc(c.apelido)}</option>`).join('')}${ks.filter(k => !k.arquivado).map(k => `<option value="k:${k.id}">Cartão · ${esc(k.nome)}</option>`).join('')}</select></div>
        <div class="campo"><label class="rot" for="i_arq">Arquivo</label><input type="file" id="i_arq" accept=".ofx,.csv,.txt,text/csv"></div></div>
      <div id="i_map"></div>
    </div>
    <div id="i_prev"></div>`;
  let linhasArq = [];
  const $ = s => el.querySelector(s);
  $('#i_arq').onchange = async ev => {
    const f = ev.target.files[0]; if(!f) return;
    const buf = await f.arrayBuffer();
    let txt = new TextDecoder('utf-8').decode(buf); if(txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf);
    if(/<OFX>|OFXHEADER/i.test(txt)){ linhasArq = lerOFX(txt); $('#i_map').innerHTML = ''; previa(); }
    else lerCSV(txt);
  };

  function lerCSV(txt){
    const sep = (txt.split('\n')[0].match(/;/g) || []).length >= (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = parseCSV(txt, sep).filter(r => r.some(c => c.trim()));
    if(rows.length < 2){ aviso('Não encontrei linhas no arquivo.'); return; }
    const cab = rows[0].map(c => c.trim());
    const acha = re => cab.findIndex(c => re.test(c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
    let iD = acha(/^(data|date)/), iV = acha(/^(valor|amount|value)/), iT = acha(/(descri|titulo|title|historico|estabelecimento)/);
    const op = sel => cab.map((c, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(c || 'coluna ' + (i + 1))}</option>`).join('');
    $('#i_map').innerHTML = `<div class="grade4" style="margin-top:.4rem;"><div class="campo"><label class="rot" for="m_d">Coluna da data</label><select id="m_d">${op(iD)}</select></div>
      <div class="campo"><label class="rot" for="m_t">Coluna da descrição</label><select id="m_t">${op(iT)}</select></div>
      <div class="campo"><label class="rot" for="m_v">Coluna do valor</label><select id="m_v">${op(iV)}</select></div>
      <div class="campo"><div class="rot">&nbsp;</div><label class="chk" style="margin-top:.4rem;"><input type="checkbox" id="m_inv"> Inverter sinal <small class="muted">(fatura de cartão)</small></label></div></div>`;
    const montar = () => {
      const d = +$('#m_d').value, t = +$('#m_t').value, v = +$('#m_v').value, inv = $('#m_inv').checked;
      linhasArq = rows.slice(1).map(r => {
        const data = normData(r[d]), valor = numBanco(r[v]) * (inv ? -1 : 1), desc = (r[t] || '').trim();
        return data && valor && desc ? {data, valor, desc, id: 'csv:' + data + ':' + Math.round(valor * 100) + ':' + desc.toLowerCase().replace(/\s+/g, ' ').slice(0, 60)} : null;
      }).filter(Boolean);
      // mesma linha repetida no arquivo (ex.: duas compras iguais no dia): numera
      const vistos = {}; linhasArq.forEach(l => { vistos[l.id] = (vistos[l.id] || 0) + 1; if(vistos[l.id] > 1) l.id += '#' + vistos[l.id]; });
      previa();
    };
    ['#m_d', '#m_t', '#m_v', '#m_inv'].forEach(s => $(s).addEventListener('change', montar));
    const cartaoSel = $('#i_onde').value.startsWith('k:'); $('#m_inv').checked = cartaoSel && rows.slice(1, 20).filter(r => numBanco(r[iV]) > 0).length > 10;
    montar();
  }

  async function previa(){
    const onde = $('#i_onde').value, ehCartao = onde.startsWith('k:'), alvo = onde.slice(2);
    if(!linhasArq.length){ $('#i_prev').innerHTML = '<div class="card"><div class="vazio">Nenhum lançamento reconhecido no arquivo.</div></div>'; return; }
    const datas = linhasArq.map(l => l.data).sort();
    const ja = await tudo(T.lanc, 'id_externo', x => x.eq(ehCartao ? 'cartao_id' : 'conta_id', alvo).not('id_externo', 'is', null).gte('data', datas[0]).lte('data', datas[datas.length - 1]));
    const existentes = new Set((ja || []).map(x => x.id_externo));
    // categoria sugerida: a última usada para a mesma descrição
    const descs = [...new Set(linhasArq.map(l => l.desc))].slice(0, 120);
    const {data: ant} = await sb.from(T.lanc).select('descricao,categoria_id,sub,tipo').in('descricao', descs).not('categoria_id', 'is', null).order('data', {ascending: false});
    const sug = {}; (ant || []).forEach(a => { const k = a.tipo + '|' + a.descricao; if(!sug[k]) sug[k] = a; });
    const catOpt = (tipo, sel) => '<option value="">—</option>' + cats.filter(c => c.tipo === tipo && !c.arquivada).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
    const novos = linhasArq.filter(l => !existentes.has(l.id));
    $('#i_prev').innerHTML = `<div class="card"><h3>${novos.length} novos de ${linhasArq.length} no arquivo <button class="btn prim dir" id="i_ok" ${novos.length ? '' : 'disabled'}>Importar ${novos.length}</button></h3>
      ${existentes.size ? `<p class="muted" style="margin-top:-.4rem;font-size:13px;">${existentes.size} já estavam no CRM e serão ignorados.</p>` : ''}
      <table class="tabela"><thead><tr><th><input type="checkbox" id="i_todos" checked aria-label="Marcar todos"></th><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th></tr></thead><tbody>
      ${linhasArq.map((l, i) => { const tipo = l.valor > 0 ? 'receita' : 'despesa', s = sug[tipo + '|' + l.desc], ja2 = existentes.has(l.id);
        return `<tr style="${ja2 ? 'opacity:.4;' : ''}"><td data-l=""><input type="checkbox" data-i="${i}" ${ja2 ? 'disabled' : 'checked'} aria-label="Importar"></td><td data-l="Data" class="sm">${dataCurta(l.data)}</td><td data-l="">${esc(l.desc)}${ja2 ? ' <span class="pill">já importado</span>' : ''}</td>
          <td data-l="Categoria"><select data-cat="${i}" style="min-width:150px;" ${ja2 ? 'disabled' : ''}>${catOpt(tipo, s?.categoria_id)}</select></td><td data-l="Valor" class="num ${l.valor > 0 ? 'valor-pos' : 'valor-neg'}">${brl(l.valor)}</td></tr>`; }).join('')}
      </tbody></table></div>`;
    $('#i_todos').onchange = e => el.querySelectorAll('[data-i]:not(:disabled)').forEach(c => c.checked = e.target.checked);
    $('#i_ok').onclick = async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Importando…';
      try{
        const escolhidos = [...el.querySelectorAll('[data-i]:checked')].map(c => +c.dataset.i);
        const rows = escolhidos.map(i => { const l = linhasArq[i], tipo = l.valor > 0 ? 'receita' : 'despesa', s = sug[tipo + '|' + l.desc];
          if(ehCartao && tipo === 'receita') return {tipo: 'pagamento_fatura', descricao: l.desc, valor_centavos: Math.abs(Math.round(l.valor * 100)), data: l.data, status: 'pago', cartao_id: alvo, conta_id: ks.find(k => k.id === alvo)?.conta_pagamento_id || cs[0]?.id, id_externo: l.id, origem: 'importacao'};
          return {tipo, descricao: l.desc, valor_centavos: Math.abs(Math.round(l.valor * 100)), data: l.data, status: 'pago', [ehCartao ? 'cartao_id' : 'conta_id']: alvo,
            categoria_id: el.querySelector(`[data-cat="${i}"]`).value || null, sub: el.querySelector(`[data-cat="${i}"]`).value === s?.categoria_id ? s?.sub || null : null, id_externo: l.id, origem: 'importacao'}; });
        let ok = 0;
        for(let i = 0; i < rows.length; i += 200){
          const lote = rows.slice(i, i + 200);
          const {data, error} = await sb.from(T.lanc).insert(lote).select('id');
          if(!error){ ok += data.length; continue; }
          if(error.code !== '23505') throw error;
          // algum já existia: grava um por um, pulando os repetidos
          for(const r of lote){ const {error: e2} = await sb.from(T.lanc).insert(r); if(!e2) ok++; else if(e2.code !== '23505') throw e2; }
        }
        aviso(`${ok} lançamentos importados.`); ir('financeiro?aba=lancamentos&' + (ehCartao ? 'cartao=' : 'conta=') + alvo);
      }catch(e){ aviso(traduzErro(e)); b.disabled = false; b.textContent = 'Tentar de novo'; }
    };
  }
  $('#i_onde').addEventListener('change', () => { if(linhasArq.length) previa(); });
}

function parseCSV(txt, sep){
  const out = []; let row = [], cel = '', aspas = false;
  for(let i = 0; i < txt.length; i++){
    const ch = txt[i];
    if(aspas){ if(ch === '"'){ if(txt[i + 1] === '"'){ cel += '"'; i++; } else aspas = false; } else cel += ch; continue; }
    if(ch === '"') aspas = true; else if(ch === sep){ row.push(cel); cel = ''; } else if(ch === '\n'){ row.push(cel.replace(/\r$/, '')); out.push(row); row = []; cel = ''; } else cel += ch;
  }
  if(cel || row.length){ row.push(cel.replace(/\r$/, '')); out.push(row); }
  return out;
}
function normData(s){
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if(m){ const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return null;
}
function numBanco(s){
  s = String(s || '').replace(/R\$|\s/g, '').trim(); if(!s) return 0;
  const neg = /^-|^\(.*\)$|-$/.test(s); s = s.replace(/[()\-+]/g, '');
  if(/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
  const n = parseFloat(s); return isFinite(n) ? (neg ? -n : n) : 0;
}
function lerOFX(txt){
  const tag = (b, t) => (b.match(new RegExp('<' + t + '>([^<\\r\\n]*)', 'i')) || [])[1]?.trim() || '';
  return [...txt.matchAll(/<STMTTRN>([\s\S]*?)(<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi)].map(m => {
    const b = m[1], dt = tag(b, 'DTPOSTED'), v = parseFloat(tag(b, 'TRNAMT').replace(',', '.'));
    const data = dt.length >= 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : null;
    const desc = (tag(b, 'MEMO') || tag(b, 'NAME') || 'Lançamento').replace(/\s+/g, ' ');
    const fit = tag(b, 'FITID');
    return data && v ? {data, valor: v, desc, id: 'ofx:' + (fit || data + ':' + Math.round(v * 100) + ':' + desc.slice(0, 40))} : null;
  }).filter(Boolean);
}
