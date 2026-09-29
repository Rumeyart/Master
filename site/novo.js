const IMG = {"ac1": "img/projetos/ac1.webp", "ac2": "img/projetos/ac2.webp", "ac3": "img/projetos/ac3.webp", "ac4": "img/projetos/ac4.webp", "grana_dashboard": "img/projetos/grana_dashboard.webp", "grana_transacoes": "img/projetos/grana_transacoes.webp", "grana_cartoes": "img/projetos/grana_cartoes.webp", "grana_cofrinhos": "img/projetos/grana_cofrinhos.webp", "grana_metas": "img/projetos/grana_metas.webp", "grana_agenda": "img/projetos/grana_agenda.webp", "grana_relatorios": "img/projetos/grana_relatorios.webp", "cm_d_home": "img/projetos/cm_d_home.webp", "cm_d_Regras": "img/projetos/cm_d_Regras.webp", "cm_m_Regras": "img/projetos/cm_m_Regras.webp", "sb1": "img/projetos/sb1.webp", "sb2": "img/projetos/sb2.webp", "sb3": "img/projetos/sb3.webp", "sb4": "img/projetos/sb4.webp"};
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const WA_NUMBER='5511990234473';
/* ---------------- projetos ---------------- */
const LOGOS={
  acervo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 3v18M10 3v18M14 3v18M18 3v18M4 7h16M4 11h16M4 15h16"/><circle cx="10" cy="9" r="1.5" fill="currentColor"/><circle cx="14" cy="13" r="1.5" fill="currentColor"/></svg>',
  grana:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5c0-5 4.5-9 10-9 4 0 7.4 1.7 9 4.2l2.5-.9-1.3 3c.4.9.7 1.9.7 3 0 5-5 9-11 9S4 18.5 4 13.5Z" transform="translate(-1.5 0) scale(.94)"/><circle cx="9.4" cy="12.2" r="1" fill="currentColor" stroke="none"/><path d="M8.4 5.2 6.5 2.6"/></svg>',
  cacadores:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l11 11M20 3 9 14"/><path d="M13 16.5l4.5-4.5M6.5 12l4.5 4.5"/><path d="M16 16l4 4M8 16l-4 4"/></svg>',
  simbiosys:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21 12 4l8 17M7.4 14h9.2M12 4v17"/><path d="M12 4c1.5-1.8 3.6-2.2 5-1.6-.6 1.6-2.6 2.4-5 1.6" /></svg>'
};
const PROJECTS=[
 {id:'acervo',name:'Acervo dos Rezos',tag:'Cifras e letras',c:'#B7791F',
  sum:'Acervo coletivo de cifras e letras, com busca rápida, tom ajustável e rolagem automática para tocar sem soltar o instrumento.',
  slides:[
   {img:'ac1',k:'phone',il:1,t:'Cifra que acompanha a mão',d:'Transposição de tom, capotraste e rolagem automática na velocidade da música.'},
   {img:'ac2',k:'phone',il:1,t:'Acervo que cresce com o grupo',d:'Busca por nome, trecho ou tom, favoritos, listas e níveis para quem contribui.'},
   {img:'ac3',k:'phone',il:1,t:'Editor de acordes',d:'Diagramas personalizados para registrar a forma de tocar de cada grupo.'},
   {img:'ac4',k:'phone',il:1,t:'Importação por PDF, foto ou texto',d:'Editores aprovam cada cifra antes de ela entrar para todos.'}
  ]},
 {id:'grana',name:'Grana a Dois',tag:'Finanças do casal',c:'#E0661A',
  sum:'Finanças do casal em um só lugar: o que é de cada um, o que é compartilhado e para onde o dinheiro está indo.',
  slides:[
   {img:'grana_dashboard',k:'phone',t:'Lançamento em linguagem natural',d:'Escreva “Uber 32,90 ontem” e valor, data e categoria entram sozinhos.'},
   {img:'grana_transacoes',k:'phone',t:'Individual e compartilhado',d:'Lançamentos de cada um e do casal lado a lado, com privacidade respeitada.'},
   {img:'grana_cartoes',k:'phone',t:'Cartões sob controle',d:'Fatura, limite, fechamento, vencimento e histórico de pagamentos.'},
   {img:'grana_cofrinhos',k:'phone',t:'Cofrinhos vinculados',d:'Reservas para objetivos, que podem funcionar como limite de um cartão.'},
   {img:'grana_metas',k:'phone',t:'Metas com prazo',d:'Quanto falta, até quando e quanto guardar por mês.'},
   {img:'grana_agenda',k:'phone',t:'Agenda financeira',d:'Saldo projetado para o fim do mês e vencimentos dos próximos 7 dias.'},
   {img:'grana_relatorios',k:'phone',t:'Relatórios e exportação',d:'Visão mensal ou anual. O app se instala no celular como qualquer outro.'}
  ]},
 {id:'cacadores',name:'Caçadores de Monstros',tag:'Jogo de cartas online',c:'#6E8A1F',
  sum:'Jogo de cartas para jogar com amigos, cada um no seu aparelho, com as regras aplicadas automaticamente pela mesa.',
  slides:[
   {img:'cm_d_home',k:'desk',t:'Uma conta por jogador',d:'Login individual e mão privada: cada um vê apenas as próprias cartas.'},
   {img:'cm_d_Regras',k:'desk',t:'Regras aplicadas pelo jogo',d:'Fases, votação, pedidos de intervenção e ajuda com aceite, tudo mediado pela mesa.'},
   {img:'cm_m_Regras',k:'phone',t:'Funciona no celular',d:'A turma joga junta mesmo com cada um em sua casa.'}
  ]},
 {id:'simbiosys',name:'Simbiosys',tag:'Catálogo e propostas',c:'#3F7A3A',
  sum:'Para uma marcenaria de playgrounds: catálogo com pedido de orçamento e painel que transforma cada pedido em proposta.',
  slides:[
   {img:'sb1',k:'phone',il:1,t:'Catálogo de modelos',d:'Apresentação cuidadosa dos produtos, já com o pedido de orçamento.'},
   {img:'sb2',k:'phone',il:1,t:'Pedido em 2 minutos',d:'O cliente informa espaço, idades e desejos. Tudo chega organizado.'},
   {img:'sb3',k:'phone',il:1,t:'Painel de pedidos',d:'Cada pedido entra na lista com status e abre uma proposta pré-preenchida.'},
   {img:'sb4',k:'phone',il:1,t:'Proposta numerada em PDF',d:'“Proposta Nº · Cliente · Modelo”, com valores ajustáveis.'}
  ]}
];


