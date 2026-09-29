// Social e anúncios: plano de ação, calendário de posts, campanhas do Meta Ads, aprendizados e marca.
// Tudo registrado com resultado, para estudar o que funciona e decidir a próxima semana.
import {q, T, tudo} from './db.js';
import {esc, brlC, centavos, inputValor, valorDigitado, dataCurta, dataBR, hojeChave, diaChave, addDias, janela, aviso, traduzErro, confirmar,
  csv, baixar, mesChave, mesNome, mesLimites, somaMes, pedidoDeAnuncio, slugify} from './util.js';
import {ICONES} from './icones.js';
import {ir, recarregar} from './app.js';

const ABAS = [['visao', 'Visão geral', 'visao'], ['plano', 'Plano de ação', 'plano'], ['calendario', 'Calendário', 'calendario'],
  ['campanhas', 'Campanhas', 'alvo'], ['aprendizados', 'Aprendizados', 'lampada'], ['marca', 'Marca', 'marca']];
export const ETAPAS_MKT = [['base', 'Base da marca'], ['perfil', 'Perfil pronto'], ['visual', 'Identidade no Canva'], ['conteudo', 'Conteúdo e Reels'],
  ['ads', 'Meta Ads'], ['rotina', 'Rotina e métricas'], ['geral', 'Outras ações']];
const PILARES = [['espelho', 'Espelho', '#E0703A'], ['prova', 'Prova', '#2566A8'], ['metodo', 'Método', '#7A4466'], ['convite', 'Convite', '#2F7D55']];
const FORMATOS = [['estatico', 'Estático'], ['carrossel', 'Carrossel'], ['reels', 'Reels'], ['stories', 'Stories'], ['video', 'Vídeo']];
const ST_POST = [['ideia', 'Ideia', 'rascunho'], ['producao', 'Em produção', 'negociacao'], ['agendado', 'Agendado', 'proposta'], ['publicado', 'Publicado', 'fechado'], ['cancelado', 'Cancelado', 'cancelado']];
const OBJETIVOS = [['reconhecimento', 'Reconhecimento'], ['trafego', 'Tráfego'], ['engajamento', 'Engajamento'], ['cadastros', 'Cadastros (Leads)'], ['vendas', 'Vendas'], ['promocao_app', 'Promoção do app']];
const DESTINOS = [['whatsapp', 'WhatsApp'], ['site', 'Site'], ['perfil', 'Perfil do Instagram'], ['formulario', 'Formulário do Meta'], ['direct', 'Direct']];
const ST_CAMP = [['planejada', 'Planejada', 'rascunho'], ['ativa', 'Ativa', 'fechado'], ['pausada', 'Pausada', 'negociacao'], ['encerrada', 'Encerrada', 'expirada']];
const TIPOS_APR = [['teste', 'Teste'], ['observacao', 'Observação'], ['decisao', 'Decisão']];
const METRICAS_POST = [['alcance', 'Alcance'], ['impressoes', 'Visualizações'], ['reproducoes', 'Reproduções'], ['curtidas', 'Curtidas'], ['comentarios', 'Comentários'],
  ['salvamentos', 'Salvamentos'], ['compartilhamentos', 'Compartilhamentos'], ['visitas_perfil', 'Visitas ao perfil'], ['cliques_link', 'Cliques no link'], ['seguidores', 'Seguidores ganhos']];
const METRICAS_CAMP = [['impressoes', 'Impressões'], ['alcance', 'Alcance'], ['cliques', 'Cliques no link'], ['conversas', 'Conversas iniciadas'], ['orcamentos', 'Viraram orçamento'], ['vendas', 'Viraram venda']];

// ---------- pequenos ajudantes ----------
const r3 = (lista, v) => lista.find(x => x[0] === v) || [v, v || '—', ''];
const nome = (lista, v) => r3(lista, v)[1];
const opts = (lista, sel, vazio) => (vazio ? `<option value="">${esc(vazio)}</option>` : '') + lista.map(x => `<option value="${esc(x[0])}" ${x[0] === sel ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
const fmtN = v => v == null ? '—' : Number(v).toLocaleString('pt-BR');
const pct = (a, b) => b ? (a / b * 100).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '%' : '—';
const engaj = p => ['curtidas', 'comentarios', 'salvamentos', 'compartilhamentos'].reduce((s, k) => s + (Number(p[k]) || 0), 0);
const temMetricas = p => METRICAS_POST.some(([k]) => p[k] != null);
const taxaEng = p => p.alcance ? engaj(p) / p.alcance : null;
const tagPost = s => `<span class="tag ${r3(ST_POST, s)[2]}">${esc(nome(ST_POST, s))}</span>`;
const tagCamp = s => `<span class="tag ${r3(ST_CAMP, s)[2]}">${esc(nome(ST_CAMP, s))}</span>`;
const corPilar = v => r3(PILARES, v)[2] || 'var(--mudo-2)';
const pilarTxt = v => v ? `<span class="mk-pilar" style="--c:${corPilar(v)}">${esc(nome(PILARES, v))}</span>` : '';
const dia = iso => iso ? dataBR(String(iso).length === 10 ? iso + 'T12:00:00' : iso) : '';
const linhas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const numInput = (id, v, rot) => `<div class="campo"><label class="rot" for="${id}">${rot}</label><input type="number" inputmode="numeric" min="0" step="1" id="${id}" value="${v ?? ''}"></div>`;
const lerNum = (ctx, id) => { const v = ctx.valor('#' + id); return v === '' ? null : Math.max(0, Math.round(Number(String(v).replace(',', '.')) || 0)); };
const SITE = () => location.origin + '/';
const linkRastreio = (fonte, meio, campanha) => SITE() + '?' + new URLSearchParams({utm_source: fonte, utm_medium: meio, ...(campanha ? {utm_campaign: campanha} : {})}).toString();

async function copiar(texto, msg = 'Copiado.'){
  try{ await navigator.clipboard.writeText(texto); aviso(msg); }
  catch(e){ await janela({titulo: 'Copie o texto', corpo: `<textarea readonly style="min-height:140px;" onfocus="this.select()">${esc(texto)}</textarea>`, botoes: [{texto: 'Fechar', classe: 'prim'}]}); }
}
function ligarCopiar(el, mapa){
  el.querySelectorAll('[data-copiar]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); copiar(mapa[b.dataset.copiar] ?? b.dataset.copiar); });
}

// soma dos resultados de uma campanha
function totais(rs){
  const t = {inv: 0, imp: 0, alc: 0, cli: 0, conv: 0, orc: 0, ven: 0, valor: 0};
  rs.forEach(r => { t.inv += Number(r.investido_centavos) || 0; t.imp += r.impressoes || 0; t.alc += r.alcance || 0; t.cli += r.cliques || 0;
    t.conv += r.conversas || 0; t.orc += r.orcamentos || 0; t.ven += r.vendas || 0; t.valor += Number(r.valor_vendas_centavos) || 0; });
  t.cpConv = t.conv ? t.inv / t.conv : null; t.ctr = t.imp ? t.cli / t.imp : null; t.cpm = t.imp ? t.inv / t.imp * 1000 : null;
  t.cpc = t.cli ? t.inv / t.cli : null; t.roas = t.inv ? t.valor / t.inv : null;
  return t;
}

// ---------- tela ----------
export async function render(el, params){
  const a = ABAS.some(x => x[0] === params.aba) ? params.aba : 'visao';
  const botao = {plano: 'Ação', calendario: 'Post', campanhas: 'Campanha', aprendizados: 'Aprendizado'}[a];
  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Divulgação da Rumëyart</div><h1>Social e anúncios</h1>
      <div class="dir">${botao ? `<button class="btn prim" id="mkNovo"><span class="ic">${ICONES.mais_novo}</span>${botao}</button>` : ''}</div></div>
    <nav class="abas">${ABAS.map(([k, t, ic]) => `<a href="#/marketing?aba=${k}" class="${k === a ? 'on' : ''}"><span class="ic">${ICONES[ic]}</span>${t}</a>`).join('')}</nav>
    <div id="mk"><div class="carregando">Carregando…</div></div>`;
  const alvo = el.querySelector('#mk');
  const novo = el.querySelector('#mkNovo');
  if(a === 'visao') await visao(alvo, params);
  if(a === 'plano'){ await plano(alvo, params); novo.onclick = async () => { if(await editarAcao({})){ aviso('Ação criada.'); recarregar(); } }; }
  if(a === 'calendario'){ await calendario(alvo, params); novo.onclick = async () => { if(await editarPost({})){ aviso('Post criado.'); recarregar(); } }; }
  if(a === 'campanhas'){ await campanhas(alvo); novo.onclick = async () => { if(await editarCampanha()){ aviso('Campanha criada.'); recarregar(); } }; }
  if(a === 'aprendizados'){ await aprendizados(alvo, params); novo.onclick = async () => { if(await editarAprendizado({})){ aviso('Aprendizado registrado.'); recarregar(); } }; }
  if(a === 'marca') await marca(alvo);
}

