// Configurações: aparência, notificações, numeração, textos padrão, empresa, acesso e exportação
import {sb, q, T, config, tudo} from './db.js';
import {esc, aviso, traduzErro, csv, baixar, autoAltura, listaBonita, confirmar, TIPOS, ORIGENS, rot, etapaNome, statusNome} from './util.js';
import {OPCOES_ZOOM, TEMAS, zoomAtual, temaAtual, mudarZoom, mudarTema} from './aparencia.js';
import {ICONES} from './icones.js';
import * as pwa from './pwa.js';
import {estado, recarregar} from './app.js';

export async function render(el){
  const [cfg, admins] = await Promise.all([config(true), q.lista(T.admins, '*', x => x.order('email'))]);
  const P = cfg.proposta, E = cfg.empresa;
  const ta = (id, rotulo, v, dica = '') => `<div class="campo"><label class="rot" for="${id}">${rotulo} ${dica ? `<small>(${dica})</small>` : ''}</label><textarea id="${id}">${esc(v)}</textarea></div>`;
  const inp = (id, rotulo, v, extra = '') => `<div class="campo"><label class="rot" for="${id}">${rotulo}</label><input type="text" id="${id}" value="${esc(v)}" ${extra}></div>`;
  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Gestão</div><h1>Configurações</h1></div>
    <div class="cols">
      <div class="card" style="grid-column:1 / -1;"><h3>Aparência <span class="muted" style="font-family:var(--f-corpo);font-size:13px;">vale só para este aparelho</span></h3>
        <div class="rot">Tema</div>
        <div class="temas" id="temas" style="margin-top:.4rem;">${TEMAS.map(([k, n]) => `<button type="button" data-tema="${k}" class="${k === temaAtual() ? 'on' : ''}"><span class="amostra ${k}"></span>${esc(n)}</button>`).join('')}</div>
        <div class="rot" style="margin-top:1rem;">Tamanho da tela</div>
        <div class="seg" id="zooms" style="margin-top:.4rem;">${OPCOES_ZOOM.map(z => `<button type="button" data-z="${z}" class="${z === zoomAtual() ? 'on' : ''}">${z}%</button>`).join('')}</div>
        <div class="muted" style="font-size:12.5px;margin-top:.45rem;">O zoom com os dedos fica travado para a tela não escorregar; use estas opções para aumentar ou diminuir tudo.</div>
      </div>
      <div class="card" style="grid-column:1 / -1;"><h3>Notificações e app</h3><div id="notifCorpo" class="muted">Verificando…</div></div>
      <div>
        <div class="card"><h3>Numeração</h3>
          <div class="grade2"><div class="campo"><label class="rot" for="c_prox">Próxima proposta</label><input type="number" id="c_prox" min="1" value="${cfg.proximo_numero}"></div>
            <div class="campo"><label class="rot" for="c_cont">Próximo contrato</label><input type="number" id="c_cont" min="1" value="${cfg.proximo_contrato}"></div></div>
          <div class="muted" style="font-size:12.5px;margin-top:.4rem;">O próximo documento criado recebe esse número.</div></div>
        <div class="card"><h3>Textos padrão da proposta</h3>
          <div class="muted" style="font-size:12.5px;margin:-.3rem 0 .4rem;">Entram em toda proposta nova. Propostas já criadas não mudam.</div>
          <div class="grade2">${inp('c_prazo', 'Prazo', P.prazo_padrao)}<div class="campo"><label class="rot" for="c_valid">Validade (dias)</label><input type="number" id="c_valid" min="1" max="90" value="${P.validade_dias || 15}"></div></div>
          ${ta('c_etp', 'Etapas de trabalho', P.etapas_padrao, 'Nome: descrição')}
          ${ta('c_pag', 'Pagamento', P.pagamento_padrao)}
          ${ta('c_inc', 'Está incluso', P.incluso_padrao)}
          ${ta('c_nao', 'Não está incluso', P.nao_incluso_padrao)}
          ${ta('c_cond', 'Letras miúdas', P.condicoes_padrao)}</div>
        <div class="card"><h3>Dados da empresa <span class="muted" style="font-family:var(--f-corpo);font-size:13px;">aparecem nas propostas e contratos</span></h3>
          ${inp('e_nome', 'Nome', E.nome)}<div class="grade2">${inp('e_cnpj', 'CNPJ', E.cnpj)}${inp('e_whats', 'WhatsApp', E.whatsapp)}</div>
          <div class="grade2">${inp('e_email', 'E-mail', E.email)}${inp('e_site', 'Site', E.site)}</div>
          <div class="grade2">${inp('e_cid', 'Cidade (para contratos)', E.cidade, 'placeholder="Vargem Grande Paulista/SP"')}${inp('e_resp', 'Responsável (assina)', E.responsavel)}</div>
          ${inp('e_end', 'Endereço', E.endereco)}</div>
        <button class="btn prim" id="salvar" style="margin-top:.2rem;">Salvar configurações</button> <span class="salvo" id="msg"></span>
      </div>
      <div>
        <div class="card"><h3>Quem acessa o CRM</h3>
          ${admins.map(a => `<div class="item-lista"><span class="pe" style="border:0;padding:0;"><span class="av">${esc(a.email.slice(0, 2).toUpperCase())}</span></span><div class="tx"><b>${esc(a.email)}</b><span>${esc(a.papel)}${a.email === estado.usuario?.email?.toLowerCase() ? ' · você' : ''}</span></div>
            ${a.email !== estado.usuario?.email?.toLowerCase() ? `<button class="btn perigo peq" data-rem="${esc(a.email)}">Remover</button>` : ''}</div>`).join('')}
          <div class="campo"><label class="rot" for="novoAcesso">Liberar novo e-mail</label><div style="display:flex;gap:.5rem;"><input type="email" id="novoAcesso" placeholder="email@exemplo.com"><button class="btn linha" id="addAcesso">Liberar</button></div>
            <div class="muted" style="font-size:12.5px;margin-top:.35rem;">A pessoa cria a senha pelo link "Esqueci minha senha" na tela de entrada (o e-mail precisa estar confirmado no Supabase).</div></div></div>
        <div class="card"><h3>Formulário do site</h3>
          <p class="muted" style="margin-top:-.3rem;font-size:14px;">Toda ideia enviada pelo site cria (ou reaproveita, pelo WhatsApp) o cliente, abre um projeto em "Novo pedido", guarda as respostas em <a href="#/pedidos">Pedidos do site</a> e agenda a tarefa "Responder pedido do site". Você recebe o aviso no celular na hora.</p></div>
        <div class="card"><h3>Seus dados</h3>
          <p class="muted" style="margin-top:0;font-size:14px;">Baixe tudo quando quiser. As planilhas abrem no Excel e no Google Planilhas.</p>
          <div style="display:grid;gap:.45rem;">
            ${[['clientes', 'clientes', 'Clientes'], ['oportunidades', 'funil', 'Projetos / funil'], ['pedidos', 'pedidos', 'Pedidos do site'], ['propostas', 'propostas', 'Propostas'], ['financeiro', 'financeiro', 'Lançamentos financeiros'], ['tarefas', 'tarefas', 'Tarefas'], ['historico', 'nota', 'Histórico completo']]
              .map(([k, ic, n]) => `<button class="btn fantasma" data-exp="${k}" style="justify-content:flex-start;"><span class="ic">${ICONES[ic]}</span>${n} (CSV)</button>`).join('')}
            <button class="btn linha" data-exp="tudo" style="justify-content:flex-start;"><span class="ic">${ICONES.importar}</span>Cópia completa de tudo (JSON)</button>
          </div></div>
      </div>
    </div>`;
  ['c_etp', 'c_pag', 'c_inc', 'c_nao'].forEach(i => listaBonita(el.querySelector('#' + i)));
  el.querySelectorAll('textarea').forEach(t => t.addEventListener('input', () => autoAltura(t)));
  requestAnimationFrame(() => el.querySelectorAll('textarea').forEach(autoAltura));
  el.querySelectorAll('#temas [data-tema]').forEach(b => b.onclick = () => { mudarTema(b.dataset.tema); el.querySelectorAll('#temas [data-tema]').forEach(x => x.classList.toggle('on', x === b)); });
  el.querySelectorAll('#zooms [data-z]').forEach(b => b.onclick = () => { mudarZoom(+b.dataset.z); el.querySelectorAll('#zooms [data-z]').forEach(x => x.classList.toggle('on', x === b)); });
  montarNotificacoes(el.querySelector('#notifCorpo'));
  const v = id => el.querySelector('#' + id).value.trim();

  el.querySelector('#salvar').onclick = async () => {
    const msg = el.querySelector('#msg');
    const prox = parseInt(v('c_prox'), 10), cont = parseInt(v('c_cont'), 10);
    if(!(prox > 0) || !(cont > 0)){ msg.className = 'salvo erro'; msg.textContent = 'Número inválido.'; return; }
    const [{data: u1}, {data: u2}] = await Promise.all([sb.from(T.propostas).select('id').eq('numero', prox).limit(1), sb.from(T.contratos).select('id').eq('numero', cont).limit(1)]);
    if(u1?.length){ msg.className = 'salvo erro'; msg.textContent = `A proposta nº ${prox} já existe.`; return; }
    if(u2?.length){ msg.className = 'salvo erro'; msg.textContent = `O contrato nº ${cont} já existe.`; return; }
    try{
      await q.altera(T.config, 1, {proximo_numero: prox, proximo_contrato: cont,
        proposta: {...P, prazo_padrao: v('c_prazo'), validade_dias: parseInt(v('c_valid'), 10) || 15, etapas_padrao: v('c_etp'), pagamento_padrao: v('c_pag'), incluso_padrao: v('c_inc'), nao_incluso_padrao: v('c_nao'), condicoes_padrao: v('c_cond')},
        empresa: {...E, nome: v('e_nome'), cnpj: v('e_cnpj'), whatsapp: v('e_whats'), email: v('e_email'), site: v('e_site'), cidade: v('e_cid'), responsavel: v('e_resp'), endereco: v('e_end')}});
      await config(true); msg.className = 'salvo'; msg.textContent = 'Salvo ✓';
    }catch(e){ msg.className = 'salvo erro'; msg.textContent = traduzErro(e); }
  };
  el.querySelector('#addAcesso').onclick = async () => {
    const email = v('novoAcesso').toLowerCase(); if(!/^\S+@\S+\.\S+$/.test(email)){ aviso('Digite um e-mail válido.'); return; }
    const {error} = await sb.rpc('rumeyart_adicionar_acesso', {p_email: email, p_papel: 'admin'});
    if(error) aviso(traduzErro(error)); else { aviso('Acesso liberado para ' + email); recarregar(); }
  };
  el.querySelectorAll('[data-rem]').forEach(b => b.onclick = async () => {
    if(!(await confirmar('Remover acesso', `${esc(b.dataset.rem)} deixa de entrar no CRM. Nada do que essa pessoa registrou é apagado.`, 'Remover', 'perigo'))) return;
    const {error} = await sb.rpc('rumeyart_remover_acesso', {p_email: b.dataset.rem});
    if(error) aviso(traduzErro(error)); else { aviso('Acesso removido.'); recarregar(); }
  });
  el.querySelectorAll('[data-exp]').forEach(b => b.onclick = async () => { b.disabled = true; try{ await exportar(b.dataset.exp); }catch(e){ aviso(traduzErro(e)); } finally{ b.disabled = false; } });
}

async function montarNotificacoes(box){
  const st = await Promise.race([pwa.estadoNotificacoes(), new Promise(r => setTimeout(() => r({suporte: false, lento: true}), 5000))]).catch(() => ({suporte: false}));
  const inst = pwa.instalado();
  const linhaApp = inst ? '<div class="status-notif"><span class="bola ok"></span><span>App instalado neste aparelho.</span></div>'
    : pwa.podeInstalar() ? '<div class="status-notif"><span class="bola"></span><span>App ainda não instalado neste aparelho.</span> <button type="button" class="btn prim peq" id="nInstalar" style="margin-left:auto;">Instalar</button></div>'
    : '<div class="status-notif"><span class="bola"></span><span>Para instalar, use o menu do navegador → <b>Instalar app</b> / <b>Adicionar à tela inicial</b>.</span></div>';
  let corpo;
  if(!st.suporte){
    corpo = st.precisaInstalar ? '<div class="status-notif"><span class="bola nao"></span><span>No iPhone, as notificações funcionam com o app instalado na Tela de Início (iOS 16.4 ou mais novo).</span></div>'
      : '<div class="status-notif"><span class="bola nao"></span><span>Este navegador não recebe notificações. No celular, use o app instalado; no computador, Chrome ou Edge.</span></div>';
  }else if(st.permissao === 'denied'){
    corpo = '<div class="status-notif"><span class="bola nao"></span><span>As notificações estão bloqueadas para o CRM. Libere nas configurações do site (cadeado ao lado do endereço) ou do celular e volte aqui.</span></div>';
  }else if(st.ativa){
    corpo = `<div class="status-notif"><span class="bola ok"></span><span>Notificações ativadas neste aparelho.</span></div>
      <label class="chk"><input type="checkbox" id="nProprias" ${st.proprias ? 'checked' : ''}> Avisar também das mudanças que eu mesmo fizer</label>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;"><button type="button" class="btn linha peq" id="nTeste">Enviar aviso de teste</button><button type="button" class="btn perigo peq" id="nDesligar">Desligar neste aparelho</button></div>`;
  }else{
    corpo = `<div class="status-notif"><span class="bola"></span><span>Notificações desligadas neste aparelho.</span></div>
      <button type="button" class="btn prim" id="nAtivar"><span class="ic">${ICONES.sino}</span>Ativar notificações</button>`;
  }
  box.className = '';
  box.innerHTML = linhaApp + corpo + `<div class="muted" style="font-size:12.5px;margin-top:.8rem;line-height:1.5;">Você recebe um aviso quando chega uma ideia pelo site, quando há movimentação nos clientes (funil, propostas, contratos, recebimentos) e na hora de cada tarefa. Cada aparelho ativa separado.</div>`;
  const $b = s => box.querySelector(s);
  if($b('#nInstalar')) $b('#nInstalar').onclick = async () => { await pwa.instalar(); montarNotificacoes(box); };
  if($b('#nAtivar')) $b('#nAtivar').onclick = async ev => { ev.currentTarget.disabled = true; await pwa.ativarNotificacoes(); montarNotificacoes(box); };
  if($b('#nDesligar')) $b('#nDesligar').onclick = async () => { await pwa.desativarNotificacoes(); montarNotificacoes(box); };
  if($b('#nTeste')) $b('#nTeste').onclick = async () => { try{ await pwa.testarNotificacao(); aviso('Aviso de teste enviado. Deve chegar em alguns segundos.'); }catch(e){ aviso(traduzErro(e)); } };
  if($b('#nProprias')) $b('#nProprias').onchange = async e => { try{ await pwa.mudarProprias(e.target.checked); aviso('Preferência salva.'); }catch(err){ aviso(traduzErro(err)); } };
}

