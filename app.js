const STORAGE_KEY = "fixflow-local-v4";
const API_BOOTSTRAP = `${window.location.origin}/api/bootstrap`;
const API_STATE = `${window.location.origin}/api/state`;
const API_USERS = `${window.location.origin}/api/users`;

const defaultBusiness = {
  ownerUserId: "",
  settings: { businessName: "FixFlow Pro", branchName: "Sucursal Centro", phone: "", whatsapp: "", address: "", currency: "MXN", language: "es-MX", publicTracking: true, lowStockAlert: 5, ticketHeader: "FixFlow Pro", whatsappTemplate: "Hola {{cliente}}, tu equipo {{modelo}} cambio a estado {{estado}}." },
  inventory: [],
  suppliers: [],
  orders: []
};

const defaultLocal = {
  session: { loggedIn: false, user: { id: "", name: "", role: "", email: "" } },
  currentView: "dashboard",
  selectedOrderId: "",
  selectedInventoryId: "",
  filters: { orderSearch: "", orderStatus: "all", inventorySearch: "", supplierSearch: "", trackingCode: "" },
  users: [],
  defaultUserId: ""
};

let state = { ...structuredClone(defaultBusiness), ...structuredClone(defaultLocal) };
let backendMode = false;

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: state.settings.currency || "MXN", maximumFractionDigits: 0 }).format(n || 0);
const dt = (v) => !v ? "Pendiente" : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
const dd = (v) => !v ? "Pendiente" : new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(v));
const statusLabel = (s) => ({ received: "Recibido", in_progress: "En proceso", waiting_parts: "Esperando repuestos", ready: "Listo", delivered: "Entregado" })[s] || s;

function trackingUrl(orderId, userId = state.ownerUserId || state.session.user.id) {
  return `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(userId)}&tracking=${encodeURIComponent(orderId)}`;
}

function loadLocal() {
  try {
    return { ...structuredClone(defaultLocal), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaultLocal);
  }
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    session: state.session,
    currentView: state.currentView,
    selectedOrderId: state.selectedOrderId,
    selectedInventoryId: state.selectedInventoryId,
    filters: state.filters,
    defaultUserId: state.defaultUserId
  }));
}