// =====================================================================
// VISÃO GERAL
// =====================================================================
async function visao(el, {m}){
  const mes = /^\d{4}-\d{2}$/.test(m || '') ? m : mesChave();
  const [ini, fim] = mesLimites(mes), hoje = hojeChave();
  const [posts, acoes, camps, res, aps, peds, marcaD] = await Promise.all([
    q.lista(T.mktPosts, '*', x => x.order('data', {nullsFirst: false})),
    q.lista(T.mktAcoes, '*', x => x.order('prazo', {nullsFirst: false}).order('ordem')),
    q.lista(T.mktCampanhas, '*'),
    q.lista(T.mktResultados, '*'),
    q.lista(T.mktAprendizados, '*', x => x.order('data', {ascending: false}).limit(4)),
    q.lista(T.pedidos, 'id,numero,nome,criado_em,respostas', x => x.gte('criado_em', ini).lt('criado_em', fim)),
    marcaDados()
  ]);
  const doMes = posts.filter(p => p.data && p.data >= ini && p.data < fim && p.status !== 'cancelado');
  const publicados = doMes.filter(p => p.status === 'publicado');
  const comAlc = publicados.filter(p => p.alcance);
  const engMedio = comAlc.length ? comAlc.reduce((s, p) => s + taxaEng(p), 0) / comAlc.length : null;
  const resMes = res.filter(r => r.inicio >= ini && r.inicio < fim);
  const t = totais(resMes);
  const viaDiv = peds.filter(p => p.respostas?.origem), viaAnuncio = peds.filter(p => pedidoDeAnuncio(p.respostas));
  const feitas = acoes.filter(x => x.concluida).length, pend = acoes.filter(x => !x.concluida), atras = pend.filter(x => x.prazo && x.prazo < hoje);
  const ativas = camps.filter(c => c.status === 'ativa');
  const proximos = posts.filter(p => p.data && p.data >= hoje && !['publicado', 'cancelado'].includes(p.status)).slice(0, 6);
  const semResultado = posts.filter(p => p.status === 'publicado' && !temMetricas(p) && p.data && p.data <= diaChave(addDias(new Date(), -2)));
  const top = [...publicados].filter(temMetricas).sort((a, b) => engaj(b) - engaj(a)).slice(0, 3);
  const alvoP = Object.fromEntries((marcaD.pilares || []).map(p => [slugify(p.nome), Number(p.peso) || 0]));

  el.innerHTML = `
    <div class="filtros"><div class="mk-mes"><button class="btn fantasma peq" data-mes="${somaMes(mes, -1)}" aria-label="Mês anterior">‹</button><b>${mesNome(mes)}</b><button class="btn fantasma peq" data-mes="${somaMes(mes, 1)}" aria-label="Próximo mês">›</button></div>
      ${mes !== mesChave() ? `<button class="btn linha peq" data-mes="${mesChave()}">Mês atual</button>` : ''}</div>
    <div class="kpis">
      <a class="kpi destaque" href="#/marketing?aba=plano"><span class="k"><i></i>Plano de ação</span><span class="v din">${pct(feitas, acoes.length)}</span><span class="d">${pend.length} pendentes${atras.length ? ` · ${atras.length} atrasada${atras.length > 1 ? 's' : ''}` : ''}</span></a>
      <a class="kpi" href="#/marketing?aba=calendario&m=${mes}" style="--c:var(--laranja)"><span class="k"><i></i>Posts publicados</span><span class="v din">${publicados.length}<small class="mk-de"> de ${doMes.length}</small></span><span class="d">${engMedio != null ? 'engajamento médio ' + pct(engMedio, 1) : 'planejados no mês'}</span></a>
      <a class="kpi" href="#/marketing?aba=campanhas" style="--c:var(--azul)"><span class="k"><i></i>Investido em anúncios</span><span class="v din">${brlC(t.inv)}</span><span class="d">${ativas.length} campanha${ativas.length === 1 ? '' : 's'} ativa${ativas.length === 1 ? '' : 's'}</span></a>
      <a class="kpi" href="#/marketing?aba=campanhas" style="--c:var(--ameixa)"><span class="k"><i></i>Conversas</span><span class="v din">${fmtN(t.conv)}</span><span class="d">${t.cpConv != null ? brlC(t.cpConv) + ' por conversa' : 'registre os resultados'}</span></a>
      <a class="kpi" href="#/pedidos" style="--c:var(--verde)"><span class="k"><i></i>Ideias pelo site</span><span class="v din">${peds.length}</span><span class="d">${viaDiv.length} com origem${viaAnuncio.length ? ` · ${viaAnuncio.length} de anúncio` : ''}</span></a>
    </div>
    ${semResultado.length ? `<div class="alerta"><span class="ic">${ICONES.calendario}</span><div><b>${semResultado.length} post${semResultado.length > 1 ? 's' : ''} publicado${semResultado.length > 1 ? 's' : ''} sem resultado.</b> Anote alcance e salvamentos para comparar depois. <a href="#/marketing?aba=calendario&f=sem_resultado">Preencher agora</a></div></div>` : ''}
    <div class="cols">
      <div>
        <section class="card"><h3>Próximas ações<a class="ver dir mk-ver" href="#/marketing?aba=plano">Plano completo</a></h3>
          ${pend.slice(0, 6).map(x => acaoLinha(x, hoje, true)).join('') || '<div class="vazio">Plano de ação em dia.</div>'}</section>
        <section class="card"><h3>Próximos posts<a class="ver dir mk-ver" href="#/marketing?aba=calendario">Calendário</a></h3>
          ${proximos.map(p => `<div class="item-lista mk-clic" data-post="${p.id}"><span class="mk-data">${dataCurta(p.data)}</span><div class="tx"><b>${esc(p.titulo)}</b><span>${esc(nome(FORMATOS, p.formato))} ${pilarTxt(p.pilar)}</span></div>${tagPost(p.status)}</div>`).join('') || '<div class="vazio">Nenhum post agendado daqui para frente. <a href="#/marketing?aba=calendario">Planejar no calendário</a></div>'}</section>
      </div>
      <div>
        <section class="card"><h3>Pilares no mês</h3>
          ${PILARES.map(([k, nm, cor]) => { const tot = doMes.filter(p => p.pilar === k).length, pub = publicados.filter(p => p.pilar === k).length, share = doMes.length ? tot / doMes.length * 100 : 0, meta = alvoP[k] ?? null;
            return `<div class="mk-barra-l"><div class="mk-barra-t"><span>${pilarTxt(k)}</span><span class="muted">${pub}/${tot} publicados${meta != null ? ` · meta ${meta}%` : ''}</span></div>
              <div class="mk-barra" style="--c:${cor}"><i style="width:${share.toFixed(1)}%"></i>${meta != null ? `<b style="left:${Math.min(100, meta)}%" title="Meta ${meta}%"></b>` : ''}</div></div>`; }).join('')}
          <p class="muted" style="font-size:12.5px;margin:.6rem 0 0;">A barra mostra a fatia de cada pilar nos posts do mês; o traço é a meta definida em Marca.</p></section>
        <section class="card"><h3>Melhores posts do mês</h3>
          ${top.map((p, i) => `<div class="item-lista mk-clic" data-post="${p.id}"><span class="mk-rank">${i + 1}</span><div class="tx"><b>${esc(p.titulo)}</b><span>${fmtN(p.alcance)} de alcance · ${fmtN(p.salvamentos)} salvamentos · ${fmtN(p.compartilhamentos)} compart.</span></div><span class="vl">${taxaEng(p) != null ? pct(taxaEng(p), 1) : ''}</span></div>`).join('') || '<div class="vazio">Quando os posts publicados tiverem resultado anotado, os melhores aparecem aqui.</div>'}</section>
        <section class="card"><h3>Aprendizados recentes<a class="ver dir mk-ver" href="#/marketing?aba=aprendizados">Todos</a></h3>
          ${aps.map(x => `<div class="item-lista"><div class="tx"><b>${esc(x.titulo)}</b><span>${dia(x.data)} · ${esc(nome(TIPOS_APR, x.tipo))}${x.decisao ? ' · ' + esc(x.decisao.slice(0, 90)) : ''}</span></div></div>`).join('') || '<div class="vazio">Anote cada teste e cada decisão. Em um mês, esse diário vira o seu manual de divulgação.</div>'}</section>
      </div>
    </div>`;
  el.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => ir('marketing?aba=visao&m=' + b.dataset.mes));
  ligarAcoes(el, acoes);
  el.querySelectorAll('[data-post]').forEach(r => r.onclick = async () => { if(await editarPost({existente: posts.find(p => p.id === r.dataset.post)})) recarregar(); });
}

