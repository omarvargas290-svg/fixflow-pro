const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataDir = path.join(root, "data");
const usersFile = path.join(dataDir, "users.json");
const storesDir = path.join(dataDir, "stores");
const authSecretFile = path.join(dataDir, "auth-secret.txt");
const tokenTtlMs = 1000 * 60 * 60 * 24 * 7;
const loginThrottle = new Map();

const defaultUsers = {
  defaultUserId: "USR-01",
  users: [
    { id: "USR-01", name: "compucellsirius", role: "Administrador", email: "omarvargas290@gmail.com", password: "Andy2706", active: true },
    { id: "USR-02", name: "Laura Campos", role: "Tecnico", email: "laura@fixflow.pro", password: "123456", active: true }
  ]
};

function userStoreTemplate(user) {
  return {
    ownerUserId: user.id,
    settings: {
      businessName: "FixFlow Pro",
      branchName: `${user.name} - Sucursal Centro`,
      phone: "+52 55 4567 1122",
      whatsapp: "+52 55 4567 1122",
      address: "Av. Reforma 245, Ciudad de Mexico",
      currency: "MXN",
      language: "es-MX",
      publicTracking: true,
      lowStockAlert: 5,
      ticketHeader: "FixFlow Pro | Taller especializado",
      whatsappTemplate: "Hola {{cliente}}, tu equipo {{modelo}} cambio a estado {{estado}}."
    },
    inventory: [
      { id: "INV-101", name: "Pantalla OLED iPhone 13 Pro", sku: "SCR-I13P-001", category: "Pantallas", stock: 2, minStock: 4, cost: 2490, supplierId: "SUP-01" }
    ],
    suppliers: [
      { id: "SUP-01", name: "Global Tech Parts", specialty: "Pantallas y tapas", distance: "0.8 km", rating: 4.8, phone: "+52 55 1100 2233" }
    ],
    orders: [
      {
        id: "RO-8842",
        customer: "Alex Rivera",
        phone: "+52 55 1200 4001",
        whatsapp: "+52 55 1200 4001",
        brand: "Apple",
        model: "iPhone 14 Pro",
        imei: "352674108945230",
        issue: "Pantalla rota y touch intermitente.",
        status: "in_progress",
        technician: user.name,
        estimatedTotal: 4890,
        deposit: 800,
        createdAt: "2026-03-16T10:00:00",
        eta: "2026-03-19",
        notes: [{ at: "2026-03-16T10:00:00", text: "Equipo recibido con display estrellado." }],
        timeline: [
          { label: "Recibido", at: "2026-03-16T10:00:00", state: "done" },
          { label: "En reparacion", at: "2026-03-17T12:30:00", state: "current" },
          { label: "Listo para entrega", at: "", state: "pending" }
        ]
      }
    ]
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(user, password) {
  if (user.passwordHash && user.passwordSalt) {
    const computed = crypto.scryptSync(password, user.passwordSalt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(user.passwordHash, "hex"));
  }
  return typeof user.password === "string" && user.password === password;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    active: Boolean(user.active)
  };
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function readAuthSecret() {
  ensureData();
  return fs.readFileSync(authSecretFile, "utf8");
}

function signToken(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + tokenTtlMs
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", readAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", readAuthSecret()).update(encodedPayload).digest("base64url");
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function migrateUsers(registry) {
  let changed = false;
  registry.users = registry.users.map((user) => {
    if (!user.passwordHash || !user.passwordSalt) {
      const sourcePassword = typeof user.password === "string" ? user.password : "123456";
      const { salt, hash } = hashPassword(sourcePassword);
      changed = true;
      return {
        ...user,
        passwordHash: hash,
        passwordSalt: salt,
        passwordUpdatedAt: new Date().toISOString()
      };
    }
    return user;
  }).map((user) => {
    if ("password" in user) {
      const next = { ...user };
      delete next.password;
      changed = true;
      return next;
    }
    return user;
  });
  if (changed) writeUsers(registry, false);
  return registry;
}

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storesDir)) fs.mkdirSync(storesDir, { recursive: true });
  if (!fs.existsSync(authSecretFile)) fs.writeFileSync(authSecretFile, crypto.randomBytes(32).toString("hex"));
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
  const registry = migrateUsers(JSON.parse(fs.readFileSync(usersFile, "utf8")));
  registry.users.forEach((user) => {
    const file = storePath(user.id);
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(userStoreTemplate(user), null, 2));
  });
}

