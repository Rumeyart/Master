// Editor de proposta com prévia ao vivo + PDF arquivado
import {q, T, servicos, config, arquivarPdf, linkArquivo} from './db.js';
import {esc, brl, numInput, STATUS, statusNome, etapaNome, dataHoraBR, whatsLink, primeiroNome, aviso, traduzErro, confirmar, janela, autoAltura, debounce, baixar, addDias, listaBonita} from './util.js';
import {calc, htmlDoc, nomeArquivo, gerarPdfBlob, CAMPOS_BRIEFING} from './proposta-doc.js';
import {ICONES} from './icones.js';
import * as forms from './forms.js';
import {ir, recarregar} from './app.js';

const TRAVADAS = ['aprovada', 'recusada', 'expirada'];
const ORDEM = ['novo', 'conversa', 'prototipo', 'proposta', 'negociacao', 'fechado', 'entregue'];

export async function render(el, {id}){
  const p = await q.um(T.propostas, id);
  if(!p){ el.innerHTML = '<div class="card"><h3>Proposta não encontrada</h3><a href="#/propostas">Voltar</a></div>'; return; }
  const [cli, op, ss, cfg, pdfs, peds] = await Promise.all([
    q.um(T.clientes, p.cliente_id), q.um(T.oport, p.oportunidade_id), servicos(), config(),
    q.lista(T.pdfs, '*', x => x.eq('proposta_id', id).order('versao', {ascending: false})),
    q.lista(T.pedidos, 'numero,ideia,respostas,criado_em', x => x.eq('oportunidade_id', p.oportunidade_id).limit(1))
  ]);
  const d = p.dados || {};
  d.itens ||= []; d.desconto_tipo ||= 'rs';
  const ped = peds[0];
  const travada = TRAVADAS.includes(p.status);
  const ativos = ss.filter(s => s.ativo);

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Proposta comercial</div><h1>Proposta Nº ${p.numero}</h1>
      <div class="dir">
        <select id="status" aria-label="Status" style="width:auto;border-radius:999px;">${STATUS.map(([k, n]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn prim" id="pdf"><span class="ic">${ICONES.pdf}</span>Gerar PDF</button>
        <button class="btn fantasma" id="mais" aria-label="Mais ações">⋯</button>
      </div>
      <div class="sub"><a href="#/cliente/${cli.id}?op=${op?.id || ''}">${esc(cli.nome)}</a> · ${esc(op?.titulo || '')} · <span class="tag ${op?.etapa}">${etapaNome(op?.etapa)}</span> · criada em ${dataHoraBR(p.criado_em)}</div></div>
    ${travada ? `<div class="travada">Esta proposta está <b>${statusNome(p.status).toLowerCase()}</b> e não pode mais ser alterada. Para mudar valores, use <b>⋯ → Duplicar</b> e gere uma nova versão.</div>` : ''}
    <div class="ed-cols">
      <div id="form">
        <details class="card sec" open><summary>Projeto</summary><div class="sec-c">
          <div class="campo"><label class="rot" for="f_tit">Título na capa</label><input type="text" id="f_tit" value="${esc(d.titulo)}" maxlength="90"></div>
          <div class="campo"><label class="rot" for="f_sub">Frase de apoio</label><input type="text" id="f_sub" value="${esc(d.subtitulo)}" maxlength="120" placeholder="Ex.: Aplicativo instalável no celular e no computador"></div>
          <div class="campo"><label class="rot" for="f_obj">O que vamos construir</label><textarea id="f_obj" placeholder="Explique em 2 ou 3 frases o que a solução faz pelo cliente.">${esc(d.objetivo)}</textarea></div>
          <div class="campo"><label class="rot" for="f_esc">Entregas (uma por linha)</label><textarea id="f_esc">${esc(d.escopo)}</textarea></div>
          ${ativos.length ? `<details style="margin-top:.8rem;"><summary style="cursor:pointer;color:var(--azul);font-size:13.5px;">Trocar o serviço base</summary>
            <div class="campo"><select id="f_serv"><option value="">— escolha —</option>${ativos.map(s => `<option value="${s.id}" ${s.id === d.servico?.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select>
            <div class="muted" style="font-size:12.5px;">Substitui título, texto, entregas e valores pelos do serviço escolhido.</div></div></details>` : ''}
        </div></details>
        ${ped || d.contexto ? `<details class="card sec"><summary>O que o cliente contou</summary><div class="sec-c">
          ${ped ? `<details><summary style="cursor:pointer;color:var(--azul);font-size:13.5px;">Ver respostas do site (pedido nº ${ped.numero})</summary><div class="briefing" style="margin:.6rem 0;"><div class="bq ideia"><div class="k">A ideia</div><div class="v">${esc(ped.ideia)}</div></div>${CAMPOS_BRIEFING.filter(([k]) => (ped.respostas || {})[k]).map(([k, t]) => `<div class="bq"><div class="k">${t}</div><div class="v">${esc(ped.respostas[k])}</div></div>`).join('')}</div></details>` : ''}
          <div class="campo"><label class="rot" for="f_ctx">Texto que vai na proposta</label><textarea id="f_ctx">${esc(d.contexto)}</textarea></div>
          <label class="chk"><input type="checkbox" id="f_mctx" ${d.mostrar_contexto ? 'checked' : ''}> Mostrar "O que você nos contou" na proposta</label></div></details>` : ''}
        <details class="card sec"><summary>Como vamos trabalhar</summary><div class="sec-c">
          <div class="muted" style="font-size:12.5px;margin:-.3rem 0 .6rem;">Uma etapa por linha, no formato <b>Nome: descrição</b>. Até 5 aparecem na proposta.</div>
          <textarea id="f_etp">${esc(d.etapas)}</textarea></div></details>
        <details class="card sec" open><summary>Investimento</summary><div class="sec-c">
          <div class="itens-ed"><div class="li-it muted" style="font-size:11.5px;"><span>Item</span><span>Qtd</span><span>Valor (R$)</span><span></span></div><div id="f_itens"></div></div>
          <button type="button" class="btn linha peq" id="addIt" style="margin-top:.4rem;">＋ Adicionar item</button>
          <datalist id="itSug">${ativos.map(s => `<option value="${esc(s.nome)}">`).join('')}<option value="Protótipo navegável"><option value="Integração com pagamento"><option value="Módulo extra"><option value="Treinamento da equipe"><option value="Migração de dados"></datalist>
          <div class="grade2" style="margin-top:.4rem;"><div class="campo"><label class="rot" for="f_desc">Desconto</label><input type="number" id="f_desc" min="0" step="10" value="${d.desconto || ''}"></div>
            <div class="campo"><label class="rot" for="f_dtipo">Tipo</label><select id="f_dtipo"><option value="rs" ${d.desconto_tipo !== 'pct' ? 'selected' : ''}>R$</option><option value="pct" ${d.desconto_tipo === 'pct' ? 'selected' : ''}>%</option></select></div></div>
          <div class="grade2"><div class="campo"><label class="rot" for="f_men">Plano mensal (R$)</label><input type="number" id="f_men" min="0" step="10" value="${d.mensal || ''}" placeholder="0 = sem mensalidade"></div>
            <div class="campo"><label class="rot" for="f_mdesc">Nome do plano</label><input type="text" id="f_mdesc" value="${esc(d.mensal_desc)}"></div></div>
          <div class="totais" id="totais" style="margin-top:.8rem;"></div>
        </div></details>
        <details class="card sec"><summary>Condições <span class="resumo">pagamento, prazo, validade, incluso</span></summary><div class="sec-c">
          <div class="campo"><label class="rot" for="f_pag">Pagamento</label><textarea id="f_pag">${esc(d.pagamento)}</textarea></div>
          <div class="grade2"><div class="campo"><label class="rot" for="f_prazo">Prazo</label><input type="text" id="f_prazo" value="${esc(d.prazo)}"></div>
            <div class="campo"><label class="rot" for="f_valid">Validade (dias)</label><input type="number" id="f_valid" min="1" max="90" value="${d.validade_dias || 15}"></div></div>
          <div class="campo"><label class="rot" for="f_inc">Está incluso</label><textarea id="f_inc">${esc(d.incluso)}</textarea></div>
          <div class="campo"><label class="rot" for="f_nao">Não está incluso</label><textarea id="f_nao">${esc(d.nao_incluso)}</textarea></div>
        </div></details>
        <details class="card sec"><summary>Observações</summary><div class="sec-c">
          <div class="campo"><label class="rot" for="f_obs">Observações da proposta</label><textarea id="f_obs" placeholder="Ex.: a integração com o Instagram fica para a versão 2.">${esc(d.obs)}</textarea></div>
          <div class="campo"><label class="rot" for="f_cond">Letras miúdas</label><textarea id="f_cond">${esc(d.condicoes)}</textarea></div>
        </div></details>
      </div>
      <div class="previa-col">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap;"><span class="salvo" id="salvo"></span><span class="muted" style="font-size:12px;" id="arq"></span></div>
        <div class="previa" id="previa"><div class="escala" id="escala"><div class="doc" id="doc"></div></div></div>
        <div class="card" style="margin-top:1rem;"><h3>PDFs gerados</h3>
          <div class="pdfs">${listaPdfs(pdfs)}</div></div>
      </div>
    </div>`;

  const $f = s => el.querySelector(s);
  const desenhar = () => {
    const c = calc(d);
    $f('#totais').innerHTML = `<div class="l"><span>Subtotal</span><span>${brl(c.subtotal)}</span></div>${c.desc > 0 ? `<div class="l"><span>Desconto</span><span>− ${brl(c.desc)}</span></div>` : ''}<div class="l g"><span>Total do projeto</span><span>${brl(c.total)}</span></div>${c.mensal > 0 ? `<div class="l"><span>Plano mensal</span><span>${brl(c.mensal)}/mês</span></div>` : ''}`;
    $f('#arq').textContent = nomeArquivo(p.numero, cli, d);
    $f('#doc').innerHTML = htmlDoc({d, cliente: cli, numero: p.numero, cfg});
    escalar();
  };
  const escalar = () => { const w = $f('#previa').clientWidth - 26, s = Math.min(1, w / 794); const e = $f('#escala'); e.style.transform = `scale(${s})`; e.style.width = 794 * s + 'px'; e.style.height = $f('#doc').offsetHeight * s + 'px'; };
  const onResize = () => { if(document.body.contains(el) && $f('#doc')) escalar(); else removeEventListener('resize', onResize); };
  addEventListener('resize', onResize);
  document.fonts?.ready.then(() => { if($f('#doc')) escalar(); });

  // salvar automático
  let pendente = false;
  const gravar = () => { const c = calc(d); return q.altera(T.propostas, id, {dados: d, titulo: d.titulo, total: c.total, mensal: c.mensal}); };
  const salvar = debounce(async () => {
    try{ await gravar(); pendente = false; $f('#salvo').className = 'salvo'; $f('#salvo').textContent = 'Salvo ✓'; }
    catch(e){ $f('#salvo').className = 'salvo erro'; $f('#salvo').textContent = 'Não salvou: ' + traduzErro(e); }
  }, 900);
  const mudou = () => { if(travada) return; pendente = true; $f('#salvo').className = 'salvo'; $f('#salvo').textContent = 'Salvando…'; desenhar(); salvar(); };

  // itens do investimento
  const desenharItens = () => {
    $f('#f_itens').innerHTML = d.itens.map((x, i) => `<div class="li-it"><input type="text" list="itSug" data-i="${i}" data-k="desc" value="${esc(x.desc)}" placeholder="Descrição" aria-label="Descrição"><input type="number" min="1" data-i="${i}" data-k="qtd" value="${x.qtd || 1}" aria-label="Quantidade"><input type="number" min="0" step="10" data-i="${i}" data-k="valor" value="${x.valor || ''}" placeholder="0 = incluso" aria-label="Valor"><button type="button" data-del="${i}" aria-label="Remover item">✕</button></div>`).join('')
      || '<div class="vazio" style="padding:.7rem;">Nenhum item. Adicione pelo menos um.</div>';
    if(travada) $f('#f_itens').querySelectorAll('input,button').forEach(x => x.disabled = true);
  };
  desenharItens();
  $f('#f_itens').addEventListener('input', e => { const t = e.target, x = d.itens[t.dataset.i]; if(!x) return; x[t.dataset.k] = t.dataset.k === 'desc' ? t.value : t.dataset.k === 'qtd' ? Math.max(1, parseInt(t.value, 10) || 1) : numInput(t.value); mudou(); });
  $f('#f_itens').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if(!b) return; d.itens.splice(+b.dataset.del, 1); desenharItens(); mudou(); });
  $f('#addIt').onclick = () => { d.itens.push({desc: '', qtd: 1, valor: 0}); desenharItens(); const ins = $f('#f_itens').querySelectorAll('input[data-k=desc]'); ins[ins.length - 1]?.focus(); };

  // campos simples
  const campos = {f_tit: ['titulo', 's'], f_sub: ['subtitulo', 's'], f_obj: ['objetivo', 's'], f_esc: ['escopo', 's'], f_ctx: ['contexto', 's'], f_mctx: ['mostrar_contexto', 'b'],
    f_etp: ['etapas', 's'], f_desc: ['desconto', 'n'], f_dtipo: ['desconto_tipo', 's'], f_men: ['mensal', 'n'], f_mdesc: ['mensal_desc', 's'],
    f_pag: ['pagamento', 's'], f_prazo: ['prazo', 's'], f_valid: ['validade_dias', 'int'], f_inc: ['incluso', 's'], f_nao: ['nao_incluso', 's'], f_obs: ['obs', 's'], f_cond: ['condicoes', 's']};
  Object.entries(campos).forEach(([fid, [k, t]]) => { const e = $f('#' + fid); if(!e) return;
    e.addEventListener(t === 'b' || e.tagName === 'SELECT' ? 'change' : 'input', () => { d[k] = t === 'n' ? numInput(e.value) : t === 'int' ? (parseInt(e.value, 10) || 15) : t === 'b' ? e.checked : e.value; mudou(); }); });

  $f('#f_serv')?.addEventListener('change', async e => {
    const s = ss.find(x => x.id === e.target.value); if(!s) return;
    if(!(await confirmar('Trocar o serviço base', `Título, texto, entregas e valores passam a ser os de <b>${esc(s.nome)}</b>. Condições e observações continuam como estão.`, 'Trocar'))){ e.target.value = d.servico?.id || ''; return; }
    Object.assign(d, {titulo: s.nome, subtitulo: s.subtitulo || '', objetivo: s.descricao || '', escopo: (s.entregaveis || []).join('\n'), servico: {id: s.id, nome: s.nome, categoria: s.categoria},
      itens: Number(s.preco_base) ? [{desc: s.nome, sub: s.subtitulo || '', qtd: 1, valor: Number(s.preco_base)}] : [], mensal: Number(s.mensal) || 0, mensal_desc: Number(s.mensal) ? s.nome : d.mensal_desc});
    mudou(); await new Promise(r => setTimeout(r, 950)); recarregar();
  });

  el.addEventListener('input', e => autoAltura(e.target));
  const crescer = () => el.querySelectorAll('#form textarea').forEach(autoAltura);
  $f('#form').addEventListener('toggle', crescer, true);
  if(travada) el.querySelectorAll('#form input, #form select, #form textarea, #form button').forEach(x => x.disabled = true);
  [['f_esc', 'Ex.: Login e dados protegidos'], ['f_etp', 'Ex.: Desenho: telas e protótipo'], ['f_pag', 'Ex.: 50% no aceite (Pix)'], ['f_inc', 'Ex.: 30 dias de ajustes'], ['f_nao', 'Ex.: Domínio próprio']]
    .forEach(([i, ph]) => listaBonita($f('#' + i), {placeholder: ph}));

  // status (e o funil acompanha)
  $f('#status').addEventListener('change', async e => {
    const novo = e.target.value, antigo = p.status;
    try{
      if(novo === 'aprovada' && !(await confirmar('Aprovar proposta', 'Depois de aprovada, a proposta fica travada (não pode ser alterada nem apagada). Confirmar?', 'Aprovar', 'verde'))){ e.target.value = antigo; return; }
      if(pendente){ await gravar(); pendente = false; }
      await q.altera(T.propostas, id, {status: novo, ...(novo === 'enviada' ? {validade_ate: addDias(new Date(), d.validade_dias || 15).toISOString().slice(0, 10)} : {})});
      p.status = novo;
      const avancar = async etapa => { if(op && op.etapa !== 'perdido' && ORDEM.indexOf(op.etapa) < ORDEM.indexOf(etapa)) await q.altera(T.oport, op.id, {etapa}); };
      if(op && d.titulo && /[…·]/.test(op.titulo || '') && op.titulo !== d.titulo){ await q.altera(T.oport, op.id, {titulo: d.titulo}); op.titulo = d.titulo; }
      if(novo === 'enviada'){
        await avancar('proposta');
        aviso('Proposta marcada como enviada.', `<button class="btn prim peq" id="retorno">Cobrar resposta em 3 dias</button>`);
        const b = document.getElementById('retorno'); if(b) b.onclick = async () => { const x = addDias(new Date(), 3); x.setHours(10, 0, 0, 0); await q.cria(T.tarefas, {cliente_id: cli.id, oportunidade_id: op?.id, titulo: `Cobrar resposta da proposta Nº ${p.numero}`, area: 'comercial', vence_em: x.toISOString()}); aviso('Lembrete criado para daqui a 3 dias.'); };
      }
      if(novo === 'negociacao') await avancar('negociacao');
      if(novo === 'aprovada' && op && !['fechado', 'entregue'].includes(op.etapa)){
        const c = calc(d);
        if(await confirmar('Fechar o projeto?', `Marcar <b>${esc(op.titulo)}</b> como fechado, com <b>${brl(c.total)}</b>${c.mensal ? ` + ${brl(c.mensal)}/mês` : ''}? Você escolhe como lançar os recebimentos no financeiro.`, 'Sim, fechar', 'verde')){
          const r = await forms.moverEtapa({...op, valor: c.total, mensal: c.mensal}, 'fechado'); if(r) aviso('Projeto fechado! Que venha a construção.');
        }
      }
      if(novo === 'recusada' && op && !['perdido', 'fechado', 'entregue'].includes(op.etapa)){
        if(await confirmar('Proposta recusada', `Marcar o projeto <b>${esc(op.titulo)}</b> como perdido?`, 'Marcar como perdido', 'perigo')) await forms.moverEtapa(op, 'perdido');
      }
      recarregar();
    }catch(err){ e.target.value = antigo; aviso(traduzErro(err)); }
  });

  // gerar PDF
  $f('#pdf').addEventListener('click', async ev => {
    const b = ev.currentTarget, txt = b.innerHTML; b.disabled = true; b.textContent = 'Gerando…';
    try{
      if(pendente){ await gravar(); pendente = false; }
      const nome = nomeArquivo(p.numero, cli, d);
      const blob = await gerarPdfBlob($f('#doc'));
      baixar(nome, blob);
      await arquivarPdf(p, blob, nome, calc(d).total);
      if(p.status === 'rascunho') aviso('PDF baixado e arquivado.', `<button class="btn prim peq" id="marcaEnv">Marcar como enviada</button>`);
      else aviso('PDF baixado e arquivado.');
      const me = document.getElementById('marcaEnv'); if(me) me.onclick = () => { $f('#status').value = 'enviada'; $f('#status').dispatchEvent(new Event('change')); };
      atualizarPdfs();
    }catch(e){ console.error(e); aviso('Não foi possível gerar o PDF: ' + traduzErro(e)); }
    finally{ b.disabled = false; b.innerHTML = txt; }
  });
  const atualizarPdfs = async () => { const l = await q.lista(T.pdfs, '*', x => x.eq('proposta_id', id).order('versao', {ascending: false})); const box = $f('.pdfs'); if(!box || !document.body.contains(box)) return; box.innerHTML = listaPdfs(l); ligarPdfs(); };
  const ligarPdfs = () => el.querySelectorAll('[data-pdf]').forEach(a => a.onclick = async e => { e.preventDefault(); try{ window.open(await linkArquivo(a.dataset.pdf, 'rumeyart-propostas'), '_blank', 'noopener'); }catch(err){ aviso(traduzErro(err)); } });
  ligarPdfs();

  // mais ações
  $f('#mais').addEventListener('click', async () => {
    const w = whatsLink(cli.whatsapp, `Olá, ${primeiroNome(cli.nome)}! Aqui é da Rumëyart. Preparei a sua proposta nº ${p.numero} (${d.titulo}). Vou te mandar o PDF por aqui.`);
    const acao = await janela({titulo: `Proposta Nº ${p.numero}`, corpo: `<div style="display:grid;gap:.45rem;">
      ${w ? `<a class="btn verde" href="${w}" target="_blank" rel="noopener" data-fecha><span class="ic">${ICONES.whats}</span>Abrir conversa no WhatsApp</a>` : ''}
      <button type="button" class="btn fantasma" data-ac="duplicar" style="justify-content:flex-start;"><span class="ic">${ICONES.copiar}</span>Duplicar como nova proposta</button>
      ${op ? `<button type="button" class="btn fantasma" data-ac="contrato" style="justify-content:flex-start;"><span class="ic">${ICONES.contratos}</span>Gerar contrato a partir desta proposta</button>` : ''}
      <button type="button" class="btn fantasma" data-ac="cliente" style="justify-content:flex-start;"><span class="ic">${ICONES.clientes}</span>Abrir ficha do cliente</button>
      ${!travada && !pdfs.length ? `<button type="button" class="btn perigo" data-ac="apagar" style="justify-content:flex-start;"><span class="ic">${ICONES.lixo}</span>Apagar proposta</button>` : ''}</div>
      <p class="muted" style="font-size:12.5px;margin-bottom:0;">Propostas com PDF gerado ou aprovadas não podem ser apagadas — ficam no histórico.</p>`,
      aoAbrir: ctx => { ctx.el.querySelectorAll('[data-ac]').forEach(x => x.onclick = () => ctx.fechar(x.dataset.ac)); const f = ctx.el.querySelector('[data-fecha]'); if(f) f.addEventListener('click', () => setTimeout(() => ctx.fechar(null), 50)); }});
    try{
      if(acao === 'cliente') ir('cliente/' + cli.id);
      if(acao === 'contrato'){ const {novoContrato} = await import('./v-contratos.js'); const k = await novoContrato({cliente_id: cli.id, oportunidade_id: p.oportunidade_id, proposta_id: p.id}); if(k) ir('contrato/' + k.id); }
      if(acao === 'duplicar'){
        const c = calc(d);
        const nova = await q.cria(T.propostas, {cliente_id: cli.id, oportunidade_id: p.oportunidade_id, titulo: d.titulo, dados: JSON.parse(JSON.stringify(d)), total: c.total, mensal: c.mensal});
        await q.cria(T.hist, {cliente_id: cli.id, oportunidade_id: p.oportunidade_id, proposta_id: nova.id, tipo: 'proposta', texto: `Proposta Nº ${nova.numero} criada a partir da Nº ${p.numero}`});
        aviso(`Proposta Nº ${nova.numero} criada.`); ir('proposta/' + nova.id);
      }
      if(acao === 'apagar' && await confirmar('Apagar proposta', `Apagar a proposta Nº ${p.numero}? O registro de criação continua no histórico do cliente.`, 'Apagar', 'perigo')){
        await q.apaga(T.propostas, id); aviso('Proposta apagada.'); ir('cliente/' + cli.id);
      }
    }catch(err){ aviso(traduzErro(err)); }
  });

  desenhar();
  requestAnimationFrame(crescer);
}

const listaPdfs = l => l.length ? l.map(f => `<a href="#" data-pdf="${esc(f.caminho)}"><span class="ic" style="width:18px;height:18px;display:inline-flex;color:var(--laranja-2);">${ICONES.pdf}</span><span style="flex:1;">Versão ${f.versao} · ${brl(f.total)}</span><span class="muted" style="font-size:12px;">${dataHoraBR(f.gerado_em)}</span></a>`).join('')
  : '<div class="vazio">Nenhum PDF gerado ainda. Cada PDF gerado fica guardado aqui, com a versão e o valor.</div>';