// =====================================================================
// PLANO DE AÇÃO
// =====================================================================
function acaoLinha(x, hoje, compacta){
  const atr = !x.concluida && x.prazo && x.prazo < hoje;
  const passos = linhas(x.passos);
  return `<div class="mk-acao ${x.concluida ? 'feita' : ''}" data-acao="${x.id}">
    <input type="checkbox" class="mk-ck" data-ck="${x.id}" ${x.concluida ? 'checked' : ''} aria-label="Concluir: ${esc(x.titulo)}">
    <div class="tx"><b>${esc(x.titulo)}</b>
      <span class="meta">${x.descricao ? esc(x.descricao) : ''}${x.prazo ? `<span class="pill ${atr ? 'mk-atras' : ''}">${atr ? 'atrasada · ' : ''}${dataCurta(x.prazo)}</span>` : ''}${compacta ? `<span class="pill">${esc(nome(ETAPAS_MKT, x.etapa))}</span>` : ''}${x.concluida && x.concluida_em ? `<span class="pill">✓ ${dataBR(x.concluida_em)}</span>` : ''}</span>
      ${!compacta && (passos.length || x.dica || x.notas) ? `<details class="mk-passos"><summary>Passo a passo${passos.length ? ' · ' + passos.length : ''}</summary>
        ${passos.length ? `<ol>${passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
        ${x.dica ? `<div class="mk-dica">${esc(x.dica)}</div>` : ''}${x.notas ? `<div class="mk-notas"><span class="eyebrow">Suas anotações</span>${esc(x.notas)}</div>` : ''}</details>` : ''}
    </div>
    <button class="btn fantasma peq" data-editar-acao="${x.id}">${compacta ? 'Abrir' : 'Editar'}</button></div>`;
}
function ligarAcoes(el, acoes){
  el.querySelectorAll('[data-ck]').forEach(cb => cb.onchange = async () => {
    const x = acoes.find(a => a.id === cb.dataset.ck); cb.disabled = true;
    try{ await q.altera(T.mktAcoes, x.id, {concluida: cb.checked}); x.concluida = cb.checked; cb.closest('.mk-acao').classList.toggle('feita', cb.checked);
      aviso(cb.checked ? 'Ação concluída.' : 'Ação reaberta.'); if(el.querySelector('.mk-prog')) recarregar(); }
    catch(e){ cb.checked = !cb.checked; aviso(traduzErro(e)); }
    finally{ cb.disabled = false; }
  });
  el.querySelectorAll('[data-editar-acao]').forEach(b => b.onclick = async () => { const r = await editarAcao({existente: acoes.find(a => a.id === b.dataset.editarAcao)}); if(r){ aviso(r === 'apagado' ? 'Ação apagada.' : 'Ação salva.'); recarregar(); } });
}

async function plano(el, {f}){
  const filtro = ['todas', 'concluidas'].includes(f) ? f : 'pendentes';
  const acoes = await q.lista(T.mktAcoes, '*', x => x.order('ordem').order('prazo', {nullsFirst: false}));
  const hoje = hojeChave(), feitas = acoes.filter(x => x.concluida).length;
  const etapas = [...ETAPAS_MKT, ...[...new Set(acoes.map(x => x.etapa))].filter(e => !ETAPAS_MKT.some(x => x[0] === e)).map(e => [e, e])];
  const ver = x => filtro === 'todas' || (filtro === 'concluidas' ? x.concluida : !x.concluida);
  el.innerHTML = `
    <div class="card mk-prog"><div class="mk-prog-l"><div><span class="eyebrow">Progresso do plano</span><b class="din">${pct(feitas, acoes.length)}</b></div><span class="muted">${feitas} de ${acoes.length} ações concluídas</span></div>
      <div class="mk-barra grande"><i style="width:${acoes.length ? (feitas / acoes.length * 100).toFixed(1) : 0}%"></i></div>
      <div class="mk-etapas-mini">${etapas.filter(([k]) => acoes.some(x => x.etapa === k)).map(([k, t]) => { const tot = acoes.filter(x => x.etapa === k), ok = tot.filter(x => x.concluida).length;
        return `<a href="#mk-${k}" class="${ok === tot.length ? 'ok' : ''}"><span>${esc(t)}</span><b class="din">${ok}/${tot.length}</b></a>`; }).join('')}</div></div>
    <div class="filtros"><div class="pilulas">${[['pendentes', 'Pendentes'], ['todas', 'Todas'], ['concluidas', 'Concluídas']].map(([k, t]) => `<button type="button" data-f="${k}" class="${k === filtro ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    ${etapas.map(([k, t], i) => { const itens = acoes.filter(x => x.etapa === k), vis = itens.filter(ver); if(!itens.length) return '';
      const ok = itens.filter(x => x.concluida).length;
      return `<section class="card mk-etapa" id="mk-${esc(k)}"><h3><span class="mk-num">${String(i + 1).padStart(2, '0')}</span>${esc(t)}<span class="muted dir mk-cont">${ok}/${itens.length}</span></h3>
        ${vis.map(x => acaoLinha(x, hoje, false)).join('') || `<div class="vazio">${filtro === 'pendentes' ? 'Etapa concluída.' : 'Nada aqui.'}</div>`}</section>`; }).join('')
      || '<div class="vazio">Nenhuma ação no plano. Use o botão Ação para criar a primeira.</div>'}`;
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => ir('marketing?aba=plano&f=' + b.dataset.f));
  el.querySelectorAll('.mk-etapas-mini a').forEach(a => a.onclick = e => { e.preventDefault(); el.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior: 'smooth', block: 'start'}); });
  ligarAcoes(el, acoes);
}

function editarAcao({existente}){
  const x = existente || {etapa: 'geral'};
  return janela({titulo: existente ? 'Ação do plano' : 'Nova ação', larga: true, corpo: `
    <div class="campo"><label class="rot" for="a_t">O que fazer *</label><input type="text" id="a_t" value="${esc(x.titulo)}"></div>
    <div class="grade3"><div class="campo"><label class="rot" for="a_e">Etapa</label><select id="a_e">${opts(ETAPAS_MKT, x.etapa)}</select></div>
      <div class="campo"><label class="rot" for="a_p">Prazo</label><input type="date" id="a_p" value="${x.prazo || ''}"></div>
      <div class="campo"><label class="rot" for="a_o">Ordem na etapa</label><input type="number" id="a_o" value="${x.ordem ?? 0}"></div></div>
    <div class="campo"><label class="rot" for="a_d">Resumo</label><input type="text" id="a_d" value="${esc(x.descricao)}"></div>
    <div class="campo"><label class="rot" for="a_ps">Passo a passo <small>(um por linha)</small></label><textarea id="a_ps" style="min-height:130px;">${esc(x.passos)}</textarea></div>
    <div class="campo"><label class="rot" for="a_di">Dica</label><input type="text" id="a_di" value="${esc(x.dica)}"></div>
    <div class="campo"><label class="rot" for="a_n">Suas anotações</label><textarea id="a_n" placeholder="O que você descobriu fazendo, links, senhas não (use o Cofre)">${esc(x.notas)}</textarea></div>
    ${existente ? `<label class="chk"><input type="checkbox" id="a_c" ${x.concluida ? 'checked' : ''}> Concluída</label>` : ''}`,
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar ação', 'Remover esta ação do plano?', 'Apagar', 'perigo'))) return false; await q.apaga(T.mktAcoes, x.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {titulo: ctx.valor('#a_t'), etapa: ctx.valor('#a_e'), prazo: ctx.valor('#a_p') || null, ordem: parseInt(ctx.valor('#a_o'), 10) || 0,
          descricao: ctx.valor('#a_d') || null, passos: ctx.valor('#a_ps') || null, dica: ctx.valor('#a_di') || null, notas: ctx.valor('#a_n') || null};
        if(existente) row.concluida = ctx.valor('#a_c');
        if(row.titulo.length < 2){ ctx.erro('Diga o que fazer.'); return false; }
        return existente ? q.altera(T.mktAcoes, x.id, row) : q.cria(T.mktAcoes, row);
      }}]});
}

