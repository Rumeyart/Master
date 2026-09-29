// Aparência: tamanho da tela (zoom do app) e tema. Fica salvo neste aparelho.
const ZOOMS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
export const OPCOES_ZOOM = ZOOMS;
export const TEMAS = [['areia', 'Areia (claro)'], ['noite', 'Noite (escuro)']];

const ler = (k, d) => { try{ return localStorage.getItem(k) ?? d; }catch(e){ return d; } };
const gravar = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };

export const zoomAtual = () => { const z = parseInt(ler('rmy-zoom', '100'), 10); return ZOOMS.includes(z) ? z : 100; };
export const temaAtual = () => ler('rmy-tema', 'areia') === 'noite' ? 'noite' : 'areia';

// As regras "@media (max-width: 760px)" do CSS são reescritas proporcionalmente ao zoom,
// assim o layout muda (menu de baixo, colunas, tabelas em cartões) exatamente como se a tela fosse menor/maior.
function ajustarMedias(f){
  for(const folha of document.styleSheets){
    let regras; try{ regras = folha.cssRules; }catch(e){ continue; } // folhas de outro domínio (fontes)
    if(!regras) continue;
    for(const r of regras){
      if(r.type !== CSSRule.MEDIA_RULE) continue;
      if(r.__orig === undefined) r.__orig = r.media.mediaText;
      const novo = r.__orig.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => Math.round(parseFloat(n) * f) + 'px');
      if(r.media.mediaText !== novo) r.media.mediaText = novo;
    }
  }
}

export function aplicarZoom(z = zoomAtual()){
  const f = z / 100;
  document.documentElement.style.setProperty('--zoom', f);
  ajustarMedias(f);
  window.dispatchEvent(new Event('resize'));
}
export function mudarZoom(z){ gravar('rmy-zoom', String(z)); aplicarZoom(z); }

export function aplicarTema(t = temaAtual()){
  document.documentElement.dataset.tema = t;
  const m = document.querySelector('meta[name=theme-color]'); if(m) m.content = t === 'noite' ? '#0C1322' : '#F5EFE6';
  const cs = document.querySelector('meta[name=color-scheme]'); if(cs) cs.content = t === 'noite' ? 'dark' : 'light';
}
export function mudarTema(t){ gravar('rmy-tema', t); aplicarTema(t); }

// ---- travar o zoom por gesto (pinça / duplo toque), mantendo a rolagem livre ----
function travarGestos(){
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), {passive: false}));
  document.addEventListener('touchmove', e => { if(e.touches && e.touches.length > 1) e.preventDefault(); }, {passive: false});
  document.addEventListener('wheel', e => { if(e.ctrlKey) e.preventDefault(); }, {passive: false}); // pinça do touchpad
  // o duplo toque para ampliar é desligado no CSS (touch-action), sem atrapalhar cliques rápidos
}

export function iniciarAparencia(){
  aplicarTema();
  // espera o CSS carregar para reescrever as medias
  if(document.readyState === 'complete') aplicarZoom();
  else { aplicarZoom(); window.addEventListener('load', () => aplicarZoom(), {once: true}); }
  travarGestos();
}
