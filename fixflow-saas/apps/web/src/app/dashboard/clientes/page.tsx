"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { apiFetch, dateText } from "@/lib/api";

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
};

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  notes: ""
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function loadCustomers(term = "") {
    const query = term ? `?search=${encodeURIComponent(term)}` : "";
    const data = await apiFetch<Customer[]>(`/customers${query}`);
    setCustomers(data);
  }

  useEffect(() => {
    loadCustomers(search).catch(console.error);
  }, [search]);

  useEffect(() => {
    if (!customers.length) {
      setSelectedCustomerId("");
      return;
    }

    if (!selectedCustomerId || !customers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm(initialForm);
      setMessageType("success");
      setMessage("Cliente creado correctamente.");
      await loadCustomers(search);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const recentCustomers = customers.filter((customer) => {
    const created = new Date(customer.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created <= 1000 * 60 * 60 * 24 * 30;
  }).length;
  const customersWithEmail = customers.filter((customer) => customer.email).length;
  const customersWithNotes = customers.filter((customer) => customer.notes).length;

  return (
    <DashboardShell
      title="Clientes"
      description="Recepcion y consulta centralizada por nombre, telefono y correo."
      moduleTheme={{
        code: "CL",
        label: "Clientes",
        soft: "rgba(59, 130, 246, 0.12)",
        solid: "#2563eb",
        glow: "#60a5fa"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Total clientes"
          value={String(customers.length)}
          hint="Base activa del tenant actual."
          icon="TC"
        />
        <MetricCard
          label="Altas recientes"
          value={String(recentCustomers)}
          hint="Clientes capturados en los ultimos 30 dias."
          icon="AR"
        />
        <MetricCard
          label="Con correo"
          value={String(customersWithEmail)}
          hint="Listos para seguimiento y contacto."
          icon="EM"
        />
        <MetricCard
          label="Con notas"
          value={String(customersWithNotes)}
          hint="Registros con contexto adicional."
          icon="NT"
        />
      </div>

      <div className="split-grid balanced">
        <DataTableCard
          title="Base de clientes"
          description="Busqueda rapida para mostrador, POS y ordenes."
          toolbar={
            <div className="toolbar">
              <input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          }
        >
          {customers.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Telefono</th>
                    <th>Correo</th>
                    <th>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      className={`row-selectable ${selectedCustomer?.id === customer.id ? "active" : ""}`}
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <td>
                        <strong>{customer.fullName}</strong>
                        <br />
                        <span>{customer.notes || "Sin notas"}</span>
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.email || "Sin correo"}</td>
                      <td>{dateText(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin clientes"
              description="Aqui apareceran los registros capturados desde recepcion y mostrador."
            />
          )}
        </DataTableCard>

        <div className="stack">
          <DataTableCard
            title="Cliente seleccionado"
            description="Consulta rapida del contacto y contexto del cliente."
          >
            {selectedCustomer ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedCustomer.fullName}</strong>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">
                        Alta {dateText(selectedCustomer.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Telefono</span>
                    <strong>{selectedCustomer.phone}</strong>
                    <p>Contacto principal para ordenes y mostrador.</p>
                  </div>
                  <div className="detail-block">
                    <span>Correo</span>
                    <strong>{selectedCustomer.email || "Sin correo registrado"}</strong>
                    <p>Util para seguimiento y envio de informacion.</p>
                  </div>
                </div>

                <div className="detail-grid single">
                  <div className="detail-block">
                    <span>Notas</span>
                    <strong>{selectedCustomer.notes || "Sin notas registradas"}</strong>
                    <p>Referencia rapida para recepcion, POS y soporte.</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona un cliente"
                description="Elige un registro de la tabla para ver su ficha de contacto."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Nuevo cliente"
            description="Alta rapida para usarlo en ordenes de servicio o ventas."
          >
            <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-header">
                <strong>Contacto principal</strong>
                <span>Solo lo necesario para registrar al cliente y usarlo de inmediato.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="fullName">Nombre completo</label>
                  <input
                    id="fullName"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Telefono</label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <strong>Datos complementarios</strong>
                <span>Opcionales, para dar seguimiento o dejar observaciones del cliente.</span>
              </div>
              <div className="form-grid compact">
                <div className="field">
                  <label htmlFor="email">Correo</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="notes">Notas</label>
                  <input
                    id="notes"
                    placeholder="Ej. solo WhatsApp, cliente frecuente, empresa..."
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
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
                {saving ? "Guardando..." : "Guardar cliente"}
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