// =====================================================================
// CALENDÁRIO DE POSTS
// =====================================================================
async function calendario(el, {m, f}){
  const mes = /^\d{4}-\d{2}$/.test(m || '') ? m : mesChave();
  const [ini, fim] = mesLimites(mes), hoje = hojeChave();
  const filtro = ST_POST.some(s => s[0] === f) || f === 'sem_resultado' ? f : '';
  const [posts, camps] = await Promise.all([q.lista(T.mktPosts, '*', x => x.order('data', {nullsFirst: false}).order('criado_em')), q.lista(T.mktCampanhas, 'id,nome')]);
  const passa = p => !filtro || (filtro === 'sem_resultado' ? p.status === 'publicado' && !temMetricas(p) : p.status === filtro);
  const doMes = posts.filter(p => p.data && p.data >= ini && p.data < fim);
  const semData = posts.filter(p => !p.data && p.status !== 'cancelado');
  const lista = (filtro === 'sem_resultado' ? posts : doMes).filter(passa);

  // grade do mês (semana começa na segunda)
  const [a, mm] = mes.split('-').map(Number);
  const primeiro = new Date(a, mm - 1, 1), dias = new Date(a, mm, 0).getDate(), antes = (primeiro.getDay() + 6) % 7;
  const celulas = [];
  for(let i = 0; i < antes; i++) celulas.push(null);
  for(let d = 1; d <= dias; d++) celulas.push(`${mes}-${String(d).padStart(2, '0')}`);
  while(celulas.length % 7) celulas.push(null);

  el.innerHTML = `
    <div class="filtros"><div class="mk-mes"><button class="btn fantasma peq" data-mes="${somaMes(mes, -1)}" aria-label="Mês anterior">‹</button><b>${mesNome(mes)}</b><button class="btn fantasma peq" data-mes="${somaMes(mes, 1)}" aria-label="Próximo mês">›</button></div>
      <div class="pilulas">${[['', 'Todos'], ...ST_POST.filter(s => s[0] !== 'cancelado').map(s => [s[0], s[1]]), ['sem_resultado', 'Sem resultado']].map(([k, t]) => `<button type="button" data-f="${k}" class="${k === filtro ? 'on' : ''}">${t}</button>`).join('')}</div>
      <button class="btn linha peq" id="expPosts" style="margin-left:auto;">Exportar</button></div>
    ${filtro === 'sem_resultado' ? '' : `<div class="card mk-cal-card"><div class="mk-cal" role="grid" aria-label="Posts de ${mesNome(mes)}">
      ${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<div class="mk-cal-cab" role="columnheader">${d}</div>`).join('')}
      ${celulas.map(k => { if(!k) return '<div class="mk-dia vazio-d"></div>'; const ps = doMes.filter(p => p.data === k && passa(p));
        return `<div class="mk-dia ${k === hoje ? 'hoje' : ''} ${k < hoje ? 'passado' : ''}" role="gridcell"><div class="mk-dia-n"><span>${Number(k.slice(8))}</span><button class="mk-add" data-novo-dia="${k}" aria-label="Novo post em ${dataCurta(k)}" title="Novo post">＋</button></div>
          ${ps.map(p => `<button class="mk-chip st-${p.status}" data-post="${p.id}" style="--c:${corPilar(p.pilar)}" title="${esc(p.titulo)}"><i></i><span>${esc(p.titulo)}</span></button>`).join('')}</div>`; }).join('')}
    </div><div class="mk-legenda">${PILARES.map(([k]) => pilarTxt(k)).join('')}<span class="muted">· contorno = ainda não publicado</span></div></div>`}
    <div class="card limpo"><h3>${filtro === 'sem_resultado' ? 'Publicados sem resultado anotado' : 'Posts de ' + mesNome(mes)}<span class="muted dir" style="font:500 13px var(--f-corpo);">${lista.length}</span></h3>
      ${lista.length ? `<table class="tabela"><thead><tr><th>Data</th><th>Post</th><th>Público</th><th>Status</th><th class="num">Alcance</th><th class="num">Salvam.</th><th class="num">Engaj.</th><th></th></tr></thead><tbody>
        ${lista.map(p => `<tr class="link" data-post="${p.id}"><td data-l="Data">${p.data ? dataCurta(p.data) : '—'}</td><td data-l="Post"><div class="nm">${esc(p.titulo)}</div><div class="sm">${esc(nome(FORMATOS, p.formato))} ${pilarTxt(p.pilar)}</div></td>
          <td data-l="Público">${esc(p.publico || '—')}</td><td data-l="Status">${tagPost(p.status)}</td><td class="num" data-l="Alcance">${fmtN(p.alcance)}</td><td class="num" data-l="Salvam.">${fmtN(p.salvamentos)}</td>
          <td class="num" data-l="Engaj.">${taxaEng(p) != null ? pct(taxaEng(p), 1) : '—'}</td>
          <td data-l="">${p.status === 'publicado' ? `<button class="btn ${temMetricas(p) ? 'fantasma' : 'linha'} peq" data-resultado="${p.id}">${temMetricas(p) ? 'Resultado' : 'Anotar resultado'}</button>` : ['agendado', 'producao'].includes(p.status) && p.data && p.data <= hoje ? `<button class="btn linha peq" data-publicar="${p.id}">Publiquei</button>` : ''}</td></tr>`).join('')}</tbody></table>`
        : '<div class="vazio">Nenhum post aqui. Use ＋ num dia do calendário ou o botão Post.</div>'}</div>
    ${semData.length && filtro !== 'sem_resultado' ? `<div class="card limpo"><h3>Banco de ideias <span class="muted" style="font:500 13px var(--f-corpo);">sem data</span></h3>${semData.map(p => `<div class="item-lista mk-clic" data-post="${p.id}"><div class="tx"><b>${esc(p.titulo)}</b><span>${esc(nome(FORMATOS, p.formato))} ${pilarTxt(p.pilar)}${p.publico ? ' · ' + esc(p.publico) : ''}</span></div>${tagPost(p.status)}</div>`).join('')}</div>` : ''}`;

  const achar = id => posts.find(p => p.id === id);
  el.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => ir(`marketing?aba=calendario&m=${b.dataset.mes}${filtro ? '&f=' + filtro : ''}`));
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => ir(`marketing?aba=calendario&m=${mes}${b.dataset.f ? '&f=' + b.dataset.f : ''}`));
  el.querySelectorAll('[data-post]').forEach(b => b.onclick = async e => { if(e.target.closest('[data-resultado],[data-publicar]')) return; const r = await editarPost({existente: achar(b.dataset.post), camps}); if(r){ aviso(r === 'apagado' ? 'Post apagado.' : 'Post salvo.'); recarregar(); } });
  el.querySelectorAll('[data-novo-dia]').forEach(b => b.onclick = async e => { e.stopPropagation(); if(await editarPost({pre: {data: b.dataset.novoDia}, camps})){ aviso('Post criado.'); recarregar(); } });
  el.querySelectorAll('[data-resultado]').forEach(b => b.onclick = async e => { e.stopPropagation(); if(await resultadoPost(achar(b.dataset.resultado))){ aviso('Resultado anotado.'); recarregar(); } });
  el.querySelectorAll('[data-publicar]').forEach(b => b.onclick = async e => { e.stopPropagation(); try{ await q.altera(T.mktPosts, b.dataset.publicar, {status: 'publicado'}); aviso('Marcado como publicado. Em 2 ou 3 dias, anote o resultado.'); recarregar(); }catch(err){ aviso(traduzErro(err)); } });
  el.querySelector('#expPosts').onclick = async () => {
    const todos = await tudo(T.mktPosts, '*', x => x.order('data', {nullsFirst: false}));
    baixar('posts-rumeyart.csv', csv(todos, [['data', 'Data'], ['titulo', 'Post'], [p => nome(FORMATOS, p.formato), 'Formato'], [p => nome(PILARES, p.pilar), 'Pilar'], ['publico', 'Público'], [p => nome(ST_POST, p.status), 'Status'],
      ...METRICAS_POST.map(([k, t]) => [k, t]), [p => taxaEng(p) != null ? (taxaEng(p) * 100).toFixed(2).replace('.', ',') : '', 'Engajamento %'], ['post_url', 'Link do post'], ['canva_url', 'Canva'], ['legenda', 'Legenda'], ['observacoes', 'Observações']]));
    aviso('Planilha baixada.');
  };
}

async function editarPost({existente, pre = {}, camps}){
  const [cs, mk] = await Promise.all([camps ? Promise.resolve(camps) : q.lista(T.mktCampanhas, 'id,nome'), marcaDados()]);
  const x = existente || {formato: 'estatico', status: 'ideia', rede: 'instagram', ...pre};
  const publicos = (mk.publicos || []).map(p => p.nome).concat('Todos');
  const r = await janela({titulo: existente ? 'Post' : 'Novo post', larga: true, corpo: `
    <div class="campo"><label class="rot" for="p_t">Título ou gancho *</label><input type="text" id="p_t" value="${esc(x.titulo)}" placeholder="Ex.: Sua rotina cabe em quantos apps?"></div>
    <div class="grade3"><div class="campo"><label class="rot" for="p_d">Data</label><input type="date" id="p_d" value="${x.data || ''}"></div>
      <div class="campo"><label class="rot" for="p_f">Formato</label><select id="p_f">${opts(FORMATOS, x.formato)}</select></div>
      <div class="campo"><label class="rot" for="p_s">Status</label><select id="p_s">${opts(ST_POST, x.status)}</select></div></div>
    <div class="grade3"><div class="campo"><label class="rot" for="p_pi">Pilar</label><select id="p_pi">${opts(PILARES, x.pilar, '—')}</select></div>
      <div class="campo"><label class="rot" for="p_pu">Público</label><input type="text" id="p_pu" list="p_pus" value="${esc(x.publico)}"><datalist id="p_pus">${[...new Set(publicos)].map(p => `<option value="${esc(p)}">`).join('')}</datalist></div>
      <div class="campo"><label class="rot" for="p_ca">Impulsionado em</label><select id="p_ca"><option value="">— orgânico —</option>${cs.map(c => `<option value="${c.id}" ${c.id === x.campanha_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <h4 class="mk-sec">Produção</h4>
    <div class="campo"><label class="rot" for="p_cv">Link do Canva</label><div class="mk-link"><input type="url" id="p_cv" value="${esc(x.canva_url)}" placeholder="https://www.canva.com/…">${x.canva_url ? `<a class="btn linha peq" href="${esc(x.canva_url)}" target="_blank" rel="noopener">Abrir</a>` : ''}</div></div>
    <div class="campo"><label class="rot" for="p_ro">Roteiro, lâminas ou ideia</label><textarea id="p_ro" style="min-height:120px;">${esc(x.roteiro)}</textarea></div>
    <div class="campo"><label class="rot" for="p_le">Legenda <small id="p_lec"></small></label><textarea id="p_le" style="min-height:120px;">${esc(x.legenda)}</textarea>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;"><button type="button" class="btn fantasma peq" id="p_cop">Copiar legenda</button>${mk.hashtags ? `<button type="button" class="btn fantasma peq" id="p_hash">＋ Hashtags da marca</button>` : ''}</div></div>
    <h4 class="mk-sec">Publicação e resultado <small class="muted" style="text-transform:none;letter-spacing:0;font-family:var(--f-corpo);">anote 2 ou 3 dias depois de publicar</small></h4>
    <div class="campo"><label class="rot" for="p_url">Link do post</label><input type="url" id="p_url" value="${esc(x.post_url)}" placeholder="https://www.instagram.com/p/…"></div>
    <div class="grade4 mk-met">${METRICAS_POST.map(([k, t]) => numInput('pm_' + k, x[k], t)).join('')}</div>
    <div class="campo"><label class="rot" for="p_o">Observações</label><textarea id="p_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>`,
    aoAbrir: ctx => {
      const le = ctx.el.querySelector('#p_le'), c = ctx.el.querySelector('#p_lec');
      const conta = () => { c.textContent = `${le.value.length}/2.200 caracteres`; }; le.addEventListener('input', conta); conta();
      ctx.el.querySelector('#p_cop').onclick = () => copiar(le.value, 'Legenda copiada.');
      const h = ctx.el.querySelector('#p_hash'); if(h) h.onclick = () => { if(!le.value.includes(mk.hashtags)) le.value = (le.value.trim() + '\n\n' + mk.hashtags).trim(); conta(); };
    },
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar post', 'Apagar este post e os números dele?', 'Apagar', 'perigo'))) return false; await q.apaga(T.mktPosts, x.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {titulo: ctx.valor('#p_t'), data: ctx.valor('#p_d') || null, formato: ctx.valor('#p_f'), status: ctx.valor('#p_s'), pilar: ctx.valor('#p_pi') || null,
          publico: ctx.valor('#p_pu') || null, campanha_id: ctx.valor('#p_ca') || null, canva_url: ctx.valor('#p_cv') || null, roteiro: ctx.valor('#p_ro') || null,
          legenda: ctx.valor('#p_le') || null, post_url: ctx.valor('#p_url') || null, observacoes: ctx.valor('#p_o') || null};
        METRICAS_POST.forEach(([k]) => { row[k] = lerNum(ctx, 'pm_' + k); });
        if(row.titulo.length < 2){ ctx.erro('Dê um título ao post.'); return false; }
        if(METRICAS_POST.some(([k]) => row[k] !== (x[k] ?? null))) row.metricas_em = new Date().toISOString();
        if(temMetricas(row) && row.status !== 'publicado' && row.status !== 'cancelado') row.status = 'publicado';
        return existente ? q.altera(T.mktPosts, x.id, row) : q.cria(T.mktPosts, row);
      }}]});
  return r;
}

