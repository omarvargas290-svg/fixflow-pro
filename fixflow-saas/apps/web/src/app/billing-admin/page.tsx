"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, dateText, money } from "@/lib/api";

type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  billingEmail?: string | null;
  subscriptionStatus: string;
  currentPeriodEndsAt?: string | null;
  brandProfile?: {
    companyName?: string | null;
  } | null;
  branches?: { id: string }[];
};

type BillingInvoice = {
  id: string;
  planName: string;
  status: "DRAFT" | "PENDING" | "REPORTED" | "PAID" | "OVERDUE" | "VOID";
  amount: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paymentReference?: string | null;
  paymentReporterName?: string | null;
  paymentReportedAt?: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    billingEmail?: string | null;
    subscriptionStatus: string;
    currentPeriodEndsAt?: string | null;
    brandProfile?: {
      companyName?: string | null;
    } | null;
  };
};

const STORAGE_KEY = "fixflow-billing-admin-secret";

const initialInvoiceForm = {
  tenantId: "",
  planName: "MVP",
  amount: 799,
  periodStart: "",
  periodEnd: "",
  dueDate: "",
  notes: ""
};

async function billingFetch<T>(
  path: string,
  secret: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-billing-secret": secret,
      ...(options.headers ?? {})
    }
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof payload === "string"
        ? payload
        : payload.message || "No se pudo completar la solicitud."
    );
  }

  return payload as T;
}

