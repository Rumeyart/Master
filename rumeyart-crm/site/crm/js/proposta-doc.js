// Documentos A4 com a identidade Rumëyart: proposta comercial (2 páginas) e contrato
import {esc, brl, dataBR, linhas, primeiroNome} from './util.js';

// Perguntas do formulário do site (mesmas chaves que o site envia)
export const CAMPOS_BRIEFING = [
  ['para', 'Para quem é'], ['marca', 'Marca / empresa'], ['tipo', 'Formato imaginado'], ['dor', 'O que incomoda hoje'],
  ['desejo', 'O que a solução deve fazer'], ['quem', 'Quem vai usar'], ['onde', 'Onde vai usar'], ['prazo', 'Para quando'], ['invest', 'Investimento previsto']
];

// Resumo do que o cliente contou no site, para entrar na proposta
function contextoDoPedido(ped){
  if(!ped) return '';
  const r = ped.respostas || {};
  return [ped.ideia, r.dor ? 'Hoje: ' + r.dor : '', r.desejo ? 'O que você espera: ' + r.desejo : ''].filter(Boolean).join('\n\n');
}

// Dados iniciais de uma proposta, a partir de um serviço (cópia: mudar o serviço depois não altera a proposta)
export function dadosPadrao(serv, cfg, pedido, tituloProjeto){
  const P = cfg?.proposta || {};
  const ctx = contextoDoPedido(pedido);
  return {
    versao_modelo: 1,
    titulo: tituloProjeto && tituloProjeto.length <= 60 && !/[…·]/.test(tituloProjeto) ? tituloProjeto : serv.nome,
    subtitulo: serv.subtitulo || '',
    servico: {id: serv.id, nome: serv.nome, categoria: serv.categoria},
    contexto: ctx, mostrar_contexto: !!ctx,
    objetivo: serv.descricao || '',
    escopo: (serv.entregaveis || []).join('\n'),
    etapas: P.etapas_padrao || '',
    itens: [{desc: serv.nome, sub: serv.subtitulo || '', qtd: 1, valor: Number(serv.preco_base) || 0}].filter(i => i.valor > 0 || !Number(serv.mensal)),
    desconto: 0, desconto_tipo: 'rs',
    mensal: Number(serv.mensal) || 0, mensal_desc: Number(serv.mensal) ? serv.nome : 'Hospedagem, manutenção e suporte',
    pagamento: P.pagamento_padrao || '', prazo: P.prazo_padrao || serv.prazo || '',
    validade_dias: P.validade_dias || 15,
    incluso: P.incluso_padrao || '', nao_incluso: P.nao_incluso_padrao || '',
    condicoes: P.condicoes_padrao || '', obs: ''
  };
}

export function calc(d){
  const L = (d.itens || []).filter(i => (i.desc || '').trim() || Number(i.valor)).map(i => {
    const q = Math.max(1, parseInt(i.qtd, 10) || 1);
    return {desc: (q > 1 ? `${q}× ` : '') + (i.desc || 'Item'), sub: [i.sub, q > 1 ? `${brl(i.valor)} cada` : ''].filter(Boolean).join(' · '), valor: q * (Number(i.valor) || 0)};
  });
  const subtotal = L.reduce((s, l) => s + l.valor, 0);
  const desc = d.desconto_tipo === 'pct' ? subtotal * Math.min(100, Number(d.desconto) || 0) / 100 : Math.min(subtotal, Number(d.desconto) || 0);
  const total = Math.max(0, Math.round((subtotal - desc) * 100) / 100);
  return {linhas: L, subtotal, desc, total, mensal: Math.max(0, Number(d.mensal) || 0)};
}

const limpa = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
export const nomeArquivo = (numero, cliente, d) => `Proposta Nº${numero} - ${limpa(cliente?.nome)} - ${limpa(d.titulo)}.pdf`;
export const nomeContrato = (numero, cliente, titulo) => `Contrato Nº${numero} - ${limpa(cliente?.nome)} - ${limpa(titulo)}.pdf`;