function resultadoPost(p){
  return janela({titulo: 'Resultado do post', corpo: `<p class="muted" style="margin-top:0;">${esc(p.titulo)}${p.data ? ' · ' + dataCurta(p.data) : ''}</p>
    <p class="muted" style="font-size:13px;">No Instagram: abra o post → Ver insights. Preencha o que aparecer; o resto pode ficar vazio.</p>
    <div class="grade2 mk-met">${METRICAS_POST.map(([k, t]) => numInput('rm_' + k, p[k], t)).join('')}</div>
    <div class="campo"><label class="rot" for="rm_url">Link do post</label><input type="url" id="rm_url" value="${esc(p.post_url)}"></div>
    <div class="campo"><label class="rot" for="rm_o">O que você percebeu</label><textarea id="rm_o" style="min-height:60px;">${esc(p.observacoes)}</textarea></div>`,
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
      const row = {metricas_em: new Date().toISOString(), post_url: ctx.valor('#rm_url') || null, observacoes: ctx.valor('#rm_o') || null, status: 'publicado'};
      METRICAS_POST.forEach(([k]) => { row[k] = lerNum(ctx, 'rm_' + k); });
      return q.altera(T.mktPosts, p.id, row);
    }}]});
}

// =====================================================================
// CAMPANHAS
// =====================================================================
async function campanhas(el){
  const [camps, res, peds] = await Promise.all([
    q.lista(T.mktCampanhas, '*', x => x.order('criado_em')),
    q.lista(T.mktResultados, '*', x => x.order('inicio', {ascending: false})),
    q.lista(T.pedidos, 'id,numero,nome,criado_em,respostas,cliente_id', x => x.not('respostas->origem', 'is', null).order('criado_em', {ascending: false}).limit(500))
  ]);
  const ordem = ['ativa', 'planejada', 'pausada', 'encerrada'];
  camps.sort((a, b) => ordem.indexOf(a.status) - ordem.indexOf(b.status));
  const deC = c => res.filter(r => r.campanha_id === c.id);
  const pedsC = c => c.codigo ? peds.filter(p => String(p.respostas?.origem?.campaign || '').toLowerCase() === c.codigo.toLowerCase()) : [];
  const geral = totais(res);
  const linkBio = linkRastreio('instagram', 'bio');
  const mapaCopiar = {bio: linkBio};
  camps.forEach(c => { if(c.codigo) mapaCopiar['c-' + c.id] = linkRastreio('meta', 'anuncio', c.codigo); if(c.copy) mapaCopiar['copy-' + c.id] = c.copy; });

  el.innerHTML = `
    <div class="kpis">
      <div class="kpi destaque"><span class="k"><i></i>Investido no total</span><span class="v din">${brlC(geral.inv)}</span><span class="d">${res.length} registro${res.length === 1 ? '' : 's'} de resultado</span></div>
      <div class="kpi" style="--c:var(--ameixa)"><span class="k"><i></i>Custo por conversa</span><span class="v din">${geral.cpConv != null ? brlC(geral.cpConv) : '—'}</span><span class="d">${fmtN(geral.conv)} conversas</span></div>
      <div class="kpi" style="--c:var(--laranja)"><span class="k"><i></i>Conversa → orçamento</span><span class="v din">${pct(geral.orc, geral.conv)}</span><span class="d">${fmtN(geral.orc)} orçamentos</span></div>
      <div class="kpi" style="--c:var(--verde)"><span class="k"><i></i>Retorno</span><span class="v din">${geral.roas != null && geral.valor ? geral.roas.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '×' : '—'}</span><span class="d">${fmtN(geral.ven)} vendas · ${brlC(geral.valor)}</span></div>
    </div>
    ${camps.length > 1 && res.length ? `<div class="card limpo"><h3>Comparativo</h3><table class="tabela"><thead><tr><th>Campanha</th><th>Status</th><th class="num">Investido</th><th class="num">Conversas</th><th class="num">Custo/conversa</th><th class="num">CTR</th><th class="num">Orçam.</th><th class="num">Vendas</th><th class="num">Ideias no site</th></tr></thead><tbody>
      ${camps.map(c => { const t = totais(deC(c)); return `<tr><td data-l="Campanha" class="nm">${esc(c.nome)}</td><td data-l="Status">${tagCamp(c.status)}</td><td class="num" data-l="Investido">${brlC(t.inv)}</td><td class="num" data-l="Conversas">${fmtN(t.conv)}</td>
        <td class="num" data-l="Custo/conversa">${t.cpConv != null ? brlC(t.cpConv) : '—'}</td><td class="num" data-l="CTR">${t.ctr != null ? pct(t.ctr, 1) : '—'}</td><td class="num" data-l="Orçam.">${fmtN(t.orc)}</td><td class="num" data-l="Vendas">${fmtN(t.ven)}</td><td class="num" data-l="Ideias no site">${pedsC(c).length}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
    <div class="card mk-links"><h3>Links com rastreio</h3>
      <p class="muted" style="margin-top:-.4rem;font-size:13.5px;">Quem entra no site por um destes links e envia a ideia chega em Pedidos do site marcado com a origem. Use o da bio no perfil e o de cada campanha no anúncio.</p>
      <div class="mk-link-l"><div class="tx"><b>Bio do Instagram</b><code>${esc(linkBio)}</code></div><button class="btn linha peq" data-copiar="bio">Copiar</button></div>
      ${camps.filter(c => c.codigo).map(c => `<div class="mk-link-l"><div class="tx"><b>${esc(c.nome)}</b><code>${esc(mapaCopiar['c-' + c.id])}</code></div><button class="btn linha peq" data-copiar="c-${c.id}">Copiar</button></div>`).join('')}</div>
    <div class="mk-camps">${camps.map(c => { const rs = deC(c), t = totais(rs), ps = pedsC(c);
      return `<article class="card mk-camp" data-camp="${c.id}">
        <div class="mk-camp-cab"><div><h3>${esc(c.nome)} ${tagCamp(c.status)}</h3>
          <div class="muted" style="font-size:13px;">${esc(nome(OBJETIVOS, c.objetivo))} → ${esc(nome(DESTINOS, c.destino))}${c.verba_diaria_centavos ? ' · ' + brlC(c.verba_diaria_centavos) + '/dia' : ''}${c.inicio ? ' · desde ' + dataCurta(c.inicio) : ''}${c.fim ? ' até ' + dataCurta(c.fim) : ''}</div></div>
          <div class="acoes-c"><button class="btn prim peq" data-res-novo="${c.id}">Registrar resultado</button><button class="btn fantasma peq" data-editar-camp="${c.id}">Editar</button></div></div>
        <div class="mk-num4">
          <div><span>Investido</span><b class="din">${brlC(t.inv)}</b></div>
          <div><span>Conversas</span><b class="din">${fmtN(t.conv)}</b><small>${t.cpConv != null ? brlC(t.cpConv) + ' cada' : ''}</small></div>
          <div><span>Cliques · CTR</span><b class="din">${fmtN(t.cli)}</b><small>${t.ctr != null ? pct(t.ctr, 1) : ''}${t.cpc != null ? ' · ' + brlC(t.cpc) + ' por clique' : ''}</small></div>
          <div><span>Orçamentos → vendas</span><b class="din">${fmtN(t.orc)} → ${fmtN(t.ven)}</b><small>${t.valor ? brlC(t.valor) : ''}</small></div>
        </div>
        ${c.hipotese ? `<div class="mk-hip"><span class="eyebrow">Hipótese</span>${esc(c.hipotese)}</div>` : ''}
        ${c.publico ? `<p style="font-size:13.5px;margin:.6rem 0 0;"><b>Público:</b> ${esc(c.publico)}</p>` : ''}
        ${ps.length ? `<p style="font-size:13.5px;margin:.4rem 0 0;"><b>Ideias enviadas pelo site:</b> ${ps.slice(0, 5).map(p => `<a href="#/pedidos?id=${p.id}">nº ${p.numero} ${esc(p.nome.split(' ')[0])}</a>`).join(', ')}${ps.length > 5 ? '…' : ''}</p>` : ''}
        ${c.copy ? `<details class="mk-det"><summary>Texto do anúncio</summary><p style="white-space:pre-wrap;">${esc(c.copy)}</p><button class="btn fantasma peq" data-copiar="copy-${c.id}">Copiar texto</button></details>` : ''}
        <details class="mk-det"><summary>Resultados por período · ${rs.length}</summary>
          ${rs.length ? `<div class="mk-rolar"><table class="tabela"><thead><tr><th>Período</th><th>Conjunto</th><th class="num">Investido</th><th class="num">Conversas</th><th class="num">Custo/conv.</th><th class="num">Orç./Vendas</th><th></th></tr></thead><tbody>
            ${rs.map(r => { const tt = totais([r]); return `<tr><td data-l="Período">${dataCurta(r.inicio)} a ${dataCurta(r.fim)}</td><td data-l="Conjunto">${esc(r.conjunto || 'Todos')}</td><td class="num" data-l="Investido">${brlC(r.investido_centavos)}</td><td class="num" data-l="Conversas">${fmtN(r.conversas)}</td><td class="num" data-l="Custo/conv.">${tt.cpConv != null ? brlC(tt.cpConv) : '—'}</td><td class="num" data-l="Orç./Vendas">${fmtN(r.orcamentos)} / ${fmtN(r.vendas)}</td>
              <td data-l=""><button class="btn fantasma peq" data-res="${r.id}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="vazio">Toda semana, copie os números do Gerenciador de Anúncios aqui.</div>'}</details>
        <div style="margin-top:.8rem;display:flex;gap:.4rem;flex-wrap:wrap;"><button class="btn linha peq" data-aprendi="${c.id}"><span class="ic">${ICONES.lampada}</span>Anotar aprendizado</button></div>
      </article>`; }).join('') || '<div class="vazio">Nenhuma campanha ainda. Use o botão Campanha.</div>'}</div>`;

  ligarCopiar(el, mapaCopiar);
  const achar = id => camps.find(c => c.id === id);
  el.querySelectorAll('[data-editar-camp]').forEach(b => b.onclick = async () => { const r = await editarCampanha(achar(b.dataset.editarCamp)); if(r){ aviso(r === 'apagado' ? 'Campanha apagada.' : 'Campanha salva.'); recarregar(); } });
  el.querySelectorAll('[data-res-novo]').forEach(b => b.onclick = async () => { if(await editarResultado({campanha: achar(b.dataset.resNovo)})){ aviso('Resultado registrado.'); recarregar(); } });
  el.querySelectorAll('[data-res]').forEach(b => b.onclick = async () => { const r0 = res.find(r => r.id === b.dataset.res); const r = await editarResultado({campanha: achar(r0.campanha_id), existente: r0}); if(r){ aviso(r === 'apagado' ? 'Registro apagado.' : 'Resultado salvo.'); recarregar(); } });
  el.querySelectorAll('[data-aprendi]').forEach(b => b.onclick = async () => { if(await editarAprendizado({pre: {campanha_id: b.dataset.aprendi, tipo: 'teste', hipotese: achar(b.dataset.aprendi)?.hipotese || ''}})){ aviso('Aprendizado registrado.', '<a class="btn prim peq" href="#/marketing?aba=aprendizados">Ver</a>'); } });
}

function editarCampanha(c){
  const x = c || {objetivo: 'cadastros', destino: 'whatsapp', status: 'planejada', plataforma: 'meta'};
  return janela({titulo: c ? 'Campanha' : 'Nova campanha', larga: true, corpo: `
    <div class="campo"><label class="rot" for="c_n">Nome *</label><input type="text" id="c_n" value="${esc(x.nome)}" placeholder="Ex.: RUM · Captação · WhatsApp"></div>
    <div class="grade3"><div class="campo"><label class="rot" for="c_ob">Objetivo</label><select id="c_ob">${opts(OBJETIVOS, x.objetivo)}</select></div>
      <div class="campo"><label class="rot" for="c_de">Destino</label><select id="c_de">${opts(DESTINOS, x.destino)}</select></div>
      <div class="campo"><label class="rot" for="c_st">Status</label><select id="c_st">${opts(ST_CAMP, x.status)}</select></div></div>
    <div class="grade3"><div class="campo"><label class="rot" for="c_v">Verba por dia (R$)</label><input type="text" inputmode="decimal" id="c_v" value="${inputValor(x.verba_diaria_centavos)}" placeholder="0,00"></div>
      <div class="campo"><label class="rot" for="c_i">Início</label><input type="date" id="c_i" value="${x.inicio || ''}"></div>
      <div class="campo"><label class="rot" for="c_f">Fim</label><input type="date" id="c_f" value="${x.fim || ''}"></div></div>
    <div class="campo"><label class="rot" for="c_co">Código de rastreio <small>(vai no link do site: utm_campaign)</small></label><input type="text" id="c_co" value="${esc(x.codigo)}" placeholder="ex.: captacao"></div>
    <div class="campo"><label class="rot" for="c_pu">Público</label><textarea id="c_pu" style="min-height:60px;">${esc(x.publico)}</textarea></div>
    <div class="campo"><label class="rot" for="c_h">Hipótese <small>(o que você quer descobrir)</small></label><textarea id="c_h" style="min-height:60px;">${esc(x.hipotese)}</textarea></div>
    <div class="campo"><label class="rot" for="c_cr">Criativos <small>(quais posts ou vídeos estão rodando)</small></label><textarea id="c_cr" style="min-height:60px;">${esc(x.criativos)}</textarea></div>
    <div class="campo"><label class="rot" for="c_cp">Texto do anúncio</label><textarea id="c_cp">${esc(x.copy)}</textarea></div>
    <div class="campo"><label class="rot" for="c_o">Observações</label><textarea id="c_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>`,
    aoAbrir: ctx => { const n1 = ctx.el.querySelector('#c_n'), co = ctx.el.querySelector('#c_co'); if(!c) n1.addEventListener('input', () => { if(!co.dataset.mexeu) co.value = slugify(n1.value.replace(/^rum\s*·?\s*/i, '')).slice(0, 40); }); co.addEventListener('input', () => { co.dataset.mexeu = '1'; }); },
    botoes: [...(c ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar campanha', 'Os resultados registrados dela também são apagados. Prefira mudar o status para Encerrada.', 'Apagar', 'perigo'))) return false; await q.apaga(T.mktCampanhas, c.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {nome: ctx.valor('#c_n'), objetivo: ctx.valor('#c_ob'), destino: ctx.valor('#c_de'), status: ctx.valor('#c_st'),
          verba_diaria_centavos: ctx.valor('#c_v') ? centavos(valorDigitado(ctx.valor('#c_v'))) : null, inicio: ctx.valor('#c_i') || null, fim: ctx.valor('#c_f') || null,
          codigo: slugify(ctx.valor('#c_co')) || null, publico: ctx.valor('#c_pu') || null, hipotese: ctx.valor('#c_h') || null, criativos: ctx.valor('#c_cr') || null,
          copy: ctx.valor('#c_cp') || null, observacoes: ctx.valor('#c_o') || null};
        if(row.nome.length < 2){ ctx.erro('Dê um nome à campanha.'); return false; }
        if(row.inicio && row.fim && row.fim < row.inicio){ ctx.erro('O fim vem antes do início.'); return false; }
        if(row.status === 'ativa' && !row.inicio) row.inicio = hojeChave();
        return c ? q.altera(T.mktCampanhas, c.id, row) : q.cria(T.mktCampanhas, row);
      }}]});
}

function editarResultado({campanha, existente}){
  const hoje = hojeChave();
  const x = existente || {inicio: diaChave(addDias(new Date(), -7)), fim: diaChave(addDias(new Date(), -1))};
  return janela({titulo: existente ? 'Resultado do período' : 'Registrar resultado', larga: true, corpo: `
    <p class="muted" style="margin-top:0;">${esc(campanha?.nome || '')}. Copie os números do Gerenciador de Anúncios (colunas: valor usado, impressões, alcance, cliques no link, conversas por mensagem).</p>
    <div class="grade3"><div class="campo"><label class="rot" for="r_i">De</label><input type="date" id="r_i" value="${x.inicio}" max="${hoje}"></div>
      <div class="campo"><label class="rot" for="r_f">Até</label><input type="date" id="r_f" value="${x.fim}"></div>
      <div class="campo"><label class="rot" for="r_cj">Conjunto</label><input type="text" id="r_cj" list="r_cjs" value="${esc(x.conjunto)}" placeholder="Todos"><datalist id="r_cjs"><option value="A · Interesses"><option value="B · Aberto"><option value="Retomada"></datalist></div></div>
    <div class="grade3"><div class="campo"><label class="rot" for="r_inv">Valor usado (R$)</label><input type="text" inputmode="decimal" id="r_inv" value="${inputValor(x.investido_centavos)}" placeholder="0,00"></div>
      ${METRICAS_CAMP.slice(0, 2).map(([k, t]) => numInput('rc_' + k, x[k], t)).join('')}</div>
    <div class="grade4">${METRICAS_CAMP.slice(2).map(([k, t]) => numInput('rc_' + k, x[k], t)).join('')}</div>
    <div class="grade2"><div class="campo"><label class="rot" for="r_vv">Valor das vendas (R$)</label><input type="text" inputmode="decimal" id="r_vv" value="${inputValor(x.valor_vendas_centavos)}" placeholder="0,00"></div>
      <div class="campo"><label class="rot" for="r_fr">Frequência</label><input type="text" inputmode="decimal" id="r_fr" value="${x.frequencia ?? ''}" placeholder="ex.: 1,8"></div></div>
    <div class="mk-calc" id="r_calc"></div>
    <div class="campo"><label class="rot" for="r_o">Observações</label><textarea id="r_o" style="min-height:60px;">${esc(x.observacoes)}</textarea></div>`,
    aoAbrir: ctx => {
      const calc = () => {
        const inv = centavos(valorDigitado(ctx.valor('#r_inv'))), g = k => Number(ctx.valor('#rc_' + k)) || 0, fr = Number(String(ctx.valor('#r_fr')).replace(',', '.')) || 0;
        const t = totais([{investido_centavos: inv, impressoes: g('impressoes'), cliques: g('cliques'), conversas: g('conversas'), orcamentos: g('orcamentos'), vendas: g('vendas'), valor_vendas_centavos: centavos(valorDigitado(ctx.valor('#r_vv')))}]);
        ctx.el.querySelector('#r_calc').innerHTML = [['Custo por conversa', t.cpConv != null ? brlC(t.cpConv) : '—'], ['CPM', t.cpm != null ? brlC(t.cpm) : '—'], ['CTR', t.ctr != null ? pct(t.ctr, 1) : '—'],
          ['Custo por clique', t.cpc != null ? brlC(t.cpc) : '—'], ['Conversa → orçamento', pct(g('orcamentos'), g('conversas'))], ['Retorno', t.roas != null && t.valor ? t.roas.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '×' : '—']]
          .map(([k, v]) => `<div><span>${k}</span><b class="din">${v}</b></div>`).join('') + (fr > 3 ? '<p class="mk-alerta-f">Frequência acima de 3: o público já viu muitas vezes. Hora de trocar o criativo.</p>' : '');
      };
      ctx.el.addEventListener('input', calc); calc();
    },
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar registro', 'Apagar os números deste período?', 'Apagar', 'perigo'))) return false; await q.apaga(T.mktResultados, existente.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {campanha_id: campanha.id, inicio: ctx.valor('#r_i'), fim: ctx.valor('#r_f'), conjunto: ctx.valor('#r_cj') || null,
          investido_centavos: centavos(valorDigitado(ctx.valor('#r_inv'))), valor_vendas_centavos: ctx.valor('#r_vv') ? centavos(valorDigitado(ctx.valor('#r_vv'))) : null,
          frequencia: ctx.valor('#r_fr') ? Number(String(ctx.valor('#r_fr')).replace(',', '.')) || null : null, observacoes: ctx.valor('#r_o') || null};
        METRICAS_CAMP.forEach(([k]) => { row[k] = lerNum(ctx, 'rc_' + k); });
        if(!row.inicio || !row.fim){ ctx.erro('Informe o período.'); return false; }
        if(row.fim < row.inicio){ ctx.erro('O fim vem antes do início.'); return false; }
        return existente ? q.altera(T.mktResultados, existente.id, row) : q.cria(T.mktResultados, row);
      }}]});
}