/* ---------------- dados extras dos projetos (links públicos e categorias) ---------------- */
const EXTRA={
  acervo:{url:'https://rumeyarezo.github.io/acervo-dos-rezos/',cat:'Música · app',shots:['ac1','ac2']},
  grana:{url:'https://grana-a-dois-beta.netlify.app/',cat:'Finanças · app',shots:['grana_dashboard','grana_metas']},
  simbiosys:{url:'https://simbiosys.carpintaria.workers.dev/',cat:'Catálogo e propostas · sistema',shots:['sb1','sb3']},
  cacadores:{url:'https://munchkin.dosbrabos.workers.dev/',cat:'Jogo de cartas online',shots:['cm_d_home'],desk:true}
};
const ORDEM=['acervo','grana','simbiosys','cacadores'];
const P_BY=Object.fromEntries(PROJECTS.map((p,i)=>[p.id,{...p,i}]));
const ico=(id,c)=>`<span class="ai" style="background:${c}">${LOGOS[id]}</span>`;

/* ---------------- carregamento ---------------- */
const loader=$('#loader');
let visto=false; try{ visto=sessionStorage.getItem('rmy-visto')==='1'; sessionStorage.setItem('rmy-visto','1'); }catch(e){}
if(visto) loader.classList.add('rapido');
const t0=performance.now();
function pronto(){
  const espera=Math.max(0,(visto?450:1500)-(performance.now()-t0));
  setTimeout(()=>{ loader.classList.add('out'); document.documentElement.classList.add('pronto'); setTimeout(()=>loader.remove(),1100); },espera);
}
if(RM){ loader.remove(); document.documentElement.classList.add('pronto'); }
else if(document.readyState==='complete') pronto(); else addEventListener('load',pronto);
setTimeout(()=>{ if(document.body.contains(loader)) pronto(); },3500);

/* ---------------- rolagem suave ---------------- */
let lenis=null;
if(!RM && window.Lenis && matchMedia('(pointer:fine)').matches){
  lenis=new Lenis({lerp:.11,wheelMultiplier:.95});
  const raf=t=>{ lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a) return;
  const id=a.getAttribute('href'); if(id.length<2) return;
  const el=document.querySelector(id); if(!el) return;
  e.preventDefault(); fecharMenu();
  if(lenis) lenis.scrollTo(el,{offset:id==='#topo'?0:-20,duration:1.4}); else el.scrollIntoView({behavior:RM?'auto':'smooth'});
  history.replaceState(null,'',id);
});

