const DESTINATION = "kenedyygortomaz@gmail.com";
const SENDER = "KenyDev <onboarding@resend.dev>";
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const STAFF_PIN_SALT = "6f8434564e069ceb22458af950b4b499";
const STAFF_PIN_HASH = "ad9400e68d180fb764c544e4d356a82760de16cd9548df84284046920d464841";
const STAFF_PIN_ITERATIONS = 180000;
const MENU_ITEMS = new Set([
  "X-Burguer", "X-Salada", "X-Bacon", "X-Tudo", "Brasa Royale",
  "Brasa & Sabor", "Brasa Burgue", "Royale Brasa", "Brasa Premium",
  "Porções da casa", "Porção para dividir", "Porção na brasa",
  "Espetinhos na brasa", "Espetinho especial", "Seleção de espetos"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function toBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  return btoa(binary);
}

function toBase64Url(bytes) {
  return toBase64(bytes).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256Hex(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function derivePinHash(pin) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(STAFF_PIN_SALT), iterations: STAFF_PIN_ITERATIONS, hash: "SHA-256" }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

async function readJson(request, limit = 16000) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > limit) return { error: "O envio excede o tamanho permitido." };
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : { error: "Dados inválidos." };
  } catch {
    return { error: "Não foi possível ler o pedido." };
  }
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function validStaffSession(request, db) {
  const token = bearer(request);
  if (!token || token.length < 32) return false;
  const tokenHash = await sha256Hex(token);
  const row = await db.prepare("SELECT expires_at FROM brasa_staff_sessions WHERE token_hash = ?").bind(tokenHash).first();
  return Boolean(row && Number(row.expires_at) > Date.now());
}

async function authenticateStaff(request, db) {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const body = await readJson(request, 1000);
  if (body.error) return json(body, 400);
  const pin = String(body.pin || "").trim();
  if (!/^\d{15}$/.test(pin)) return json({ error: "Informe o PIN de 15 dígitos." }, 400);

  const now = Date.now();
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await sha256Hex("brasa-auth:" + address);
  const attempts = await db.prepare("SELECT COUNT(*) AS total FROM brasa_auth_attempts WHERE ip_hash = ? AND attempted_at > ?").bind(ipHash, now - 15 * 60 * 1000).first();
  if (Number(attempts?.total || 0) >= 6) return json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, 429);

  if (!constantTimeEqual(await derivePinHash(pin), STAFF_PIN_HASH)) {
    await db.prepare("INSERT INTO brasa_auth_attempts (ip_hash, attempted_at) VALUES (?, ?)").bind(ipHash, now).run();
    return json({ error: "PIN inválido." }, 401);
  }

  await db.prepare("DELETE FROM brasa_auth_attempts WHERE ip_hash = ? OR attempted_at < ?").bind(ipHash, now - 24 * 60 * 60 * 1000).run();
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const expiresAt = now + 8 * 60 * 60 * 1000;
  await db.prepare("INSERT INTO brasa_staff_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").bind(tokenHash, now, expiresAt).run();
  return json({ token, expiresAt });
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) return null;
  const normalized = [];
  for (const item of items) {
    const name = String(item?.name || "").trim();
    const quantity = Number(item?.quantity);
    if (!MENU_ITEMS.has(name) || !Number.isInteger(quantity) || quantity < 1 || quantity > 30) return null;
    normalized.push({ name, quantity });
  }
  return normalized;
}

function toOrder(row) {
  let items = [];
  try { items = JSON.parse(row.items_json); } catch {}
  return {
    id: row.id, code: row.code, order_type: row.order_type,
    table_no: row.table_no == null ? null : Number(row.table_no),
    customer_name: row.customer_name || "", items, notes: row.notes || "",
    source: row.source, status: row.status,
    created_at: Number(row.created_at), updated_at: Number(row.updated_at)
  };
}

async function createOrder(request, env) {
  const staffToken = bearer(request);
  if (staffToken && !await validStaffSession(request, env.DB)) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const body = await readJson(request);
  if (body.error) return json(body, 400);
  const items = normalizeItems(body.items);
  const orderType = body.order_type === "pickup" ? "pickup" : body.order_type === "table" ? "table" : "";
  const tableNo = orderType === "table" ? Number(body.table_no) : null;
  if (!items) return json({ error: "Confira os itens e quantidades do pedido." }, 400);
  if (!orderType || (orderType === "table" && (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > 12))) return json({ error: "Escolha uma mesa de 1 a 12 ou retirada." }, 400);

  const customerName = String(body.customer_name || "").trim().slice(0, 70);
  const notes = String(body.notes || "").trim().slice(0, 500);
  const now = Date.now();
  const id = crypto.randomUUID();
  const code = "BR-" + String(now).slice(-7) + "-" + bytesToHex(crypto.getRandomValues(new Uint8Array(2))).toUpperCase();
  const source = staffToken ? "staff" : "customer";
  await env.DB.prepare("INSERT INTO brasa_orders (id, code, order_type, table_no, customer_name, items_json, notes, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)")
    .bind(id, code, orderType, tableNo, customerName, JSON.stringify(items), notes, source, now, now).run();
  return json({ order: { id, code, order_type: orderType, table_no: tableNo, customer_name: customerName, items, notes, source, status: "new", created_at: now, updated_at: now } }, 201);
}