// =====================================================================
// APRENDIZADOS
// =====================================================================
async function aprendizados(el, {t: tipo}){
  const filtro = TIPOS_APR.some(x => x[0] === tipo) ? tipo : '';
  const [aps, posts, camps] = await Promise.all([
    q.lista(T.mktAprendizados, '*', x => x.order('data', {ascending: false}).order('criado_em', {ascending: false})),
    q.lista(T.mktPosts, 'id,titulo,data'), q.lista(T.mktCampanhas, 'id,nome')]);
  const lista = aps.filter(a => !filtro || a.tipo === filtro);
  const pNome = id => posts.find(p => p.id === id)?.titulo, cNome = id => camps.find(c => c.id === id)?.nome;
  el.innerHTML = `
    <div class="filtros"><div class="pilulas">${[['', 'Todos'], ...TIPOS_APR].map(([k, t]) => `<button type="button" data-t="${k}" class="${k === filtro ? 'on' : ''}">${t}${k ? ' · ' + aps.filter(a => a.tipo === k).length : ''}</button>`).join('')}</div>
      <input type="search" id="apBusca" placeholder="Buscar nos aprendizados"><button class="btn linha peq" id="expAp" style="margin-left:auto;">Exportar</button></div>
    <div class="mk-aps">${lista.map(a => `<article class="card mk-ap" data-busca="${esc(`${a.titulo} ${a.hipotese || ''} ${a.acao || ''} ${a.resultado || ''} ${a.decisao || ''}`.toLowerCase())}">
      <div class="mk-ap-cab"><span class="eyebrow">${dia(a.data)} · ${esc(nome(TIPOS_APR, a.tipo))}</span><button class="btn fantasma peq" data-ap="${a.id}">Editar</button></div>
      <h3>${esc(a.titulo)}</h3>
      <div class="mk-ap-fluxo">${[['Hipótese', a.hipotese], ['O que foi feito', a.acao], ['Resultado', a.resultado], ['Decisão', a.decisao]].filter(([, v]) => v).map(([k, v]) => `<div class="${k === 'Decisão' ? 'dec' : ''}"><span>${k}</span><p>${esc(v)}</p></div>`).join('')}</div>
      ${a.post_id || a.campanha_id ? `<div class="mk-ap-rel">${a.post_id && pNome(a.post_id) ? `<a href="#/marketing?aba=calendario">Post: ${esc(pNome(a.post_id))}</a>` : ''}${a.campanha_id && cNome(a.campanha_id) ? `<a href="#/marketing?aba=campanhas">Campanha: ${esc(cNome(a.campanha_id))}</a>` : ''}</div>` : ''}
    </article>`).join('') || `<div class="vazio">${aps.length ? 'Nada com esse filtro.' : 'Nenhum aprendizado ainda. Cada vez que testar algo (um gancho, um público, um horário), anote a hipótese, o resultado e o que decidiu. É o seu estudo de campanha.'}</div>`}</div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => ir('marketing?aba=aprendizados' + (b.dataset.t ? '&t=' + b.dataset.t : '')));
  el.querySelector('#apBusca').oninput = e => { const v = e.target.value.trim().toLowerCase(); el.querySelectorAll('[data-busca]').forEach(c => c.classList.toggle('hidden', !!v && !c.dataset.busca.includes(v))); };
  el.querySelectorAll('[data-ap]').forEach(b => b.onclick = async () => { const r = await editarAprendizado({existente: aps.find(a => a.id === b.dataset.ap), posts, camps}); if(r){ aviso(r === 'apagado' ? 'Aprendizado apagado.' : 'Aprendizado salvo.'); recarregar(); } });
  el.querySelector('#expAp').onclick = () => { baixar('aprendizados-rumeyart.csv', csv(aps, [['data', 'Data'], [a => nome(TIPOS_APR, a.tipo), 'Tipo'], ['titulo', 'Título'], ['hipotese', 'Hipótese'], ['acao', 'O que foi feito'], ['resultado', 'Resultado'], ['decisao', 'Decisão'], [a => pNome(a.post_id) || '', 'Post'], [a => cNome(a.campanha_id) || '', 'Campanha']])); aviso('Planilha baixada.'); };
}

async function editarAprendizado({existente, pre = {}, posts, camps}){
  [posts, camps] = await Promise.all([posts ? posts : q.lista(T.mktPosts, 'id,titulo,data', x => x.order('data', {ascending: false, nullsFirst: false})), camps ? camps : q.lista(T.mktCampanhas, 'id,nome')]);
  const x = existente || {data: hojeChave(), tipo: 'teste', ...pre};
  return janela({titulo: existente ? 'Aprendizado' : 'Novo aprendizado', larga: true, corpo: `
    <div class="campo"><label class="rot" for="l_t">Título *</label><input type="text" id="l_t" value="${esc(x.titulo)}" placeholder="Ex.: Pergunta no título dobra os salvamentos"></div>
    <div class="grade2"><div class="campo"><label class="rot" for="l_d">Data</label><input type="date" id="l_d" value="${x.data || hojeChave()}"></div>
      <div class="campo"><label class="rot" for="l_ti">Tipo</label><select id="l_ti">${opts(TIPOS_APR, x.tipo)}</select></div></div>
    <div class="campo"><label class="rot" for="l_h">Hipótese <small>(o que você achava)</small></label><textarea id="l_h" style="min-height:60px;">${esc(x.hipotese)}</textarea></div>
    <div class="campo"><label class="rot" for="l_a">O que foi feito</label><textarea id="l_a" style="min-height:60px;">${esc(x.acao)}</textarea></div>
    <div class="campo"><label class="rot" for="l_r">Resultado <small>(com números, se tiver)</small></label><textarea id="l_r" style="min-height:60px;">${esc(x.resultado)}</textarea></div>
    <div class="campo"><label class="rot" for="l_de">Decisão <small>(o que muda daqui para frente)</small></label><textarea id="l_de" style="min-height:60px;">${esc(x.decisao)}</textarea></div>
    <div class="grade2"><div class="campo"><label class="rot" for="l_p">Post relacionado</label><select id="l_p"><option value="">—</option>${posts.map(p => `<option value="${p.id}" ${p.id === x.post_id ? 'selected' : ''}>${p.data ? dataCurta(p.data) + ' · ' : ''}${esc(p.titulo)}</option>`).join('')}</select></div>
      <div class="campo"><label class="rot" for="l_c">Campanha relacionada</label><select id="l_c"><option value="">—</option>${camps.map(c => `<option value="${c.id}" ${c.id === x.campanha_id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div></div>`,
    botoes: [...(existente ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar aprendizado', 'Apagar este registro?', 'Apagar', 'perigo'))) return false; await q.apaga(T.mktAprendizados, x.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: ctx => {
        const row = {titulo: ctx.valor('#l_t'), data: ctx.valor('#l_d') || hojeChave(), tipo: ctx.valor('#l_ti'), hipotese: ctx.valor('#l_h') || null, acao: ctx.valor('#l_a') || null,
          resultado: ctx.valor('#l_r') || null, decisao: ctx.valor('#l_de') || null, post_id: ctx.valor('#l_p') || null, campanha_id: ctx.valor('#l_c') || null};
        if(row.titulo.length < 2){ ctx.erro('Dê um título.'); return false; }
        return existente ? q.altera(T.mktAprendizados, x.id, row) : q.cria(T.mktAprendizados, row);
      }}]});
}

