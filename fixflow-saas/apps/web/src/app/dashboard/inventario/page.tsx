"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, money } from "@/lib/api";

type Supplier = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unitCost: number;
  salePrice: number;
  supplier?: { name: string } | null;
};

const initialForm = {
  sku: "",
  name: "",
  category: "",
  stock: 0,
  minStock: 1,
  unitCost: 0,
  salePrice: 0,
  supplierId: ""
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function loadItems(term = "", low = false) {
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    if (low) params.set("lowStock", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch<Item[]>(`/inventory/items${query}`);
    setItems(data);
  }

  async function loadSuppliers() {
    const data = await apiFetch<Supplier[]>("/suppliers");
    setSuppliers(data);
  }

  useEffect(() => {
    loadItems(search, lowStock).catch(console.error);
  }, [search, lowStock]);

  useEffect(() => {
    loadSuppliers().catch(console.error);
  }, []);

  useEffect(() => {
    if (!items.length) {
      setSelectedItemId("");
      return;
    }

    if (!selectedItemId || !items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      await apiFetch("/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          supplierId: form.supplierId || undefined
        })
      });
      setForm(initialForm);
      setMessageType("success");
      setMessage("Repuesto guardado correctamente.");
      await loadItems(search, lowStock);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el repuesto.");
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const lowStockItems = items.filter((item) => item.stock <= item.minStock).length;
  const totalUnits = items.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = items.reduce((sum, item) => sum + item.stock * item.unitCost, 0);

  return (
    <DashboardShell
      title="Inventario y refacciones"
      description="Control de stock, costo, precio, alertas y proveedor."
      moduleTheme={{
        code: "IN",
        label: "Inventario",
        soft: "rgba(34, 197, 94, 0.12)",
        solid: "#16a34a",
        glow: "#4ade80"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Piezas activas"
          value={String(items.length)}
          hint="Catalogo visible del modulo de inventario."
          icon="PI"
        />
        <MetricCard
          label="Stock bajo"
          value={String(lowStockItems)}
          hint="Items en punto de reabasto o por debajo del minimo."
          icon="SB"
        />
        <MetricCard
          label="Unidades"
          value={String(totalUnits)}
          hint="Cantidad total en existencia del lote filtrado."
          icon="UN"
        />
        <MetricCard
          label="Valor inventario"
          value={money(inventoryValue)}
          hint="Costo aproximado del inventario actual."
          icon="VL"
        />
      </div>

      <div className="split-grid balanced">
        <DataTableCard
          title="Existencias"
          description="Piezas de reparacion y productos de mostrador."
          toolbar={
            <div className="toolbar">
              <input
                placeholder="Buscar SKU, nombre o categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                className="secondary-button"
                onClick={() => setLowStock((current) => !current)}
                type="button"
              >
                {lowStock ? "Ver todo" : "Solo stock bajo"}
              </button>
            </div>
          }
        >
          {items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Repuesto</th>
                    <th>Stock</th>
                    <th>Costo</th>
                    <th>Venta</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      className={`row-selectable ${selectedItem?.id === item.id ? "active" : ""}`}
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <td>{item.sku}</td>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <span>{item.category}</span>
                      </td>
                      <td>
                        <span
                          className={item.stock <= item.minStock ? "badge danger" : "badge success"}
                        >
                          {item.stock} / min {item.minStock}
                        </span>
                      </td>
                      <td>{money(item.unitCost)}</td>
                      <td>{money(item.salePrice)}</td>
                      <td>{item.supplier?.name || "Sin proveedor"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin inventario"
              description="Cuando cargues refacciones, aqui podras controlarlas por costo, precio y proveedor."
            />
          )}
        </DataTableCard>

        <div className="stack">
          <DataTableCard
            title="Repuesto seleccionado"
            description="Ficha rapida para costo, venta y reabasto."
            toolbar={
              selectedItem ? (
                <span className={`badge ${selectedItem.stock <= selectedItem.minStock ? "danger" : "success"}`}>
                  {selectedItem.stock <= selectedItem.minStock ? "Stock bajo" : "Stock sano"}
                </span>
              ) : undefined
            }
          >
            {selectedItem ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedItem.name}</strong>
                      <p>
                        {selectedItem.sku} · {selectedItem.category}
                      </p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">
                        {selectedItem.supplier?.name || "Sin proveedor"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Stock actual</span>
                    <strong>{selectedItem.stock}</strong>
                    <p>Minimo configurado: {selectedItem.minStock}</p>
                  </div>
                  <div className="detail-block">
                    <span>Costo unitario</span>
                    <strong>{money(selectedItem.unitCost)}</strong>
                    <p>Precio sugerido: {money(selectedItem.salePrice)}</p>
                  </div>
                  <div className="detail-block">
                    <span>Margen estimado</span>
                    <strong>{money(selectedItem.salePrice - selectedItem.unitCost)}</strong>
                    <p>Utilidad bruta por pieza.</p>
                  </div>
                  <div className="detail-block">
                    <span>Valor en stock</span>
                    <strong>{money(selectedItem.stock * selectedItem.unitCost)}</strong>
                    <p>Inversion estimada en existencia.</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona un repuesto"
                description="Elige una fila del inventario para revisar su ficha rapida."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Nuevo repuesto"
            description="Alta rapida para el modulo tecnico y el POS."
          >
            <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-header">
                <strong>Identificacion del repuesto</strong>
                <span>Datos para buscarlo y reconocerlo rapido en inventario y POS.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="sku">SKU</label>
                  <input
                    id="sku"
                    value={form.sku}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sku: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="name">Nombre</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="category">Categoria</label>
                  <input
                    id="category"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Relacion con proveedor</strong>
                <span>Asocia la pieza con tu proveedor principal para compras y reabasto.</span>
              </div>
              <div className="form-grid sidebar-fit">
                <div className="field">
                  <label htmlFor="supplier">Proveedor</label>
                  <select
                    id="supplier"
                    value={form.supplierId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, supplierId: event.target.value }))
                    }
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Stock y precios</strong>
                <span>Define existencias, minimo de alerta y costos comerciales.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="stock">Stock actual</label>
                  <input
                    id="stock"
                    type="number"
                    value={form.stock}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, stock: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="minStock">Stock minimo</label>
                  <input
                    id="minStock"
                    type="number"
                    value={form.minStock}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, minStock: Number(event.target.value) }))
                    }
                  />
                </div>
              </div>

              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="unitCost">Costo unitario</label>
                  <input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, unitCost: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="salePrice">Precio de venta</label>
                  <input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    value={form.salePrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, salePrice: Number(event.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>

            {message ? (
              <div className={messageType === "error" ? "danger-text" : "status-text"}>
                {message}
              </div>
            ) : null}

            <div className="action-row">
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Guardando..." : "Guardar repuesto"}
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
