"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, dateText, money } from "@/lib/api";

type Invoice = {
  id: string;
  planName: string;
  status: "DRAFT" | "PENDING" | "REPORTED" | "PAID" | "OVERDUE" | "VOID";
  amount: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string | null;
  paymentReportedAt?: string | null;
  paymentReference?: string | null;
  paymentReporterName?: string | null;
  paymentReporterEmail?: string | null;
  paymentNotes?: string | null;
  notes?: string | null;
};

type PaymentInstructions = {
  method: "TRANSFER";
  bankName: string;
  accountHolder: string;
  clabe?: string | null;
  accountNumber?: string | null;
  referenceLabel: string;
  note: string;
  supportEmail?: string | null;
  supportWhatsApp?: string | null;
};

type SubscriptionState = {
  id: string;
  name: string;
  plan: string;
  billingEmail?: string | null;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  currentPeriodStartsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  subscriptionInvoices: Invoice[];
  paymentInstructions: PaymentInstructions;
};

const initialReportForm = {
  invoiceId: "",
  reporterName: "",
  reporterEmail: "",
  paymentReference: "",
  paidAt: "",
  notes: ""
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [message, setMessage] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const reportableInvoices = useMemo(
    () =>
      (subscription?.subscriptionInvoices || []).filter((invoice) =>
        ["PENDING", "OVERDUE", "REPORTED"].includes(invoice.status)
      ),
    [subscription]
  );

  async function loadSubscription() {
    const data = await apiFetch<SubscriptionState>("/subscriptions/current");
    setSubscription(data);

    const reportableInvoice = data.subscriptionInvoices.find((invoice) =>
      ["PENDING", "OVERDUE", "REPORTED"].includes(invoice.status)
    );

    const nextInvoiceId = reportableInvoice?.id || data.subscriptionInvoices[0]?.id || "";
    setSelectedInvoiceId((current) => current || nextInvoiceId);
    setReportForm((current) => ({
      ...current,
      invoiceId: current.invoiceId || nextInvoiceId
    }));
  }

  useEffect(() => {
    const now = new Date();
    setReportForm((current) => ({
      ...current,
      paidAt: now.toISOString().slice(0, 16)
    }));
    loadSubscription().catch(console.error);
  }, []);

  useEffect(() => {
    if (!subscription?.subscriptionInvoices?.length) {
      setSelectedInvoiceId("");
      return;
    }

    if (
      !selectedInvoiceId ||
      !subscription.subscriptionInvoices.some((invoice) => invoice.id === selectedInvoiceId)
    ) {
      setSelectedInvoiceId(subscription.subscriptionInvoices[0].id);
    }
  }, [subscription, selectedInvoiceId]);

  async function handleReportPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await apiFetch(`/subscriptions/invoices/${reportForm.invoiceId}/report-payment`, {
        method: "POST",
        body: JSON.stringify({
          reporterName: reportForm.reporterName,
          reporterEmail: reportForm.reporterEmail,
          paymentReference: reportForm.paymentReference,
          paidAt: new Date(reportForm.paidAt).toISOString(),
          notes: reportForm.notes
        })
      });

      setMessage("Pago reportado. Queda pendiente de validacion administrativa.");
      setReportForm((current) => ({
        ...initialReportForm,
        paidAt: current.paidAt
      }));
      await loadSubscription();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reportar el pago.");
    }
  }

  const selectedInvoice =
    subscription?.subscriptionInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  const overdueAmount = (subscription?.subscriptionInvoices || [])
    .filter((invoice) => invoice.status === "OVERDUE")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingInvoices = (subscription?.subscriptionInvoices || []).filter((invoice) =>
    ["PENDING", "REPORTED", "OVERDUE"].includes(invoice.status)
  ).length;
  const paidInvoices = (subscription?.subscriptionInvoices || []).filter(
    (invoice) => invoice.status === "PAID"
  ).length;

  return (
    <DashboardShell
      title="Suscripcion y facturacion"
      description="Control de plan, vigencia, facturas y reporte manual de pago por transferencia."
      moduleTheme={{
        code: "SB",
        label: "Suscripcion",
        soft: "rgba(236, 72, 153, 0.12)",
        solid: "#db2777",
        glow: "#f472b6"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Plan actual"
          value={subscription?.plan || "MVP"}
          hint={subscription?.billingEmail || "Sin correo de facturacion"}
          icon="PL"
        />
        <MetricCard
          label="Estado"
          value={subscription?.subscriptionStatus || "TRIAL"}
          hint={`Vigencia: ${dateText(subscription?.currentPeriodEndsAt || undefined)}`}
          icon="ES"
        />
        <MetricCard
          label="Facturas pendientes"
          value={String(pendingInvoices)}
          hint="Pendientes, reportadas o vencidas."
          icon="FP"
        />
        <MetricCard
          label="Monto vencido"
          value={money(overdueAmount)}
          hint={`${paidInvoices} facturas ya conciliadas.`}
          icon="MV"
        />
      </div>

      <div className="split-grid balanced">
        <div className="stack">
          <DataTableCard
            title="Resumen comercial"
            description="Lectura ejecutiva del tenant y su ciclo de cobro."
          >
            <div className="order-detail-stack">
              <div className="detail-hero">
                <div className="detail-hero-top">
                  <div>
                    <strong>{subscription?.name || "Tenant actual"}</strong>
                    <p>{subscription?.billingEmail || "Sin correo de facturacion"}</p>
                  </div>
                  <div className="detail-meta-row">
                    <span className="header-chip">{subscription?.plan || "MVP"}</span>
                    <span className="header-chip">
                      {subscription?.subscriptionStatus || "TRIAL"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-block">
                  <span>Periodo actual</span>
                  <strong>{dateText(subscription?.currentPeriodStartsAt || undefined)}</strong>
                  <p>a {dateText(subscription?.currentPeriodEndsAt || undefined)}</p>
                </div>
                <div className="detail-block">
                  <span>Trial</span>
                  <strong>{dateText(subscription?.trialEndsAt || undefined)}</strong>
                  <p>Fecha limite del periodo de prueba o arranque.</p>
                </div>
              </div>
            </div>
          </DataTableCard>

          <DataTableCard
            title="Pago manual por SPEI"
            description="Transfiere a esta cuenta y luego reporta el movimiento para validacion."
          >
            <div className="stack">
              <div className="subtle-box">
                <strong>Banco</strong>
                <p>{subscription?.paymentInstructions.bankName || "Pendiente de configurar"}</p>
              </div>
              <div className="subtle-box">
                <strong>Titular</strong>
                <p>
                  {subscription?.paymentInstructions.accountHolder || "Pendiente de configurar"}
                </p>
              </div>
              <div className="form-grid">
                <div className="subtle-box">
                  <strong>CLABE</strong>
                  <p>{subscription?.paymentInstructions.clabe || "No configurada"}</p>
                </div>
                <div className="subtle-box">
                  <strong>Cuenta</strong>
                  <p>{subscription?.paymentInstructions.accountNumber || "Opcional"}</p>
                </div>
              </div>
              <div className="subtle-box">
                <strong>{subscription?.paymentInstructions.referenceLabel || "Referencia"}</strong>
                <p>
                  Usa el folio o la referencia bancaria en tu reporte para que podamos validar
                  rapido.
                </p>
              </div>
              <div className="subtle-box">
                <strong>Contacto de cobranza</strong>
                <p>{subscription?.paymentInstructions.supportEmail || "Sin correo configurado"}</p>
                <p>
                  {subscription?.paymentInstructions.supportWhatsApp || "Sin WhatsApp configurado"}
                </p>
              </div>
              <div className="subtle-box">
                <strong>Nota</strong>
                <p>{subscription?.paymentInstructions.note}</p>
              </div>
            </div>
          </DataTableCard>

          <DataTableCard
            title="Factura seleccionada"
            description="Detalle rapido de la factura activa y su seguimiento."
          >
            {selectedInvoice ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedInvoice.planName}</strong>
                      <p>
                        {dateText(selectedInvoice.periodStart)} a {dateText(selectedInvoice.periodEnd)}
                      </p>
                    </div>
                    <div className="detail-meta-row">
                      <span
                        className={
                          selectedInvoice.status === "PAID"
                            ? "badge success"
                            : selectedInvoice.status === "REPORTED"
                              ? "badge info"
                              : selectedInvoice.status === "OVERDUE"
                                ? "badge danger"
                                : "badge warning"
                        }
                      >
                        {selectedInvoice.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Total</span>
                    <strong>{money(selectedInvoice.amount)}</strong>
                    <p>Vence {dateText(selectedInvoice.dueDate)}</p>
                  </div>
                  <div className="detail-block">
                    <span>Seguimiento</span>
                    <strong>{selectedInvoice.paymentReference || "Sin referencia"}</strong>
                    <p>
                      {selectedInvoice.paymentReporterName
                        ? `Reportado por ${selectedInvoice.paymentReporterName}`
                        : "Aun sin reporte de pago"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sin factura seleccionada"
                description="Elige una factura del historial para revisar su detalle."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Reportar pago"
            description="Registra la transferencia para dejar la factura en revision."
          >
            <form className="form-card" onSubmit={handleReportPayment}>
              <div className="form-grid">
                <div className="field">
                  <label>Factura</label>
                  <select
                    value={reportForm.invoiceId}
                    onChange={(event) => {
                      setSelectedInvoiceId(event.target.value);
                      setReportForm((current) => ({ ...current, invoiceId: event.target.value }));
                    }}
                  >
                    <option value="">Selecciona una factura</option>
                    {reportableInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.planName} - {dateText(invoice.periodStart)} - {money(invoice.amount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Nombre del pagador</label>
                  <input
                    value={reportForm.reporterName}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        reporterName: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Correo de confirmacion</label>
                  <input
                    type="email"
                    value={reportForm.reporterEmail}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        reporterEmail: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Referencia bancaria</label>
                  <input
                    value={reportForm.paymentReference}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        paymentReference: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Fecha y hora del pago</label>
                  <input
                    type="datetime-local"
                    value={reportForm.paidAt}
                    onChange={(event) =>
                      setReportForm((current) => ({ ...current, paidAt: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label>Notas del pago</label>
                <textarea
                  value={reportForm.notes}
                  onChange={(event) =>
                    setReportForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </div>

              {message ? <div className="status-text">{message}</div> : null}

              <div className="action-row">
                <button
                  className="primary-button"
                  disabled={!reportForm.invoiceId}
                  type="submit"
                >
                  Enviar reporte de pago
                </button>
              </div>
            </form>
          </DataTableCard>
        </div>
      </div>

      <DataTableCard
        title="Facturas de suscripcion"
        description="Historial de cobro mensual del tenant."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Periodo</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {(subscription?.subscriptionInvoices || []).map((invoice) => (
                <tr
                  className={`row-selectable ${selectedInvoice?.id === invoice.id ? "active" : ""}`}
                  key={invoice.id}
                  onClick={() => {
                    setSelectedInvoiceId(invoice.id);
                    setReportForm((current) => ({ ...current, invoiceId: invoice.id }));
                  }}
                >
                  <td>{invoice.planName}</td>
                  <td>
                    {dateText(invoice.periodStart)}
                    <br />
                    <span>a {dateText(invoice.periodEnd)}</span>
                  </td>
                  <td>{dateText(invoice.dueDate)}</td>
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
                  <td>{money(invoice.amount)}</td>
                  <td>
                    {invoice.paymentReference ? (
                      <div className="status-text">
                        Ref: {invoice.paymentReference}
                        {invoice.paymentReporterName ? ` - ${invoice.paymentReporterName}` : ""}
                      </div>
                    ) : (
                      <div className="status-text">
                        Esperando reporte de transferencia o validacion administrativa.
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableCard>
    </DashboardShell>
  );
}