/* ---------------- cabeçalho e menu ---------------- */
const hdr=$('#hdr'), menuBtn=$('#menuBtn'), mega=$('#mega');
function fecharMenu(){ mega.classList.remove('on'); menuBtn.setAttribute('aria-expanded','false'); menuBtn.setAttribute('aria-label','Abrir menu'); }
menuBtn.addEventListener('click',()=>{ const on=!mega.classList.contains('on'); mega.classList.toggle('on',on); menuBtn.setAttribute('aria-expanded',on); menuBtn.setAttribute('aria-label',on?'Fechar menu':'Abrir menu'); hdr.classList.remove('esconde'); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') fecharMenu(); });
document.addEventListener('pointerdown',e=>{ if(mega.classList.contains('on') && !e.target.closest('.hdr-l')) fecharMenu(); });
const appLinks=ORDEM.map(id=>{ const p=P_BY[id]; return `<a href="${EXTRA[id].url}" target="_blank" rel="noopener">${ico(id,p.c)}<span><b>${p.name}</b><small>${EXTRA[id].cat}</small></span><span class="ext">↗</span></a>`; }).join('');
$('#megaApps').innerHTML=appLinks;
$('#footApps').innerHTML=ORDEM.map(id=>`<a href="${EXTRA[id].url}" target="_blank" rel="noopener">${P_BY[id].name} ↗</a>`).join('');
let ultY=0;
function cabecalho(y){ if(mega.classList.contains('on')) return; if(y>ultY+6 && y>innerHeight*.6) hdr.classList.add('esconde'); else if(y<ultY-6) hdr.classList.remove('esconde'); ultY=y; }

/* ---------------- cursor com rótulo ---------------- */
const cur=$('#cur'), curTxt=$('#curTxt');
let cx=-100, cy=-100, tx=-100, ty=-100;
if(matchMedia('(pointer:fine)').matches){
  addEventListener('pointermove',e=>{ tx=e.clientX; ty=e.clientY; const d=e.target.closest('[data-cursor]'); if(d && !document.getElementById('gal').classList.contains('open')){ curTxt.textContent=d.dataset.cursor; cur.classList.add('on'); } else cur.classList.remove('on'); },{passive:true});
}

/* ---------------- fios em WebGL no topo ---------------- */
const cv=$('#gl'), sym=$('#heroSym'), hero=$('.hero');
let gl=null, prog=null, U={}, heroVis=true, mX=.7, mY=.5, mXs=.7, mYs=.5;
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=(deriv)=>`${deriv?'#extension GL_OES_standard_derivatives : enable\n':''}precision mediump float;
uniform vec2 uR;uniform float uT;uniform vec2 uM;uniform vec2 uS;uniform float uSc;
vec3 pal(float x){vec3 a=vec3(.878,.439,.227),b=vec3(.784,.341,.494),c=vec3(.478,.267,.4),d=vec3(.145,.4,.659),e=vec3(.486,.769,.941);
 x=clamp(x,0.,1.);if(x<.25)return mix(a,b,x/.25);if(x<.5)return mix(b,c,(x-.25)/.25);if(x<.75)return mix(c,d,(x-.5)/.25);return mix(d,e,(x-.75)/.25);}
void main(){
 vec2 uv=gl_FragCoord.xy/uR;float asp=uR.x/uR.y;
 vec2 p=vec2(uv.x*asp,uv.y);vec2 s=vec2(uS.x*asp,uS.y);vec2 m=vec2(uM.x*asp,uM.y);
 vec2 d=p-s;float r=length(d);float t=uT;
 float f=p.y+.05*sin(p.x*2.1+t*.21)+.024*sin(p.x*5.7-t*.29+p.y*2.3)+uSc*.35;
 f+=.1*d.y/(r*r*16.+.32);
 vec2 dm=p-m;f+=.03*exp(-dot(dm,dm)*10.)*sin(t*.9+p.x*4.);
 float g=f*24.;float k=min(fract(g),1.-fract(g));
 float w=${deriv?'fwidth(g)*1.15':'24.*1.8/uR.y'};
 float line=1.-smoothstep(0.,w,k);
 float fade=(smoothstep(-.05,.6,uv.x)*.75+.25)*(smoothstep(1.3,.1,r)*.75+.25);
 vec3 bg=vec3(.961,.937,.902);
 vec3 col=pal(uv.x*.8+.1+.08*sin(g*.05+t*.12));
 vec3 c=mix(bg,col,line*fade*.62);
 c=mix(c,vec3(.95,.58,.36),exp(-r*r*10.)*.42);
 c=mix(c,vec3(.49,.77,.94),exp(-pow((r-.24)*8.,2.))*.1);
 float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 gl_FragColor=vec4(c+(n-.5)*.018,1.);
}`;
function iniciaGL(){
  try{ gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'}); }catch(e){}
  if(!gl){ $('#heroFallback').hidden=false; cv.remove(); return false; }
  const deriv=!!gl.getExtension('OES_standard_derivatives');
  const sh=(tp,src)=>{ const s=gl.createShader(tp); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try{
    prog=gl.createProgram(); gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS(deriv))); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw new Error('link');
  }catch(e){ console.warn('webgl',e); $('#heroFallback').hidden=false; cv.remove(); gl=null; return false; }
  gl.useProgram(prog);
  const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['uR','uT','uM','uS','uSc'].forEach(k=>U[k]=gl.getUniformLocation(prog,k));
  tamGL(); return true;
}
function tamGL(){ if(!gl) return; const d=Math.min(1.5,devicePixelRatio||1); const r=cv.getBoundingClientRect(); cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d); gl.viewport(0,0,cv.width,cv.height); }
function desenhaGL(now){
  if(!gl||!heroVis) return;
  const r=cv.getBoundingClientRect(), s=sym.getBoundingClientRect();
  const sx=(s.left+s.width/2-r.left)/r.width, sy=1-(s.top+s.height/2-r.top)/r.height;
  mXs+=(mX-mXs)*.05; mYs+=(mY-mYs)*.05;
  gl.uniform2f(U.uR,cv.width,cv.height); gl.uniform1f(U.uT,now/1000); gl.uniform2f(U.uM,mXs,1-mYs); gl.uniform2f(U.uS,sx,sy); gl.uniform1f(U.uSc,Math.min(1,scrollY/innerHeight));
  gl.drawArrays(gl.TRIANGLES,0,3);
}
const temGL=iniciaGL();
if('IntersectionObserver' in window) new IntersectionObserver(es=>{ heroVis=es[0].isIntersecting; },{rootMargin:'80px'}).observe(hero);
addEventListener('pointermove',e=>{ const r=hero.getBoundingClientRect(); mX=e.clientX/r.width; mY=(e.clientY-r.top)/r.height;
  if(!RM){ sym.style.setProperty('--px',((e.clientX/innerWidth-.5)*-18).toFixed(1)+'px'); sym.style.setProperty('--py',((e.clientY/innerHeight-.5)*-14).toFixed(1)+'px'); } },{passive:true});
if(RM && temGL) requestAnimationFrame(t=>desenhaGL(12000));

/* ---------------- faixa de projetos ---------------- */
const tk=$('#tkTrack');
const itensTk=[...ORDEM.map(id=>[id,P_BY[id].name,EXTRA[id].cat,P_BY[id].c]),['crm','CRM Rumëyart','Gestão de clientes','#16213A']];
const LOGO_CRM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M3.5 9h17M8 13h4M8 16h7"/></svg>';
const umaVolta=itensTk.map(([id,n,c,cor])=>`<span class="tk-item"><span class="ai" style="background:${cor}">${LOGOS[id]||LOGO_CRM}</span>${n} <small>${c}</small></span>`).join('');
tk.innerHTML=umaVolta+umaVolta+umaVolta;
let tkx=0, vel=0, yAnt=scrollY;

/* ---------------- revelar palavras (frase e títulos) ---------------- */
function splitWords(el){
  const out=[];
  const walk=node=>{ [...node.childNodes].forEach(ch=>{
    if(ch.nodeType===3){ const frag=document.createDocumentFragment();
      ch.textContent.split(/(\s+)/).forEach(part=>{ if(!part) return; if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
        const s=document.createElement('span'); s.className='w'; s.textContent=part; frag.appendChild(s); out.push(s); });
      node.replaceChild(frag,ch);
    } else if(ch.nodeType===1 && !ch.classList.contains('chip-img')) walk(ch);
    else if(ch.nodeType===1) out.push(ch);
  }); };
  walk(el); return out;
}
const reveals=$$('.reveal').map(el=>({el,words:splitWords(el)}));
function progresso(el,ini=.9,fim=.3){ const r=el.getBoundingClientRect(); const vh=innerHeight; return clamp((vh*ini-r.top)/(vh*ini-vh*fim)); }

/* ---------------- histórias fixas ---------------- */
const story=$('#fazemos'), sts=$$('.st',story), scs=$$('.scene',story), navs=$$('[data-nav]',story), frameTag=$('#frameTag');
const TAGS=['Biblioteca · possibilidades','Ajustes · ao vivo','Novidades · v1.2'];
let stAtual=0;
function mostraSt(i){ if(i===stAtual) return; stAtual=i; sts.forEach((s,k)=>s.classList.toggle('on',k===i)); scs.forEach((s,k)=>s.classList.toggle('on',k===i)); navs.forEach((n,k)=>n.classList.toggle('on',k===i)); frameTag.textContent=TAGS[i]; }
const LIB=[['Estudos','#2566A8','<path d="M4 6.5 12 3l8 3.5-8 3.5z"/><path d="M7 8.5v5c0 1.5 2.3 3 5 3s5-1.5 5-3v-5"/>'],
  ['Finanças','#E0703A','<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M3.5 10h17M8 14.5h3"/>'],
  ['Catálogo','#3F7A3A','<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'],
  ['Agenda','#7A4466','<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>'],
  ['Jogo','#6E8A1F','<path d="M7 9h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8z"/><path d="M8.5 11.5v3M7 13h3M15.5 12.5h.01M17 14h.01"/>'],
  ['Propostas','#B7791F','<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>']];
$('#lib').innerHTML=LIB.map(([n,c,p],i)=>`<div class="tl" style="transition-delay:${i*70}ms"><span class="bx" style="background:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>${n}</div>`).join('');
const libTiles=$$('#lib .tl'); let libI=0;
setInterval(()=>{ if(stAtual!==0||document.hidden) return; libTiles.forEach((t,k)=>t.classList.toggle('real',k===libI)); libI=(libI+1)%libTiles.length; },1300);

/* ajustes ao vivo */
const ph=$('#ph'), CORES=[['#E0703A','Laranja'],['#2566A8','Azul'],['#7A4466','Ameixa'],['#3F7A3A','Verde']];
$('#sw').innerHTML=CORES.map(([c,n],i)=>`<button type="button" style="--c:${c}" aria-label="${n}" aria-pressed="${i===0}" data-c="${c}"></button>`).join('');
let mexeu=false;
function cor(c){ ph.style.setProperty('--ac',c); $('#tnTema').style.setProperty('--ac',c); $$('#sw button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===c)); }
$$('#sw button').forEach(b=>b.addEventListener('click',()=>{ mexeu=true; cor(b.dataset.c); }));
$('#tnNome').addEventListener('input',e=>{ mexeu=true; $('#phNome').textContent=e.target.value||'Seu app'; });
$('#tnRaio').addEventListener('input',e=>{ mexeu=true; ph.style.setProperty('--rr',e.target.value+'px'); });
$('#tnTema').addEventListener('click',e=>{ mexeu=true; const on=e.currentTarget.getAttribute('aria-pressed')!=='true'; e.currentTarget.setAttribute('aria-pressed',on); ph.classList.toggle('escuro',on); });
let demo=0;
setInterval(()=>{ if(mexeu||stAtual!==1||document.hidden||RM) return; demo++; cor(CORES[demo%4][0]); if(demo%3===0){ const t=$('#tnTema'); const on=t.getAttribute('aria-pressed')!=='true'; t.setAttribute('aria-pressed',on); ph.classList.toggle('escuro',on); } const r=[14,24,6][demo%3]; $('#tnRaio').value=r; ph.style.setProperty('--rr',r+'px'); },1800);

/* ---------------- cartões e entradas ---------------- */
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); } }),{threshold:.25});
  $$('.sobe').forEach(el=>io.observe(el));
} else $$('.sobe').forEach(el=>el.classList.add('vis'));
const evo=$$('#evo span'); let ev=0;
setInterval(()=>{ if(document.hidden) return; evo.forEach((s,k)=>s.classList.toggle('on',k===ev)); ev=(ev+1)%evo.length; },1100);

