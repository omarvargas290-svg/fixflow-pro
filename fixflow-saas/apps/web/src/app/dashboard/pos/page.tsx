"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, money } from "@/lib/api";

type Customer = {
  id: string;
  fullName: string;
};

type Sale = {
  id: string;
  folio: string;
  total: number;
  customer?: { fullName: string } | null;
  items: { description: string; quantity: number }[];
  createdAt: string;
};

type SaleItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const initialItem: SaleItem = {
  description: "",
  quantity: 1,
  unitPrice: 0
};

export default function PosPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [items, setItems] = useState<SaleItem[]>([initialItem]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function loadSales() {
    const data = await apiFetch<Sale[]>("/pos/sales");
    setSales(data);
  }

  async function loadCustomers() {
    const data = await apiFetch<Customer[]>("/customers");
    setCustomers(data);
  }

  useEffect(() => {
    loadSales().catch(console.error);
    loadCustomers().catch(console.error);
  }, []);

  useEffect(() => {
    if (!sales.length) {
      setSelectedSaleId("");
      return;
    }

    if (!selectedSaleId || !sales.some((sale) => sale.id === selectedSaleId)) {
      setSelectedSaleId(sales[0].id);
    }
  }, [sales, selectedSaleId]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? null;
  const ticketAverage = sales.length
    ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length
    : 0;
  const totalUnits = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((inner, item) => inner + item.quantity, 0),
    0
  );
  const mostRecentSale = sales[0]?.total ?? 0;

  function updateItem(index: number, patch: Partial<SaleItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      await apiFetch("/pos/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || undefined,
          paymentMethod,
          items: items.filter((item) => item.description.trim())
        })
      });

      setCustomerId("");
      setPaymentMethod("CASH");
      setItems([initialItem]);
      setMessageType("success");
      setMessage("Venta guardada correctamente.");
      await loadSales();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la venta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title="Punto de venta"
      description="Ventas de mostrador para accesorios, refacciones y consumibles."
      moduleTheme={{
        code: "PV",
        label: "Punto de venta",
        soft: "rgba(168, 85, 247, 0.12)",
        solid: "#9333ea",
        glow: "#c084fc"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Ventas registradas"
          value={String(sales.length)}
          hint="Tickets recientes del punto de venta."
          icon="VT"
        />
        <MetricCard
          label="Ticket promedio"
          value={money(ticketAverage)}
          hint="Promedio simple del lote visible."
          icon="TP"
        />
        <MetricCard
          label="Articulos vendidos"
          value={String(totalUnits)}
          hint="Unidades acumuladas en ventas recientes."
          icon="AR"
        />
        <MetricCard
          label="Ultima venta"
          value={money(mostRecentSale)}
          hint="Referencia rapida del ticket mas nuevo."
          icon="UV"
        />
      </div>

      <div className="split-grid balanced">
        <DataTableCard title="Ventas recientes" description="Referencia para mostrador y cierre.">
          {sales.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Cliente</th>
                    <th>Articulos</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      className={`row-selectable ${selectedSale?.id === sale.id ? "active" : ""}`}
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                    >
                      <td>{sale.folio}</td>
                      <td>{sale.customer?.fullName || "Mostrador"}</td>
                      <td>{sale.items.map((item) => `${item.description} x${item.quantity}`).join(", ")}</td>
                      <td>{money(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin ventas"
              description="Las ventas de mostrador apareceran aqui en cuanto registres la primera."
            />
          )}
        </DataTableCard>

        <div className="stack">
          <DataTableCard
            title="Venta seleccionada"
            description="Resumen rapido del ticket para mostrador y corte."
          >
            {selectedSale ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedSale.folio}</strong>
                      <p>{selectedSale.customer?.fullName || "Mostrador general"}</p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">{money(selectedSale.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Cliente</span>
                    <strong>{selectedSale.customer?.fullName || "Mostrador general"}</strong>
                    <p>Venta rapida registrada desde POS.</p>
                  </div>
                  <div className="detail-block">
                    <span>Partidas</span>
                    <strong>{selectedSale.items.length}</strong>
                    <p>
                      {selectedSale.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                      en total.
                    </p>
                  </div>
                </div>

                <div className="detail-block">
                  <span>Detalle del ticket</span>
                  <ul className="detail-list">
                    {selectedSale.items.map((item, index) => (
                      <li key={`${selectedSale.id}-${index}-${item.description}`}>
                        <strong>{item.description}</strong>
                        <span>x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona una venta"
                description="Elige un ticket de la tabla para ver su resumen rapido."
              />
            )}
          </DataTableCard>

          <DataTableCard title="Nueva venta" description="Captura rapida para mostrador.">
            <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-header">
                <strong>Encabezado de venta</strong>
                <span>Selecciona cliente y metodo de cobro antes de capturar partidas.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="sale-customer">Cliente</label>
                  <select
                    id="sale-customer"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                  >
                    <option value="">Mostrador general</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="payment-method">Metodo de pago</label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="MIXED">Mixto</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Partidas</strong>
                <span>Captura cada articulo en una tarjeta para evitar campos amontonados.</span>
              </div>

              <div className="stack">
              {items.map((item, index) => (
                <div className="line-item-card" key={`${index}-${item.description}`}>
                  <div className="line-item-header">
                    <strong>Partida {index + 1}</strong>
                    <span className="helper-text">
                      {money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                    </span>
                  </div>

                  <div className="field">
                    <label>Descripcion</label>
                    <input
                      placeholder="Pantalla OLED, mica, bateria, funda..."
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, { description: event.target.value })
                      }
                    />
                  </div>

                  <div className="line-item-grid">
                    <div className="field">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Precio unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(index, { unitPrice: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Subtotal</label>
                      <input
                        disabled
                        value={money(
                          (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>

            <div className="action-row">
              <button
                className="secondary-button"
                onClick={() => setItems((current) => [...current, initialItem])}
                type="button"
              >
                Agregar partida
              </button>
              {items.length > 1 ? (
                <button
                  className="secondary-button"
                  onClick={() => setItems((current) => current.slice(0, -1))}
                  type="button"
                >
                  Quitar ultima
                </button>
                ) : null}
            </div>

            <div className="summary-card">
              <strong>Total estimado</strong>
              <span>{money(total)}</span>
            </div>

            {message ? (
              <div className={messageType === "error" ? "danger-text" : "status-text"}>
                {message}
              </div>
            ) : null}

            <div className="action-row">
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Guardando..." : "Guardar venta"}
              </button>
            </div>
            </form>
          </DataTableCard>
        </div>
      </div>
    </DashboardShell>
  );
}
