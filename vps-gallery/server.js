import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const STORAGE_DIR = path.resolve(process.env.GALLERY_STORAGE_DIR || path.join(ROOT, "storage", "gallery", "barbearia"));
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.GALLERY_ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.GALLERY_SESSION_SECRET || "";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SESSION_MS = 8 * 60 * 60 * 1000;
const app = express();
const loginAttempts = new Map();

if (ADMIN_PASSWORD.length < 12 || SESSION_SECRET.length < 32) {
  console.error("Configure GALLERY_ADMIN_PASSWORD (mínimo 12 caracteres) e GALLERY_SESSION_SECRET (mínimo 32 caracteres).");
  process.exit(1);
}

app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});
app.use(express.json({ limit: "4kb" }));

function sign(payload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}
function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS, nonce: crypto.randomBytes(24).toString("hex") })).toString("base64url");
  return payload + "." + sign(payload);
}
function authorized(req) {
  const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).exp > Date.now(); }
  catch { return false; }
}
function requireAdmin(req, res, next) {
  if (!authorized(req)) return res.status(401).json({ error: "Acesso administrativo necessário. Entre novamente." });
  next();
}
function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: ".jpg", type: "image/jpeg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { ext: ".png", type: "image/png" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { ext: ".webp", type: "image/webp" };
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(buffer.toString("ascii", 8, 12))) return { ext: ".avif", type: "image/avif" };
  return null;
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

app.get("/api/gallery/health", (_req, res) => res.json({ ok: true, storage: "local-disk" }));
app.post("/api/gallery/login", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
  if (attempts.length >= 6) return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos." });
  const supplied = String(req.body?.password || "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    attempts.push(now);
    loginAttempts.set(ip, attempts);
    return res.status(401).json({ error: "Senha incorreta." });
  }
  loginAttempts.delete(ip);
  return res.json({ token: makeToken() });
});
app.get("/api/gallery/images", async (_req, res, next) => {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const files = await fs.readdir(STORAGE_DIR, { withFileTypes: true });
    const images = [];
    for (const entry of files) {
      if (!entry.isFile() || !/^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(entry.name)) continue;
      const stat = await fs.stat(path.join(STORAGE_DIR, entry.name));
      images.push({ key: "barbearia/" + entry.name, size: stat.size });
    }
    images.sort((a, b) => a.key.localeCompare(b.key));
    res.json({ images });
  } catch (error) { next(error); }
});
app.get("/api/gallery/image/barbearia/:filename", async (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(filename)) return res.sendStatus(404);
  try {
    const file = path.join(STORAGE_DIR, filename);
    await fs.access(file);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type(path.extname(filename));
    res.sendFile(file);
  } catch (error) { if (error.code === "ENOENT") res.sendStatus(404); else next(error); }
});
app.post("/api/gallery/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Selecione uma imagem de até 6 MB." });
    const detected = detectImage(req.file.buffer);
    if (!detected) return res.status(415).json({ error: "Arquivo inválido. Use JPG, PNG, WEBP ou AVIF." });
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const filename = crypto.randomUUID() + detected.ext;
    await fs.writeFile(path.join(STORAGE_DIR, filename), req.file.buffer, { flag: "wx", mode: 0o640 });
    res.status(201).json({ ok: true, key: "barbearia/" + filename });
  } catch (error) { next(error); }
});
app.delete("/api/gallery/images/barbearia/:filename", requireAdmin, async (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(filename)) return res.sendStatus(404);
  try {
    await fs.unlink(path.join(STORAGE_DIR, filename));
    res.json({ ok: true });
  } catch (error) { if (error.code === "ENOENT") res.sendStatus(404); else next(error); }
});

app.use(express.static(PUBLIC_DIR, { index: "index.html", extensions: ["html"] }));
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Cada imagem deve ter no máximo 6 MB." });
  console.error(error);
  res.status(500).json({ error: "Erro interno no servidor." });
});
await fs.mkdir(STORAGE_DIR, { recursive: true });
app.listen(PORT, "127.0.0.1", () => console.log("KenyDev gallery server ativo em http://127.0.0.1:" + PORT));