/* ---------------- três formas ---------------- */
const ways=$$('.way'), wvs=$$('.wv'); let wAtual=0;
function mostraWay(i){ if(i===wAtual) return; wAtual=i; ways.forEach((w,k)=>w.classList.toggle('on',k===i)); wvs.forEach((w,k)=>w.classList.toggle('on',k===i)); }
const icoA=(id,c)=>`<span class="ai" style="background:${c}">${LOGOS[id]||LOGO_CRM}</span>`;
$('#base').innerHTML=[['simbiosys','Catálogo + propostas','pedido vira proposta em PDF',1],['grana','Finanças','contas, cartões e metas',0],['acervo','Acervo','busca, listas e níveis',0],['crm','CRM','clientes, funil e financeiro',0]]
  .map(([id,n,d,s])=>`<div class="${s?'sel':''}">${icoA(id,(P_BY[id]||{c:'#16213A'}).c)}<b>${n}</b><small>${d}</small>${s?'<em>usar como base</em>':''}</div>`).join('');
const FRASES=['Um app para meus alunos marcarem aulas e eu ver quem está com a mensalidade atrasada.','Um catálogo em que o cliente escolhe o modelo e o pedido já chega como proposta.','Um jogo de cartas com as regras da nossa turma, cada pessoa no seu celular.'];
const typeTx=$('#typeTx'); let fi=0, ci=0, apagando=false;
function digita(){ if(RM){ typeTx.textContent=FRASES[0]; return; } const f=FRASES[fi];
  if(wAtual!==0||document.hidden){ setTimeout(digita,600); return; }
  if(!apagando){ ci++; typeTx.textContent=f.slice(0,ci); if(ci>=f.length){ apagando=true; setTimeout(digita,1800); return; } setTimeout(digita,34+Math.random()*40); }
  else { ci-=3; typeTx.textContent=f.slice(0,Math.max(0,ci)); if(ci<=0){ apagando=false; ci=0; fi=(fi+1)%FRASES.length; setTimeout(digita,400); return; } setTimeout(digita,14); } }