function storePath(userId) {
  return path.join(storesDir, `${userId}.json`);
}

function readUsers() {
  ensureData();
  return migrateUsers(JSON.parse(fs.readFileSync(usersFile, "utf8")));
}

function writeUsers(data, ensure = true) {
  if (ensure) ensureData();
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

function readStore(userId) {
  ensureData();
  const file = storePath(userId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeStore(userId, data) {
  ensureData();
  fs.writeFileSync(storePath(userId), JSON.stringify(data, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

function sendNoContent(res) {
  res.writeHead(204, { "Cache-Control": "no-store" });
  res.end();
}

function contentType(file) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png"
  }[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "X-Content-Type-Options": "nosniff"
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function getAuthToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

function requireAuth(req, res) {
  const token = getAuthToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return null;
  }
  const registry = readUsers();
  const user = registry.users.find((item) => item.id === payload.userId && item.active);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "invalid_session" });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (String(user.role || "").toLowerCase() !== "administrador") {
    sendJson(res, 403, { ok: false, error: "admin_required" });
    return null;
  }
  return user;
}

function throttleKey(req, email) {
  return `${req.socket.remoteAddress || "unknown"}:${String(email || "").toLowerCase()}`;
}

function canAttemptLogin(req, email) {
  const key = throttleKey(req, email);
  const now = Date.now();
  const entry = loginThrottle.get(key);
  if (!entry) return true;
  if (entry.blockedUntil && entry.blockedUntil > now) return false;
  if (entry.lastAttemptAt && now - entry.lastAttemptAt > 15 * 60 * 1000) {
    loginThrottle.delete(key);
    return true;
  }
  return true;
}

function recordLoginFailure(req, email) {
  const key = throttleKey(req, email);
  const now = Date.now();
  const current = loginThrottle.get(key) || { failures: 0, blockedUntil: 0, lastAttemptAt: now };
  current.failures += 1;
  current.lastAttemptAt = now;
  if (current.failures >= 5) current.blockedUntil = now + 5 * 60 * 1000;
  loginThrottle.set(key, current);
}

function clearLoginThrottle(req, email) {
  loginThrottle.delete(throttleKey(req, email));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") return sendNoContent(res);

  if (url.pathname === "/api/login" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return sendJson(res, 400, { ok: false, error: "missing_credentials" });
      if (!canAttemptLogin(req, email)) return sendJson(res, 429, { ok: false, error: "too_many_attempts" });

      const registry = readUsers();
      const user = registry.users.find((item) => item.email.toLowerCase() === email && item.active);
      const pendingUser = registry.users.find((item) => item.email.toLowerCase() === email && !item.active);
      if (pendingUser) {
        recordLoginFailure(req, email);
        return sendJson(res, 403, { ok: false, error: "pending_approval" });
      }
      if (!user || !verifyPassword(user, password)) {
        recordLoginFailure(req, email);
        return sendJson(res, 401, { ok: false, error: "invalid_credentials" });
      }

      clearLoginThrottle(req, email);
      return sendJson(res, 200, { ok: true, user: sanitizeUser(user), token: signToken(user) });
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid_request" });
    }
  }

  if (url.pathname === "/api/session" && req.method === "GET") {
    const user = requireAuth(req, res);
    if (!user) return;
    return sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
  }

  if (url.pathname === "/api/bootstrap" && req.method === "GET") {
    const user = requireAuth(req, res);
    if (!user) return;
    const registry = readUsers();
    return sendJson(res, 200, {
      defaultUserId: registry.defaultUserId,
      users: registry.users.map(sanitizeUser),
      currentUser: sanitizeUser(user)
    });
  }

  if (url.pathname === "/api/state") {
    const user = requireAuth(req, res);
    if (!user) return;
    const requestedUserId = url.searchParams.get("userId") || user.id;
    if (requestedUserId !== user.id) return sendJson(res, 403, { ok: false, error: "forbidden" });
    if (req.method === "GET") {
      const store = readStore(requestedUserId);
      return store ? sendJson(res, 200, store) : sendJson(res, 404, { ok: false });
    }
    if (req.method === "PUT") {
      try {
        const body = await readBody(req);
        if (String(body.ownerUserId || "") !== user.id) return sendJson(res, 403, { ok: false, error: "forbidden" });
        writeStore(requestedUserId, body);
        return sendJson(res, 200, { ok: true });
      } catch {
        return sendJson(res, 400, { ok: false, error: "invalid_request" });
      }
    }
    return sendJson(res, 405, { ok: false });
  }

  if (url.pathname === "/api/register" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const registry = readUsers();
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = String(body.role || "Tecnico").trim() || "Tecnico";

      if (!name || !email || !password) return sendJson(res, 400, { ok: false, error: "missing_fields" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { ok: false, error: "invalid_email" });
      if (password.length < 6) return sendJson(res, 400, { ok: false, error: "weak_password" });
      if (registry.users.some((item) => item.email.toLowerCase() === email)) return sendJson(res, 409, { ok: false, error: "email_exists" });

      const nextId = `USR-${String(registry.users.length + 1).padStart(2, "0")}`;
      const hashed = hashPassword(password);
      const user = {
        id: nextId,
        name,
        role,
        email,
        active: false,
        passwordHash: hashed.hash,
        passwordSalt: hashed.salt,
        passwordUpdatedAt: new Date().toISOString()
      };
      registry.users.push(user);
      writeUsers(registry);
      writeStore(user.id, userStoreTemplate(user));
      return sendJson(res, 201, { ok: true, user: sanitizeUser(user) });
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid_request" });
    }
  }

  if (url.pathname === "/api/users" && req.method === "POST") {
    const authUser = requireAdmin(req, res);
    if (!authUser) return;
    try {
      const body = await readBody(req);
      const registry = readUsers();
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = String(body.role || "Tecnico").trim() || "Tecnico";

      if (!name || !email || !password) return sendJson(res, 400, { ok: false, error: "missing_fields" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { ok: false, error: "invalid_email" });
      if (password.length < 6) return sendJson(res, 400, { ok: false, error: "weak_password" });
      if (registry.users.some((item) => item.email.toLowerCase() === email)) return sendJson(res, 409, { ok: false, error: "email_exists" });

      const nextId = `USR-${String(registry.users.length + 1).padStart(2, "0")}`;
      const hashed = hashPassword(password);
      const user = {
        id: nextId,
        name,
        role,
        email,
        active: true,
        passwordHash: hashed.hash,
        passwordSalt: hashed.salt,
        passwordUpdatedAt: new Date().toISOString()
      };
      registry.users.push(user);
      writeUsers(registry);
      writeStore(user.id, userStoreTemplate(user));
      return sendJson(res, 201, { ok: true, user: sanitizeUser(user) });
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid_request" });
    }
  }

  if (url.pathname.startsWith("/api/users/") && req.method === "DELETE") {
    const authUser = requireAdmin(req, res);
    if (!authUser) return;
    const userId = url.pathname.split("/").pop();
    if (userId === authUser.id) return sendJson(res, 400, { ok: false, error: "self_delete" });
    const registry = readUsers();
    const user = registry.users.find((item) => item.id === userId);
    if (!user) return sendJson(res, 404, { ok: false });
    registry.users = registry.users.filter((item) => item.id !== userId);
    writeUsers(registry);
    const file = storePath(userId);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname.startsWith("/api/users/") && url.pathname.endsWith("/approve") && req.method === "POST") {
    const authUser = requireAdmin(req, res);
    if (!authUser) return;
    const parts = url.pathname.split("/");
    const userId = parts[3];
    const registry = readUsers();
    const user = registry.users.find((item) => item.id === userId);
    if (!user) return sendJson(res, 404, { ok: false });
    user.active = true;
    writeUsers(registry);
    return sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
  }

  let filePath = path.join(root, url.pathname === "/" ? "index.html" : url.pathname.slice(1));
  if (!filePath.startsWith(root)) return sendJson(res, 403, { ok: false });
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(root, "index.html");
  serveFile(res, filePath);
});

server.listen(port, () => {
  ensureData();
  console.log(`FixFlow Pro running on http://localhost:${port}`);
});
