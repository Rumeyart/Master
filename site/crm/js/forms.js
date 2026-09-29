// Janelas de cadastro usadas em várias telas
import {sb, T, q, servicos, config, contas, clientes as listarClientes, limparCache} from './db.js';
import {$, esc, janela, opcoes, TIPOS, ORIGENS, ETAPAS, AREAS, etapaNome, numInput, brl, paraInputDataHora, deInputDataHora, addDias, hojeChave, centavos, aviso, whatsLink} from './util.js';
import {ICONES} from './icones.js';
import {passos, acharPasso, preencherPasso} from './passos.js';
import {dadosPadrao, calc} from './proposta-doc.js';

// ---------- seletor de cliente com busca ----------
export async function htmlSeletorCliente(id = 'f_cli', selecionado, {opcional = false} = {}){
  const cs = await listarClientes(false);
  return {cs, html: `<div class="campo"><label class="rot" for="${id}">Cliente${opcional ? ' <small>(opcional)</small>' : ''}</label>
    <select id="${id}" data-add="cliente"><option value="">${opcional ? '— sem cliente —' : '— escolha o cliente —'}</option>${cs.map(c => `<option value="${c.id}" ${c.id === selecionado ? 'selected' : ''}>${esc(c.nome)}${c.marca ? ' · ' + esc(c.marca) : ''}</option>`).join('')}<option value="__novo">＋ Cadastrar novo cliente…</option></select></div>`};
}
export function ligarSeletorCliente(el, id, cs, aoMudar){
  const sel = el.querySelector('#' + id), busca = el.querySelector('#' + id + '_q');
  if(busca) busca.addEventListener('input', () => {
    const t = busca.value.trim().toLowerCase();
    [...sel.options].forEach(o => { if(!o.value || o.value === '__novo') return; const c = cs.find(x => x.id === o.value); o.hidden = t && !(`${c.nome} ${c.marca || ''} ${c.whatsapp || ''}`.toLowerCase().includes(t)); });
    const vis = [...sel.options].filter(o => o.value && o.value !== '__novo' && !o.hidden);
    if(t && vis.length === 1){ sel.value = vis[0].value; sel.dispatchEvent(new Event('change')); }
  });
  sel.addEventListener('change', async () => {
    if(sel.value === '__novo'){
      const c = await cliente();
      if(c){ cs.push(c); const o = new Option(c.nome, c.id, true, true); sel.insertBefore(o, sel.lastElementChild); sel.value = c.id; }
      else sel.value = '';
    }
    if(aoMudar) aoMudar(sel.value);
  });
  if(aoMudar && sel.value) aoMudar(sel.value);
}

// ---------- escolher o que criar ----------
export function escolherNovo(){
  const itens = [['cliente', 'clientes', 'Cliente', 'Cadastro novo'], ['oportunidade', 'oportunidade', 'Oportunidade', 'Novo projeto no funil'],
    ['proposta', 'propostas', 'Proposta', 'Com PDF padronizado'], ['tarefa', 'tarefas', 'Tarefa', 'Lembrete com horário'],
    ['nota', 'nota', 'Anotação', 'Registrar conversa'], ['receita', 'receita', 'Receita', 'Entrada no financeiro'],
    ['despesa', 'despesa', 'Despesa', 'Saída no financeiro'], ['compra', 'compras', 'Item de compra', 'Lista de compras']];
  return janela({titulo: 'Criar novo', corpo: `<div class="escolhas">${itens.map(([k, ic, n, d]) =>
    `<button type="button" data-k="${k}"><span class="ic">${ICONES[ic]}</span><b>${n}</b><span class="d">${d}</span></button>`).join('')}</div>`,
    aoAbrir: ctx => ctx.el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => ctx.fechar(b.dataset.k))});
}

