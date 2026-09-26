// Catálogo de serviços (base das propostas)
import {q, T, servicos, limparCache} from './db.js';
import {esc, brl, CATEGORIAS, rot, opcoes, numInput, janela, aviso, confirmar, listaBonita, linhas} from './util.js';
import {ICONES} from './icones.js';
import {recarregar} from './app.js';

const ICO = {app: 'oportunidade', sistema: 'painel', site: 'visao', jogo: 'funil', documento: 'propostas', manutencao: 'config', hospedagem: 'conta', consultoria: 'nota', outro: 'mais'};

export async function render(el){
  const ss = await servicos(true);
  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Operação</div><h1>Serviços</h1>
      <div class="dir"><button class="btn prim" id="novo"><span class="ic">${ICONES.mais_novo}</span>Serviço</button></div>
      <div class="sub">O que a Rumëyart oferece. Cada serviço já traz descrição, entregas, prazo e preço para montar a proposta em segundos.</div></div>
    <div class="serv-grade">${ss.map(s => `<div class="serv ${s.ativo ? '' : 'inativo'}">
      <div style="display:flex;align-items:center;gap:.6rem;"><span class="ic">${ICONES[ICO[s.categoria]] || ICONES.servicos}</span><span class="pill">${rot(CATEGORIAS, s.categoria)}</span>${s.ativo ? '' : '<span class="tag expirada">inativo</span>'}
        <button class="btn fantasma peq" data-id="${s.id}" style="margin-left:auto;">Editar</button></div>
      <h3>${esc(s.nome)}</h3>
      ${s.subtitulo ? `<div class="muted" style="font-size:13.5px;">${esc(s.subtitulo)}</div>` : ''}
      ${(s.entregaveis || []).length ? `<ul>${s.entregaveis.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
      <div class="preco">${Number(s.preco_base) ? `<div><div class="eyebrow">a partir de</div><b>${brl(s.preco_base)}</b></div>` : ''}${Number(s.mensal) ? `<div><div class="eyebrow">mensal</div><b>${brl(s.mensal)}</b></div>` : ''}${s.prazo ? `<div style="margin-left:auto;text-align:right;"><div class="eyebrow">prazo</div><span style="font-size:13px;">${esc(s.prazo)}</span></div>` : ''}</div>
    </div>`).join('') || '<div class="vazio">Nenhum serviço cadastrado.</div>'}</div>`;
  el.querySelector('#novo').onclick = async () => { if(await editar()){ limparCache('servicos'); aviso('Serviço criado.'); recarregar(); } };
  el.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => { const r = await editar(ss.find(s => s.id === b.dataset.id)); if(r){ limparCache('servicos'); aviso(r === 'apagado' ? 'Serviço apagado.' : 'Serviço salvo.'); recarregar(); } });
}

function editar(s){
  const x = s || {categoria: 'app', ativo: true, entregaveis: [], ordem: 100};
  return janela({titulo: s ? 'Editar serviço' : 'Novo serviço', larga: true, corpo: `
    <div class="grade2"><div class="campo"><label class="rot" for="s_nome">Nome *</label><input type="text" id="s_nome" value="${esc(x.nome)}"></div>
      <div class="campo"><label class="rot" for="s_cat">Categoria</label><select id="s_cat">${opcoes(CATEGORIAS, x.categoria)}</select></div></div>
    <div class="campo"><label class="rot" for="s_sub">Frase curta</label><input type="text" id="s_sub" value="${esc(x.subtitulo)}"></div>
    <div class="campo"><label class="rot" for="s_desc">Descrição (vai em "O que vamos construir")</label><textarea id="s_desc">${esc(x.descricao)}</textarea></div>
    <div class="campo"><label class="rot" for="s_ent">Entregas</label><textarea id="s_ent">${esc((x.entregaveis || []).join('\n'))}</textarea></div>
    <div class="grade4"><div class="campo"><label class="rot" for="s_preco">Preço base (R$)</label><input type="number" id="s_preco" min="0" step="50" value="${x.preco_base || ''}"></div>
      <div class="campo"><label class="rot" for="s_men">Mensal (R$)</label><input type="number" id="s_men" min="0" step="10" value="${x.mensal || ''}"></div>
      <div class="campo"><label class="rot" for="s_prazo">Prazo</label><input type="text" id="s_prazo" value="${esc(x.prazo)}" placeholder="30 a 45 dias"></div>
      <div class="campo"><label class="rot" for="s_ordem">Ordem</label><input type="number" id="s_ordem" value="${x.ordem ?? 100}"></div></div>
    <label class="chk"><input type="checkbox" id="s_ativo" ${x.ativo ? 'checked' : ''}> Ativo (aparece nas propostas)</label>`,
    aoAbrir: ctx => listaBonita(ctx.el.querySelector('#s_ent'), {placeholder: 'Ex.: Protótipo navegável'}),
    botoes: [...(s ? [{texto: 'Apagar', classe: 'perigo', acao: async () => { if(!(await confirmar('Apagar serviço', 'Propostas antigas não mudam (guardam uma cópia). Se quiser só esconder, desmarque "Ativo".', 'Apagar', 'perigo'))) return false; await q.apaga(T.servicos, s.id); return 'apagado'; }}] : []),
      {texto: 'Cancelar'}, {texto: 'Salvar', classe: 'prim', acao: async ctx => {
        const row = {nome: ctx.valor('#s_nome'), categoria: ctx.valor('#s_cat'), subtitulo: ctx.valor('#s_sub') || null, descricao: ctx.valor('#s_desc') || null,
          entregaveis: linhas(ctx.el.querySelector('#s_ent').value), preco_base: numInput(ctx.valor('#s_preco')), mensal: numInput(ctx.valor('#s_men')),
          prazo: ctx.valor('#s_prazo') || null, ordem: parseInt(ctx.valor('#s_ordem'), 10) || 100, ativo: ctx.valor('#s_ativo')};
        if(row.nome.length < 2){ ctx.erro('Dê um nome ao serviço.'); return false; }
        return s ? q.altera(T.servicos, s.id, row) : q.cria(T.servicos, row);
      }}]});
}