async function fetchBootstrap() {
  try {
    const res = await fetch(API_BOOTSTRAP, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error();
    backendMode = true;
    return await res.json();
  } catch {
    backendMode = false;
    return { users: [], defaultUserId: "" };
  }
}

async function fetchState(userId) {
  if (!userId) return structuredClone(defaultBusiness);
  try {
    const res = await fetch(`${API_STATE}?userId=${encodeURIComponent(userId)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return structuredClone(defaultBusiness);
  }
}

async function persistBusiness() {
  if (!backendMode || !state.ownerUserId) return;
  await fetch(`${API_STATE}?userId=${encodeURIComponent(state.ownerUserId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerUserId: state.ownerUserId,
      settings: state.settings,
      inventory: state.inventory,
      suppliers: state.suppliers,
      orders: state.orders
    })
  }).catch(() => {});
}

async function refreshRegistry() {
  const bootstrap = await fetchBootstrap();
  state.users = bootstrap.users || [];
  state.defaultUserId = bootstrap.defaultUserId || "";
}

async function initialize() {
  const local = loadLocal();
  state = { ...structuredClone(defaultBusiness), ...structuredClone(defaultLocal), ...local };
  await refreshRegistry();

  const route = getTrackingRoute();
  if (route.userId) {
    Object.assign(state, await fetchState(route.userId));
    state.ownerUserId = route.userId;
  } else if (state.session.loggedIn && state.session.user.id) {
    Object.assign(state, await fetchState(state.session.user.id));
    state.ownerUserId = state.session.user.id;
  }

  if (!state.selectedOrderId && state.orders[0]) state.selectedOrderId = state.orders[0].id;
  render();
}

function setState(mutator, persist = false) {
  mutator(state);
  saveLocal();
  if (persist) persistBusiness();
  render();
}

function currentOrder() {
  return state.orders.find((o) => o.id === state.selectedOrderId) || state.orders[0] || null;
}

function currentInventoryItem() {
  return state.inventory.find((i) => i.id === state.selectedInventoryId) || null;
}

function getTrackingRoute() {
  const params = new URLSearchParams(window.location.search);
  return {
    userId: (params.get("u") || "").trim(),
    tracking: (params.get("tracking") || "").trim().toUpperCase()
  };
}

function renderLogin() {
  return `<section class="screen login-screen"><div class="login-card"><div class="logo-lockup"><div class="logo-badge">FF</div><div><p class="eyebrow">Taller tecnico</p><h1>FixFlow Pro</h1><p class="muted">${backendMode ? "Backend por usuario activo" : "Modo local temporal"}</p></div></div><form id="login-form" class="login-form"><div class="field"><label>Correo</label><input name="email" value="${esc(state.session.user.email)}" required></div><div class="field"><label>Contrasena</label><input name="password" type="password" value="123456" required></div><button class="btn" type="submit">Entrar</button></form><div class="login-hint"><strong>Usuarios</strong><p class="muted">${state.users.length ? `${state.users.length} disponibles` : "Sin backend de usuarios"}</p></div></div></section>`;
}

function renderNav() {
  const items = [["dashboard", "Dashboard"], ["orders", "Ordenes"], ["new-order", "Nueva orden"], ["inventory", "Inventario"], ["suppliers", "Proveedores"], ["settings", "Configuracion"], ["tracking", "Seguimiento"]];
  return items.map(([id, label]) => `<button class="nav-btn ${state.currentView === id ? "active" : ""}" data-nav="${id}"><span>${label}</span><span>></span></button>`).join("");
}

function shell(title, subtitle, content) {
  return `<div class="app-layout"><aside class="sidebar"><div><div class="brand"><div class="brand-mark">FF</div><div><h3>${esc(state.settings.businessName || "FixFlow Pro")}</h3><p class="muted" style="color: rgba(248,251,255,0.64);">${esc(state.settings.branchName || "")}</p></div></div><nav>${renderNav()}</nav></div><button class="ghost-btn" data-action="logout">Cerrar sesion</button></aside><main class="workspace"><header class="topbar"><div><p class="eyebrow">Operacion</p><h2>${esc(title)}</h2><p class="muted">${esc(subtitle)}</p></div><div class="topbar-actions"><span class="topbar-badge">${backendMode ? `DB ${esc(state.ownerUserId)}` : "Local"}</span><button class="btn" data-nav="new-order">Nueva orden</button></div></header>${content}<div class="mobile-nav">${renderNav()}</div></main></div>`;
}

function orderCard(order) {
  return `<article class="order-card"><div class="card-top"><div><h4>${esc(order.customer)}</h4><p class="muted">${esc(order.brand)} ${esc(order.model)}</p></div><span class="status ${esc(order.status)}">${esc(statusLabel(order.status))}</span></div><div class="meta"><span>${esc(order.id)}</span><span>${esc(order.technician)}</span></div><div class="card-row"><div><strong>${money(order.estimatedTotal)}</strong><p class="muted">ETA ${esc(dd(order.eta))}</p></div><button class="btn" data-open-order="${esc(order.id)}">Detalle</button></div></article>`;
}

function buildTimeline(createdAt, status) {
  const now = new Date().toISOString();
  if (status === "received") return [{ label: "Recibido", at: createdAt, state: "current" }, { label: "En reparacion", at: "", state: "pending" }, { label: "Listo para entrega", at: "", state: "pending" }];
  if (status === "in_progress" || status === "waiting_parts") return [{ label: "Recibido", at: createdAt, state: "done" }, { label: status === "waiting_parts" ? "Esperando repuestos" : "En reparacion", at: now, state: "current" }, { label: "Listo para entrega", at: "", state: "pending" }];
  if (status === "ready") return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "En reparacion", at: now, state: "done" }, { label: "Listo para entrega", at: now, state: "current" }];
  return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "En reparacion", at: now, state: "done" }, { label: "Entregado", at: now, state: "current" }];
}

