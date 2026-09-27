// O que acontece quando alguém digita um item que ainda não existe numa lista (data-add="...")
import {q, T, categorias, fornecedores, servicos, contas} from './db.js';
import {registrarCriador} from './combo.js';
import {aviso} from './util.js';

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// texto livre: o valor é o próprio texto (áreas, tipos, origens, unidades…)
registrarCriador('texto', async txt => txt ? {value: cap(txt), label: cap(txt)} : null);

registrarCriador('categoria', async (txt, sel) => {
  if(!txt) return null;
  const tipo = sel.dataset.tipo === 'receita' ? 'receita' : 'despesa';
  const row = await q.cria(T.categorias, {nome: cap(txt), tipo, subs: [], cor: tipo === 'receita' ? '#2566A8' : '#E0703A'});
  (await categorias()).push(row);
  return {value: row.id, label: row.nome};
});

registrarCriador('sub', async (txt, sel) => {
  if(!txt) return null;
  const raiz = sel.closest('.janela') || document;
  const catSel = raiz.querySelector(sel.dataset.catDe || '#l_cat');
  const cats = await categorias(), c = cats.find(x => x.id === catSel?.value);
  if(!c){ aviso('Escolha a categoria primeiro.'); return null; }
  const nome = cap(txt);
  const subs = [...(c.subs || [])]; if(!subs.includes(nome)) subs.push(nome);
  await q.altera(T.categorias, c.id, {subs}); c.subs = subs;
  return {value: nome, label: nome};
});

registrarCriador('fornecedor', async txt => {
  if(!txt) return null;
  const row = await q.cria(T.fornecedores, {nome: cap(txt)});
  (await fornecedores()).push(row);
  return {value: row.id, label: row.nome};
});

registrarCriador('recurso', async (txt, sel) => {
  if(!txt) return null;
  const row = await q.cria(T.recursos, {nome: cap(txt)});
  const o = new Option(row.nome, row.id); o.dataset.u = row.unidade || 'un'; sel.insertBefore(o, null);
  return {value: row.id, label: row.nome};
});

registrarCriador('servico', async txt => {
  if(!txt) return null;
  const row = await q.cria(T.servicos, {nome: cap(txt), categoria: 'outro'});
  (await servicos()).push(row);
  return {value: row.id, label: row.nome};
});

registrarCriador('conta', async txt => {
  if(!txt) return null;
  const row = await q.cria(T.contas, {apelido: cap(txt)});
  (await contas()).push(row);
  return {value: row.id, label: row.apelido};
});

registrarCriador('cliente', async txt => {
  const {cliente} = await import('./forms.js');
  const c = await cliente(null, {nome: txt ? txt.replace(/\b\p{L}/gu, m => m.toUpperCase()) : ''});
  return c ? {value: c.id, label: c.nome, aviso: false} : null;
});
