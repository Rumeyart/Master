// Próximos passos: a lista de "o que fazer" e o texto pronto que vai para o cliente em cada um.
// Os textos usam linguagem neutra (servem para qualquer pessoa) e chamam o cliente pelo primeiro nome.
// Variáveis: {nome} primeiro nome do cliente · {projeto} nome do projeto · {responsavel} quem assina (Configurações → Empresa)
import {config} from './db.js';
import {primeiroNome} from './util.js';

export const VARIAVEIS_PASSOS = [['{nome}', 'primeiro nome do cliente'], ['{projeto}', 'nome do projeto'], ['{responsavel}', 'seu nome']];

export const PASSOS_PADRAO = [
  {titulo: 'Responder pedido do site', texto: 'Olá, {nome}! Aqui é {responsavel}, da Rumëyart. Recebi a sua ideia pelo site e quero entender melhor o que você imagina para {projeto}. Podemos conversar por uns 20 minutos esta semana? Me diga o dia e o horário que ficam melhores para você.'},
  {titulo: 'Marcar conversa de levantamento', texto: 'Oi, {nome}! Para desenhar {projeto} do jeito certo, quero fazer uma conversa de levantamento: entender a sua rotina, o que funciona hoje e o que precisa mudar. Leva cerca de 40 minutos, por vídeo ou ligação. Qual destes horários fica melhor: [dia e hora] ou [dia e hora]?'},
  {titulo: 'Enviar protótipo', texto: 'Oi, {nome}! O protótipo de {projeto} está pronto para você navegar: [link]. Explore à vontade, faça o caminho do dia a dia e anote o que parecer estranho ou estiver faltando. As suas impressões agora são o que deixa a versão final certeira.'},
  {titulo: 'Enviar proposta', texto: 'Oi, {nome}! Preparei a proposta de {projeto} com tudo o que conversamos: o que vamos construir, as etapas, o prazo e o investimento. Vou mandar o PDF aqui. Se algo não fizer sentido ou se quiser ajustar algum ponto, é só me falar.'},
  {titulo: 'Cobrar resposta da proposta', texto: 'Oi, {nome}, tudo bem por aí? Passando para saber se deu para olhar a proposta de {projeto}. Se ficou alguma dúvida ou se quiser mudar algum ponto, posso ajustar sem problema.'},
  {titulo: 'Enviar contrato', texto: 'Oi, {nome}! Segue o contrato de {projeto}, com tudo o que combinamos na proposta. Leia com calma e, se estiver tudo certo, é só assinar e me devolver por aqui. Assim já reservo a agenda para começarmos.'},
  {titulo: 'Cobrar entrada', texto: 'Oi, {nome}! Para darmos início a {projeto}, falta só a entrada combinada. A chave Pix é [chave Pix]. Assim que o pagamento cair, aviso por aqui e já começo a primeira etapa.'},
  {titulo: 'Cobrar parcela', texto: 'Oi, {nome}! Passando para lembrar da parcela de {projeto} com vencimento em [data]. Se o pagamento já foi feito, pode desconsiderar esta mensagem. Qualquer dúvida, estou por aqui.'},
  {titulo: 'Publicar versão 1', texto: '{nome}, chegou o dia: a primeira versão de {projeto} está no ar! O link é [link]. Explore com calma e me conte as primeiras impressões. Nos próximos dias sigo acompanhando de perto para ajustar o que for preciso.'},
  {titulo: 'Treinamento com o cliente', texto: 'Oi, {nome}! Vamos marcar o treinamento de {projeto}? Em cerca de uma hora mostro cada função na prática e deixo tudo pronto para você e para quem mais for usar. Qual dia fica melhor?'},
  {titulo: 'Pedir depoimento', texto: 'Oi, {nome}! Foi muito bom construir {projeto} em parceria. Se puder, me conte em poucas linhas como tem sido a experiência até aqui. Com a sua autorização, gostaria de compartilhar esse depoimento no site da Rumëyart.'},
  {titulo: 'Renovar domínio', texto: 'Oi, {nome}! O domínio de {projeto} vence em breve e precisa ser renovado para continuar no ar. Posso cuidar disso; o valor da renovação é [valor]. Posso seguir?'}
];

let cache = null, responsavel = '';
export async function carregarPassos(forcar){
  try{
    const cfg = await config(forcar);
    cache = Array.isArray(cfg?.passos) && cfg.passos.length ? cfg.passos : PASSOS_PADRAO;
    responsavel = primeiroNome(cfg?.empresa?.responsavel) || '';
  }catch(e){ cache = PASSOS_PADRAO; }
  return cache;
}
export const passos = () => cache || PASSOS_PADRAO;

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const acharPasso = titulo => { const t = norm(titulo); return t ? passos().find(p => norm(p.titulo) === t) : null; };

// nome de projeto que cabe numa frase (títulos automáticos do site ficam de fora)
const projetoLegivel = p => p && p.length <= 60 && !/[…·]/.test(p) ? p : '';

// monta o texto trocando as variáveis; sem nome de projeto, usa "o seu projeto" com a preposição certa
export function preencherPasso(texto, {nome, projeto} = {}){
  const pj = projetoLegivel(projeto);
  let t = String(texto || '');
  if(!pj) t = t.replace(/\bde \{projeto\}/g, 'do seu projeto').replace(/\ba \{projeto\}/g, 'ao seu projeto').replace(/\bem \{projeto\}/g, 'no seu projeto').replace(/\{projeto\}/g, 'o seu projeto');
  else t = t.replace(/\{projeto\}/g, pj);
  const pn = primeiroNome(nome);
  t = pn ? t.replace(/\{nome\}/g, pn) : t.replace(/^\{nome\},\s*/, '').replace(/,?\s*\{nome\}/g, '');
  return t.replace(/\{responsavel\}/g, responsavel || 'a equipe').replace(/\s{2,}/g, ' ').trim();
}
export const mensagemDoPasso = (titulo, dados) => { const p = acharPasso(titulo); return p && p.texto ? preencherPasso(p.texto, dados) : null; };