function renderDashboard() {
  const active = state.orders.filter((o) => ["received", "in_progress", "waiting_parts"].includes(o.status)).length;
  const ready = state.orders.filter((o) => o.status === "ready").length;
  const delivered = state.orders.filter((o) => o.status === "delivered").length;
  const low = state.inventory.filter((i) => i.stock <= i.minStock).length;
  return shell("Dashboard", "Resumen general del taller", `<section class="dashboard-grid"><article class="metric-card"><span class="muted">Activas</span><div class="metric-value">${active}</div></article><article class="metric-card"><span class="muted">Listas</span><div class="metric-value">${ready}</div></article><article class="metric-card"><span class="muted">Entregadas</span><div class="metric-value">${delivered}</div></article><article class="metric-card"><span class="muted">Bajo stock</span><div class="metric-value">${low}</div></article></section><section class="panel"><div class="section-head"><div><h3>Ordenes recientes</h3><p class="muted">Base independiente del usuario actual.</p></div></div><div class="stack">${state.orders.map(orderCard).join("")}</div></section>`);
}

function renderOrders() {
  const term = state.filters.orderSearch.toLowerCase().trim();
  const filtered = state.orders.filter((o) => (state.filters.orderStatus === "all" || o.status === state.filters.orderStatus) && (!term || [o.id, o.customer, o.model, o.phone].join(" ").toLowerCase().includes(term)));
  const order = currentOrder();
  const detail = order ? `<section class="panel"><div class="section-head"><div><h3>${esc(order.id)}</h3><p class="muted">${esc(order.customer)} - ${esc(order.model)}</p></div><span class="status ${esc(order.status)}">${esc(statusLabel(order.status))}</span></div><div class="toolbar"><select data-order-status="${esc(order.id)}"><option value="received" ${order.status === "received" ? "selected" : ""}>Recibido</option><option value="in_progress" ${order.status === "in_progress" ? "selected" : ""}>En proceso</option><option value="waiting_parts" ${order.status === "waiting_parts" ? "selected" : ""}>Esperando repuestos</option><option value="ready" ${order.status === "ready" ? "selected" : ""}>Listo</option><option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Entregado</option></select><button class="ghost-btn" data-share="${esc(order.id)}">Compartir seguimiento</button><button class="btn" data-print="${esc(order.id)}">Imprimir ticket</button></div><div class="note" style="margin-top:16px;"><strong>Liga publica</strong><p class="mono muted">${esc(trackingUrl(order.id))}</p></div><div class="timeline" style="margin-top:16px;">${order.timeline.map((s) => `<div class="timeline-item ${esc(s.state === "pending" ? "" : s.state)}"><strong>${esc(s.label)}</strong><p class="muted">${esc(s.at ? dt(s.at) : "Pendiente")}</p></div>`).join("")}</div></section>` : "";
  return shell("Ordenes", "Control de tickets", `<section class="panel"><div class="section-head"><div><h3>Ordenes</h3><p class="muted">Solo del usuario actual.</p></div><div class="toolbar"><input data-filter="orderSearch" value="${esc(state.filters.orderSearch)}" placeholder="Buscar"><select data-filter-status><option value="all" ${state.filters.orderStatus === "all" ? "selected" : ""}>Todas</option><option value="received" ${state.filters.orderStatus === "received" ? "selected" : ""}>Recibidas</option><option value="in_progress" ${state.filters.orderStatus === "in_progress" ? "selected" : ""}>En proceso</option><option value="waiting_parts" ${state.filters.orderStatus === "waiting_parts" ? "selected" : ""}>Esperando repuestos</option><option value="ready" ${state.filters.orderStatus === "ready" ? "selected" : ""}>Listas</option><option value="delivered" ${state.filters.orderStatus === "delivered" ? "selected" : ""}>Entregadas</option></select></div></div><div class="detail-layout"><div class="stack">${filtered.map(orderCard).join("")}</div>${detail}</div></section>`);
}

