"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, dateText, money } from "@/lib/api";

type Order = {
  id: string;
  folio: string;
  status: string;
  priority?: string | null;
  failureReport: string;
  diagnosis?: string | null;
  createdAt?: string | null;
  promisedAt?: string | null;
  estimateAmount?: number | null;
  paidAmount?: number | null;
  balanceAmount?: number | null;
  customer: { fullName: string; phone: string; email?: string | null; notes?: string | null };
  device: {
    category?: string | null;
    brand: string;
    model: string;
    imei?: string | null;
    serialNumber?: string | null;
    accessories?: string | null;
    issueSummary?: string | null;
  };
  assignedUser?: { id: string; name: string } | null;
  payments?: { id: string; amount: number; method: string; note?: string | null }[];
  partsUsed?: {
    id: string;
    quantity: number;
    inventoryItem: { name: string; sku?: string | null };
  }[];
};

type UserOption = {
  id: string;
  role: "ADMIN" | "TECH" | "CASHIER";
  user: { id: string; name: string; email: string };
};

const initialForm = {
  customer: {
    fullName: "",
    phone: "",
    email: "",
    notes: ""
  },
  device: {
    category: "Celular",
    brand: "",
    model: "",
    serialNumber: "",
    imei: "",
    accessories: "",
    issueSummary: ""
  },
  failureReport: "",
  priority: "normal",
  promisedAt: "",
  estimateAmount: 0,
  paidAmount: 0,
  assignedUserId: ""
};

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "RECEIVED", label: "Recibido" },
  { value: "DIAGNOSIS", label: "Diagnostico" },
  { value: "QUOTE_PENDING", label: "Pendiente autorizacion" },
  { value: "APPROVED", label: "Autorizado" },
  { value: "IN_REPAIR", label: "En reparacion" },
  { value: "READY_DELIVERY", label: "Listo para entrega" },
  { value: "DELIVERED", label: "Entregado" }
];

const quickStatuses = ["DIAGNOSIS", "APPROVED", "IN_REPAIR", "READY_DELIVERY", "DELIVERED"];

const statusLabelMap: Record<string, string> = {
  RECEIVED: "Recibido",
  DIAGNOSIS: "Diagnostico",
  QUOTE_PENDING: "Pendiente autorizacion",
  APPROVED: "Autorizado",
  IN_REPAIR: "En reparacion",
  READY_DELIVERY: "Listo para entrega",
  DELIVERED: "Entregado"
};