digita();

/* ---------------- carrossel de projetos ---------------- */
const car=$('#car');
car.innerHTML=ORDEM.map(id=>{ const p=P_BY[id], x=EXTRA[id];
  const shots=x.shots.map((s,k)=>`<span class="shot ${x.desk?'desk':''} ${k?'b':''}"><img src="${IMG[s]}" alt="" loading="lazy" draggable="false"></span>`).join('');
  return `<article class="pc"><button type="button" class="pc-img" style="--c:${p.c}" data-gal="${p.i}" data-cursor="Ver telas" aria-label="Ver telas de ${p.name}"><span class="glogo">${LOGOS[id]}</span>${shots}</button>
  <div class="pc-meta"><div><b>${p.name}</b><small>${x.cat}</small></div><a href="${x.url}" target="_blank" rel="noopener" data-cursor="Abrir o app">Abrir ↗</a></div></article>`; }).join('');
let arrastou=false;
$$('[data-gal]',car).forEach(b=>b.addEventListener('click',e=>{ if(arrastou){ e.preventDefault(); return; } openGal(+b.dataset.gal,0,b); }));
const passoCar=()=>($('.pc',car)?.getBoundingClientRect().width||300)+20;
$('#carPrev').addEventListener('click',()=>car.scrollBy({left:-passoCar(),behavior:'smooth'}));
$('#carNext').addEventListener('click',()=>car.scrollBy({left:passoCar(),behavior:'smooth'}));
let dx0=null, sl0=0;
car.addEventListener('pointerdown',e=>{ if(e.pointerType!=='mouse') return; dx0=e.clientX; sl0=car.scrollLeft; arrastou=false; });
addEventListener('pointermove',e=>{ if(dx0===null) return; const d=e.clientX-dx0; if(Math.abs(d)>5){ arrastou=true; car.classList.add('drag'); } car.scrollLeft=sl0-d; });
addEventListener('pointerup',()=>{ if(dx0===null) return; dx0=null; car.classList.remove('drag'); setTimeout(()=>arrastou=false,50); });

/* ---------------- lista tipográfica ---------------- */
const AREAS=[['Estudos','matérias, revisões e metas','Seu material de estudo está espalhado em quantos lugares diferentes?'],
  ['Rotina pessoal','agenda, hábitos e lembretes','Quantos aplicativos você usa hoje para organizar uma única rotina?'],
  ['Finanças','contas, cartões e metas','Você sabe exatamente quanto entrou e quanto saiu no último mês?'],
  ['Negócio','pedidos, propostas e clientes','Quanto tempo se perde repassando pedidos, orçamentos e cobranças à mão?'],
  ['Jogos','regras da casa, cada pessoa no seu aparelho','E se o jogo da sua turma tivesse as regras da casa e rodasse no celular de cada um?'],
  ['Acervos e catálogos','se o processo existe, dá para desenhar','Se é uma tarefa que se repete toda semana, ela pode virar uma ferramenta.']];
$('#tlList').innerHTML=AREAS.map(([n,d,q],i)=>`<li><button type="button" data-i="${i}" aria-expanded="false"><b>${n}</b><span>${d}</span></button><p class="tl-open">${q}</p></li>`).join('');
const fq=$('#floatQ'); let fqx=-999, fqy=-999, fqtx=-999, fqty=-999;
$$('#tlList button').forEach(b=>{
  const i=+b.dataset.i;
  b.addEventListener('pointerenter',e=>{ if(e.pointerType!=='mouse') return; $('#floatQt').textContent=AREAS[i][0]; $('#floatQx').textContent=AREAS[i][2]; fq.classList.add('on'); });
  b.addEventListener('pointerleave',()=>fq.classList.remove('on'));
  b.addEventListener('click',()=>{ const li=b.parentElement; const on=!li.classList.contains('aberto'); $$('#tlList li').forEach(x=>{ x.classList.remove('aberto'); x.firstElementChild.setAttribute('aria-expanded','false'); }); li.classList.toggle('aberto',on); b.setAttribute('aria-expanded',on); });
});
addEventListener('pointermove',e=>{ fqtx=e.clientX+22; fqty=e.clientY+22; },{passive:true});