// ---------- partes comuns ----------
const LOGO_S = '../img/rumeyart-simbolo.png', LOGO_W = '../img/rumeyart-marca.png';
const fios = (w, h, n = 6) => `<svg class="fios" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${[...Array(n)].map((_, i) => {
  const y = 20 + i * (h - 40) / (n - 1), a = 10 + (i % 3) * 8, c = ['#E0703A', '#7A4466', '#7CC4F0'][i % 3];
  return `<path d="M0 ${y} C ${w * .25} ${y - a}, ${w * .5} ${y + a}, ${w * .75} ${y - a / 2} S ${w} ${y + a / 3}, ${w} ${y}" fill="none" stroke="${c}" stroke-width="1" opacity="${i % 3 === 2 ? .55 : .4}"/>`;
}).join('')}</svg>`;
const cab = (rotulo, numTxt, data) => `<div class="hd"><div class="mk"><img class="s" src="${LOGO_S}" alt=""><img class="w" src="${LOGO_W}" alt="Rumëyart Criação"></div>
  <div class="num"><div class="k">${rotulo}</div><div class="v">${numTxt}</div>${data ? `<div class="d">${data}</div>` : ''}</div></div>`;
const rodape = (E, numTxt, pg, tot) => `<div class="pf"><span>${esc(E.nome || 'Rumëyart Criação')}${E.site ? ' · ' + esc(E.site) : ''}${E.whatsapp ? ' · WhatsApp ' + esc(E.whatsapp) : ''}</span><span>${numTxt} · página ${pg} de ${tot}</span></div>`;
const lista = (xs, cls = '') => `<ul class="bl ${cls}">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;

// ---------- proposta ----------
export function htmlDoc({d, cliente, numero, cfg}){
  const E = cfg?.empresa || {}, c = calc(d);
  const emissao = new Date(), validade = new Date(emissao.getTime() + (d.validade_dias || 15) * 86400000);
  const numTxt = `Nº ${numero ?? '—'}`;
  const primeiro = primeiroNome(cliente?.nome);
  const escopo = linhas(d.escopo), incluso = linhas(d.incluso), nao = linhas(d.nao_incluso), pag = linhas(d.pagamento);
  const etapas = linhas(d.etapas).map(e => { const [t, ...r] = e.split(/:\s*|\s+[—–-]\s+/); return {t: t.trim(), d: r.join(': ').trim()}; });
  const ctx = d.mostrar_contexto && d.contexto ? d.contexto : '';
  const ctxCurto = ctx.length > 520 ? ctx.slice(0, 500).replace(/\s+\S*$/, '') + '…' : ctx;

  return `
  <section class="page">
    ${cab('Proposta comercial', numTxt, 'Emitida em ' + dataBR(emissao))}
    <div class="hero">
      ${fios(700, 230)}
      <div class="para">Preparada para <b>${esc(cliente?.nome || '')}</b>${cliente?.marca ? ` · ${esc(cliente.marca)}` : ''}</div>
      <h1>${esc(d.titulo || '')}</h1>
      ${d.subtitulo ? `<div class="sub">${esc(d.subtitulo)}</div>` : ''}
    </div>
    <div class="pad">
      <p class="intro">${primeiro ? esc(primeiro) + ', a' : 'A'}qui está o caminho que desenhamos para transformar a sua ideia em algo que funciona no dia a dia: o que vamos construir, como vamos trabalhar juntos e quanto isso representa.</p>
      ${ctxCurto ? `<div class="ctx"><div class="eyebrow">O que você nos contou</div><div class="tx">${esc(ctxCurto)}</div></div>` : ''}
      <div class="bloco"><div class="eyebrow">O que vamos construir</div><div class="rule"></div>
        ${d.objetivo ? `<p class="obj">${esc(d.objetivo)}</p>` : ''}
        ${escopo.length ? `<div class="escopo">${escopo.map(x => `<div class="it"><span class="ck">✓</span><span>${esc(x)}</span></div>`).join('')}</div>` : ''}
      </div>
      ${etapas.length ? `<div class="bloco"><div class="eyebrow">Como vamos trabalhar</div><div class="rule"></div>
        <div class="etapas" style="grid-template-columns:repeat(${Math.min(etapas.length, 5)},1fr);">${etapas.slice(0, 5).map((e, i) => `<div class="et"><div class="b">${String(i + 1).padStart(2, '0')}</div><div class="t">${esc(e.t)}</div>${e.d ? `<div class="d">${esc(e.d)}</div>` : ''}</div>`).join('')}</div></div>` : ''}
    </div>
    ${rodape(E, numTxt, 1, 2)}
  </section>

  <section class="page">
    ${cab('Proposta comercial', numTxt, '')}
    <div class="pad">
      <div class="bloco" style="margin-top:26px;"><div class="eyebrow">Investimento</div><div class="rule"></div>
        <table class="inv">${c.linhas.map(l => `<tr><td>${esc(l.desc)}${l.sub ? `<span class="sm">${esc(l.sub)}</span>` : ''}</td><td class="v">${l.valor > 0 ? brl(l.valor) : '<span class="inc">Incluso</span>'}</td></tr>`).join('')}
          ${c.desc > 0 ? `<tr class="sub"><td>Subtotal</td><td class="v">${brl(c.subtotal)}</td></tr><tr class="desc"><td>Desconto${d.desconto_tipo === 'pct' ? ` (${Number(d.desconto)}%)` : ''}</td><td class="v">− ${brl(c.desc)}</td></tr>` : ''}
        </table>
        <div class="totbox"><div><div class="k">${c.linhas.length ? 'Investimento do projeto' : 'Investimento'}</div><div class="e">Valores válidos até ${dataBR(validade)}</div></div><div class="t">${brl(c.total)}</div></div>
        ${c.mensal > 0 ? `<div class="mensal"><div><b>${esc(d.mensal_desc || 'Plano mensal')}</b><span>Cobrado mensalmente depois da entrega. Pode ser cancelado quando quiser.</span></div><div class="t">${brl(c.mensal)}<small>/mês</small></div></div>` : ''}
      </div>
      <div class="two">
        <div><div class="eyebrow">Condições</div><div class="rule"></div>
          <div class="kv"><div class="k">Pagamento</div><div class="v">${pag.length ? lista(pag) : 'A combinar'}</div></div>
          <div class="kv"><div class="k">Prazo</div><div class="v">${esc(d.prazo || 'A combinar')}</div></div>
          <div class="kv"><div class="k">Validade</div><div class="v">${d.validade_dias || 15} dias · até ${dataBR(validade)}</div></div>
        </div>
        <div>${incluso.length ? `<div class="eyebrow">Está incluso</div><div class="rule"></div>${lista(incluso, 'ok')}` : ''}
          ${nao.length ? `<div class="eyebrow" style="margin-top:14px;">Não está incluso</div><div class="rule"></div>${lista(nao, 'nao')}` : ''}</div>
      </div>
      <div class="bloco"><div class="eyebrow">Próximos passos</div><div class="rule"></div>
        <div class="passos">
          <div class="ps"><div class="b">1</div><div class="t">Aceite</div><div class="d">Você confirma a proposta pelo WhatsApp.</div></div>
          <div class="ps"><div class="b">2</div><div class="t">Contrato e entrada</div><div class="d">Assinatura digital e pagamento da entrada.</div></div>
          <div class="ps"><div class="b">3</div><div class="t">Protótipo</div><div class="d">Você testa as telas antes da construção.</div></div>
          <div class="ps"><div class="b">4</div><div class="t">No ar</div><div class="d">Publicação, treinamento e ajustes.</div></div>
        </div></div>
      ${d.obs ? `<div class="bloco"><div class="eyebrow">Observações</div><div class="rule"></div><div class="obs">${esc(d.obs)}</div></div>` : ''}
      <div class="sign">
        <div class="who"><div class="gr">Seguimos juntos,</div><div class="nm">${esc(E.responsavel || 'Equipe Rumëyart')}</div><div class="rl">${esc(E.nome || 'Rumëyart Criação')}</div></div>
        <div class="fine">${d.condicoes ? esc(d.condicoes) + '<br>' : ''}Proposta enviada digitalmente — o aceite pelo WhatsApp ou e-mail vale como confirmação.</div>
      </div>
    </div>
    <div class="fecho"><img src="${LOGO_S}" alt=""><div><div class="q">Um ambiente pensado para as ideias florescerem.</div><div class="s">${esc(E.email || '')}${E.email && E.whatsapp ? ' · ' : ''}${E.whatsapp ? 'WhatsApp ' + esc(E.whatsapp) : ''}</div></div></div>
    ${rodape(E, numTxt, 2, 2)}
  </section>`;
}

// ---------- contrato (texto corrido, quantas páginas precisar) ----------
export function htmlContrato({titulo, corpo, numero}){
  const numTxt = `Nº ${numero ?? '—'}`;
  const blocos = String(corpo || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const par = l => /^_{5,}\s*$/.test(l.trim()) ? '<div class="ass-l"></div>' : `<p>${esc(l)}</p>`;
  const html = blocos.map((p, i) => {
    const ls = p.split('\n');
    if(i === 0 && /^CONTRATO/i.test(ls[0])) return `<h1 class="ct-t">${esc(ls[0])}</h1>${ls.slice(1).map(par).join('')}`;
    if(/^\d+(\.\d+)*\.?\s+\S/.test(ls[0]) && ls[0] === ls[0].toUpperCase()) return `<div class="avoid"><h3 class="ct-h">${esc(ls[0])}</h3>${ls.slice(1).map(par).join('')}</div>`;
    return `<div class="avoid">${ls.map(par).join('')}</div>`;
  }).join('');
  return `<section class="page contrato">
    ${cab('Contrato', numTxt, esc(titulo || ''))}
    <div class="pad ct">${html}</div>
  </section>`;
}

// ---------- PDF ----------
export async function gerarPdfBlob(docEl){
  await document.fonts.ready;
  const clone = docEl.cloneNode(true); clone.removeAttribute('id'); clone.style.transform = 'none'; clone.classList.add('pdf-a4');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:0;top:0;width:794px;z-index:-1;pointer-events:none;';
  holder.appendChild(clone); document.body.appendChild(holder);
  try{
    await Promise.all([...clone.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const PAGE = 1122;
    clone.querySelectorAll('.page:not(.contrato)').forEach(p => { p.style.height = PAGE + 'px'; });
    clone.style.height = (clone.querySelectorAll('.page').length * PAGE) + 'px';
    const sy = window.scrollY; window.scrollTo(0, 0);
    try{
      return await window.html2pdf().set({
        margin: 0, image: {type: 'jpeg', quality: 0.95},
        html2canvas: {scale: 2, useCORS: true, backgroundColor: '#FBF8F3', scrollX: 0, scrollY: 0},
        jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}, pagebreak: {mode: []}
      }).from(clone).outputPdf('blob');
    } finally { window.scrollTo(0, sy); }
  } finally { holder.remove(); }
}

// Contrato: html2pdf com margens (texto corrido quebra entre páginas)
export async function gerarContratoPdf(docEl){
  await document.fonts.ready;
  const clone = docEl.cloneNode(true); clone.removeAttribute('id'); clone.style.transform = 'none';
  clone.classList.add('pdf');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:0;top:0;width:718px;z-index:-1;pointer-events:none;';
  holder.appendChild(clone); document.body.appendChild(holder);
  try{
    await Promise.all([...clone.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const sy = window.scrollY; window.scrollTo(0, 0);
    try{
      return await window.html2pdf().set({
        margin: [12, 10, 14, 10], image: {type: 'jpeg', quality: 0.95},
        html2canvas: {scale: 2, useCORS: true, backgroundColor: '#FFFFFF', scrollX: 0, scrollY: 0},
        jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}, pagebreak: {mode: ['css', 'legacy'], avoid: '.avoid'}
      }).from(clone).outputPdf('blob');
    } finally { window.scrollTo(0, sy); }
  } finally { holder.remove(); }
}