// =====================================================================
// MARCA
// =====================================================================
async function marcaDados(){ const r = await q.um(T.mktMarca, 1); return r?.dados || {}; }
async function salvarMarca(parcial){
  const atual = await marcaDados();
  const dados = {...atual, ...parcial};
  const r = await q.um(T.mktMarca, 1);
  return r ? q.altera(T.mktMarca, 1, {dados}) : q.cria(T.mktMarca, {id: 1, dados});
}

async function marca(el){
  const d = await marcaDados();
  const lista = t => linhas(t).map(x => `<li>${esc(x)}</li>`).join('');
  const bioLen = String(d.bio || '').length;
  const mapa = {frase: d.frase_guia || '', promessa: d.promessa || '', bio: d.bio || '', hashtags: d.hashtags || ''};
  (d.textos || []).forEach((t, i) => { mapa['t' + i] = t.texto || ''; });
  (d.cores || []).forEach((c, i) => { mapa['cor' + i] = c.hex || ''; });
  const somaPeso = (d.pilares || []).reduce((s, p) => s + (Number(p.peso) || 0), 0);
  const sec = (k, t, corpo) => `<section class="card mk-marca"><h3>${t}<button class="btn fantasma peq dir" data-sec="${k}">Editar</button></h3>${corpo}</section>`;

  el.innerHTML = `
    <div class="mk-frase"><span class="eyebrow">Frase-guia</span><p>${esc(d.frase_guia || 'Defina a frase-guia da marca.')}</p><button class="btn linha peq" data-copiar="frase">Copiar</button></div>
    <div class="cols">
      <div>
        ${sec('posicionamento', 'Posicionamento', `
          <div class="mk-bloco"><span class="eyebrow">Promessa</span><p>${esc(d.promessa || '—')}</p></div>
          <div class="mk-bloco"><span class="eyebrow">Provas</span><ul>${lista(d.provas) || '<li>—</li>'}</ul></div>
          <div class="mk-bloco"><span class="eyebrow">Inimigo comum</span><p>${esc(d.inimigo || '—')}</p></div>
          <div class="mk-bloco"><span class="eyebrow">Bio do Instagram · <span class="${bioLen > 150 ? 'valor-neg' : ''}">${bioLen}/150</span></span><p style="white-space:pre-wrap;">${esc(d.bio || '—')}</p><button class="btn fantasma peq" data-copiar="bio">Copiar bio</button></div>`)}
        ${sec('tom', 'Tom de voz', `<ol class="mk-regras">${lista(d.tom)}</ol>
          <div class="mk-faz"><div><span class="eyebrow">Faz</span><ul>${lista(d.faz)}</ul></div><div class="nao"><span class="eyebrow">Não faz</span><ul>${lista(d.nao_faz)}</ul></div></div>`)}
        ${sec('textos', 'Textos-base', (d.textos || []).map((t, i) => `<div class="mk-texto"><div class="mk-texto-t"><b>${esc(t.titulo)}</b><button class="btn fantasma peq" data-copiar="t${i}">Copiar</button></div><p>${esc(t.texto)}</p></div>`).join('') || '<div class="vazio">Guarde aqui legendas, textos de anúncio e respostas prontas.</div>')}
      </div>
      <div>
        ${sec('publicos', 'Públicos', (d.publicos || []).map(p => `<div class="mk-pub"><b>${esc(p.nome)}</b><span>${esc(p.dor || '')}</span>${p.gancho ? `<em>“${esc(p.gancho)}”</em>` : ''}${p.prova ? `<small>Prova: ${esc(p.prova)}</small>` : ''}</div>`).join('') || '<div class="vazio">Cadastre os públicos da marca.</div>')}
        ${sec('pilares', 'Pilares de conteúdo', (d.pilares || []).map(p => `<div class="mk-barra-l"><div class="mk-barra-t"><span>${PILARES.some(x => x[0] === slugify(p.nome)) ? pilarTxt(slugify(p.nome)) : esc(p.nome)}</span><span class="muted">${Number(p.peso) || 0}%</span></div><div class="mk-barra" style="--c:${corPilar(slugify(p.nome))}"><i style="width:${Math.min(100, Number(p.peso) || 0)}%"></i></div><small class="muted">${esc(p.mostra || '')}${p.formatos ? ' · ' + esc(p.formatos) : ''}</small></div>`).join('')
          + (somaPeso && somaPeso !== 100 ? `<p class="valor-neg" style="font-size:13px;">Os pesos somam ${somaPeso}%. O ideal é fechar em 100%.</p>` : ''))}
        ${sec('cores', 'Cores', `<div class="mk-cores">${(d.cores || []).map((c, i) => `<button class="mk-cor" data-copiar="cor${i}" title="Copiar ${esc(c.hex)}"><i style="background:${/^#[0-9a-f]{3,8}$/i.test(c.hex || '') ? c.hex : 'transparent'}"></i><b>${esc(c.nome)}</b><code>${esc(c.hex)}</code><small>${esc(c.uso || '')}</small></button>`).join('')}</div>`)}
        ${sec('visual', 'Tipografia, formatos e hashtags', `<div class="mk-bloco"><span class="eyebrow">Tipografia</span><p>${esc(d.fontes || '—')}</p></div>
          <div class="mk-bloco"><span class="eyebrow">Formatos</span><ul>${lista(d.formatos) || '<li>—</li>'}</ul></div>
          <div class="mk-bloco"><span class="eyebrow">Hashtags fixas</span><p>${esc(d.hashtags || '—')}</p>${d.hashtags ? '<button class="btn fantasma peq" data-copiar="hashtags">Copiar</button>' : ''}</div>`)}
      </div>
    </div>`;
  ligarCopiar(el, mapa);
  el.querySelectorAll('[data-sec]').forEach(b => b.onclick = async () => { if(await editarMarca(b.dataset.sec, d)){ aviso('Marca atualizada.'); recarregar(); } });
}