/* ---------------- rodapé: marca com brilho ---------------- */
const wm=$('#wordmark');
addEventListener('pointermove',e=>{ const r=wm.getBoundingClientRect(); if(r.top>innerHeight||r.bottom<0) return; wm.style.setProperty('--mx',((e.clientX/innerWidth-.5)*2).toFixed(3)); wm.style.setProperty('--my',(((e.clientY-r.top)/r.height-.5)*2).toFixed(3)); },{passive:true});
$('#ano').textContent=new Date().getFullYear();

/* ---------------- botões magnéticos ---------------- */
if(!RM && matchMedia('(hover:hover)').matches){
  $$('.magnet').forEach(b=>{
    b.addEventListener('pointermove',e=>{ const r=b.getBoundingClientRect(); const dx=(e.clientX-r.left-r.width/2)/r.width, dy=(e.clientY-r.top-r.height/2)/r.height; b.style.transform=`translate(${dx*8}px,${dy*6}px)`; });
    b.addEventListener('pointerleave',()=>{ b.style.transform=''; });
  });
}

/* ---------------- laço principal ---------------- */
const rings=$('#rings'), askHead=$('#askHead'), askLine=$('#askLine'), diags=$$('.diag');
function quadro(now){
  const y=scrollY;
  vel=vel*.9+(y-yAnt)*.1; yAnt=y;
  cabecalho(y);
  if(temGL && !RM) desenhaGL(now);
  // cursor
  cx+=(tx-cx)*.22; cy+=(ty-cy)*.22; cur.style.transform=`translate3d(${cx}px,${cy}px,0)`;
  fqx+=(fqtx-fqx)*.18; fqy+=(fqty-fqy)*.18; fq.style.transform=`translate3d(${Math.min(fqx,innerWidth-340)}px,${fqy}px,0) scale(${fq.classList.contains('on')?1:.9})`;
  // faixa
  tkx-=(.45+Math.min(8,Math.abs(vel))*.35); const tw=tk.scrollWidth/3; if(-tkx>tw) tkx+=tw; tk.style.transform=`translate3d(${tkx}px,0,0)`;
  // símbolo do topo
  sym.style.setProperty('--rot',(y*.02).toFixed(2)+'deg');
  // palavras
  reveals.forEach(({el,words})=>{ const p=progresso(el,.92,.4); const n=words.length; words.forEach((w,i)=>{ const v=clamp(p*n*1.05-i); if(w.classList.contains('chip-img')){ w.style.setProperty('--cs',(.2+.8*v).toFixed(3)); w.style.setProperty('--cr',((1-v)*-12).toFixed(1)+'deg'); } else w.style.setProperty('--o',(.18+.82*v).toFixed(2)); }); });
  // história
  const sr=story.getBoundingClientRect(); const sp=clamp(-sr.top/(sr.height-innerHeight)); mostraSt(Math.min(2,Math.floor(sp*3)));
  // três formas
  const meio=innerHeight/2; let melhor=0, dist=1e9; ways.forEach((w,k)=>{ const r=w.getBoundingClientRect(); const d=Math.abs(r.top+r.height/2-meio); if(d<dist){ dist=d; melhor=k; } }); mostraWay(melhor);
  // formulário
  diags.forEach(d=>d.style.setProperty('--d',progresso(d,.95,.5).toFixed(3)));
  if(askHead){ const ap=progresso(askHead,1,.2); const h=askHead.querySelector('h2'); if(h) h.style.setProperty('--ty',((1-ap)*40).toFixed(1)+'px'); askLine.style.setProperty('--al',ap.toFixed(3)); rings.style.setProperty('--rs',(.85+ap*.25).toFixed(3)); rings.style.setProperty('--rr',(ap*40).toFixed(1)+'deg'); }
  if(!RM) requestAnimationFrame(quadro);
}
if(RM){ reveals.forEach(({words})=>words.forEach(w=>{ w.style.setProperty('--o',1); w.style.setProperty('--cs',1); })); diags.forEach(d=>d.style.setProperty('--d',1)); }
else requestAnimationFrame(quadro);
let rz; addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(tamGL,150); });

