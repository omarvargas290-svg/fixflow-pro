"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, money } from "@/lib/api";

type ReportOverview = {
  daily: number;
  weekly: number;
  monthly: number;
  ordersByStatus: { status: string; total: number }[];
  paymentsByMethod: { method: string; total: number }[];
};

const statusLabels: Record<string, string> = {
  RECEIVED: "Recibido",
  DIAGNOSIS: "Diagnostico",
  QUOTE_PENDING: "Pendiente autorizacion",
  APPROVED: "Autorizado",
  IN_REPAIR: "En reparacion",
  READY_DELIVERY: "Listo para entrega",
  DELIVERED: "Entregado"
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Mixto"
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportOverview | null>(null);

  useEffect(() => {
    apiFetch<ReportOverview>("/reports/overview").then(setReport).catch(console.error);
  }, []);

  const totalOrders = (report?.ordersByStatus || []).reduce((sum, row) => sum + row.total, 0);
  const topStatus = [...(report?.ordersByStatus || [])].sort((a, b) => b.total - a.total)[0];
  const totalPayments = (report?.paymentsByMethod || []).reduce((sum, row) => sum + row.total, 0);
  const topMethod = [...(report?.paymentsByMethod || [])].sort((a, b) => b.total - a.total)[0];
  const serviceProjection = (report?.daily ?? 0) * 30;

  return (
    <DashboardShell
      title="Reportes"
      description="Vista financiera y operativa diaria, semanal y mensual."
      moduleTheme={{
        code: "RP",
        label: "Reportes",
        soft: "rgba(234, 179, 8, 0.14)",
        solid: "#ca8a04",
        glow: "#facc15"
      }}
    >
      <section className="overview-hero">
        <div className="overview-copy">
          <span className="eyebrow">Lectura ejecutiva</span>
          <h3>Un resumen claro para saber como se esta moviendo el taller.</h3>
          <p>
            Visualiza produccion, flujo de cobro y concentracion operativa sin salir del panel.
          </p>
        </div>

        <div className="quick-links-grid">
          <article className="insight-card">
            <strong>{topStatus ? statusLabels[topStatus.status] || topStatus.status : "Sin datos"}</strong>
            <span>Estado con mayor carga operativa actual.</span>
          </article>
          <article className="insight-card">
            <strong>
              {topMethod ? paymentMethodLabels[topMethod.method] || topMethod.method : "Sin pagos"}
            </strong>
            <span>Metodo de cobro predominante en el periodo visible.</span>
          </article>
          <article className="insight-card">
            <strong>{money(serviceProjection)}</strong>
            <span>Proyeccion simple mensual usando el ritmo del dia.</span>
          </article>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard
          label="Hoy"
          value={money(report?.daily ?? 0)}
          hint="Cobro acumulado del dia."
          icon="DY"
        />
        <MetricCard
          label="Semana"
          value={money(report?.weekly ?? 0)}
          hint="Referencia util para corte semanal."
          icon="WK"
        />
        <MetricCard
          label="Mes"
          value={money(report?.monthly ?? 0)}
          hint="Lectura base del mes actual."
          icon="MO"
        />
        <MetricCard
          label="Carga operativa"
          value={String(totalOrders)}
          hint="Total de ordenes consideradas en el resumen."
          icon="OP"
        />
      </div>

      <div className="split-grid balanced">
        <DataTableCard
          title="Distribucion por estado"
          description="Donde esta concentrado el trabajo del taller."
        >
          <div className="stack">
            {(report?.ordersByStatus || []).map((row) => {
              const percentage = totalOrders ? Math.round((row.total / totalOrders) * 100) : 0;

              return (
                <div className="pipeline-row" key={row.status}>
                  <div className="panel-title-row">
                    <strong>{statusLabels[row.status] || row.status}</strong>
                    <span>{row.total} · {percentage}%</span>
                  </div>
                  <div className="pipeline-track">
                    <div className="pipeline-bar" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </DataTableCard>

        <DataTableCard
          title="Mezcla de cobro"
          description="Distribucion financiera por metodo de pago."
        >
          <div className="stack">
            {(report?.paymentsByMethod || []).map((row) => {
              const percentage = totalPayments ? Math.round((row.total / totalPayments) * 100) : 0;

              return (
                <div className="detail-block" key={row.method}>
                  <span>{paymentMethodLabels[row.method] || row.method}</span>
                  <strong>{money(row.total)}</strong>
                  <p>{percentage}% de la mezcla total de cobro.</p>
                </div>
              );
            })}
          </div>
        </DataTableCard>
      </div>

      <div className="card-grid">
        <article className="panel-card module-card">
          <div className="panel-title-row">
            <div className="module-title">
              <span className="module-icon">RD</span>
              <h3>Ritmo diario</h3>
            </div>
          </div>
          <p>Usa el total del dia para anticipar cierres y necesidades de caja.</p>
          <ul className="compact-list">
            <li>Revisa si el ritmo diario sostiene la meta mensual.</li>
            <li>Detecta dias debiles cuando el ingreso diario cae demasiado.</li>
            <li>Combina este bloque con caja y entregas para cierre rapido.</li>
          </ul>
        </article>

        <article className="panel-card module-card">
          <div className="panel-title-row">
            <div className="module-title">
              <span className="module-icon">CX</span>
              <h3>Lectura para caja</h3>
            </div>
          </div>
          <p>La mezcla de cobro ayuda a conciliar efectivo, transferencias y terminal.</p>
          <ul className="compact-list">
            <li>Efectivo alto implica mayor control de arqueo.</li>
            <li>Transferencias altas facilitan conciliacion bancaria.</li>
            <li>Mixto alto suele venir de tickets mas grandes.</li>
          </ul>
        </article>
      </div>
    </DashboardShell>
  );
}
