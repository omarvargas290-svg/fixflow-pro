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
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
};

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
};

type PurchaseOrder = {
  id: string;
  folio: string;
  total: number;
  supplier: { name: string };
  items: { description: string; quantity: number }[];
};

type PurchaseItem = {
  inventoryItemId: string;
  description: string;
  quantity: number;
  unitCost: number;
};

const initialSupplierForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: ""
};

const initialPurchaseItem: PurchaseItem = {
  inventoryItemId: "",
  description: "",
  quantity: 1,
  unitCost: 0
};

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [supplierMessage, setSupplierMessage] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([initialPurchaseItem]);

  async function loadBase() {
    const [suppliersData, itemsData, purchasesData] = await Promise.all([
      apiFetch<Supplier[]>("/suppliers"),
      apiFetch<InventoryItem[]>("/inventory/items"),
      apiFetch<PurchaseOrder[]>("/purchase-orders")
    ]);

    setSuppliers(suppliersData);
    setInventory(itemsData);
    setPurchaseOrders(purchasesData);
  }

  useEffect(() => {
    loadBase().catch(console.error);
  }, []);

  useEffect(() => {
    if (!suppliers.length) {
      setSelectedSupplierId("");
    } else if (!selectedSupplierId || !suppliers.some((supplier) => supplier.id === selectedSupplierId)) {
      setSelectedSupplierId(suppliers[0].id);
    }

    if (!purchaseOrders.length) {
      setSelectedPurchaseId("");
    } else if (
      !selectedPurchaseId ||
      !purchaseOrders.some((purchase) => purchase.id === selectedPurchaseId)
    ) {
      setSelectedPurchaseId(purchaseOrders[0].id);
    }
  }, [suppliers, purchaseOrders, selectedSupplierId, selectedPurchaseId]);

  function updatePurchaseItem(index: number, patch: Partial<PurchaseItem>) {
    setPurchaseItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  async function handleSupplierSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupplierMessage("");

    try {
      await apiFetch("/suppliers", {
        method: "POST",
        body: JSON.stringify(supplierForm)
      });
      setSupplierForm(initialSupplierForm);
      setSupplierMessage("Proveedor creado correctamente.");
      await loadBase();
    } catch (error) {
      setSupplierMessage(error instanceof Error ? error.message : "No se pudo crear el proveedor.");
    }
  }

  async function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseMessage("");

    try {
      await apiFetch("/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: purchaseSupplierId,
          items: purchaseItems
            .filter((item) => item.description.trim())
            .map((item) => ({
              ...item,
              inventoryItemId: item.inventoryItemId || undefined
            }))
        })
      });
      setPurchaseSupplierId("");
      setPurchaseItems([initialPurchaseItem]);
      setPurchaseMessage("Compra registrada y stock actualizado.");
      await loadBase();
    } catch (error) {
      setPurchaseMessage(error instanceof Error ? error.message : "No se pudo registrar la compra.");
    }
  }

  const purchaseTotal = purchaseItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;
  const selectedPurchase =
    purchaseOrders.find((purchase) => purchase.id === selectedPurchaseId) ?? null;
  const purchasesTotal = purchaseOrders.reduce((sum, purchase) => sum + purchase.total, 0);
  const supplierCoverage = suppliers.filter((supplier) => supplier.phone || supplier.email).length;

  return (
    <DashboardShell
      title="Proveedores y compras"
      description="Control de suministro, contactos y ordenes de compra."
      moduleTheme={{
        code: "CP",
        label: "Compras",
        soft: "rgba(14, 165, 233, 0.12)",
        solid: "#0284c7",
        glow: "#38bdf8"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Proveedores"
          value={String(suppliers.length)}
          hint="Base disponible para reabasto."
          icon="PV"
        />
        <MetricCard
          label="Compras"
          value={String(purchaseOrders.length)}
          hint="Ordenes de compra registradas."
          icon="OC"
        />
        <MetricCard
          label="Monto comprado"
          value={money(purchasesTotal)}
          hint="Suma de compras visibles en el modulo."
          icon="MC"
        />
        <MetricCard
          label="Con contacto"
          value={String(supplierCoverage)}
          hint="Proveedores listos para seguimiento directo."
          icon="CT"
        />
      </div>

      <div className="split-grid balanced">
        <div className="stack">
          <DataTableCard
            title="Proveedores"
            description="Base para reabasto, compras y negociacion de refacciones."
          >
            {suppliers.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Contacto</th>
                      <th>Telefono</th>
                      <th>Correo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr
                        className={`row-selectable ${selectedSupplier?.id === supplier.id ? "active" : ""}`}
                        key={supplier.id}
                        onClick={() => setSelectedSupplierId(supplier.id)}
                      >
                        <td>{supplier.name}</td>
                        <td>{supplier.contactName || "Sin contacto"}</td>
                        <td>{supplier.phone || "Sin telefono"}</td>
                        <td>{supplier.email || "Sin correo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Sin proveedores"
                description="Cuando captures proveedores, aqui tendras la base para compras."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Proveedor seleccionado"
            description="Ficha rapida para compras y contacto."
          >
            {selectedSupplier ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedSupplier.name}</strong>
                      <p>{selectedSupplier.contactName || "Sin contacto principal"}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Telefono</span>
                    <strong>{selectedSupplier.phone || "Sin telefono"}</strong>
                    <p>Canal rapido para cotizar o confirmar stock.</p>
                  </div>
                  <div className="detail-block">
                    <span>Correo</span>
                    <strong>{selectedSupplier.email || "Sin correo"}</strong>
                    <p>Ideal para enviar ordenes de compra o listas.</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona un proveedor"
                description="Elige una fila para consultar sus datos clave."
              />
            )}
          </DataTableCard>

          <DataTableCard title="Nuevo proveedor" description="Alta rapida para compras del taller.">
            <form className="form-card" onSubmit={handleSupplierSubmit}>
              <div className="form-section">
                <div className="section-header">
                  <strong>Datos principales</strong>
                  <span>Informacion base para identificar al proveedor y contactarlo rapido.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label>Nombre</label>
                    <input
                      value={supplierForm.name}
                      onChange={(event) =>
                        setSupplierForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Contacto</label>
                    <input
                      value={supplierForm.contactName}
                      onChange={(event) =>
                        setSupplierForm((current) => ({
                          ...current,
                          contactName: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Telefono</label>
                    <input
                      value={supplierForm.phone}
                      onChange={(event) =>
                        setSupplierForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Correo</label>
                    <input
                      type="email"
                      value={supplierForm.email}
                      onChange={(event) =>
                        setSupplierForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <strong>Contexto comercial</strong>
                  <span>Campos opcionales para direccion y notas de compra.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label>Direccion</label>
                    <input
                      value={supplierForm.address}
                      onChange={(event) =>
                        setSupplierForm((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Notas</label>
                    <input
                      value={supplierForm.notes}
                      onChange={(event) =>
                        setSupplierForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {supplierMessage ? <div className="status-text">{supplierMessage}</div> : null}

              <div className="action-row">
                <button className="primary-button" type="submit">
                  Guardar proveedor
                </button>
              </div>
            </form>
          </DataTableCard>
        </div>

        <div className="stack">
          <DataTableCard
            title="Ordenes de compra"
            description="Compra recibida con actualizacion inmediata al inventario."
          >
            {purchaseOrders.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Proveedor</th>
                      <th>Partidas</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((purchase) => (
                      <tr
                        className={`row-selectable ${selectedPurchase?.id === purchase.id ? "active" : ""}`}
                        key={purchase.id}
                        onClick={() => setSelectedPurchaseId(purchase.id)}
                      >
                        <td>{purchase.folio}</td>
                        <td>{purchase.supplier.name}</td>
                        <td>
                          {purchase.items
                            .map((item) => `${item.description} x${item.quantity}`)
                            .join(", ")}
                        </td>
                        <td>{money(purchase.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Sin compras"
                description="Las ordenes de compra registradas quedaran visibles aqui."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Compra seleccionada"
            description="Resumen de la orden y sus partidas principales."
          >
            {selectedPurchase ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedPurchase.folio}</strong>
                      <p>{selectedPurchase.supplier.name}</p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">{money(selectedPurchase.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Proveedor</span>
                    <strong>{selectedPurchase.supplier.name}</strong>
                    <p>Compra integrada al flujo de reabasto.</p>
                  </div>
                  <div className="detail-block">
                    <span>Partidas</span>
                    <strong>{selectedPurchase.items.length}</strong>
                    <p>
                      {selectedPurchase.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                      registradas.
                    </p>
                  </div>
                </div>

                <div className="detail-block">
                  <span>Detalle</span>
                  <ul className="detail-list">
                    {selectedPurchase.items.map((item, index) => (
                      <li key={`${selectedPurchase.id}-${index}-${item.description}`}>
                        <strong>{item.description}</strong>
                        <span>x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona una compra"
                description="Elige una orden de compra para ver su ficha resumida."
              />
            )}
          </DataTableCard>

          <DataTableCard title="Nueva compra" description="Reabasto rapido para piezas del taller.">
            <form className="form-card" onSubmit={handlePurchaseSubmit}>
              <div className="form-section">
                <div className="section-header">
                  <strong>Encabezado de compra</strong>
                  <span>Selecciona primero el proveedor y luego agrega las partidas.</span>
                </div>
                <div className="field">
                  <label>Proveedor</label>
                  <select
                    value={purchaseSupplierId}
                    onChange={(event) => setPurchaseSupplierId(event.target.value)}
                  >
                    <option value="">Selecciona proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <strong>Partidas de compra</strong>
                  <span>Cada pieza queda en su propia tarjeta para capturar mejor.</span>
                </div>

                <div className="stack">
                  {purchaseItems.map((item, index) => (
                    <div className="line-item-card" key={`${index}-${item.description}`}>
                      <div className="line-item-header">
                        <strong>Partida {index + 1}</strong>
                        <span className="helper-text">
                          {money((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
                        </span>
                      </div>

                      <div className="field">
                        <label>Inventario vinculado</label>
                        <select
                          value={item.inventoryItemId}
                          onChange={(event) => {
                            const linked = inventory.find((row) => row.id === event.target.value);
                            updatePurchaseItem(index, {
                              inventoryItemId: event.target.value,
                              description: linked ? linked.name : item.description
                            });
                          }}
                        >
                          <option value="">Sin vincular</option>
                          {inventory.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.sku} · {row.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label>Descripcion</label>
                        <input
                          placeholder="Pantalla, bateria, teclado, flex..."
                          value={item.description}
                          onChange={(event) =>
                            updatePurchaseItem(index, { description: event.target.value })
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
                              updatePurchaseItem(index, { quantity: Number(event.target.value) })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Costo unitario</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(event) =>
                              updatePurchaseItem(index, { unitCost: Number(event.target.value) })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Subtotal</label>
                          <input
                            disabled
                            value={money(
                              (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
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
                  onClick={() => setPurchaseItems((current) => [...current, initialPurchaseItem])}
                  type="button"
                >
                  Agregar partida
                </button>
                {purchaseItems.length > 1 ? (
                  <button
                    className="secondary-button"
                    onClick={() => setPurchaseItems((current) => current.slice(0, -1))}
                    type="button"
                  >
                    Quitar ultima
                  </button>
                ) : null}
              </div>

              <div className="summary-card">
                <strong>Total de compra</strong>
                <span>{money(purchaseTotal)}</span>
              </div>

              {purchaseMessage ? <div className="status-text">{purchaseMessage}</div> : null}

              <div className="action-row">
                <button className="primary-button" type="submit">
                  Guardar compra
                </button>
              </div>
            </form>
          </DataTableCard>
        </div>
      </div>
    </DashboardShell>
  );
}
