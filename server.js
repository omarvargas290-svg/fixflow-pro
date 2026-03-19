const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataDir = path.join(root, "data");
const usersFile = path.join(dataDir, "users.json");
const storesDir = path.join(dataDir, "stores");

const defaultUsers = {
  defaultUserId: "USR-01",
  users: [
    { id: "USR-01", name: "Juan Delgado", role: "Administrador", email: "tecnico@fixflow.pro", password: "123456", active: true },
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

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storesDir)) fs.mkdirSync(storesDir, { recursive: true });
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
  const registry = JSON.parse(fs.readFileSync(usersFile, "utf8"));
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
  return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

function writeUsers(data) {
  ensureData();
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
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
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
    res.writeHead(200, { "Content-Type": contentType(filePath) });
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
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/bootstrap") {
    return sendJson(res, 200, readUsers());
  }

  if (url.pathname === "/api/state") {
    const userId = url.searchParams.get("userId");
    if (!userId) return sendJson(res, 400, { ok: false, error: "userId required" });
    if (req.method === "GET") {
      const store = readStore(userId);
      return store ? sendJson(res, 200, store) : sendJson(res, 404, { ok: false });
    }
    if (req.method === "PUT") {
      try {
        const body = await readBody(req);
        writeStore(userId, body);
        return sendJson(res, 200, { ok: true });
      } catch {
        return sendJson(res, 400, { ok: false });
      }
    }
    return sendJson(res, 405, { ok: false });
  }

  if (url.pathname === "/api/users" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const registry = readUsers();
      if (registry.users.some((u) => u.email.toLowerCase() === String(body.email || "").toLowerCase())) {
        return sendJson(res, 409, { ok: false, error: "email_exists" });
      }
      const nextId = `USR-${String(registry.users.length + 1).padStart(2, "0")}`;
      const user = {
        id: nextId,
        name: String(body.name || ""),
        role: String(body.role || "Tecnico"),
        email: String(body.email || "").toLowerCase(),
        password: String(body.password || ""),
        active: true
      };
      registry.users.push(user);
      writeUsers(registry);
      writeStore(user.id, userStoreTemplate(user));
      return sendJson(res, 201, { ok: true, user });
    } catch {
      return sendJson(res, 400, { ok: false });
    }
  }

  if (url.pathname.startsWith("/api/users/") && req.method === "DELETE") {
    const userId = url.pathname.split("/").pop();
    const registry = readUsers();
    const user = registry.users.find((u) => u.id === userId);
    if (!user) return sendJson(res, 404, { ok: false });
    registry.users = registry.users.filter((u) => u.id !== userId);
    writeUsers(registry);
    const file = storePath(userId);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return sendJson(res, 200, { ok: true });
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
