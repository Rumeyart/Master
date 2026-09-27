// Estado das notificações (o que já foi visto fica guardado neste aparelho)
import {sb, T} from './db.js';
import {NOVIDADES} from './novidades.js';

const K_NOV = 'rumeyart-novidades-vistas', K_ATV = 'rumeyart-atividade-vista';
const ler = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const gravar = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };

// blocos de novidades ainda não vistos (na primeira vez, só o mais recente)
export function novidadesNaoVistas(){
  const i = NOVIDADES.findIndex(n => n.id === ler(K_NOV));
  return i < 0 ? NOVIDADES.slice(0, 1) : NOVIDADES.slice(0, i);
}
// desde quando a atividade conta como nova (na primeira vez, a partir de agora)
export function atividadeVistaEm(){
  let v = ler(K_ATV);
  if(!v){ v = new Date().toISOString(); gravar(K_ATV, v); }
  return v;
}
// quantas coisas novas: blocos de novidades + atividade feita por outras pessoas ou pelo site
export async function contarNotificacoes(email){
  const nov = new Set(novidadesNaoVistas().map(n => n.data)).size;
  let atv = 0;
  try{
    // conta por acontecimento (um pedido do site que cria cliente, projeto e tarefa conta 1; uma importação de extrato conta 1)
    let c = sb.from(T.atividade).select('criado_em,autor').gt('criado_em', atividadeVistaEm()).order('criado_em', {ascending: false}).limit(200);
    if(email) c = c.or(`autor.is.null,autor.neq."${email.replace(/"/g, '')}"`);
    const {data} = await c;
    let ant = null;
    (data || []).forEach(r => { if(!ant || ant.autor !== r.autor || Math.abs(new Date(ant.criado_em) - new Date(r.criado_em)) > 4000) atv++; ant = r; });
  }catch(e){}
  return {nov, atv, total: nov + atv};
}
export function marcarVisto(){ gravar(K_NOV, NOVIDADES[0].id); gravar(K_ATV, new Date().toISOString()); }