/* ---------------- galeria ---------------- */
const gal=$('#gal'), gImg=$('#galImg'), gFrame=$('#galFrame'), gList=$('#galList');
let gp=0, gs=0, lastFocus=null;
function renderSlide(dir){
  const p=PROJECTS[gp], s=p.slides[gs];
  const apply=()=>{
    gImg.src=IMG[s.img]||''; gImg.alt=`${p.name}: ${s.t}`;
    gFrame.className='frame '+s.k;
    let tag=gFrame.querySelector('.illu'); if(tag) tag.remove();
    if(s.il){ tag=document.createElement('span'); tag.className='illu'; tag.textContent='prévia ilustrativa'; gFrame.appendChild(tag); }
  };
  if(dir && !RM){ gFrame.style.setProperty('--dx',(dir>0?-24:24)+'px'); gFrame.classList.add('swap'); setTimeout(()=>{apply(); gFrame.style.setProperty('--dx',(dir>0?24:-24)+'px'); requestAnimationFrame(()=>{gFrame.classList.remove('swap')});},220); }
  else apply();
  $$('.strengths li',gal).forEach((li,i)=>{ li.firstElementChild.classList.toggle('on',i===gs); li.firstElementChild.setAttribute('aria-current',i===gs?'true':'false'); });
  $('#galCount').textContent=String(gs+1).padStart(2,'0')+' / '+String(p.slides.length).padStart(2,'0');
}
function openGal(i,s,from){
  gp=i; gs=s||0; lastFocus=from||document.activeElement;
  const p=PROJECTS[gp];
  $('#galPanel').style.setProperty('--c',p.c);
  $('#galLogo').innerHTML=LOGOS[p.id];
  $('#galTag').textContent=p.tag;
  $('#galName').textContent=p.name;
  $('#galSum').textContent=p.sum;
  gList.innerHTML='';
  p.slides.forEach((sl,k)=>{
    const li=document.createElement('li');
    li.innerHTML=`<button type="button"><i class="bul"></i><div><b></b><span></span></div></button>`;
    li.querySelector('b').textContent=sl.t; li.querySelector('span').textContent=sl.d;
    li.firstElementChild.addEventListener('click',()=>{const d=k>gs?1:-1; gs=k; renderSlide(d);});
    gList.appendChild(li);
  });
  gal.classList.add('open'); document.documentElement.style.overflow='hidden';
  renderSlide(0);
  setTimeout(()=>$('#galClose').focus(),50);
}
function closeGal(){ gal.classList.remove('open'); document.documentElement.style.overflow=''; if(lastFocus) lastFocus.focus({preventScroll:true}); }
function step(d){ const n=PROJECTS[gp].slides.length; gs=(gs+d+n)%n; renderSlide(d); }
$('#galClose').addEventListener('click',closeGal);
$('#galPrev').addEventListener('click',()=>step(-1));
$('#galNext').addEventListener('click',()=>step(1));
$('#galCta').addEventListener('click',()=>closeGal());
gal.addEventListener('click',e=>{ if(e.target===gal) closeGal(); });
document.addEventListener('keydown',e=>{
  if(!gal.classList.contains('open')) return;
  if(e.key==='Escape') closeGal();
  else if(e.key==='ArrowRight') step(1);
  else if(e.key==='ArrowLeft') step(-1);
  else if(e.key==='Tab'){ const f=$$('button,a',gal).filter(x=>x.offsetParent!==null); const a=f[0], z=f[f.length-1];
    if(e.shiftKey && document.activeElement===a){e.preventDefault(); z.focus();} else if(!e.shiftKey && document.activeElement===z){e.preventDefault(); a.focus();} }
});
let sx=null; const stage=$('#galStage');
stage.addEventListener('pointerdown',e=>{sx=e.clientX;});
stage.addEventListener('pointerup',e=>{ if(sx==null) return; const dx=e.clientX-sx; sx=null; if(Math.abs(dx)>40) step(dx<0?1:-1); });


/* ---------------- formulário ---------------- */
const form=$('#form'), F=n=>form.elements[n];
const QS=$$('.q',form);
const fIdeia=$('#f-ideia'), fNome=$('#f-nome'), fWhats=$('#f-whats'), fMarca=$('#f-marca');
const firstName=()=> (fNome.value.trim().split(/\s+/)[0]||'');
const radio=n=>{const c=form.querySelector(`input[name="${n}"]:checked`); return c?c.value:'';};
const checks=n=>$$(`input[name="${n}"]:checked`,form).map(c=>c.value);
const digits=v=>v.replace(/\D/g,'');
function maskPhone(v){
  let d=digits(v); if(d.startsWith('55')&&d.length>11) d=d.slice(2); d=d.slice(0,11);
  if(d.length<=2) return d?`(${d}`:'';
  if(d.length<=6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<=10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,3)} ${d.slice(3,7)}-${d.slice(7)}`;
}
const showMarca=()=>$('#subMarca').classList.toggle('show',!!radio('para')&&radio('para')!=='Para mim (uso pessoal)');
fWhats.addEventListener('input',()=>{ fWhats.value=maskPhone(fWhats.value); });
fIdeia.addEventListener('input',()=>{ $('#c-ideia').textContent=fIdeia.value.length; });
form.addEventListener('change',e=>{ if(e.target.name==='para') showMarca(); });
$$('.ex button',form).forEach(b=>b.addEventListener('click',()=>{ const t=$('#'+b.parentElement.dataset.for); const add=b.textContent.replace('…',' '); t.value=(t.value.trim()?t.value.trim()+'\n':'')+add; t.focus(); t.setSelectionRange(t.value.length,t.value.length); update(); }));

const answered={
  ideia:()=>fIdeia.value.trim().length>=10,
  nome:()=>fNome.value.trim().length>=2,
  whats:()=>{const d=digits(fWhats.value); return d.length>=10&&d.length<=11;},
  para:()=>!!radio('para'),
  tipo:()=>checks('tipo').length>0,
  dor:()=>F('dor').value.trim().length>3,
  desejo:()=>F('desejo').value.trim().length>3,
  uso:()=>!!(radio('quem')||radio('onde')),
  tempo:()=>!!(radio('prazo')||radio('invest'))
};
function update(){
  let n=0; QS.forEach(q=>{ const ok=answered[q.dataset.q](); q.classList.toggle('done',ok); if(ok){n++; q.classList.remove('bad');} });
  $('#railTxt').textContent=`${n} de ${QS.length} respondidas`;
  $('#railBar').style.width=(n/QS.length*100)+'%';
  const nm=firstName();
  $('#qt-whats').textContent = nm ? `Obrigado, ${nm}. Qual WhatsApp usamos para continuar a conversa?` : 'Qual WhatsApp usamos para continuar a conversa?';
  $('#qt-dor').textContent = nm ? `${nm}, qual problema essa ferramenta precisa resolver?` : 'Qual problema essa ferramenta precisa resolver?';
  saveDraft();
}
form.addEventListener('input',update); form.addEventListener('change',update);

const KEY='rumeyart-ideia';
function saveDraft(){ try{ const o={}; [...form.elements].forEach(el=>{ if(!el.name) return; if(el.type==='radio'||el.type==='checkbox'){ if(el.checked)(o[el.name]=o[el.name]||[]).push(el.value);} else o[el.name]=el.value; }); localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
function loadDraft(){ try{ const o=JSON.parse(localStorage.getItem(KEY)||'null'); if(!o) return; [...form.elements].forEach(el=>{ if(!el.name||!(el.name in o)) return; if(el.type==='radio'||el.type==='checkbox') el.checked=o[el.name].includes(el.value); else el.value=o[el.name]; }); $('#c-ideia').textContent=fIdeia.value.length; showMarca(); }catch(e){} }
loadDraft(); update();

function resumo(txt,max=260){
  let t=txt.replace(/\s+/g,' ').trim();
  if(t.length<=max) return t;
  t=t.slice(0,max); const cut=t.lastIndexOf(' '); return t.slice(0,cut>120?cut:max).replace(/[,.;:\s]+$/,'')+'…';
}
function buildMsg(){
  const nome=fNome.value.trim().replace(/\s+/g,' ');
  let m=`Olá, Rumëyart! Aqui é ${nome}.\n\nMinha ideia, em resumo: ${resumo(fIdeia.value)}`;
  if($('#incAll').checked){
    const L=[]; const add=(k,v)=>{ if(v) L.push(`• ${k}: ${v}`); };
    add('Para quem',radio('para')); add('Marca',$('#subMarca').classList.contains('show')?fMarca.value.trim():'');
    add('Formato',checks('tipo').join(', '));
    add('Problema a resolver',F('dor').value.trim().replace(/\s+/g,' '));
    add('O que a ferramenta precisa fazer',F('desejo').value.trim().replace(/\s+/g,' '));
    add('Quem usa',radio('quem')); add('Onde usa',radio('onde'));
    add('Prazo',radio('prazo')); add('Investimento',radio('invest'));
    add('Meu WhatsApp',fWhats.value.trim());
    if(L.length) m+=`\n\nOutras respostas do formulário:\n${L.join('\n')}`;
  }
  return m;
}
function paintMsg(){ const m=buildMsg(); $('#msg').textContent=m; $('#waBtn').href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(m)}`; }
$('#incAll').addEventListener('change',paintMsg);