async function exportar(tipo){
  const hoje = new Date().toISOString().slice(0, 10);
  const nome = n => `rumeyart-${n}-${hoje}`;
  if(tipo === 'tudo'){
    const dados = {exportado_em: new Date().toISOString()};
    for(const n of ['clientes', 'oport', 'pedidos', 'propostas', 'pdfs', 'hist', 'tarefas', 'servicos', 'config', 'fornecedores', 'recursos', 'precos', 'compras', 'modelos', 'contratos', 'contas', 'cartoes', 'categorias', 'lanc']) dados[T[n]] = await tudo(T[n]);
    baixar(nome('crm-completo') + '.json', JSON.stringify(dados, null, 1), 'application/json'); aviso('Cópia completa baixada.'); return;
  }
  const cli = '*, cliente:rumeyart_clientes(nome)';
  if(tipo === 'clientes') baixar(nome('clientes') + '.csv', csv(await tudo(T.clientes), [['nome', 'Nome'], ['marca', 'Marca'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['cidade', 'Cidade'], ['uf', 'UF'], ['cpf_cnpj', 'CPF/CNPJ'], [r => rot(TIPOS, r.tipo), 'Tipo'], [r => rot(ORIGENS, r.origem), 'Origem'], ['observacoes', 'Observações'], [r => r.arquivado ? 'sim' : 'não', 'Arquivado'], ['criado_em', 'Cadastro']]));
  if(tipo === 'oportunidades') baixar(nome('projetos') + '.csv', csv(await tudo(T.oport, cli), [[r => r.cliente?.nome, 'Cliente'], ['titulo', 'Projeto'], [r => etapaNome(r.etapa), 'Etapa'], ['valor', 'Valor'], ['mensal', 'Mensal'], ['origem', 'Origem'], ['motivo_perda', 'Motivo da perda'], ['criado_em', 'Criado em'], ['fechado_em', 'Fechado em'], ['entrega_prevista', 'Entrega prevista'], ['entregue_em', 'Entregue em'], ['suporte_ate', 'Suporte até'], ['link_app', 'Link do app']]));
  if(tipo === 'pedidos') baixar(nome('pedidos-site') + '.csv', csv(await tudo(T.pedidos), [['numero', 'Nº'], ['criado_em', 'Data'], ['nome', 'Nome'], ['whatsapp', 'WhatsApp'], ['ideia', 'Ideia'], [r => r.respostas?.para, 'Para quem'], [r => r.respostas?.marca, 'Marca'], [r => r.respostas?.tipo, 'Formato'], [r => r.respostas?.dor, 'Incômodo'], [r => r.respostas?.desejo, 'Desejo'], [r => r.respostas?.quem, 'Quem usa'], [r => r.respostas?.onde, 'Onde'], [r => r.respostas?.prazo, 'Prazo'], [r => r.respostas?.invest, 'Investimento'], ['status', 'Status']]));
  if(tipo === 'propostas') baixar(nome('propostas') + '.csv', csv(await tudo(T.propostas, cli), [['numero', 'Nº'], [r => r.cliente?.nome, 'Cliente'], ['titulo', 'Projeto'], [r => statusNome(r.status), 'Status'], ['total', 'Total'], ['mensal', 'Mensal'], ['criado_em', 'Criada em'], ['enviada_em', 'Enviada em'], ['aprovada_em', 'Aprovada em'], [r => r.dados?.prazo, 'Prazo']]));
  if(tipo === 'financeiro') baixar(nome('financeiro') + '.csv', csv(await tudo(T.lanc, cli), [['data', 'Data'], ['tipo', 'Tipo'], ['descricao', 'Descrição'], [r => (r.valor_centavos / 100).toFixed(2).replace('.', ','), 'Valor'], ['status', 'Situação'], ['sub', 'Subcategoria'], [r => r.cliente?.nome, 'Cliente'], [r => r.parcelas > 1 ? `${r.parcela}/${r.parcelas}` : '', 'Parcela'], ['origem', 'Origem'], ['observacoes', 'Observações']]));
  if(tipo === 'tarefas') baixar(nome('tarefas') + '.csv', csv(await tudo(T.tarefas, cli), [[r => r.cliente?.nome, 'Cliente'], ['titulo', 'Tarefa'], ['area', 'Área'], ['vence_em', 'Para'], [r => r.concluida ? 'sim' : 'não', 'Concluída'], ['concluida_em', 'Concluída em'], ['criado_por', 'Criada por']]));
  if(tipo === 'historico') baixar(nome('historico') + '.csv', csv(await tudo(T.hist, cli), [['criado_em', 'Data'], [r => r.cliente?.nome, 'Cliente'], ['tipo', 'Tipo'], ['texto', 'Registro'], ['autor', 'Autor']]));
  aviso('Arquivo baixado.');
}
