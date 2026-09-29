// Busca geral
import {q, T} from './db.js';
import {esc, brl, brlC, dataCurta, etapaNome, statusNome} from './util.js';
import {ICONES} from './icones.js';

export async function render(el, {q: termo}){
  const t = String(termo || '').trim();
  const s = t.replace(/[%,()]/g, ' ').trim(), like = `%${s}%`, dig = s.replace(/\D/g, '');
  if(s.length < 2){ el.innerHTML = '<div class="card"><div class="vazio">Digite pelo menos 2 letras na busca.</div></div>'; return; }
  const [cs, ops, peds, props, ks, ls, ts, fs] = await Promise.all([
    q.lista(T.clientes, 'id,nome,marca,whatsapp,cidade,arquivado', x => x.or(`nome.ilike.${like},marca.ilike.${like},email.ilike.${like},cidade.ilike.${like}${dig.length >= 4 ? `,whatsapp_digits.ilike.%${dig}%` : ''}`).limit(20)),
    q.lista(T.oport, 'id,titulo,etapa,valor,cliente_id,cliente:rumeyart_clientes(nome)', x => x.ilike('titulo', like).limit(15)),
    q.lista(T.pedidos, 'id,numero,nome,ideia,status', x => x.or(`nome.ilike.${like},ideia.ilike.${like}`).order('criado_em', {ascending: false}).limit(15)),
    q.lista(T.propostas, 'id,numero,titulo,status,total,cliente:rumeyart_clientes(nome)', x => (/^\d+$/.test(s) ? x.eq('numero', +s) : x.ilike('titulo', like)).limit(15)),
    q.lista(T.contratos, 'id,numero,titulo,assinado_em,cliente:rumeyart_clientes(nome)', x => (/^\d+$/.test(s) ? x.eq('numero', +s) : x.ilike('titulo', like)).limit(10)),
    q.lista(T.lanc, 'id,tipo,descricao,valor_centavos,data,status', x => x.ilike('descricao', like).order('data', {ascending: false}).limit(15)),
    q.lista(T.tarefas, 'id,titulo,vence_em,concluida,cliente_id', x => x.ilike('titulo', like).eq('concluida', false).limit(10)),
    q.lista(T.fornecedores, 'id,nome,cidade', x => x.ilike('nome', like).limit(10))
  ]);
  const grupo = (tit, ic, itens) => itens ? `<div class="card res-grupo"><h3><span class="ic" style="width:20px;height:20px;display:inline-flex;color:var(--laranja-2);">${ICONES[ic]}</span>${tit}</h3>${itens}</div>` : '';
  const item = (href, b, sp, vl = '') => `<a class="item-lista" href="${href}" style="color:inherit;text-decoration:none;"><div class="tx"><b>${b}</b><span>${sp}</span></div>${vl ? `<span class="vl">${vl}</span>` : ''}</a>`;
  const total = cs.length + ops.length + peds.length + props.length + ks.length + ls.length + ts.length + fs.length;
  el.innerHTML = `
    <div class="cab"><div class="eyebrow">Busca</div><h1>“${esc(t)}”</h1><div class="sub">${total} ${total === 1 ? 'resultado' : 'resultados'}</div></div>
    ${total ? '' : '<div class="card"><div class="vazio">Nada encontrado. Tente o nome do cliente, parte do WhatsApp, o número da proposta ou uma palavra da ideia.</div></div>'}
    <div class="cols">
      <div>
        ${grupo('Clientes', 'clientes', cs.map(c => item(`#/cliente/${c.id}`, esc(c.nome) + (c.arquivado ? ' <span class="tag expirada">arquivado</span>' : ''), esc([c.marca, c.whatsapp, c.cidade].filter(Boolean).join(' · ')))).join(''))}
        ${grupo('Pedidos do site', 'pedidos', peds.map(p => item(`#/pedidos?f=todos&id=${p.id}`, `Nº ${p.numero} · ${esc(p.nome)}`, esc(String(p.ideia).slice(0, 110)))).join(''))}
        ${grupo('Projetos', 'funil', ops.map(o => item(`#/cliente/${o.cliente_id}?op=${o.id}`, esc(o.titulo), `${esc(o.cliente?.nome || '')} · ${etapaNome(o.etapa)}`, Number(o.valor) ? brl(o.valor) : '')).join(''))}
        ${grupo('Tarefas', 'tarefas', ts.map(x => item(x.cliente_id ? `#/cliente/${x.cliente_id}` : '#/tarefas', esc(x.titulo), dataCurta(x.vence_em.slice(0, 10)))).join(''))}
      </div>
      <div>
        ${grupo('Propostas', 'propostas', props.map(p => item(`#/proposta/${p.id}`, `Nº ${p.numero} · ${esc(p.cliente?.nome || '')}`, `${esc(p.titulo || '')} · ${statusNome(p.status)}`, brl(p.total))).join(''))}
        ${grupo('Contratos', 'contratos', ks.map(k => item(`#/contrato/${k.id}`, `Nº ${k.numero} · ${esc(k.cliente?.nome || '')}`, `${esc(k.titulo)} · ${k.assinado_em ? 'assinado' : 'aguardando assinatura'}`)).join(''))}
        ${grupo('Financeiro', 'financeiro', ls.map(l => item(`#/financeiro?aba=lancamentos&mes=${l.data.slice(0, 7)}`, esc(l.descricao), `${dataCurta(l.data)} · ${l.status === 'pago' ? 'pago' : 'pendente'}`, (l.tipo === 'receita' ? '+' : '−') + brlC(l.valor_centavos))).join(''))}
        ${grupo('Fornecedores', 'fornecedor', fs.map(f => item('#/compras?aba=fornecedores', esc(f.nome), esc(f.cidade || ''))).join(''))}
      </div>
    </div>`;
}
