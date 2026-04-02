"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTableCard } from "@/components/data-table-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { ModuleCard } from "@/components/module-card";
import { apiFetch } from "@/lib/api";

type Membership = {
  id: string;
  role: "ADMIN" | "TECH" | "CASHIER";
  status: string;
  user: { name: string; email: string; phone?: string | null };
  branch?: { name: string } | null;
};

type Branch = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
};

type TenantProfile = {
  name: string;
  plan?: string;
  billingEmail?: string | null;
  brandProfile?: {
    companyName?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    ticketHeader?: string | null;
    supportEmail?: string | null;
    customDomain?: string | null;
  } | null;
  branches?: Branch[];
};

const initialUserForm = {
  name: "",
  email: "",
  password: "",
  role: "TECH" as "ADMIN" | "TECH" | "CASHIER",
  phone: ""
};

const initialBranchForm = {
  name: "",
  code: "",
  address: "",
  phone: ""
};

const initialTenantForm = {
  name: "",
  plan: "MVP",
  billingEmail: "",
  companyName: "",
  primaryColor: "#145cff",
  secondaryColor: "#101828",
  accentColor: "#22c55e",
  ticketHeader: "",
  supportEmail: "",
  customDomain: ""
};

export default function AdminPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [userForm, setUserForm] = useState(initialUserForm);
  const [branchForm, setBranchForm] = useState(initialBranchForm);
  const [tenantForm, setTenantForm] = useState(initialTenantForm);
  const [userMessage, setUserMessage] = useState("");
  const [branchMessage, setBranchMessage] = useState("");
  const [tenantMessage, setTenantMessage] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);

  async function loadUsers() {
    const data = await apiFetch<Membership[]>("/users");
    setMemberships(data);
  }

  async function loadTenantProfile() {
    const data = await apiFetch<TenantProfile>("/tenant/profile");
    setTenantProfile(data);
    setTenantForm({
      name: data.name || "",
      plan: data.plan || "MVP",
      billingEmail: data.billingEmail || "",
      companyName: data.brandProfile?.companyName || "",
      primaryColor: data.brandProfile?.primaryColor || "#145cff",
      secondaryColor: data.brandProfile?.secondaryColor || "#101828",
      accentColor: data.brandProfile?.accentColor || "#22c55e",
      ticketHeader: data.brandProfile?.ticketHeader || "",
      supportEmail: data.brandProfile?.supportEmail || "",
      customDomain: data.brandProfile?.customDomain || ""
    });
  }

  useEffect(() => {
    loadUsers().catch(console.error);
    loadTenantProfile().catch(console.error);
  }, []);

  useEffect(() => {
    if (!memberships.length) {
      setSelectedMembershipId("");
    } else if (
      !selectedMembershipId ||
      !memberships.some((membership) => membership.id === selectedMembershipId)
    ) {
      setSelectedMembershipId(memberships[0].id);
    }

    const branches = tenantProfile?.branches || [];
    if (!branches.length) {
      setSelectedBranchId("");
    } else if (!selectedBranchId || !branches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(branches[0].id);
    }
  }, [memberships, tenantProfile, selectedMembershipId, selectedBranchId]);

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    setUserMessage("");

    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(userForm)
      });
      setUserForm(initialUserForm);
      setUserMessage("Usuario guardado y activado en el tenant.");
      await loadUsers();
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : "No se pudo guardar el usuario.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleBranchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingBranch(true);
    setBranchMessage("");

    try {
      await apiFetch("/branches", {
        method: "POST",
        body: JSON.stringify(branchForm)
      });
      setBranchForm(initialBranchForm);
      setBranchMessage("Sucursal creada correctamente.");
      await loadTenantProfile();
    } catch (error) {
      setBranchMessage(error instanceof Error ? error.message : "No se pudo crear la sucursal.");
    } finally {
      setSavingBranch(false);
    }
  }

  async function handleTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTenant(true);
    setTenantMessage("");

    try {
      await apiFetch("/tenant/profile", {
        method: "PUT",
        body: JSON.stringify(tenantForm)
      });
      setTenantMessage("Branding y datos del negocio actualizados.");
      await loadTenantProfile();
    } catch (error) {
      setTenantMessage(error instanceof Error ? error.message : "No se pudo actualizar el tenant.");
    } finally {
      setSavingTenant(false);
    }
  }

  const selectedMembership =
    memberships.find((membership) => membership.id === selectedMembershipId) ?? null;
  const selectedBranch =
    tenantProfile?.branches?.find((branch) => branch.id === selectedBranchId) ?? null;
  const admins = memberships.filter((membership) => membership.role === "ADMIN").length;
  const techs = memberships.filter((membership) => membership.role === "TECH").length;
  const cashiers = memberships.filter((membership) => membership.role === "CASHIER").length;

  return (
    <DashboardShell
      title="Administracion SaaS"
      description="Usuarios, branding, tenant y sucursales listos para una operacion comercial mas ordenada."
      moduleTheme={{
        code: "AD",
        label: "Administracion",
        soft: "rgba(99, 102, 241, 0.12)",
        solid: "#4f46e5",
        glow: "#818cf8"
      }}
    >
      <div className="metric-grid">
        <MetricCard
          label="Usuarios"
          value={String(memberships.length)}
          hint="Accesos activos del tenant."
          icon="US"
        />
        <MetricCard
          label="Admins"
          value={String(admins)}
          hint="Perfiles con control total."
          icon="AD"
        />
        <MetricCard
          label="Tecnicos"
          value={String(techs)}
          hint="Equipo operativo del taller."
          icon="TC"
        />
        <MetricCard
          label="Sucursales"
          value={String(tenantProfile?.branches?.length || 0)}
          hint={`Cajeros activos: ${cashiers}`}
          icon="SC"
        />
      </div>

      <div className="split-grid balanced">
        <div className="stack">
          <DataTableCard
            title="Branding y negocio"
            description="Configuracion base por cliente SaaS."
          >
            <div className="detail-grid">
              <div className="detail-block">
                <span>Negocio</span>
                <strong>{tenantForm.companyName || tenantProfile?.name || "Sin definir"}</strong>
                <p>{tenantForm.billingEmail || "Sin correo de facturacion"}</p>
              </div>
              <div className="detail-block">
                <span>Preview visual</span>
                <strong>{tenantForm.customDomain || "Dominio sin asignar"}</strong>
                <div className="detail-meta-row">
                  <span
                    className="header-chip"
                    style={{
                      background: tenantForm.primaryColor,
                      color: "#fff",
                      borderColor: tenantForm.primaryColor
                    }}
                  >
                    Primario
                  </span>
                  <span
                    className="header-chip"
                    style={{
                      background: tenantForm.accentColor,
                      color: "#fff",
                      borderColor: tenantForm.accentColor
                    }}
                  >
                    Acento
                  </span>
                  <span
                    className="header-chip"
                    style={{
                      background: tenantForm.secondaryColor,
                      color: "#fff",
                      borderColor: tenantForm.secondaryColor
                    }}
                  >
                    Secundario
                  </span>
                </div>
              </div>
            </div>

            <form className="form-card" onSubmit={handleTenantSubmit}>
              <div className="form-section">
                <div className="section-header">
                  <strong>Identidad del negocio</strong>
                  <span>Datos principales del tenant y de la marca comercial.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label>Nombre interno del tenant</label>
                    <input
                      value={tenantForm.name}
                      onChange={(event) =>
                        setTenantForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Nombre comercial</label>
                    <input
                      value={tenantForm.companyName}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          companyName: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Plan</label>
                    <input
                      value={tenantForm.plan}
                      onChange={(event) =>
                        setTenantForm((current) => ({ ...current, plan: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Email de facturacion</label>
                    <input
                      type="email"
                      value={tenantForm.billingEmail}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          billingEmail: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Email soporte</label>
                    <input
                      type="email"
                      value={tenantForm.supportEmail}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          supportEmail: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Dominio personalizado</label>
                    <input
                      value={tenantForm.customDomain}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          customDomain: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <strong>Paleta visual y ticket</strong>
                  <span>Colores base y encabezado impreso para el taller.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label>Color principal</label>
                    <input
                      value={tenantForm.primaryColor}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          primaryColor: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Color acento</label>
                    <input
                      value={tenantForm.accentColor}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          accentColor: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Color secundario</label>
                    <input
                      value={tenantForm.secondaryColor}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          secondaryColor: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Encabezado de ticket</label>
                  <textarea
                    value={tenantForm.ticketHeader}
                    onChange={(event) =>
                      setTenantForm((current) => ({
                        ...current,
                        ticketHeader: event.target.value
                      }))
                    }
                  />
                </div>
              </div>

              {tenantMessage ? <div className="status-text">{tenantMessage}</div> : null}

              <div className="action-row">
                <button className="primary-button" disabled={savingTenant} type="submit">
                  {savingTenant ? "Guardando..." : "Guardar branding"}
                </button>
              </div>
            </form>
          </DataTableCard>

          <DataTableCard title="Sucursales" description="Escalado base para operacion multi-branch.">
            <div className="stack">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Codigo</th>
                      <th>Direccion</th>
                      <th>Telefono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tenantProfile?.branches || []).map((branch) => (
                      <tr
                        className={`row-selectable ${selectedBranch?.id === branch.id ? "active" : ""}`}
                        key={branch.id}
                        onClick={() => setSelectedBranchId(branch.id)}
                      >
                        <td>{branch.name}</td>
                        <td>{branch.code}</td>
                        <td>{branch.address || "Sin direccion"}</td>
                        <td>{branch.phone || "Sin telefono"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedBranch ? (
                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Sucursal activa</span>
                    <strong>{selectedBranch.name}</strong>
                    <p>Codigo: {selectedBranch.code}</p>
                  </div>
                  <div className="detail-block">
                    <span>Contacto</span>
                    <strong>{selectedBranch.phone || "Sin telefono"}</strong>
                    <p>{selectedBranch.address || "Sin direccion registrada"}</p>
                  </div>
                </div>
              ) : null}

              <form className="form-card" onSubmit={handleBranchSubmit}>
                <div className="form-section">
                  <div className="section-header">
                    <strong>Nueva sucursal</strong>
                    <span>Captura solo los datos operativos clave para empezar.</span>
                  </div>
                  <div className="form-grid compact">
                    <div className="field">
                      <label>Nombre de sucursal</label>
                      <input
                        value={branchForm.name}
                        onChange={(event) =>
                          setBranchForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Codigo</label>
                      <input
                        value={branchForm.code}
                        onChange={(event) =>
                          setBranchForm((current) => ({ ...current, code: event.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Direccion</label>
                      <input
                        value={branchForm.address}
                        onChange={(event) =>
                          setBranchForm((current) => ({ ...current, address: event.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Telefono</label>
                      <input
                        value={branchForm.phone}
                        onChange={(event) =>
                          setBranchForm((current) => ({ ...current, phone: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {branchMessage ? <div className="status-text">{branchMessage}</div> : null}

                <div className="action-row">
                  <button className="primary-button" disabled={savingBranch} type="submit">
                    {savingBranch ? "Guardando..." : "Crear sucursal"}
                  </button>
                </div>
              </form>
            </div>
          </DataTableCard>
        </div>

        <div className="stack">
          <DataTableCard
            title="Accesos del tenant"
            description="Usuarios activos del tenant con seleccion rapida."
          >
            {memberships.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Sucursal</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((membership) => (
                      <tr
                        className={`row-selectable ${selectedMembership?.id === membership.id ? "active" : ""}`}
                        key={membership.id}
                        onClick={() => setSelectedMembershipId(membership.id)}
                      >
                        <td>
                          <strong>{membership.user.name}</strong>
                          <br />
                          <span>{membership.user.email}</span>
                        </td>
                        <td>{membership.role}</td>
                        <td>{membership.branch?.name || "Global"}</td>
                        <td>
                          <span className="badge info">{membership.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Sin accesos"
                description="En cuanto registres usuarios del tenant apareceran aqui."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Acceso seleccionado"
            description="Ficha rapida del rol y alcance actual del usuario."
          >
            {selectedMembership ? (
              <div className="order-detail-stack">
                <div className="detail-hero">
                  <div className="detail-hero-top">
                    <div>
                      <strong>{selectedMembership.user.name}</strong>
                      <p>{selectedMembership.user.email}</p>
                    </div>
                    <div className="detail-meta-row">
                      <span className="header-chip">{selectedMembership.role}</span>
                      <span className="header-chip">{selectedMembership.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span>Rol</span>
                    <strong>{selectedMembership.role}</strong>
                    <p>Define el alcance visible dentro del panel.</p>
                  </div>
                  <div className="detail-block">
                    <span>Sucursal</span>
                    <strong>{selectedMembership.branch?.name || "Global"}</strong>
                    <p>{selectedMembership.user.phone || "Sin telefono registrado"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Selecciona un acceso"
                description="Elige un usuario del listado para revisar su ficha."
              />
            )}
          </DataTableCard>

          <DataTableCard
            title="Nuevo acceso"
            description="Alta rapida para administrador, tecnico o cajero."
          >
            <form className="form-card" onSubmit={handleUserSubmit}>
              <div className="form-section">
                <div className="section-header">
                  <strong>Datos del usuario</strong>
                  <span>Informacion basica del nuevo acceso.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label htmlFor="user-name">Nombre</label>
                    <input
                      id="user-name"
                      value={userForm.name}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-email">Correo</label>
                    <input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-phone">Telefono</label>
                    <input
                      id="user-phone"
                      value={userForm.phone}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <strong>Acceso y permisos</strong>
                  <span>Define la contrasena inicial y el rol operativo.</span>
                </div>
                <div className="form-grid compact">
                  <div className="field">
                    <label htmlFor="user-password">Contrasena</label>
                    <input
                      id="user-password"
                      type="password"
                      value={userForm.password}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-role">Rol</label>
                    <select
                      id="user-role"
                      value={userForm.role}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          role: event.target.value as typeof current.role
                        }))
                      }
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="TECH">Tecnico</option>
                      <option value="CASHIER">Cajero</option>
                    </select>
                  </div>
                </div>
              </div>

              {userMessage ? <div className="status-text">{userMessage}</div> : null}

              <div className="action-row">
                <button className="primary-button" disabled={savingUser} type="submit">
                  {savingUser ? "Guardando..." : "Guardar acceso"}
                </button>
              </div>
            </form>
          </DataTableCard>

          <div className="card-grid">
            <ModuleCard
              title="Administrador"
              description="Gobierna el tenant, branding, billing y usuarios."
              icon="AD"
              bullets={[
                "Configuracion general y branding",
                "Usuarios, sucursales y permisos",
                "Supervision comercial y financiera"
              ]}
            />
            <ModuleCard
              title="Tecnico"
              description="Opera diagnostico, seguimiento y piezas."
              icon="TC"
              bullets={[
                "Ordenes y avance tecnico",
                "Uso de refacciones",
                "Preparacion para entrega"
              ]}
            />
            <ModuleCard
              title="Cajero"
              description="Enfocado en cobro, entrega y POS."
              icon="CJ"
              bullets={[
                "POS y tickets",
                "Cobros y entregas",
                "Apoyo a cortes de caja"
              ]}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
