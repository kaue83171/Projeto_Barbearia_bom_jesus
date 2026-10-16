import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createSign } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || ROOT;
mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, "data.sqlite"));
const sessions = new Map();

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, google_calendar_id TEXT, active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
    service TEXT NOT NULL, barber_id TEXT NOT NULL REFERENCES barbers(id),
    appointment_date TEXT NOT NULL, appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', google_event_id TEXT, created_at TEXT NOT NULL,
    UNIQUE(barber_id, appointment_date, appointment_time)
  );
  CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_date);
`);

const seed = db.prepare("SELECT COUNT(*) AS count FROM barbers").get();
if (seed.count === 0) {
  const password = process.env.BARBER_DEFAULT_PASSWORD || "troque-esta-senha";
  const insert = db.prepare("INSERT INTO barbers (id,name,phone,password_hash) VALUES (?,?,?,?)");
  [["joao", "João Santos", "55999939207"], ["felipe", "Felipe Lima", "5511000000002"], ["gustavo", "Gustavo Oliveira", "5511000000003"]]
    .forEach(([id, name, phone]) => insert.run(id, name, phone, hashPassword(password)));
  console.log(`Barbeiros criados. Senha inicial: ${password} (altere BARBER_DEFAULT_PASSWORD antes de publicar)`);
}
// Migração dos registros da primeira versão de desenvolvimento.
db.prepare("UPDATE barbers SET phone='5511000000002' WHERE id='felipe' AND phone LIKE '%@local'").run();
db.prepare("UPDATE barbers SET phone='5511000000003' WHERE id='gustavo' AND phone LIKE '%@local'").run();

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}
async function body(req) { let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function auth(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  return sessions.get(token);
}
function slotsFor(date) {
  const d = new Date(`${date}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime()) || d < today || d.getDay() === 0) return [];
  return Array.from({ length: 11 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
}
async function googleEvent(appointment, barber) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) return null;
  const calendarId = barber.google_calendar_id || process.env[`GOOGLE_CALENDAR_ID_${barber.id.toUpperCase()}`] || process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return null;
  const now = Math.floor(Date.now() / 1000), header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(JSON.stringify({ iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/calendar", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })).toString("base64url");
  const sign = createSign("RSA-SHA256"); sign.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${sign.sign(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"), "base64url")}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  if (!tokenRes.ok) throw new Error("Não foi possível autenticar no Google Calendar");
  const { access_token } = await tokenRes.json();
  const start = `${appointment.appointment_date}T${appointment.appointment_time}:00-03:00`;
  const endHour = String(Number(appointment.appointment_time.slice(0, 2)) + 1).padStart(2, "0");
  const eventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ summary: `${appointment.service} — ${appointment.customer_name}`, description: `Cliente: ${appointment.customer_name}\nWhatsApp: ${appointment.customer_phone}`, start: { dateTime: start, timeZone: "America/Sao_Paulo" }, end: { dateTime: `${appointment.appointment_date}T${endHour}:00:00-03:00`, timeZone: "America/Sao_Paulo" } }) });
  if (!eventRes.ok) throw new Error("Google Calendar recusou o evento");
  return (await eventRes.json()).id;
}
async function notifyWhatsApp(appointment, barber) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !barber.phone || !/^\d+$/.test(barber.phone)) return;
  await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: barber.phone, type: "text", text: { body: `Novo agendamento! ${appointment.appointment_date} às ${appointment.appointment_time}\n${appointment.service}\nCliente: ${appointment.customer_name}\nWhatsApp: ${appointment.customer_phone}` } }) });
}

async function api(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/barbers") return json(res, 200, db.prepare("SELECT id,name FROM barbers WHERE active=1 ORDER BY name").all());
    if (req.method === "GET" && url.pathname === "/api/availability") {
      const barber = url.searchParams.get("barberId"), date = url.searchParams.get("date");
      const booked = db.prepare("SELECT appointment_time AS time FROM appointments WHERE barber_id=? AND appointment_date=? AND status='confirmed'").all(barber, date).map(x => x.time);
      return json(res, 200, { slots: slotsFor(date), booked });
    }
    if (req.method === "POST" && url.pathname === "/api/auth/barber") {
      const { phone, password } = await body(req), barber = db.prepare("SELECT * FROM barbers WHERE phone=? AND active=1").get(String(phone || "").replace(/\D/g, "")) || db.prepare("SELECT * FROM barbers WHERE phone=? AND active=1").get(phone);
      if (!barber || !verifyPassword(password || "", barber.password_hash)) return json(res, 401, { error: "Telefone ou senha inválidos" });
      const token = randomUUID(); sessions.set(token, { id: barber.id, name: barber.name });
      return json(res, 200, { token, barber: { id: barber.id, name: barber.name } });
    }
    if (req.method === "POST" && url.pathname === "/api/appointments") {
      const item = await body(req);
      if (!item.customerName || !item.customerPhone || !item.service || !item.barberId || !item.date || !item.time || !slotsFor(item.date).includes(item.time)) return json(res, 400, { error: "Dados de agendamento incompletos" });
      const barber = db.prepare("SELECT * FROM barbers WHERE id=? AND active=1").get(item.barberId); if (!barber) return json(res, 404, { error: "Barbeiro não encontrado" });
      const appointment = { id: randomUUID(), customer_name: item.customerName.trim(), customer_phone: item.customerPhone.trim(), service: item.service.trim(), barber_id: item.barberId, appointment_date: item.date, appointment_time: item.time, status: "confirmed", created_at: new Date().toISOString() };
      try { db.prepare("INSERT INTO appointments (id,customer_name,customer_phone,service,barber_id,appointment_date,appointment_time,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(...Object.values(appointment)); }
      catch (e) { if (String(e).includes("UNIQUE")) return json(res, 409, { error: "Este horário acabou de ser reservado. Escolha outro." }); throw e; }
      try { appointment.google_event_id = await googleEvent(appointment, barber); if (appointment.google_event_id) db.prepare("UPDATE appointments SET google_event_id=? WHERE id=?").run(appointment.google_event_id, appointment.id); } catch (e) { console.error("Google Calendar:", e.message); }
      try { await notifyWhatsApp(appointment, barber); } catch (e) { console.error("WhatsApp:", e.message); }
      return json(res, 201, { id: appointment.id, message: "Agendamento confirmado" });
    }
    const session = auth(req); if (url.pathname.startsWith("/api/barber/") && !session) return json(res, 401, { error: "Faça login como barbeiro" });
    if (req.method === "GET" && url.pathname === "/api/barber/appointments") return json(res, 200, db.prepare("SELECT a.*, b.name AS barber_name FROM appointments a JOIN barbers b ON b.id=a.barber_id WHERE a.barber_id=? AND a.appointment_date >= date('now','localtime') ORDER BY a.appointment_date,a.appointment_time").all(session.id));
    return json(res, 404, { error: "Rota não encontrada" });
  } catch (e) { console.error(e); return json(res, 500, { error: "Erro interno do servidor" }); }
}

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  let file = normalize(join(ROOT, url.pathname === "/" ? "index.html" : url.pathname.slice(1)));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try { await stat(file); const data = await readFile(file); res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }); res.end(data); } catch { res.writeHead(404).end("Not found"); }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Barbearia Bom Jesus: http://localhost:${PORT}`));