// ---------- cliente ----------
const usados = async (tabela, col) => { try{ return [...new Set((await q.lista(tabela, col, x => x.order('criado_em', {ascending: false}).limit(400))).map(r => r[col]).filter(Boolean))]; }catch(e){ return []; } };
export async function cliente(existente, pre = {}){
  const [tiposUs, origensUs] = await Promise.all([usados(T.clientes, 'tipo'), usados(T.clientes, 'origem')]);
  const c = existente || {tipo: 'pessoal', origem: 'whatsapp', ...pre};
  const corpo = `
    <div class="campo"><label class="rot" for="c_nome">Nome *</label><input type="text" id="c_nome" value="${esc(c.nome)}" maxlength="160"></div>
    <div class="grade2">
      <div class="campo"><label class="rot" for="c_whats">WhatsApp</label><input type="tel" id="c_whats" value="${esc(c.whatsapp)}" placeholder="(11) 9 9999-9999"></div>
      <div class="campo"><label class="rot" for="c_email">E-mail</label><input type="email" id="c_email" value="${esc(c.email)}"></div>
    </div>
    <div class="grade2">
      <div class="campo"><label class="rot" for="c_tipo">Para quem é</label><select id="c_tipo" data-add="texto">${opcoes(TIPOS, c.tipo, tiposUs)}</select></div>
      <div class="campo"><label class="rot" for="c_origem">Como chegou</label><select id="c_origem" data-add="texto">${opcoes(ORIGENS, c.origem, origensUs)}</select></div>
    </div>
    <div class="campo"><label class="rot" for="c_marca">Marca / empresa <small>(se houver)</small></label><input type="text" id="c_marca" value="${esc(c.marca)}"></div>
    <div class="grade3">
      <div class="campo" style="grid-column:span 2;"><label class="rot" for="c_cidade">Cidade</label><input type="text" id="c_cidade" value="${esc(c.cidade)}"></div>
      <div class="campo"><label class="rot" for="c_uf">UF</label><input type="text" id="c_uf" value="${esc(c.uf || 'SP')}" maxlength="2" style="text-transform:uppercase;"></div>
    </div>
    <div class="campo"><label class="rot" for="c_doc">CPF / CNPJ <small>(para contrato)</small></label><input type="text" id="c_doc" value="${esc(c.cpf_cnpj)}"></div>
    <div class="campo"><label class="rot" for="c_obs">Observações</label><textarea id="c_obs">${esc(c.observacoes)}</textarea></div>`;
  return janela({titulo: existente ? 'Editar cliente' : 'Novo cliente', corpo, botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
    const v = s => ctx.valor(s);
    const row = {nome: v('#c_nome'), whatsapp: v('#c_whats') || null, email: v('#c_email') || null, tipo: v('#c_tipo'), origem: v('#c_origem'),
      marca: v('#c_marca') || null, cidade: v('#c_cidade') || null, uf: (v('#c_uf') || '').toUpperCase() || null, cpf_cnpj: v('#c_doc') || null, observacoes: v('#c_obs') || null};
    if(row.nome.length < 2){ ctx.erro('Informe o nome do cliente.'); return false; }
    const dig = (row.whatsapp || '').replace(/\D/g, '');
    if(dig && dig.length < 10){ ctx.erro('WhatsApp precisa ter DDD + número.'); return false; }
    if(!existente && dig){
      const {data} = await sb.from(T.clientes).select('id,nome').eq('whatsapp_digits', dig).eq('arquivado', false).limit(1);
      if(data && data.length && !ctx._dup){ ctx._dup = true; ctx.erro(`Já existe um cliente com esse WhatsApp: ${data[0].nome}. Clique em Salvar de novo para cadastrar mesmo assim.`); return false; }
    }
    return existente ? q.altera(T.clientes, existente.id, row) : q.cria(T.clientes, row);
  }}]});
}