export default function BillingAdminPage() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState("");
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("REPORTED");
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);
  const [message, setMessage] = useState("");

  const activeSecret = savedSecret || secret;

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === invoiceForm.tenantId) || null,
    [tenants, invoiceForm.tenantId]
  );

  async function loadTenants(operatorSecret: string, search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await billingFetch<TenantSummary[]>(
      `/billing-admin/tenants${query}`,
      operatorSecret
    );
    setTenants(data);
  }

  async function loadInvoices(operatorSecret: string, status = statusFilter, search = invoiceSearch) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await billingFetch<BillingInvoice[]>(
      `/billing-admin/invoices${query}`,
      operatorSecret
    );
    setInvoices(data);
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await Promise.all([loadTenants(secret), loadInvoices(secret, statusFilter, invoiceSearch)]);
      window.sessionStorage.setItem(STORAGE_KEY, secret);
      setSavedSecret(secret);
      setMessage("Backoffice desbloqueado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo validar la clave.");
    }
  }

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    setSecret(stored);
    setSavedSecret(stored);
    loadTenants(stored).catch(() => undefined);
    loadInvoices(stored, statusFilter, invoiceSearch).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!savedSecret) return;
    loadInvoices(savedSecret, statusFilter, invoiceSearch).catch(() => undefined);
  }, [savedSecret, statusFilter, invoiceSearch]);

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await billingFetch("/billing-admin/invoices", activeSecret, {
        method: "POST",
        body: JSON.stringify({
          ...invoiceForm,
          amount: Number(invoiceForm.amount),
          periodStart: new Date(invoiceForm.periodStart).toISOString(),
          periodEnd: new Date(invoiceForm.periodEnd).toISOString(),
          dueDate: new Date(invoiceForm.dueDate).toISOString()
        })
      });
      setMessage("Factura SaaS creada correctamente.");
      setInvoiceForm((current) => ({
        ...initialInvoiceForm,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
        dueDate: current.dueDate
      }));
      await loadInvoices(activeSecret, statusFilter, invoiceSearch);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la factura.");
    }
  }

  async function updateInvoice(invoiceId: string, mode: "paid" | "overdue") {
    setMessage("");

    try {
      await billingFetch(`/billing-admin/invoices/${invoiceId}/mark-${mode}`, activeSecret, {
        method: "POST"
      });
      setMessage(
        mode === "paid"
          ? "Factura validada y tenant reactivado."
          : "Factura marcada como vencida."
      );
      await loadInvoices(activeSecret, statusFilter, invoiceSearch);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la factura.");
    }
  }

  return (
    <div className="login-shell">
      <div className="login-grid" style={{ width: "min(1400px, 100%)" }}>
        <section className="hero-card">
          <div>
            <span className="eyebrow">Backoffice interno</span>
            <h1>Validacion manual de suscripciones.</h1>
            <p>
              Emite mensualidades, revisa transferencias reportadas y reactiva tenants desde un
              panel de cobranza separado del producto normal.
            </p>
          </div>
          <div className="hero-grid">
            <div className="hero-chip">
              <strong>{invoices.length}</strong>
              <span>facturas cargadas en la vista</span>
            </div>
            <div className="hero-chip">
              <strong>{tenants.length}</strong>
              <span>tenants disponibles</span>
            </div>
          </div>
        </section>

        <section className="login-card">
          <span className="eyebrow">Cobranza SaaS</span>
          <h2>Abrir backoffice</h2>
          <p>Usa la clave interna de facturacion para acceder a esta vista.</p>

          <form className="form-stack" onSubmit={unlock}>
            <div className="field">
              <label>Clave operador</label>
              <input
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="BILLING_OPERATOR_SECRET"
              />
            </div>
            <button className="primary-button" type="submit">
              Desbloquear panel
            </button>
          </form>

          {message ? <div className="status-text" style={{ marginTop: 16 }}>{message}</div> : null}
        </section>
      </div>

      {savedSecret ? (
        <div className="page-content" style={{ width: "min(1400px, 100%)", marginTop: 28 }}>
          <div className="split-grid">
            <div className="stack">
              <div className="panel-card">
                <div className="panel-title-row">
                  <div>
                    <h3>Facturas SaaS</h3>
                    <p>Pendientes, reportadas o vencidas para accion rapida.</p>
                  </div>
                </div>
                <div className="toolbar">
                  <input
                    value={invoiceSearch}
                    onChange={(event) => setInvoiceSearch(event.target.value)}
                    placeholder="Buscar tenant, referencia o plan"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="REPORTED">Reportadas</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="OVERDUE">Vencidas</option>
                    <option value="PAID">Pagadas</option>
                  </select>
                  <button
                    className="secondary-button"
                    onClick={() => loadInvoices(activeSecret, statusFilter, invoiceSearch)}
                    type="button"
                  >
                    Actualizar
                  </button>
                </div>
                <div className="table-wrap" style={{ marginTop: 16 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Plan</th>
                        <th>Periodo</th>
                        <th>Estado</th>
                        <th>Pago reportado</th>
                        <th>Total</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <strong>
                              {invoice.tenant.brandProfile?.companyName || invoice.tenant.name}
                            </strong>
                            <br />
                            <span>{invoice.tenant.billingEmail || invoice.tenant.slug}</span>
                          </td>
                          <td>{invoice.planName}</td>
                          <td>
                            {dateText(invoice.periodStart)}
                            <br />
                            <span>a {dateText(invoice.periodEnd)}</span>
                          </td>
                          <td>
                            <span
                              className={
                                invoice.status === "PAID"
                                  ? "badge success"
                                  : invoice.status === "REPORTED"
                                    ? "badge info"
                                    : invoice.status === "OVERDUE"
                                      ? "badge danger"
                                      : "badge warning"
                              }
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td>
                            {invoice.paymentReference ? (
                              <>
                                <strong>{invoice.paymentReference}</strong>
                                <br />
                                <span>{invoice.paymentReporterName || "Sin nombre"}</span>
                              </>
                            ) : (
                              <span>Sin reporte</span>
                            )}
                          </td>
                          <td>{money(invoice.amount)}</td>
                          <td>
                            <div className="ticket-actions">
                              <button
                                className="mini-button"
                                onClick={() => updateInvoice(invoice.id, "paid")}
                                type="button"
                              >
                                Validar
                              </button>
                              <button
                                className="mini-button"
                                onClick={() => updateInvoice(invoice.id, "overdue")}
                                type="button"
                              >
                                Marcar vencida
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="panel-card">
                <div className="panel-title-row">
                  <div>
                    <h3>Nueva factura SaaS</h3>
                    <p>Emite una mensualidad manual por tenant.</p>
                  </div>
                </div>

                <div className="toolbar">
                  <input
                    value={tenantSearch}
                    onChange={(event) => setTenantSearch(event.target.value)}
                    placeholder="Buscar tenant por nombre o correo"
                  />
                  <button
                    className="secondary-button"
                    onClick={() => loadTenants(activeSecret, tenantSearch)}
                    type="button"
                  >
                    Buscar tenants
                  </button>
                </div>

                <form className="form-card" onSubmit={handleCreateInvoice} style={{ marginTop: 16 }}>
                  <div className="form-grid">
                    <div className="field">
                      <label>Tenant</label>
                      <select
                        value={invoiceForm.tenantId}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({ ...current, tenantId: event.target.value }))
                        }
                      >
                        <option value="">Selecciona un tenant</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {(tenant.brandProfile?.companyName || tenant.name) + " - " + tenant.slug}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Plan</label>
                      <input
                        value={invoiceForm.planName}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({ ...current, planName: event.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceForm.amount}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            amount: Number(event.target.value)
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Vence</label>
                      <input
                        type="datetime-local"
                        value={invoiceForm.dueDate}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Periodo inicia</label>
                      <input
                        type="datetime-local"
                        value={invoiceForm.periodStart}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            periodStart: event.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Periodo termina</label>
                      <input
                        type="datetime-local"
                        value={invoiceForm.periodEnd}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            periodEnd: event.target.value
                          }))
                        }
                      />
                    </div>
                  </div>

                  {selectedTenant ? (
                    <div className="subtle-box">
                      <strong>{selectedTenant.brandProfile?.companyName || selectedTenant.name}</strong>
                      <span>
                        {selectedTenant.billingEmail || selectedTenant.slug} - {selectedTenant.subscriptionStatus}
                      </span>
                    </div>
                  ) : null}

                  <div className="field">
                    <label>Notas</label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </div>

                  <div className="action-row">
                    <button className="primary-button" type="submit">
                      Emitir factura
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        window.sessionStorage.removeItem(STORAGE_KEY);
                        setSavedSecret("");
                        setSecret("");
                        setMessage("");
                        setInvoices([]);
                        setTenants([]);
                      }}
                      type="button"
                    >
                      Cerrar backoffice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