function renderNewOrder() {
  return shell("Nueva orden", "Alta de reparacion", `<section class="panel"><form id="new-order-form" class="new-order-form"><div class="split"><div class="field"><label>Cliente</label><input name="customer" required></div><div class="field"><label>Telefono</label><input name="phone" required></div></div><div class="split"><div class="field"><label>WhatsApp</label><input name="whatsapp"></div><div class="field"><label>Marca</label><input name="brand" required></div></div><div class="split"><div class="field"><label>Modelo</label><input name="model" required></div><div class="field"><label>IMEI</label><input name="imei"></div></div><div class="split"><div class="field"><label>Tecnico</label><input name="technician" value="${esc(state.session.user.name)}" required></div><div class="field"><label>Anticipo</label><input name="deposit" type="number" value="0"></div></div><div class="field"><label>Total estimado</label><input name="estimatedTotal" type="number" value="0"></div><div class="field"><label>Falla</label><textarea name="issue" rows="4" required></textarea></div><button class="btn" type="submit">Crear orden</button></form></section>`);
}

function renderInventory() {
  const term = state.filters.inventorySearch.toLowerCase().trim();
  const items = state.inventory.filter((i) => !term || [i.name, i.sku, i.category].join(" ").toLowerCase().includes(term));
  const editing = currentInventoryItem();
  return shell("Inventario", "Repuestos y existencias", `<section class="settings-grid"><div class="panel"><div class="section-head"><div><h3>Inventario</h3><p class="muted">Base independiente por usuario.</p></div><div class="toolbar"><input data-filter="inventorySearch" value="${esc(state.filters.inventorySearch)}" placeholder="Buscar repuesto"><button class="ghost-btn" data-new-inventory>Nuevo repuesto</button></div></div><div class="three-col">${items.map((i) => `<article class="stock-card"><div class="card-top"><div><h4>${esc(i.name)}</h4><p class="muted">${esc(i.sku)} - ${esc(i.category)}</p></div><span class="status ${i.stock <= i.minStock ? "in_progress" : "ready"}">${i.stock}</span></div><p class="muted">Minimo ${i.minStock}</p><strong>${money(i.cost)}</strong><div class="card-row"><span class="muted">Proveedor ${esc(i.supplierId || "N/A")}</span><button class="ghost-btn" data-edit-inventory="${esc(i.id)}">Editar</button></div></article>`).join("") || `<div class="empty-state">No hay repuestos.</div>`}</div></div><div class="panel"><div class="section-head"><div><h3>${editing ? "Editar repuesto" : "Agregar repuesto"}</h3><p class="muted">${editing ? `Actualizando ${esc(editing.name)}` : "Crear una nueva pieza para este usuario."}</p></div></div><form id="inventory-form" class="settings-form"><input type="hidden" name="id" value="${esc(editing ? editing.id : "")}"><div class="field"><label>Nombre</label><input name="name" value="${esc(editing ? editing.name : "")}" required></div><div class="split"><div class="field"><label>SKU</label><input name="sku" value="${esc(editing ? editing.sku : "")}" required></div><div class="field"><label>Categoria</label><input name="category" value="${esc(editing ? editing.category : "")}" required></div></div><div class="split"><div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="${esc(editing ? editing.stock : 0)}" required></div><div class="field"><label>Stock minimo</label><input name="minStock" type="number" min="0" value="${esc(editing ? editing.minStock : 1)}" required></div></div><div class="split"><div class="field"><label>Costo</label><input name="cost" type="number" min="0" value="${esc(editing ? editing.cost : 0)}" required></div><div class="field"><label>ID proveedor</label><input name="supplierId" value="${esc(editing ? editing.supplierId : "")}"></div></div><div class="card-row"><button class="btn" type="submit">${editing ? "Guardar cambios" : "Agregar repuesto"}</button>${editing ? `<button class="ghost-btn" type="button" data-cancel-inventory>Cancelar</button>` : ""}</div></form></section>`);
}