function statusTone(status: string) {
  if (status === "READY_DELIVERY" || status === "DELIVERED") return "success";
  if (status === "QUOTE_PENDING") return "warning";
  if (status === "IN_REPAIR" || status === "DIAGNOSIS") return "info";
  return "danger";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [technicians, setTechnicians] = useState<UserOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function loadOrders(term = "", status = "", technicianId = "") {
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    if (status) params.set("status", status);
    if (technicianId) params.set("technicianId", technicianId);
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch<Order[]>(`/service-orders${query}`);
    setOrders(data);
  }

  async function loadTechnicians() {
    const users = await apiFetch<UserOption[]>("/users");
    setTechnicians(users.filter((item) => item.role === "TECH" || item.role === "ADMIN"));
  }

  useEffect(() => {
    loadOrders(search, statusFilter, technicianFilter).catch(console.error);
  }, [search, statusFilter, technicianFilter]);

  useEffect(() => {
    loadTechnicians().catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId("");
      return;
    }

    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  function applyPromiseShortcut(daysAhead: number) {
    const base = new Date();
    base.setDate(base.getDate() + daysAhead);
    base.setHours(18, 0, 0, 0);
    const localValue = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setForm((current) => ({ ...current, promisedAt: localValue }));
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      await apiFetch("/service-orders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          assignedUserId: form.assignedUserId || undefined,
          promisedAt: form.promisedAt ? new Date(form.promisedAt).toISOString() : undefined
        })
      });

      setForm(initialForm);
      setMessageType("success");
      setMessage("Orden creada correctamente.");
      await loadOrders(search, statusFilter, technicianFilter);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo crear la orden.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      await apiFetch(`/service-orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessageType("success");
      setMessage("Estado actualizado.");
      await loadOrders(search, statusFilter, technicianFilter);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    }
  }

  function printTicket(order: Order) {
    const win = window.open("", "_blank", "width=420,height=720");
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>${order.folio}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; }
            .ticket { width: 72mm; margin: 0 auto; padding: 8px 0; }
            h1,h2,p { margin: 0; }
            h1 { font-size: 14px; text-align: center; margin-bottom: 6px; }
            h2 { font-size: 12px; margin: 10px 0 6px; }
            p { font-size: 11px; line-height: 1.4; margin-bottom: 4px; }
            .line { border-top: 1px dashed #999; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; }
            .bold { font-weight: 700; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="ticket">
            <h1>FixFlow SaaS · Orden de servicio</h1>
            <p class="bold">Folio: ${order.folio}</p>
            <p>Cliente: ${order.customer.fullName}</p>
            <p>Telefono: ${order.customer.phone}</p>
            <div class="line"></div>
            <h2>Equipo</h2>
            <p>${order.device.brand} ${order.device.model}</p>
            <p>IMEI/Serie: ${order.device.imei || "Sin dato"}</p>
            <div class="line"></div>
            <h2>Servicio</h2>
            <p>Falla reportada: ${order.failureReport}</p>
            <p>Estado: ${order.status}</p>
            <p>Fecha promesa: ${order.promisedAt ? dateText(order.promisedAt) : "Sin fecha"}</p>
            <div class="line"></div>
            <div class="row"><p>Total estimado</p><p>${money(order.estimateAmount ?? 0)}</p></div>
            <div class="row"><p>Saldo</p><p>${money(order.balanceAmount ?? 0)}</p></div>
          </div>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const openOrders = orders.filter((order) => order.status !== "DELIVERED").length;
  const readyOrders = orders.filter((order) => order.status === "READY_DELIVERY").length;
  const quotePendingOrders = orders.filter((order) => order.status === "QUOTE_PENDING").length;
  const pendingBalance = orders.reduce(
    (sum, order) => sum + Math.max(order.balanceAmount ?? 0, 0),
    0
  );
  const selectedPayments = selectedOrder?.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;

  return (
    <DashboardShell
      title="Ordenes de servicio"
        description="Captura, seguimiento tecnico, anticipos y ticket termico."
      moduleTheme={{
        code: "OS",
        label: "Ordenes",
        soft: "rgba(249, 115, 22, 0.12)",
        solid: "#f97316",
        glow: "#fb923c"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Abiertas"
          value={String(openOrders)}
          hint="Ordenes que siguen dentro del flujo tecnico."
          icon="AB"
        />
        <MetricCard
          label="Listas"
          value={String(readyOrders)}
          hint="Equipos que ya pueden pasar a entrega."
          icon="LT"
        />
        <MetricCard
          label="Por autorizar"
          value={String(quotePendingOrders)}
          hint="Casos que esperan respuesta del cliente."
          icon="CT"
        />
        <MetricCard
          label="Saldo pendiente"
          value={money(pendingBalance)}
          hint="Pendiente estimado del lote filtrado."
          icon="SD"
        />
      </div>

      <div className="split-grid balanced">
        <DataTableCard
          title="Pipeline de ordenes"
          description="Busqueda por folio, nombre, telefono, IMEI y tecnico responsable."
          toolbar={
            <div className="toolbar">
              <input
                placeholder="Nombre, folio, IMEI..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={technicianFilter}
                onChange={(event) => setTechnicianFilter(event.target.value)}
              >
                <option value="">Todos los tecnicos</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.user.id}>
                    {tech.user.name}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {orders.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Cliente</th>
                    <th>Equipo</th>
                    <th>Estado</th>
                    <th>Tecnico</th>
                    <th>Promesa</th>
                    <th>Saldo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      className={`row-selectable ${selectedOrder?.id === order.id ? "active" : ""}`}
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td>{order.folio}</td>
                      <td>
                        <strong>{order.customer.fullName}</strong>
                        <br />
                        <span>{order.customer.phone}</span>
                      </td>
                      <td>
                        {order.device.brand} {order.device.model}
                        <br />
                        <span>{order.device.imei || order.failureReport}</span>
                      </td>
                      <td>
                        <select
                          className="inline-status"
                          value={order.status}
                          onChange={(event) => updateStatus(order.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {statusOptions
                            .filter((option) => option.value)
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>{order.assignedUser?.name || "Sin asignar"}</td>
                      <td>{dateText(order.promisedAt || undefined)}</td>
                      <td>{money(order.balanceAmount ?? order.estimateAmount ?? 0)}</td>
                      <td>
                        <div className="ticket-actions">
                          <button
                            className="mini-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              printTicket(order);
                            }}
                            type="button"
                          >
                            Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin ordenes"
              description="Aqui veras el flujo de trabajo del taller y el cambio rapido de estado."
            />
          )}
        </DataTableCard>

        <div className="stack">
          <DataTableCard
            title="Orden seleccionada"
            description="Vista rapida para seguimiento, cobro y entrega."
            toolbar={
              selectedOrder ? (
                <span className={`badge ${statusTone(selectedOrder.status)}`}>
                  {statusLabelMap[selectedOrder.status] || selectedOrder.status}
                </span>
              ) : undefined
            }
          >
            {selectedOrder ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedOrder.folio}</strong>
                      <p>
                        {selectedOrder.device.brand} {selectedOrder.device.model} ·{" "}
                        {selectedOrder.customer.fullName}
                      </p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">
                        {selectedOrder.assignedUser?.name || "Sin tecnico"}
                      </span>
                      <span className="header-chip">
                        {selectedOrder.priority ? `Prioridad ${selectedOrder.priority}` : "Normal"}
                      </span>
                    </div>
                  </div>

                  <div className="detail-actions">
                    {quickStatuses.map((status) => (
                      <button
                        className={`mini-button ${selectedOrder.status === status ? "active" : ""}`}
                        key={status}
                        onClick={() => updateStatus(selectedOrder.id, status)}
                        type="button"
                      >
                        {statusLabelMap[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Cliente</span>
                    <strong>{selectedOrder.customer.fullName}</strong>
                    <p>{selectedOrder.customer.phone}</p>
                    <p>{selectedOrder.customer.email || "Sin correo registrado"}</p>
                  </div>
                  <div className="detail-block">
                    <span>Equipo</span>
                    <strong>
                      {selectedOrder.device.category || "Equipo"} · {selectedOrder.device.brand}{" "}
                      {selectedOrder.device.model}
                    </strong>
                    <p>IMEI: {selectedOrder.device.imei || "Sin dato"}</p>
                    <p>Serie: {selectedOrder.device.serialNumber || "Sin dato"}</p>
                  </div>
                  <div className="detail-block">
                    <span>Promesa y recepcion</span>
                    <strong>{dateText(selectedOrder.promisedAt || undefined)}</strong>
                    <p>Capturada: {dateText(selectedOrder.createdAt || undefined)}</p>
                    <p>{selectedOrder.device.accessories || "Sin accesorios registrados"}</p>
                  </div>
                  <div className="detail-block">
                    <span>Cobro</span>
                    <strong>{money(selectedOrder.estimateAmount ?? 0)}</strong>
                    <p>Anticipo acumulado: {money(selectedPayments)}</p>
                    <p>Saldo pendiente: {money(selectedOrder.balanceAmount ?? 0)}</p>
                  </div>
                </div>

                <div className="detail-grid single">
                  <div className="detail-block">
                    <span>Falla reportada</span>
                    <strong>{selectedOrder.failureReport}</strong>
                    <p>{selectedOrder.device.issueSummary || "Sin resumen tecnico inicial"}</p>
                    {selectedOrder.diagnosis ? <p>Diagnostico: {selectedOrder.diagnosis}</p> : null}
                  </div>
                </div>

                {selectedOrder.partsUsed?.length ? (
                  <div className="detail-block">
                    <span>Piezas utilizadas</span>
                    <ul className="detail-list">
                      {selectedOrder.partsUsed.map((part) => (
                        <li key={part.id}>
                          <strong>{part.inventoryItem.name}</strong>
                          <span>
                            {part.quantity} pza · {part.inventoryItem.sku || "Sin SKU"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedOrder.payments?.length ? (
                  <div className="detail-block">
                    <span>Pagos registrados</span>
                    <ul className="detail-list">
                      {selectedOrder.payments.map((payment) => (
                        <li key={payment.id}>
                          <strong>{money(payment.amount)}</strong>
                          <span>
                            {payment.method}
                            {payment.note ? ` · ${payment.note}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="action-row">
                  <button className="primary-button" onClick={() => printTicket(selectedOrder)} type="button">
                    Imprimir ticket
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona una orden"
                description="Elige una fila del pipeline para ver sus datos y accionar mas rapido."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Nueva orden"
            description="Captura integrada de cliente, equipo, tecnico y cobro inicial."
          >
            <form className="form-card" onSubmit={handleCreateOrder}>
            <div className="form-section">
              <div className="section-header">
                <strong>Cliente</strong>
                <span>Alta rapida del cliente sin salir de la orden.</span>
              </div>

              <div className="form-grid compact">
                <div className="field">
                  <label>Nombre del cliente</label>
                  <input
                    placeholder="Nombre completo"
                    value={form.customer.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer: { ...current.customer, fullName: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Telefono</label>
                  <input
                    placeholder="Telefono o WhatsApp"
                    value={form.customer.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer: { ...current.customer, phone: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-grid compact">
                <div className="field">
                  <label>Correo</label>
                  <input
                    type="email"
                    placeholder="Opcional"
                    value={form.customer.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer: { ...current.customer, email: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Notas del cliente</label>
                  <input
                    placeholder="Referencia rapida"
                    value={form.customer.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customer: { ...current.customer, notes: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Equipo recibido</strong>
                <span>Modelo, identificadores y accesorios entregados.</span>
              </div>

              <div className="form-grid compact">
                <div className="field">
                  <label>Categoria</label>
                  <select
                    value={form.device.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, category: event.target.value }
                      }))
                    }
                  >
                    <option value="Celular">Celular</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Consola">Consola</option>
                  </select>
                </div>
                <div className="field">
                  <label>Marca</label>
                  <input
                    placeholder="Apple, Samsung, Lenovo..."
                    value={form.device.brand}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, brand: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Modelo</label>
                  <input
                    placeholder="Modelo exacto"
                    value={form.device.model}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, model: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>IMEI</label>
                  <input
                    placeholder="Opcional"
                    value={form.device.imei}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, imei: event.target.value }
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Serie</label>
                  <input
                    placeholder="Numero de serie"
                    value={form.device.serialNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, serialNumber: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label>Accesorios</label>
                <input
                  placeholder="Cargador, funda, chip, memoria..."
                  value={form.device.accessories}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      device: { ...current.device, accessories: event.target.value }
                    }))
                  }
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Servicio y recepcion</strong>
                <span>Describe la falla y deja observaciones tecnicas iniciales.</span>
              </div>
              <div className="form-grid single">
                <div className="field">
                  <label>Falla reportada</label>
                  <textarea
                    placeholder="Describe lo que reporta el cliente."
                    value={form.failureReport}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, failureReport: event.target.value }))
                    }
                  />
                </div>

                <div className="field">
                  <label>Resumen tecnico inicial</label>
                  <textarea
                    placeholder="Inspeccion visual, pruebas iniciales o hallazgos."
                    value={form.device.issueSummary}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device: { ...current.device, issueSummary: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Asignacion y cobro</strong>
                <span>Tecnico responsable, prioridad y datos comerciales.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label>Tecnico asignado</label>
                  <select
                    value={form.assignedUserId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, assignedUserId: event.target.value }))
                    }
                  >
                    <option value="">Sin asignar</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.user.id}>
                        {tech.user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Prioridad</label>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, priority: event.target.value }))
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Fecha promesa</label>
                <div className="quick-action-row">
                  <button className="quick-pill" onClick={() => applyPromiseShortcut(0)} type="button">
                    Hoy
                  </button>
                  <button className="quick-pill" onClick={() => applyPromiseShortcut(1)} type="button">
                    Manana
                  </button>
                  <button className="quick-pill" onClick={() => applyPromiseShortcut(2)} type="button">
                    +2 dias
                  </button>
                  <button className="quick-pill" onClick={() => applyPromiseShortcut(3)} type="button">
                    +3 dias
                  </button>
                </div>
                <small className="helper-text">
                  Usa un atajo o ajusta la fecha exacta manualmente.
                </small>
                <input
                  type="datetime-local"
                  value={form.promisedAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, promisedAt: event.target.value }))
                  }
                />
              </div>

              <div className="form-grid compact">
                <div className="field">
                  <label>Estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.estimateAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimateAmount: Number(event.target.value)
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Anticipo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.paidAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paidAmount: Number(event.target.value)
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="info-grid">
              <div className="subtle-box">
                <strong>Total estimado</strong>
                <span>{money(form.estimateAmount)}</span>
              </div>
              <div className="subtle-box">
                <strong>Saldo proyectado</strong>
                <span>{money(Math.max(form.estimateAmount - form.paidAmount, 0))}</span>
              </div>
            </div>

            {message ? (
              <div className={messageType === "error" ? "danger-text" : "status-text"}>
                {message}
              </div>
            ) : null}

            <div className="action-row">
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Guardando..." : "Crear orden"}
              </button>
              <button
                className="secondary-button"
                onClick={() => setForm(initialForm)}
                type="button"
              >
                Limpiar
              </button>
            </div>
            </form>
          </DataTableCard>
        </div>
      </div>
    </DashboardShell>
  );
}
