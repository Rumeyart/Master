// Lista de clientes
import {q, T, clientes} from './db.js';
import {esc, haQuanto, etapaNome} from './util.js';
import {ICONES} from './icones.js';
import * as forms from './forms.js';
import {ir} from './app.js';

export async function render(el, {arq}){
  const verArq = arq === '1';
  const [cs, ops] = await Promise.all([clientes(verArq), q.lista(T.oport, 'id,cliente_id,etapa,valor,atualizado_em', x => x.eq('arquivado', false))]);
  const lista = cs.filter(c => verArq ? c.arquivado : !c.arquivado);
  const porCli = {}; ops.forEach(o => (porCli[o.cliente_id] ||= []).push(o));
  const ultimaEtapa = id => (porCli[id] || []).sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em))[0]?.etapa;

  el.innerHTML = `
    <div class="cab"><h1>Clientes</h1>
      <div class="dir"><input type="search" id="fBusca" placeholder="Buscar" style="width:13rem;border-radius:999px;"><button class="btn prim" id="novo"><span class="ic">${ICONES.mais_novo}</span>Cliente</button></div>
      <div class="sub">${lista.length} ${verArq ? 'arquivados' : 'ativos'} · <a href="#/clientes${verArq ? '' : '?arq=1'}">${verArq ? 'ver ativos' : 'ver arquivados'}</a></div></div>
    <div class="card" style="padding-top:6px;">
      ${lista.length ? `<table class="tabela"><thead><tr><th>Cliente</th><th>Projeto</th><th>Último contato</th></tr></thead><tbody>
        ${lista.map(c => { const e = ultimaEtapa(c.id); return `<tr class="link" data-id="${c.id}" data-o="${c.origem}" data-t="${c.tipo}" data-busca="${esc(`${c.nome} ${c.marca || ''} ${c.whatsapp_digits || ''} ${c.cidade || ''} ${c.email || ''}`.toLowerCase())}">
          <td data-l=""><div class="nm">${esc(c.nome)}</div><div class="sm">${[c.marca, c.whatsapp].filter(Boolean).map(esc).join(' · ')}</div></td>
          <td data-l="Projeto">${e ? `<span class="tag ${e}">${etapaNome(e)}</span>${(porCli[c.id] || []).length > 1 ? ` <span class="sm">+${porCli[c.id].length - 1}</span>` : ''}` : '<span class="muted">—</span>'}</td>
          <td data-l="Contato" class="sm">${c.ultimo_contato_em ? haQuanto(c.ultimo_contato_em) : '—'}</td></tr>`; }).join('')}
      </tbody></table>` : `<div class="vazio">${verArq ? 'Nenhum cliente arquivado.' : 'Nenhum cliente ainda. Os pedidos do site entram aqui sozinhos, ou cadastre pelo botão Cliente.'}</div>`}
    </div>`;

  const filtrar = () => {
    const t = el.querySelector('#fBusca').value.trim().toLowerCase();
    el.querySelectorAll('tr[data-id]').forEach(r => r.classList.toggle('hidden', t && !r.dataset.busca.includes(t)));
  };
  el.querySelector('#fBusca').addEventListener('input', filtrar);
  el.querySelectorAll('tr[data-id]').forEach(r => r.addEventListener('click', e => { if(e.target.closest('[data-stop]')) return; ir('cliente/' + r.dataset.id); }));
  el.querySelector('#novo').onclick = async () => { const c = await forms.cliente(); if(c) ir('cliente/' + c.id); };
}