function renderSuppliers() {
  const term = state.filters.supplierSearch.toLowerCase().trim();
  const items = state.suppliers.filter((s) => !term || [s.name, s.specialty].join(" ").toLowerCase().includes(term));
  return shell("Proveedores", "Red de suministro", `<section class="panel"><div class="section-head"><div><h3>Proveedores</h3><p class="muted">Directorio del usuario actual.</p></div><div class="toolbar"><input data-filter="supplierSearch" value="${esc(state.filters.supplierSearch)}" placeholder="Buscar proveedor"></div></div><div class="three-col">${items.map((s) => `<article class="supplier-card"><div class="card-top"><div><h4>${esc(s.name)}</h4><p class="muted">${esc(s.specialty)}</p></div><span class="status ready">${esc(s.rating)}</span></div><p class="muted">${esc(s.phone)} - ${esc(s.distance)}</p></article>`).join("")}</div></section>`);
}

function renderSettings() {
  return shell("Configuracion", "Negocio y usuarios", `<section class="settings-grid"><div class="panel"><form id="settings-form" class="settings-form"><div class="split"><div class="field"><label>Nombre</label><input name="businessName" value="${esc(state.settings.businessName)}"></div><div class="field"><label>Sucursal</label><input name="branchName" value="${esc(state.settings.branchName)}"></div></div><div class="split"><div class="field"><label>Telefono</label><input name="phone" value="${esc(state.settings.phone)}"></div><div class="field"><label>WhatsApp</label><input name="whatsapp" value="${esc(state.settings.whatsapp)}"></div></div><div class="field"><label>Direccion</label><input name="address" value="${esc(state.settings.address)}"></div><div class="split"><div class="field"><label>Seguimiento publico</label><select name="publicTracking"><option value="true" ${state.settings.publicTracking ? "selected" : ""}>Activo</option><option value="false" ${!state.settings.publicTracking ? "selected" : ""}>Inactivo</option></select></div><div class="field"><label>Moneda</label><select name="currency"><option value="MXN" ${state.settings.currency === "MXN" ? "selected" : ""}>MXN</option><option value="USD" ${state.settings.currency === "USD" ? "selected" : ""}>USD</option></select></div></div><div class="field"><label>Plantilla WhatsApp</label><textarea name="whatsappTemplate" rows="3">${esc(state.settings.whatsappTemplate)}</textarea></div><button class="btn" type="submit">Guardar</button></form></div><div class="stack"><section class="panel"><div class="section-head"><div><h3>Usuarios</h3><p class="muted">Cada usuario tiene su propia base.</p></div></div><div class="user-list">${state.users.map((u) => `<div class="user-row"><div><strong>${esc(u.name)}</strong><p class="muted">${esc(u.email)} - ${esc(u.role)}</p></div><div class="user-actions"><span class="status ${u.active ? "ready" : "delivered"}">${u.active ? "Activo" : "Inactivo"}</span><button class="ghost-btn danger-btn" data-delete-user="${esc(u.id)}">Eliminar</button></div></div>`).join("")}</div></section><section class="panel"><form id="user-form" class="settings-form"><div class="field"><label>Nombre</label><input name="name" required></div><div class="field"><label>Correo</label><input name="email" type="email" required></div><div class="split"><div class="field"><label>Rol</label><input name="role" value="Tecnico" required></div><div class="field"><label>Contrasena</label><input name="password" required></div></div><button class="btn" type="submit">Crear usuario</button></form></section></div></section>`);
}