// editor de linhas (públicos, pilares, cores, textos)
function linhasEd(id, campos, itens){
  const linha = (it = {}) => `<div class="mk-le-l">${campos.map(([k, t, tipo]) => tipo === 'area'
    ? `<textarea data-k="${k}" placeholder="${esc(t)}" aria-label="${esc(t)}" style="min-height:70px;">${esc(it[k] ?? '')}</textarea>`
    : `<input type="${tipo || 'text'}" data-k="${k}" placeholder="${esc(t)}" aria-label="${esc(t)}" value="${esc(it[k] ?? '')}">`).join('')}<button type="button" class="btn fantasma peq mk-le-rm" aria-label="Remover linha" title="Remover">✕</button></div>`;
  return {html: `<div class="mk-le" id="${id}">${(itens || []).map(linha).join('')}</div><button type="button" class="btn linha peq" data-le-add="${id}">＋ Adicionar</button>`,
    ligar: ctx => { const box = ctx.el.querySelector('#' + id);
      ctx.el.querySelector(`[data-le-add="${id}"]`).onclick = () => { box.insertAdjacentHTML('beforeend', linha()); box.lastElementChild.querySelector('input,textarea').focus(); };
      box.addEventListener('click', e => { const rm = e.target.closest('.mk-le-rm'); if(rm) rm.closest('.mk-le-l').remove(); }); },
    ler: ctx => [...ctx.el.querySelectorAll(`#${id} .mk-le-l`)].map(l => Object.fromEntries([...l.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.type === 'number' ? Number(i.value) || 0 : i.value.trim()])))
      .filter(o => Object.values(o).some(v => v !== '' && v !== 0))};
}

function editarMarca(sec, d){
  const area = (id, rot, v, dica = '', h = 90) => `<div class="campo"><label class="rot" for="${id}">${rot}${dica ? ` <small>${dica}</small>` : ''}</label><textarea id="${id}" style="min-height:${h}px;">${esc(v || '')}</textarea></div>`;
  let corpo = '', ler, ligar, titulo = 'Editar marca', larga = true;
  if(sec === 'posicionamento'){
    titulo = 'Posicionamento';
    corpo = `<div class="campo"><label class="rot" for="m_fg">Frase-guia</label><input type="text" id="m_fg" value="${esc(d.frase_guia)}"></div>`
      + area('m_pr', 'Promessa', d.promessa, '', 70) + area('m_pv', 'Provas', d.provas, '(uma por linha)') + area('m_in', 'Inimigo comum', d.inimigo, '', 70)
      + area('m_bio', 'Bio do Instagram', d.bio, '<span id="m_bioc"></span>', 90);
    ligar = ctx => { const b = ctx.el.querySelector('#m_bio'), c = ctx.el.querySelector('#m_bioc'); const f = () => { c.textContent = `${b.value.length}/150`; c.className = b.value.length > 150 ? 'valor-neg' : ''; }; b.addEventListener('input', f); f(); };
    ler = ctx => ({frase_guia: ctx.valor('#m_fg'), promessa: ctx.valor('#m_pr'), provas: ctx.valor('#m_pv'), inimigo: ctx.valor('#m_in'), bio: ctx.el.querySelector('#m_bio').value.trim()});
  }
  if(sec === 'tom'){
    titulo = 'Tom de voz';
    corpo = area('m_tom', 'Regras', d.tom, '(uma por linha)', 150) + '<div class="grade2">' + area('m_faz', 'Faz', d.faz, '(exemplos, um por linha)', 120) + area('m_nf', 'Não faz', d.nao_faz, '(um por linha)', 120) + '</div>';
    ler = ctx => ({tom: ctx.valor('#m_tom'), faz: ctx.valor('#m_faz'), nao_faz: ctx.valor('#m_nf')});
  }
  if(sec === 'visual'){
    titulo = 'Tipografia, formatos e hashtags';
    corpo = area('m_fo', 'Tipografia', d.fontes, '', 60) + area('m_fm', 'Formatos', d.formatos, '(um por linha)', 100) + `<div class="campo"><label class="rot" for="m_hs">Hashtags fixas</label><input type="text" id="m_hs" value="${esc(d.hashtags)}"></div>`;
    ler = ctx => ({fontes: ctx.valor('#m_fo'), formatos: ctx.valor('#m_fm'), hashtags: ctx.valor('#m_hs')});
  }
  const LISTAS = {
    publicos: ['Públicos', [['nome', 'Público'], ['dor', 'Dor concreta'], ['gancho', 'Pergunta-gancho'], ['prova', 'Projeto-prova']]],
    pilares: ['Pilares de conteúdo', [['nome', 'Pilar'], ['peso', 'Peso %', 'number'], ['mostra', 'O que mostra'], ['formatos', 'Formatos']]],
    cores: ['Cores', [['nome', 'Nome'], ['hex', '#hex'], ['uso', 'Uso']]],
    textos: ['Textos-base', [['titulo', 'Título'], ['texto', 'Texto', 'area']]]
  };
  if(LISTAS[sec]){
    const [t, campos] = LISTAS[sec]; titulo = t;
    const ed = linhasEd('m_le', campos, d[sec]);
    corpo = (sec === 'pilares' ? '<p class="muted" style="margin-top:0;font-size:13px;">Os nomes Espelho, Prova, Método e Convite ligam o pilar às cores do calendário.</p>' : '') + ed.html;
    ligar = ed.ligar; ler = ctx => ({[sec]: ed.ler(ctx)});
  }
  return janela({titulo, larga, corpo, aoAbrir: ctx => ligar && ligar(ctx),
    botoes: [{texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => { await salvarMarca(ler(ctx)); return true; }}]});
}
