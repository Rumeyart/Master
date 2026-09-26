// Contrato: revisar o texto, gerar PDF, marcar como assinado
import {q, T, config, enviarDoc, linkArquivo} from './db.js';
import {esc, dataBR, dataHoraBR, hojeChave, whatsLink, primeiroNome, aviso, traduzErro, confirmar, janela, debounce, baixar, autoAltura} from './util.js';
import {htmlContrato, gerarContratoPdf, nomeContrato} from './proposta-doc.js';
import {VARIAVEIS, preencher} from './v-contratos.js';
import {ICONES} from './icones.js';
import {ir, recarregar} from './app.js';

export async function render(el, {id}){
  const k = await q.um(T.contratos, id);
  if(!k){ el.innerHTML = '<div class="card"><h3>Contrato não encontrado</h3><a href="#/contratos">Voltar</a></div>'; return; }
  const [cli, op, prop, cfg] = await Promise.all([q.um(T.clientes, k.cliente_id), k.oportunidade_id ? q.um(T.oport, k.oportunidade_id) : null, k.proposta_id ? q.um(T.propostas, k.proposta_id, 'id,numero,titulo,status,dados') : null, config()]);
  const assinado = !!k.assinado_em;
  const faltando = [...new Set((k.corpo.match(/\{\{\s*[\w.]+\s*\}\}/g) || []))];

  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Contrato</div><h1>Contrato Nº ${k.numero}</h1>
      <div class="dir"><button class="btn prim" id="pdf"><span class="ic">${ICONES.pdf}</span>Gerar PDF</button>
        ${assinado ? '' : '<button class="btn verde" id="assinar">Marcar como assinado</button>'}
        <button class="btn fantasma" id="mais" aria-label="Mais ações">⋯</button></div>
      <div class="sub"><a href="#/cliente/${cli.id}${op ? '?op=' + op.id : ''}">${esc(cli.nome)}</a>${op ? ' · ' + esc(op.titulo) : ''}${prop ? ` · <a href="#/proposta/${prop.id}">Proposta Nº ${prop.numero}</a>` : ''} · criado em ${dataHoraBR(k.criado_em)}</div></div>
    ${assinado ? `<div class="alerta ok"><span class="ic">${ICONES.ok}</span><div>Assinado em <b>${dataBR(k.assinado_em + 'T12:00:00')}</b>. O texto fica travado para não divergir do que foi assinado.</div></div>` : ''}
    ${faltando.length && !assinado ? `<div class="alerta"><span class="ic">${ICONES.sino}</span><div>Ainda há campos sem preencher: ${faltando.map(esc).join(', ')}. Complete os dados do cliente ou edite o texto.</div></div>` : ''}
    <div class="ed-cols">
      <div id="form">
        <div class="card"><h3>Texto do contrato <span class="salvo dir" id="salvo"></span></h3>
          <div class="campo"><label class="rot" for="c_tit">Título (aparece no cabeçalho)</label><input type="text" id="c_tit" value="${esc(k.titulo)}" ${assinado ? 'disabled' : ''}></div>
          <div class="campo"><label class="rot" for="c_corpo">Cláusulas</label><textarea id="c_corpo" style="min-height:420px;font-size:13.5px;line-height:1.55;" ${assinado ? 'disabled' : ''}>${esc(k.corpo)}</textarea></div>
          ${assinado ? '' : `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;"><button class="btn linha peq" id="repreencher">Preencher de novo com os dados atuais</button></div>
          <p class="muted" style="font-size:12.5px;">Mudou o CPF, o valor ou a proposta? "Preencher de novo" refaz o texto a partir do modelo${k.modelo_id ? '' : ' (modelo não encontrado)'} — edições manuais se perdem.</p>`}
        </div>
        <div class="card"><h3>Arquivo</h3>
          ${k.caminho ? `<a href="#" id="abrir" class="btn linha peq"><span class="ic">${ICONES.pdf}</span>Abrir último PDF gerado</a>` : '<div class="vazio">Nenhum PDF gerado ainda.</div>'}
        </div>
      </div>
      <div class="previa-col">
        <div class="previa" id="previa"><div class="escala" id="escala"><div class="doc" id="doc"></div></div></div>
      </div>
    </div>`;

  const $f = s => el.querySelector(s);
  const escalar = () => { const w = $f('#previa').clientWidth - 26, s = Math.min(1, w / 794); const e = $f('#escala'); e.style.transform = `scale(${s})`; e.style.width = 794 * s + 'px'; e.style.height = $f('#doc').offsetHeight * s + 'px'; };
  const desenhar = () => { $f('#doc').innerHTML = htmlContrato({titulo: k.titulo, corpo: k.corpo, numero: k.numero}); escalar(); };
  const onResize = () => { if(document.body.contains(el) && $f('#doc')) escalar(); else removeEventListener('resize', onResize); };
  addEventListener('resize', onResize);
  document.fonts?.ready.then(() => { if($f('#doc')) escalar(); });

  let pendente = false;
  const gravar = () => q.altera(T.contratos, id, {titulo: k.titulo, corpo: k.corpo});
  const salvar = debounce(async () => { try{ await gravar(); pendente = false; $f('#salvo').className = 'salvo dir'; $f('#salvo').textContent = 'Salvo ✓'; }catch(e){ $f('#salvo').className = 'salvo erro dir'; $f('#salvo').textContent = 'Não salvou'; } }, 900);
  const mudou = () => { pendente = true; $f('#salvo').textContent = 'Salvando…'; desenhar(); salvar(); };
  $f('#c_tit').addEventListener('input', e => { k.titulo = e.target.value; mudou(); });
  $f('#c_corpo').addEventListener('input', e => { k.corpo = e.target.value; autoAltura(e.target); mudou(); });

  $f('#repreencher')?.addEventListener('click', async () => {
    if(!(await confirmar('Preencher de novo', 'O texto volta a ser o do modelo, com os dados atuais do cliente e da proposta. Edições manuais feitas aqui se perdem.', 'Preencher'))) return;
    try{
      const mod = k.modelo_id ? await q.um(T.modelos, k.modelo_id) : null;
      if(!mod){ aviso('O modelo deste contrato não existe mais.'); return; }
      const propFull = k.proposta_id ? await q.um(T.propostas, k.proposta_id) : null;
      k.corpo = preencher(mod.corpo, {cfg, cliente: cli, op, prop: propFull, numero: k.numero});
      await gravar(); aviso('Texto refeito.'); recarregar();
    }catch(e){ aviso(traduzErro(e)); }
  });

  $f('#pdf').addEventListener('click', async ev => {
    const b = ev.currentTarget, txt = b.innerHTML; b.disabled = true; b.textContent = 'Gerando…';
    try{
      if(pendente){ await gravar(); pendente = false; }
      const nome = nomeContrato(k.numero, cli, k.titulo);
      const blob = await gerarContratoPdf($f('#doc'));
      baixar(nome, blob);
      const caminho = await enviarDoc(`contratos/${k.numero}`, blob, nome);
      await q.altera(T.contratos, id, {caminho});
      aviso('PDF baixado e guardado.', whatsLink(cli.whatsapp) ? `<a class="btn verde peq" target="_blank" rel="noopener" href="${whatsLink(cli.whatsapp, `Olá, ${primeiroNome(cli.nome)}! Segue o contrato nº ${k.numero} do projeto ${k.titulo}. Qualquer dúvida, me chama por aqui.`)}">Enviar pelo WhatsApp</a>` : '');
    }catch(e){ console.error(e); aviso('Não foi possível gerar o PDF: ' + traduzErro(e)); }
    finally{ b.disabled = false; b.innerHTML = txt; }
  });
  $f('#abrir')?.addEventListener('click', async e => { e.preventDefault(); try{ window.open(await linkArquivo(k.caminho, 'rumeyart-docs'), '_blank', 'noopener'); }catch(err){ aviso(traduzErro(err)); } });

  $f('#assinar')?.addEventListener('click', async () => {
    const data = await janela({titulo: 'Contrato assinado', corpo: `<div class="campo"><label class="rot" for="a_dt">Assinado em</label><input type="date" id="a_dt" value="${hojeChave()}"></div>
      <p class="muted" style="font-size:12.5px;">Depois disso o texto fica travado. O registro vai para o histórico do cliente.</p>`,
      botoes: [{texto: 'Cancelar'}, {texto: 'Confirmar', classe: 'verde', acao: ctx => ctx.valor('#a_dt') || hojeChave()}]});
    if(!data) return;
    try{
      if(pendente){ await gravar(); pendente = false; }
      await q.altera(T.contratos, id, {assinado_em: data});
      if(op && !['fechado', 'entregue'].includes(op.etapa)){
        const {moverEtapa} = await import('./forms.js');
        if(await confirmar('Fechar o projeto?', `Contrato assinado. Quer marcar <b>${esc(op.titulo)}</b> como fechado e lançar os recebimentos?`, 'Sim, fechar', 'verde')) await moverEtapa(op, 'fechado');
      }
      aviso('Contrato marcado como assinado.'); recarregar();
    }catch(e){ aviso(traduzErro(e)); }
  });

  $f('#mais').addEventListener('click', async () => {
    const acao = await janela({titulo: `Contrato Nº ${k.numero}`, corpo: `<div style="display:grid;gap:.45rem;">
      <button type="button" class="btn fantasma" data-ac="cliente" style="justify-content:flex-start;"><span class="ic">${ICONES.clientes}</span>Abrir ficha do cliente</button>
      <button type="button" class="btn fantasma" data-ac="vars" style="justify-content:flex-start;"><span class="ic">${ICONES.editar}</span>Ver variáveis dos modelos</button>
      ${assinado ? '<button type="button" class="btn fantasma" data-ac="desassinar" style="justify-content:flex-start;">Desfazer "assinado"</button>' : '<button type="button" class="btn perigo" data-ac="apagar" style="justify-content:flex-start;"><span class="ic">' + ICONES.lixo + '</span>Apagar contrato</button>'}</div>`,
      aoAbrir: ctx => ctx.el.querySelectorAll('[data-ac]').forEach(x => x.onclick = () => ctx.fechar(x.dataset.ac))});
    try{
      if(acao === 'cliente') ir('cliente/' + cli.id);
      if(acao === 'vars') janela({titulo: 'Variáveis', corpo: `<div class="dados">${VARIAVEIS.map(([v, n]) => `<div><div class="k">{{${v}}}</div><div class="v">${esc(n)}</div></div>`).join('')}</div>`, botoes: [{texto: 'Fechar'}]});
      if(acao === 'desassinar' && await confirmar('Desfazer assinatura', 'O contrato volta a ser editável.', 'Desfazer')){ await q.altera(T.contratos, id, {assinado_em: null}); recarregar(); }
      if(acao === 'apagar' && await confirmar('Apagar contrato', `Apagar o contrato Nº ${k.numero}? O registro de criação continua no histórico do cliente.`, 'Apagar', 'perigo')){ await q.apaga(T.contratos, id); aviso('Contrato apagado.'); ir('contratos'); }
    }catch(e){ aviso(traduzErro(e)); }
  });

  desenhar();
  requestAnimationFrame(() => autoAltura($f('#c_corpo')));
}