function trackingCard(order) {
  return `<div class="tracking-result panel"><div class="tracking-row"><div><p class="eyebrow">Orden ${esc(order.id)}</p><h3>${esc(order.brand)} ${esc(order.model)}</h3><p class="muted">${esc(order.customer)}</p></div><span class="status ${esc(order.status)}">${esc(statusLabel(order.status))}</span></div><div class="tracking-list" style="margin-top:16px;">${order.timeline.map((s) => `<div class="tracking-step"><strong>${esc(s.label)}</strong><p class="muted">${esc(s.at ? dt(s.at) : "Pendiente")}</p></div>`).join("")}</div></div>`;
}

function renderTracking() {
  const order = state.filters.trackingCode ? state.orders.find((o) => o.id.toUpperCase() === state.filters.trackingCode.toUpperCase()) : null;
  return shell("Seguimiento", "Consulta publica por folio", `<section class="tracking-card" style="width:100%;max-width:none;"><form id="tracking-form" class="tracking-form"><div class="split"><div class="field"><label>Codigo</label><input name="trackingCode" value="${esc(state.filters.trackingCode)}" placeholder="RO-8842"></div><div class="field" style="align-self:end;"><button class="btn" type="submit">Consultar</button></div></div></form>${order ? trackingCard(order) : ""}</section>`);
}

function renderPublicTracking(order) {
  if (!order) return `<section class="screen login-screen"><div class="tracking-card"><h1>Orden no encontrada</h1></div></section>`;
  return `<section class="screen login-screen"><div class="tracking-card" style="width:min(100%,780px);"><div class="section-head"><div><p class="eyebrow">${esc(state.settings.businessName)}</p><h1>Seguimiento de reparacion</h1><p class="muted">Vista publica independiente</p></div><a class="ghost-btn" href="${esc(window.location.pathname)}">Volver</a></div>${trackingCard(order)}</div></section>`;
}

function render() {
  const app = document.getElementById("app");
  const route = getTrackingRoute();
  const order = route.tracking ? state.orders.find((o) => o.id.toUpperCase() === route.tracking) : null;
  if (route.userId && route.tracking && state.settings.publicTracking) app.innerHTML = renderPublicTracking(order);
  else app.innerHTML = state.session.loggedIn ? ({ dashboard: renderDashboard, orders: renderOrders, "new-order": renderNewOrder, inventory: renderInventory, suppliers: renderSuppliers, settings: renderSettings, tracking: renderTracking }[state.currentView] || renderDashboard)() : renderLogin();
  bind();
}