form.addEventListener('submit',e=>{
  e.preventDefault();
  let first=null;
  QS.filter(q=>q.hasAttribute('data-req')).forEach(q=>{ const ok=answered[q.dataset.q](); q.classList.toggle('bad',!ok); if(!ok&&!first) first=q; });
  if(first){ first.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}); const f=first.querySelector('input,textarea'); f&&setTimeout(()=>f.focus({preventScroll:true}),RM?0:450); toast('Falta completar uma resposta obrigatória.'); return; }
  const nm=firstName();
  const t=$('#doneTitle'); t.innerHTML=''; t.append(`Pronto, ${nm}. Sua ideia está `); const em=document.createElement('em'); em.textContent='registrada'; t.append(em,'.');
  paintMsg();
  enviarCRM();
  $('#sendRow').hidden=true; const d=$('#done'); d.classList.add('show');
  d.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}); setTimeout(()=>d.focus({preventScroll:true}),RM?0:500);
});
/* as respostas também seguem para o CRM da Rumëyart (Supabase) */
const CRM_URL='https://uotxnchfvrgpxwimmefd.supabase.co/rest/v1/rpc/rumeyart_novo_pedido';
const CRM_KEY='sb_publishable_wopZQEqU4NERsq2wqCJMXQ_hg53O5VA';
let ultimoEnvio='';
async function enviarCRM(){
  const st=$('#crmSt');
  const respostas={para:radio('para'),marca:$('#subMarca').classList.contains('show')?fMarca.value.trim():'',tipo:checks('tipo').join(', '),
    dor:F('dor').value.trim(),desejo:F('desejo').value.trim(),quem:radio('quem'),onde:radio('onde'),prazo:radio('prazo'),invest:radio('invest'),whats:fWhats.value.trim()};
  const corpo={p_nome:fNome.value.trim().replace(/\s+/g,' '),p_whatsapp:fWhats.value.trim(),p_ideia:fIdeia.value.trim(),p_respostas:respostas};
  const assinatura=JSON.stringify(corpo);
  if(assinatura===ultimoEnvio) return;
  st.className='crm-st'; st.textContent='Registrando sua ideia…';
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),9000);
  try{
    const r=await fetch(CRM_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:CRM_KEY,Authorization:'Bearer '+CRM_KEY},body:assinatura,signal:ctrl.signal});
    const txt=await r.text();
    if(r.ok){ ultimoEnvio=assinatura; const n=parseInt(txt,10); st.className='crm-st ok'; st.textContent=`Recebemos sua ideia${n?` (pedido nº ${n})`:''}. O WhatsApp só adianta a conversa.`; try{localStorage.removeItem(KEY);}catch(e){} return; }
    if(/pedido_repetido/.test(txt)){ ultimoEnvio=assinatura; st.className='crm-st ok'; st.textContent='Sua ideia já tinha chegado para nós há instantes.'; return; }
    throw new Error(txt);
  }catch(e){ st.className='crm-st'; st.textContent='Para garantir que sua ideia chegue, envie pelo WhatsApp abaixo.'; }
  finally{ clearTimeout(t); }
}
$('#editBack').addEventListener('click',()=>{ $('#done').classList.remove('show'); $('#sendRow').hidden=false; QS[0].scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}); });
$('#copyMsg').addEventListener('click',()=>{
  const m=$('#msg').textContent;
  const fallback=()=>{ const r=document.createRange(); r.selectNodeContents($('#msg')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast('Mensagem selecionada. É só copiar.'); };
  try{ navigator.clipboard.writeText(m).then(()=>toast('Mensagem copiada'),fallback); }catch(e){ fallback(); }
});
let tt; function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(tt); tt=setTimeout(()=>el.classList.remove('show'),2400); }

})();