// ---------- oportunidade ----------
export async function oportunidade({cliente_id, existente}){
  const ss = (await servicos()).filter(s => s.ativo);
  const o = existente || {etapa: 'novo', valor: 0, mensal: 0};
  const seletor = cliente_id || existente ? null : await htmlSeletorCliente('o_cli');
  const corpo = `${seletor ? seletor.html : ''}
    <div class="campo"><label class="rot" for="o_serv">Serviço</label><select id="o_serv" data-add="servico"><option value="">— personalizado —</option>${ss.map(s => `<option value="${s.id}" ${s.id === o.servico_id ? 'selected' : ''}>${esc(s.nome)}${s.preco_base ? ' · a partir de ' + brl(s.preco_base) : ''}${s.mensal ? ' · ' + brl(s.mensal) + '/mês' : ''}</option>`).join('')}</select></div>
    <div class="campo"><label class="rot" for="o_tit">Nome do projeto *</label><input type="text" id="o_tit" value="${esc(o.titulo)}" placeholder="Ex: App de agendamento da escola de capoeira"></div>
    <div class="grade3">
      <div class="campo"><label class="rot" for="o_valor">Valor do projeto (R$)</label><input type="number" id="o_valor" min="0" step="50" value="${o.valor || ''}"></div>
      <div class="campo"><label class="rot" for="o_mensal">Mensal (R$)</label><input type="number" id="o_mensal" min="0" step="10" value="${o.mensal || ''}"></div>
      <div class="campo"><label class="rot" for="o_etapa">Etapa</label><select id="o_etapa">${ETAPAS.map(([k, n]) => `<option value="${k}" ${k === o.etapa ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    ${existente ? `<div class="grade2">
      <div class="campo"><label class="rot" for="o_link">Link do app</label><input type="url" id="o_link" value="${esc(o.link_app)}" placeholder="https://"></div>
      <div class="campo"><label class="rot" for="o_repo">Repositório</label><input type="url" id="o_repo" value="${esc(o.repositorio)}" placeholder="https://github.com/…"></div></div>` : `<div class="grade2">
      <div class="campo"><label class="rot" for="o_acao">Próxima ação</label><input type="text" id="o_acao" list="acoesSug" placeholder="Ex: Marcar conversa de levantamento"></div>
      <div class="campo"><label class="rot" for="o_quando">Quando</label><input type="datetime-local" id="o_quando" value="${paraInputDataHora(proximoHorario())}"></div>
    </div>`}
    ${acoesDatalist()}`;
  return janela({titulo: existente ? 'Editar projeto' : 'Nova oportunidade', corpo,
    aoAbrir: ctx => {
      if(seletor) ligarSeletorCliente(ctx.el, 'o_cli', seletor.cs);
      ctx.el.querySelector('#o_serv').addEventListener('change', e => {
        const s = ss.find(x => x.id === e.target.value); if(!s) return;
        if(!ctx.el.querySelector('#o_tit').value) ctx.el.querySelector('#o_tit').value = s.nome;
        if(s.preco_base) ctx.el.querySelector('#o_valor').value = s.preco_base;
        if(s.mensal) ctx.el.querySelector('#o_mensal').value = s.mensal;
      });
    },
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
      const cid = cliente_id || existente?.cliente_id || ctx.valor('#o_cli');
      if(!cid || cid === '__novo'){ ctx.erro('Escolha o cliente.'); return false; }
      const row = {titulo: ctx.valor('#o_tit'), servico_id: ctx.valor('#o_serv') || null, valor: numInput(ctx.valor('#o_valor')), mensal: numInput(ctx.valor('#o_mensal')), etapa: ctx.valor('#o_etapa')};
      if(row.titulo.length < 2){ ctx.erro('Dê um nome para o projeto.'); return false; }
      if(existente){ row.link_app = ctx.valor('#o_link') || null; row.repositorio = ctx.valor('#o_repo') || null; return q.altera(T.oport, existente.id, row); }
      const acao = ctx.valor('#o_acao'), quando = deInputDataHora(ctx.valor('#o_quando'));
      const nova = await q.cria(T.oport, {...row, cliente_id: cid, origem: 'manual', proxima_acao: acao || null, proxima_acao_em: acao ? quando : null});
      if(acao && quando) await q.cria(T.tarefas, {cliente_id: cid, oportunidade_id: nova.id, titulo: acao, area: 'comercial', vence_em: quando});
      return nova;
    }}]});
}

function proximoHorario(){ const d = addDias(new Date(), 1); d.setHours(10, 0, 0, 0); return d; }
function acoesDatalist(){ return `<datalist id="acoesSug">${passos().map(p => `<option value="${esc(p.titulo)}">`).join('')}</datalist>`; }

// ---------- tarefa (com ou sem cliente) ----------
export async function tarefa({cliente_id, oportunidade_id, existente, area}){
  const areasUs = await usados(T.tarefas, 'area');
  const t = existente || {area: area || 'comercial'};
  const seletor = cliente_id || existente ? null : await htmlSeletorCliente('t_cli', null, {opcional: true});
  const cid0 = cliente_id || existente?.cliente_id;
  const corpo = `${seletor ? seletor.html : ''}
    <div class="campo"><label class="rot" for="t_op">Projeto <small>(opcional)</small></label><select id="t_op"><option value="">—</option></select></div>
    <div class="campo"><label class="rot" for="t_tit">O que fazer *</label><input type="text" id="t_tit" list="acoesSug" value="${esc(t.titulo)}" placeholder="Ex: Enviar protótipo"></div>
    <div class="dica-msg" id="t_msg" hidden><span class="ic">${ICONES.whats}</span><span>Este passo tem mensagem pronta para o cliente.</span><button type="button" class="link" id="t_ver">Ver e enviar</button></div>
    <div class="grade2">
      <div class="campo"><label class="rot" for="t_area">Área</label><select id="t_area" data-add="texto">${opcoes(AREAS, t.area, areasUs)}</select></div>
      <div class="campo"><label class="rot" for="t_quando">Quando *</label><input type="datetime-local" id="t_quando" value="${paraInputDataHora(t.vence_em || proximoHorario())}"></div>
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem;">${[['Hoje 17h', 0, 17], ['Amanhã 10h', 1, 10], ['Em 3 dias', 3, 10], ['Em 1 semana', 7, 10]].map(([n, d, h]) => `<button type="button" class="btn fantasma peq" data-atalho="${d},${h}">${n}</button>`).join('')}</div>
    ${acoesDatalist()}`;
  return janela({titulo: existente ? 'Editar tarefa' : 'Nova tarefa', corpo,
    aoAbrir: ctx => {
      const carregarOps = async cid => {
        const sel = ctx.el.querySelector('#t_op'); sel.innerHTML = '<option value="">—</option>';
        if(!cid || cid === '__novo') return;
        const ops = await q.lista(T.oport, 'id,titulo,etapa', x => x.eq('cliente_id', cid).eq('arquivado', false).order('criado_em', {ascending: false}));
        sel.innerHTML += ops.map(o => `<option value="${o.id}" ${o.id === (oportunidade_id || t.oportunidade_id) ? 'selected' : ''}>${esc(o.titulo)} · ${etapaNome(o.etapa)}</option>`).join('');
        if(!oportunidade_id && !t.oportunidade_id && ops.length === 1) sel.value = ops[0].id;
      };
      if(seletor) ligarSeletorCliente(ctx.el, 't_cli', seletor.cs, carregarOps); else carregarOps(cid0);
      const tit = ctx.el.querySelector('#t_tit'), dica = ctx.el.querySelector('#t_msg');
      const atualizarDica = () => { const p = acharPasso(tit.value); dica.hidden = !(p && p.texto); };
      tit.addEventListener('input', atualizarDica); tit.addEventListener('change', atualizarDica); atualizarDica();
      ctx.el.querySelector('#t_ver').onclick = async () => {
        const cid = cid0 || (seletor ? ctx.valor('#t_cli') : null);
        let cli = seletor ? seletor.cs.find(c => c.id === cid) : null;
        if(!cli && cid && cid !== '__novo') cli = await q.um(T.clientes, cid, 'nome,whatsapp').catch(() => null);
        const op = ctx.el.querySelector('#t_op').selectedOptions[0];
        const projeto = op && op.value ? op.textContent.replace(/\s·\s[^·]+$/, '').trim() : '';
        verMensagem(tit.value, {nome: cli?.nome, whatsapp: cli?.whatsapp, projeto});
      };
      ctx.el.querySelectorAll('[data-atalho]').forEach(b => b.onclick = () => { const [d, h] = b.dataset.atalho.split(',').map(Number); const x = addDias(new Date(), d); x.setHours(h, 0, 0, 0); ctx.el.querySelector('#t_quando').value = paraInputDataHora(x); });
    },
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { await q.apaga(T.tarefas, existente.id); return 'apagada'; }}] : []), {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
      let cid = cid0 || (seletor ? ctx.valor('#t_cli') : null);
      if(cid === '__novo') cid = null;
      const row = {titulo: ctx.valor('#t_tit'), area: ctx.valor('#t_area'), vence_em: deInputDataHora(ctx.valor('#t_quando')), oportunidade_id: ctx.valor('#t_op') || null};
      if(row.titulo.length < 2){ ctx.erro('Descreva a tarefa.'); return false; }
      if(!row.vence_em){ ctx.erro('Escolha a data.'); return false; }
      const r = existente ? await q.altera(T.tarefas, existente.id, row) : await q.cria(T.tarefas, {...row, cliente_id: cid || null});
      if(row.oportunidade_id) await q.altera(T.oport, row.oportunidade_id, {proxima_acao: row.titulo, proxima_acao_em: row.vence_em});
      return r;
    }}]});
}

// ---------- anotação rápida ----------
export async function notaRapida(cliente_id){
  const seletor = cliente_id ? null : await htmlSeletorCliente('n_cli');
  const corpo = `${seletor ? seletor.html : ''}
    <div class="campo"><label class="rot" for="n_tipo">Tipo</label><select id="n_tipo"><option value="nota">Anotação</option><option value="contato">Contato com o cliente</option></select></div>
    <div class="campo"><label class="rot" for="n_tx">O que aconteceu</label><textarea id="n_tx" placeholder="Ex: Conversamos por vídeo; a ideia é começar pelo módulo de agenda."></textarea></div>`;
  return janela({titulo: 'Nova anotação', corpo, aoAbrir: ctx => { if(seletor) ligarSeletorCliente(ctx.el, 'n_cli', seletor.cs); },
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
      const cid = cliente_id || ctx.valor('#n_cli'); const texto = ctx.valor('#n_tx');
      if(!cid || cid === '__novo'){ ctx.erro('Escolha o cliente.'); return false; }
      if(!texto){ ctx.erro('Escreva a anotação.'); return false; }
      return q.cria(T.hist, {cliente_id: cid, tipo: ctx.valor('#n_tipo'), texto});
    }}]});
}

// ---------- nova proposta ----------
export async function novaProposta({cliente_id, oportunidade_id}){
  const [ss, cfg] = await Promise.all([servicos(), config()]);
  const ativos = ss.filter(s => s.ativo);
  const seletor = cliente_id ? null : await htmlSeletorCliente('p_cli');
  const corpo = `${seletor ? seletor.html : ''}
    <div class="campo"><label class="rot" for="p_op">Projeto</label><select id="p_op"><option value="__nova">＋ Novo projeto</option></select></div>
    <div class="campo"><label class="rot" for="p_serv">Serviço principal</label><select id="p_serv">${ativos.map(s => `<option value="${s.id}">${esc(s.nome)}${s.preco_base ? ' · ' + brl(s.preco_base) : ''}</option>`).join('')}</select>
      <div class="muted" style="font-size:12.5px;margin-top:.35rem;">A proposta já vem com escopo, etapas, condições e, se houver, as respostas que o cliente deu no site. Você ajusta tudo depois.</div></div>`;
  return janela({titulo: 'Nova proposta', corpo,
    aoAbrir: ctx => {
      const carregarOps = async cid => {
        const sel = ctx.el.querySelector('#p_op'); sel.innerHTML = '<option value="__nova">＋ Novo projeto</option>';
        if(!cid || cid === '__novo') return;
        const ops = await q.lista(T.oport, 'id,titulo,etapa,servico_id', x => x.eq('cliente_id', cid).eq('arquivado', false).not('etapa', 'in', '(entregue,perdido)').order('criado_em', {ascending: false}));
        sel.innerHTML += ops.map(o => `<option value="${o.id}" data-serv="${o.servico_id || ''}">${esc(o.titulo)} · ${etapaNome(o.etapa)}</option>`).join('');
        if(oportunidade_id) sel.value = oportunidade_id; else if(ops.length) sel.value = ops[0].id;
        sel.dispatchEvent(new Event('change'));
      };
      ctx.el.querySelector('#p_op').addEventListener('change', e => { const s = e.target.selectedOptions[0]?.dataset.serv; if(s) ctx.el.querySelector('#p_serv').value = s; });
      if(seletor) ligarSeletorCliente(ctx.el, 'p_cli', seletor.cs, carregarOps); else carregarOps(cliente_id);
    },
    botoes: [{texto: 'Cancelar'}, {texto: 'Criar proposta', classe: 'prim', acao: async ctx => {
      const cid = cliente_id || ctx.valor('#p_cli');
      if(!cid || cid === '__novo'){ ctx.erro('Escolha o cliente.'); return false; }
      const serv = ss.find(s => s.id === ctx.valor('#p_serv'));
      if(!serv){ ctx.erro('Escolha o serviço.'); return false; }
      let opId = ctx.valor('#p_op'), op = null;
      if(opId === '__nova'){
        op = await q.cria(T.oport, {cliente_id: cid, titulo: serv.nome, servico_id: serv.id, valor: serv.preco_base || 0, mensal: serv.mensal || 0, etapa: 'conversa', origem: 'manual'});
        opId = op.id;
      }else op = await q.um(T.oport, opId);
      const ped = await q.lista(T.pedidos, 'ideia,respostas', x => x.eq('oportunidade_id', opId).limit(1));
      const dados = dadosPadrao(serv, cfg, ped[0], op?.titulo);
      const c = calc(dados);
      return q.cria(T.propostas, {cliente_id: cid, oportunidade_id: opId, titulo: dados.titulo, dados, total: c.total, mensal: c.mensal});
    }}]});
}

// ---------- mudar etapa (com as perguntas certas) ----------
export async function moverEtapa(op, etapa){
  if(op.etapa === etapa) return null;
  const row = {etapa};
  if(etapa === 'perdido'){
    const motivo = await janela({titulo: 'Projeto perdido', corpo: `<p class="muted" style="margin-top:0;">${esc(op.titulo)}</p>
      <div class="campo"><label class="rot" for="m_mot">Por que não aconteceu? <small>(ajuda a vender melhor depois)</small></label>
      <input type="text" id="m_mot" list="motivosSug" placeholder="Ex: Achou caro"><datalist id="motivosSug"><option value="Achou caro"><option value="Adiou o projeto"><option value="Parou de responder"><option value="Fechou com outra pessoa"><option value="Resolveu com uma ferramenta pronta"></datalist></div>`,
      botoes: [{texto: 'Cancelar'}, {texto: 'Marcar como perdido', classe: 'perigo', acao: ctx => ctx.valor('#m_mot') || 'Sem motivo informado'}]});
    if(!motivo) return null; row.motivo_perda = motivo;
  }
  if(etapa === 'fechado'){
    const cs = await contas();
    const r = await janela({titulo: 'Projeto fechado!', corpo: `<p class="muted" style="margin-top:0;">${esc(op.titulo)}</p>
      <div class="grade2"><div class="campo"><label class="rot" for="m_val">Valor fechado (R$)</label><input type="number" id="m_val" min="0" step="50" value="${op.valor || ''}"></div>
      <div class="campo"><label class="rot" for="m_men">Mensal (R$)</label><input type="number" id="m_men" min="0" step="10" value="${op.mensal || ''}"></div></div>
      <div class="grade2"><div class="campo"><label class="rot" for="m_ent">Entrega prevista</label><input type="date" id="m_ent" value="${addDias(new Date(), 30).toISOString().slice(0, 10)}"></div>
      <div class="campo"><label class="rot" for="m_parc">Recebimento</label><select id="m_parc"><option value="0">Não lançar agora</option><option value="1">À vista</option><option value="2" selected>2x (entrada + entrega)</option><option value="3">3x</option><option value="4">4x</option></select></div></div>
      ${cs.length ? `<div class="campo"><label class="rot" for="m_conta">Conta que recebe</label><select id="m_conta">${cs.filter(c => !c.arquivada).map(c => `<option value="${c.id}">${esc(c.apelido)}</option>`).join('')}</select></div>` : ''}
      <div class="muted" style="font-size:12.5px;margin-top:.5rem;">As parcelas entram no financeiro como recebimentos previstos, ligados a este cliente.</div>`,
      botoes: [{texto: 'Cancelar'}, {texto: 'Confirmar', classe: 'prim', acao: ctx => ({valor: numInput(ctx.valor('#m_val')), mensal: numInput(ctx.valor('#m_men')), ent: ctx.valor('#m_ent'), parc: parseInt(ctx.valor('#m_parc'), 10) || 0, conta: ctx.valor('#m_conta')})}]});
    if(!r) return null;
    row.valor = r.valor; row.mensal = r.mensal; if(r.ent) row.entrega_prevista = r.ent;
    const salvo = await q.altera(T.oport, op.id, row);
    if(r.parc && r.valor > 0 && r.conta){
      const total = centavos(r.valor), n = r.parc, base = Math.floor(total / n), grupo = crypto.randomUUID();
      const cat = (await q.lista(T.categorias, 'id,nome,tipo', x => x.eq('tipo', 'receita').order('ordem').limit(1)))[0];
      const linhas = [...Array(n)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i * 30);
        return {tipo: 'receita', descricao: op.titulo + (n > 1 ? (i === 0 ? ' — entrada' : ` — parcela ${i + 1}`) : ''), valor_centavos: i === n - 1 ? total - base * (n - 1) : base,
          data: d.toISOString().slice(0, 10), status: 'pendente', conta_id: r.conta, categoria_id: cat?.id || null, sub: n > 1 ? (i === 0 ? 'Sinal / entrada' : i === n - 1 ? 'Quitação' : 'Parcela') : 'Quitação',
          cliente_id: op.cliente_id, oportunidade_id: op.id, grupo_id: n > 1 ? grupo : null, parcela: n > 1 ? i + 1 : null, parcelas: n > 1 ? n : null, origem: 'venda'};
      });
      await q.criaVarios(T.lanc, linhas);
    }
    return salvo;
  }
  if(etapa === 'entregue'){
    const r = await janela({titulo: 'Projeto entregue', corpo: `<p class="muted" style="margin-top:0;">${esc(op.titulo)}</p>
      <div class="grade2"><div class="campo"><label class="rot" for="m_ent">Entregue em</label><input type="date" id="m_ent" value="${hojeChave()}"></div>
      <div class="campo"><label class="rot" for="m_sup">Suporte até</label><input type="date" id="m_sup" value="${addDias(new Date(), 30).toISOString().slice(0, 10)}"></div></div>
      <div class="campo"><label class="rot" for="m_link">Link do app</label><input type="url" id="m_link" value="${esc(op.link_app)}" placeholder="https://"></div>`,
      botoes: [{texto: 'Cancelar'}, {texto: 'Confirmar entrega', classe: 'prim', acao: ctx => ({ent: ctx.valor('#m_ent'), sup: ctx.valor('#m_sup'), link: ctx.valor('#m_link')})}]});
    if(!r) return null;
    row.entregue_em = r.ent || hojeChave(); row.suporte_ate = r.sup || null; row.link_app = r.link || op.link_app || null;
  }
  return q.altera(T.oport, op.id, row);
}

export function novaSenha(){
  return janela({titulo: 'Criar nova senha', corpo: `<div class="campo"><label class="rot" for="ns">Nova senha (mínimo 8 caracteres)</label><input type="password" id="ns" autocomplete="new-password"></div>`,
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => { const v = ctx.valor('#ns'); if(v.length < 8){ ctx.erro('Use pelo menos 8 caracteres.'); return false; } return v; }}]});
}

// ---------- mensagem pronta do próximo passo: revisar, copiar ou abrir no WhatsApp ----------
export function verMensagem(titulo, {nome, whatsapp, projeto} = {}){
  const p = acharPasso(titulo);
  if(!p) return null;
  const texto = preencherPasso(p.texto, {nome, projeto});
  return janela({titulo: p.titulo, corpo: `
    <div class="campo"><label class="rot" for="mp_tx">Mensagem${nome ? ' para ' + esc(nome) : ''} <small>(ajuste antes de enviar, se quiser)</small></label>
      <textarea id="mp_tx" style="min-height:170px;line-height:1.55;">${esc(texto)}</textarea></div>
    ${/\[[^\]]+\]/.test(texto) ? '<p class="muted" style="font-size:12.5px;margin:.5rem 0 0;">Troque o que está entre colchetes, como [link] ou [data], antes de enviar.</p>' : ''}
    ${nome ? '' : '<p class="muted" style="font-size:12.5px;margin:.5rem 0 0;">Escolha o cliente na tarefa para a mensagem sair com o nome.</p>'}`,
    aoAbrir: ctx => { const t = ctx.el.querySelector('#mp_tx'); requestAnimationFrame(() => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; }); },
    botoes: [{texto: 'Copiar', classe: 'fantasma', acao: async ctx => { try{ await navigator.clipboard.writeText(ctx.el.querySelector('#mp_tx').value); aviso('Mensagem copiada.'); }catch(e){ ctx.erro('Não foi possível copiar neste navegador.'); return false; } }},
      ...(whatsapp ? [{texto: 'Abrir no WhatsApp', classe: 'verde', acao: ctx => { const w = whatsLink(whatsapp, ctx.el.querySelector('#mp_tx').value); if(w) window.open(w, '_blank', 'noopener'); }}] : [])]});
}