async function handleBrasa(request, env, url) {
  if (url.pathname === "/api/brasa/health" && request.method === "GET") return json({ ok: true, database: Boolean(env.DB), staffPanel: Boolean(STAFF_PIN_SALT && STAFF_PIN_HASH) });
  if (!env.DB) return json({ error: "Banco de pedidos ainda não está configurado." }, 503);
  if (url.pathname === "/api/brasa/auth") return authenticateStaff(request, env.DB);

  if (url.pathname === "/api/brasa/auth/session" && request.method === "DELETE") {
    const token = bearer(request);
    if (token) await env.DB.prepare("DELETE FROM brasa_staff_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
    return json({ ok: true });
  }

  if (url.pathname === "/api/brasa/orders" && request.method === "POST") return createOrder(request, env);
  if (url.pathname === "/api/brasa/orders" && request.method === "GET") {
    if (!await validStaffSession(request, env.DB)) return json({ error: "Acesso restrito à equipe." }, 401);
    const rows = await env.DB.prepare("SELECT * FROM brasa_orders WHERE created_at > ? ORDER BY created_at DESC LIMIT 200").bind(Date.now() - 72 * 60 * 60 * 1000).all();
    return json({ orders: (rows.results || []).map(toOrder) });
  }

  const match = url.pathname.match(/^\/api\/brasa\/orders\/([a-f0-9-]{20,50})$/i);
  if (match && request.method === "PATCH") {
    if (!await validStaffSession(request, env.DB)) return json({ error: "Acesso restrito à equipe." }, 401);
    const body = await readJson(request, 1000);
    const allowed = new Set(["new", "preparing", "ready", "served", "closed", "cancelled"]);
    if (body.error || !allowed.has(body.status)) return json({ error: "Status de pedido inválido." }, 400);
    const now = Date.now();
    const result = await env.DB.prepare("UPDATE brasa_orders SET status = ?, updated_at = ? WHERE id = ?").bind(body.status, now, match[1]).run();
    if (!result.meta?.changes) return json({ error: "Pedido não encontrado." }, 404);
    return json({ ok: true, status: body.status, updated_at: now });
  }
  return json({ error: "Rota Brasa Royale não encontrada." }, 404);
}


function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}
async function createGalleryToken(secret) {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = toBase64Url(new TextEncoder().encode(String(expires) + ":" + toBase64Url(crypto.getRandomValues(new Uint8Array(24)))));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return payload + "." + toBase64Url(signature);
}
async function validGallerySession(request, secret) {
  const parts = bearer(request).split(".");
  if (parts.length !== 2) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(parts[1]), new TextEncoder().encode(parts[0]));
    const payload = new TextDecoder().decode(decodeBase64Url(parts[0]));
    const expires = Number(payload.split(":")[0]);
    return valid && Number.isFinite(expires) && expires > Date.now();
  } catch { return false; }
}
async function handleGallery(request, env, url) {
  if (!env.GALLERY_BUCKET) return json({ error: "Armazenamento R2 não configurado." }, 503);
  if (url.pathname === "/api/gallery/login" && request.method === "POST") {
    if (!env.GALLERY_ADMIN_PASSWORD || !env.GALLERY_SESSION_SECRET) return json({ error: "Credenciais administrativas não configuradas." }, 503);
    const body = await readJson(request, 2000);
    if (body.error) return json(body, 400);
    if (!constantTimeEqual(String(body.password || ""), env.GALLERY_ADMIN_PASSWORD)) return json({ error: "Senha incorreta." }, 401);
    return json({ token: await createGalleryToken(env.GALLERY_SESSION_SECRET) });
  }
  if (url.pathname === "/api/gallery/images" && request.method === "GET") {
    const listed = await env.GALLERY_BUCKET.list({ prefix: "barbearia/", limit: 100 });
    return json({ images: (listed.objects || []).map(o => ({ key: o.key, size: o.size })) });
  }
  const imageMatch = url.pathname.match(/^\/api\/gallery\/image\/(barbearia\/[a-zA-Z0-9._-]+)$/);
  if (imageMatch && request.method === "GET") {
    const object = await env.GALLERY_BUCKET.get(imageMatch[1]);
    if (!object) return json({ error: "Imagem não encontrada." }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  }
  if (url.pathname === "/api/gallery/upload" && request.method === "POST") {
    if (!env.GALLERY_SESSION_SECRET || !await validGallerySession(request, env.GALLERY_SESSION_SECRET)) return json({ error: "Acesso administrativo necessário." }, 401);
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024 + 65536) return json({ error: "Cada imagem deve ter no máximo 6 MB." }, 413);
    let form;
    try { form = await request.formData(); } catch { return json({ error: "Envio inválido." }, 400); }
    const file = form.get("image");
    if (!file || typeof file.arrayBuffer !== "function" || file.size < 1 || file.size > 6 * 1024 * 1024) return json({ error: "Selecione uma imagem de até 6 MB." }, 400);
    const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
    const ext = types[file.type];
    if (!ext) return json({ error: "Formato não permitido. Use JPG, PNG, WEBP ou AVIF." }, 415);
    const key = "barbearia/" + crypto.randomUUID() + "." + ext;
    await env.GALLERY_BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=3600" } });
    return json({ ok: true, key }, 201);
  }
  const deleteMatch = url.pathname.match(/^\/api\/gallery\/images\/(barbearia\/[a-zA-Z0-9._-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    if (!env.GALLERY_SESSION_SECRET || !await validGallerySession(request, env.GALLERY_SESSION_SECRET)) return json({ error: "Acesso administrativo necessário." }, 401);
    await env.GALLERY_BUCKET.delete(deleteMatch[1]);
    return json({ ok: true });
  }
  return json({ error: "Rota da galeria não encontrada." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/gallery/")) return handleGallery(request, env, url);
    if (url.pathname.startsWith("/api/brasa/")) return handleBrasa(request, env, url);
    if (url.pathname !== "/api/briefing") {
      if (url.pathname.startsWith("/api/")) return json({ error: "Rota não encontrada." }, 404);
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) return json({ error: "Formato de envio inválido." }, 415);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_PDF_BYTES + 512 * 1024) return json({ error: "O arquivo excede o limite de 8 MB." }, 413);

    let form;
    try { form = await request.formData(); } catch { return json({ error: "Não foi possível ler os dados enviados." }, 400); }
    if (String(form.get("_honey") || "").trim()) return json({ error: "Não foi possível validar o envio." }, 400);

    const email = String(form.get("E-mail do cliente") || "").trim();
    const name = String(form.get("Nome do cliente") || "").trim();
    const company = String(form.get("Empresa") || "").trim();
    const attachment = form.get("attachment");
    if (!name || !company || !validEmail(email)) return json({ error: "Confira seu nome, empresa e e-mail." }, 400);
    if (!attachment || typeof attachment.arrayBuffer !== "function") return json({ error: "O PDF do briefing não foi anexado. Tente novamente." }, 400);
    if (attachment.size <= 0 || attachment.size > MAX_PDF_BYTES) return json({ error: "O PDF deve ter no máximo 8 MB." }, 413);
    if (attachment.type !== "application/pdf" || !attachment.name.toLowerCase().endsWith(".pdf")) return json({ error: "O anexo precisa ser um arquivo PDF válido." }, 415);
    if (!env.RESEND_API_KEY) return json({ error: "O serviço de envio ainda não está configurado. Avise a KenyDev." }, 503);

    const bytes = new Uint8Array(await attachment.arrayBuffer());
    const payload = {
      from: SENDER, to: [DESTINATION], reply_to: email,
      subject: "Novo briefing de site — KenyDev",
      html: "<p>Um novo briefing foi recebido pelo formulário KenyDev.</p>" +
        "<p><strong>Cliente:</strong> " + escapeHtml(name) + "</p>" +
        "<p><strong>Empresa:</strong> " + escapeHtml(company) + "</p>" +
        "<p>As respostas completas estão no PDF anexado.</p>",
      attachments: [{ filename: attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_"), content: toBase64(bytes) }]
    };

    let resendResponse;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      return json({ error: "Falha de conexão com o serviço de e-mail. Tente novamente." }, 502);
    }
    if (!resendResponse.ok) return json({ error: "O Resend recusou o envio. Verifique o domínio remetente e a configuração da conta Resend." }, 502);
    return json({ ok: true });
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