function printTicket(order) {
  const html = `<html><head><title>${esc(order.id)}</title><style>@page{size:80mm auto;margin:0}body{font-family:Consolas,monospace;width:72mm;margin:0 auto;padding:3mm;color:#000;font-size:11px}h3,p{margin:0} .line{border-top:1px dashed #000;margin:2.5mm 0}.row{display:flex;justify-content:space-between;gap:4px}.center{text-align:center}.small{font-size:10px}</style></head><body><div class="center"><h3>${esc(state.settings.businessName)}</h3><p class="small">${esc(state.settings.ticketHeader)}</p><p class="small">${esc(state.settings.address)}</p><p class="small">${esc(state.settings.phone)}</p></div><div class="line"></div><p>Orden: ${esc(order.id)}</p><p>Cliente: ${esc(order.customer)}</p><p>Equipo: ${esc(order.brand)} ${esc(order.model)}</p><p>Estado: ${esc(statusLabel(order.status))}</p><p>Falla: ${esc(order.issue)}</p><div class="line"></div><div class="row"><span>Total</span><span>${esc(money(order.estimatedTotal))}</span></div><div class="row"><span>Anticipo</span><span>${esc(money(order.deposit))}</span></div><div class="row"><strong>Saldo</strong><strong>${esc(money(order.estimatedTotal - order.deposit))}</strong></div><div class="line"></div><p class="small">${esc(trackingUrl(order.id))}</p></body></html>`;
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach((b) => b.onclick = () => setState((s) => { s.currentView = b.dataset.nav; }));
  document.querySelectorAll("[data-open-order]").forEach((b) => b.onclick = () => setState((s) => { s.selectedOrderId = b.dataset.openOrder; s.currentView = "orders"; }));
  document.querySelectorAll("[data-edit-inventory]").forEach((b) => b.onclick = () => setState((s) => { s.selectedInventoryId = b.dataset.editInventory; }));
  document.querySelectorAll("[data-new-inventory]").forEach((b) => b.onclick = () => setState((s) => { s.selectedInventoryId = ""; }));
  document.querySelectorAll("[data-cancel-inventory]").forEach((b) => b.onclick = () => setState((s) => { s.selectedInventoryId = ""; }));
  document.querySelectorAll("[data-filter]").forEach((i) => i.oninput = () => setState((s) => { s.filters[i.dataset.filter] = i.value; }));
  const status = document.querySelector("[data-filter-status]");
  if (status) status.onchange = () => setState((s) => { s.filters.orderStatus = status.value; });

  const login = document.getElementById("login-form");
  if (login) login.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(login);
    const email = String(f.get("email") || "").trim().toLowerCase();
    const password = String(f.get("password") || "");
    const user = state.users.find((u) => u.active && u.email.toLowerCase() === email && u.password === password);
    if (!user) return window.alert("Credenciales invalidas.");
    Object.assign(state, await fetchState(user.id));
    state.ownerUserId = user.id;
    state.session.loggedIn = true;
    state.session.user = { id: user.id, name: user.name, role: user.role, email: user.email };
    state.selectedOrderId = state.orders[0] ? state.orders[0].id : "";
    saveLocal();
    render();
  };

  const orderForm = document.getElementById("new-order-form");
  if (orderForm) orderForm.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(orderForm);
    const createdAt = new Date().toISOString();
    const nextId = `RO-${Math.max(8842, ...state.orders.map((o) => Number(o.id.replace(/\D/g, "")) || 0)) + 1}`;
    setState((s) => {
      s.orders.unshift({
        id: nextId,
        customer: String(f.get("customer") || ""),
        phone: String(f.get("phone") || ""),
        whatsapp: String(f.get("whatsapp") || f.get("phone") || ""),
        brand: String(f.get("brand") || ""),
        model: String(f.get("model") || ""),
        imei: String(f.get("imei") || ""),
        issue: String(f.get("issue") || ""),
        status: "received",
        technician: String(f.get("technician") || ""),
        estimatedTotal: Number(f.get("estimatedTotal") || 0),
        deposit: Number(f.get("deposit") || 0),
        createdAt,
        eta: new Date(Date.now() + 259200000).toISOString(),
        notes: [{ at: createdAt, text: "Orden creada desde formulario." }],
        timeline: buildTimeline(createdAt, "received")
      });
      s.selectedOrderId = nextId;
      s.currentView = "orders";
    }, true);
  };

  const inventoryForm = document.getElementById("inventory-form");
  if (inventoryForm) inventoryForm.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(inventoryForm);
    const id = String(f.get("id") || "").trim();
    setState((s) => {
      if (id) {
        const item = s.inventory.find((inv) => inv.id === id);
        if (!item) return;
        item.name = String(f.get("name") || "");
        item.sku = String(f.get("sku") || "");
        item.category = String(f.get("category") || "");
        item.stock = Number(f.get("stock") || 0);
        item.minStock = Number(f.get("minStock") || 0);
        item.cost = Number(f.get("cost") || 0);
        item.supplierId = String(f.get("supplierId") || "");
      } else {
        const nextId = `INV-${Math.max(100, ...s.inventory.map((inv) => Number(inv.id.replace(/\D/g, "")) || 0)) + 1}`;
        s.inventory.unshift({
          id: nextId,
          name: String(f.get("name") || ""),
          sku: String(f.get("sku") || ""),
          category: String(f.get("category") || ""),
          stock: Number(f.get("stock") || 0),
          minStock: Number(f.get("minStock") || 0),
          cost: Number(f.get("cost") || 0),
          supplierId: String(f.get("supplierId") || "")
        });
      }
      s.selectedInventoryId = "";
    }, true);
  };

  const settings = document.getElementById("settings-form");
  if (settings) settings.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(settings);
    setState((s) => {
      s.settings = { ...s.settings, businessName: String(f.get("businessName") || ""), branchName: String(f.get("branchName") || ""), phone: String(f.get("phone") || ""), whatsapp: String(f.get("whatsapp") || ""), address: String(f.get("address") || ""), publicTracking: String(f.get("publicTracking")) === "true", currency: String(f.get("currency") || "MXN"), whatsappTemplate: String(f.get("whatsappTemplate") || "") };
    }, true);
  };

  const userForm = document.getElementById("user-form");
  if (userForm) userForm.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(userForm);
    const email = String(f.get("email") || "").trim().toLowerCase();
    if (!emailOk(email)) return window.alert("Ingresa un email valido.");
    if (state.users.some((u) => u.email.toLowerCase() === email)) return window.alert("Ese correo ya existe.");
    const res = await fetch(API_USERS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(f.get("name") || ""), email, role: String(f.get("role") || "Tecnico"), password: String(f.get("password") || "") }) });
    if (!res.ok) return window.alert("No se pudo crear el usuario.");
    await refreshRegistry();
    render();
  };

  document.querySelectorAll("[data-delete-user]").forEach((b) => b.onclick = async () => {
    const user = state.users.find((u) => u.id === b.dataset.deleteUser);
    if (!user) return;
    if (user.id === state.session.user.id) return window.alert("No puedes eliminar tu propia sesion.");
    const admins = state.users.filter((u) => u.active && u.role.toLowerCase() === "administrador");
    if (user.role.toLowerCase() === "administrador" && admins.length <= 1) return window.alert("Debe quedar al menos un administrador.");
    if (!window.confirm(`Eliminar a ${user.name}?`)) return;
    const res = await fetch(`${API_USERS}/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    if (!res.ok) return window.alert("No se pudo eliminar.");
    await refreshRegistry();
    render();
  });

  document.querySelectorAll("[data-order-status]").forEach((sel) => sel.onchange = () => {
    setState((s) => {
      const order = s.orders.find((o) => o.id === sel.dataset.orderStatus);
      if (!order) return;
      order.status = sel.value;
      order.timeline = buildTimeline(order.createdAt, sel.value);
      order.notes.unshift({ at: new Date().toISOString(), text: `Estado actualizado a ${statusLabel(sel.value)}.` });
    }, true);
  });

  document.querySelectorAll("[data-share]").forEach((b) => b.onclick = async () => {
    const link = trackingUrl(b.dataset.share);
    try {
      await navigator.clipboard.writeText(link);
      window.alert(`Liga copiada:\n${link}`);
    } catch {
      window.prompt("Copia esta liga:", link);
    }
  });

  document.querySelectorAll("[data-print]").forEach((b) => b.onclick = () => {
    const order = state.orders.find((o) => o.id === b.dataset.print);
    if (order) printTicket(order);
  });

  const tracking = document.getElementById("tracking-form");
  if (tracking) tracking.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(tracking);
    setState((s) => { s.filters.trackingCode = String(f.get("trackingCode") || "").trim().toUpperCase(); });
  };

  document.querySelectorAll("[data-action='logout']").forEach((b) => b.onclick = () => setState((s) => { s.session.loggedIn = false; s.ownerUserId = ""; }));
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));

initialize();
