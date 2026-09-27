// Envia as notificações do CRM Rumëyart (Web Push) para os aparelhos inscritos.
// É chamada só pelo banco (pg_net), com o segredo compartilhado no cabeçalho x-rumeyart-segredo.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let cfgCache: { vapid_publica: string; vapid_privada: string; segredo: string; contato: string } | null = null;
async function cfg() {
  if (!cfgCache) {
    const { data, error } = await db.from("rumeyart_push_config").select("vapid_publica,vapid_privada,segredo,contato").eq("id", 1).single();
    if (error) throw error;
    cfgCache = data;
    webpush.setVapidDetails(data.contato, data.vapid_publica, data.vapid_privada);
  }
  return cfgCache!;
}

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const resp = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);
  let c;
  try { c = await cfg(); } catch (_e) { return resp({ erro: "config" }, 500); }
  if (!iguais(req.headers.get("x-rumeyart-segredo") || "", c.segredo)) return resp({ erro: "nao_autorizado" }, 401);

  const b = await req.json().catch(() => ({}));
  if (!b.titulo) return resp({ erro: "sem_titulo" }, 400);

  let q = db.from("rumeyart_push_inscricoes").select("id,email,endpoint,p256dh,auth,proprias");
  if (b.apenas) q = q.eq("email", b.apenas);
  const { data: subs, error } = await q;
  if (error) return resp({ erro: error.message }, 500);
  const alvo = (subs || []).filter((s) => !b.excluir || s.email !== b.excluir || s.proprias);

  const payload = JSON.stringify({ titulo: b.titulo, corpo: b.corpo || "", url: b.url || "/crm/", tag: b.tag || undefined });
  let ok = 0;
  const mortos: string[] = [];
  const falhas: string[] = [];
  await Promise.all(alvo.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload,
        { TTL: 60 * 60 * 24, urgency: "high", topic: (b.tag || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined });
      ok++;
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) mortos.push(s.id);
      else falhas.push(`${st || ""} ${(e as Error).message}`.slice(0, 200));
    }
  }));
  if (mortos.length) await db.from("rumeyart_push_inscricoes").delete().in("id", mortos);
  const vivos = alvo.filter((s) => !mortos.includes(s.id)).map((s) => s.id);
  if (ok && vivos.length) await db.from("rumeyart_push_inscricoes").update({ usado_em: new Date().toISOString() }).in("id", vivos);
  return resp({ enviados: ok, removidos: mortos.length, falhas });
});
