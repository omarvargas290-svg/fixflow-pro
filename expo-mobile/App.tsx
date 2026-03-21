import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
};

type Settings = {
  businessName: string;
  branchName: string;
  phone: string;
  whatsapp: string;
  address: string;
  currency: string;
  language: string;
  publicTracking: boolean;
  lowStockAlert: number;
  ticketHeader: string;
  whatsappTemplate: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  supplierId: string;
};

type Supplier = {
  id: string;
  name: string;
  specialty: string;
  distance: string;
  rating: number;
  phone: string;
};

type TimelineItem = {
  label: string;
  at: string;
  state: string;
};

type Order = {
  id: string;
  customer: string;
  phone: string;
  whatsapp: string;
  brand: string;
  model: string;
  imei: string;
  issue: string;
  status: string;
  technician: string;
  estimatedTotal: number;
  deposit: number;
  createdAt: string;
  eta: string;
  notes: { at: string; text: string }[];
  timeline: TimelineItem[];
};

type Bootstrap = {
  defaultUserId: string;
  users: User[];
  currentUser?: User;
};

type AuthResponse = {
  ok: boolean;
  user: User;
  token: string;
};

type StoreState = {
  ownerUserId: string;
  settings: Settings;
  inventory: InventoryItem[];
  suppliers: Supplier[];
  orders: Order[];
};

const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

const SESSION_KEY = "fixflow.mobile.session";

const money = (value: number, currency = "MXN") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(0)}`;
  }
};

function normalizeStore(input: Partial<StoreState> | null | undefined): StoreState {
  return {
    ownerUserId: String(input?.ownerUserId || ""),
    settings: {
      businessName: String(input?.settings?.businessName || "FixFlow Pro"),
      branchName: String(input?.settings?.branchName || "Sucursal Centro"),
      phone: String(input?.settings?.phone || ""),
      whatsapp: String(input?.settings?.whatsapp || ""),
      address: String(input?.settings?.address || ""),
      currency: String(input?.settings?.currency || "MXN"),
      language: String(input?.settings?.language || "es-MX"),
      publicTracking: Boolean(input?.settings?.publicTracking ?? true),
      lowStockAlert: Number(input?.settings?.lowStockAlert || 5),
      ticketHeader: String(input?.settings?.ticketHeader || "FixFlow Pro"),
      whatsappTemplate: String(input?.settings?.whatsappTemplate || "Hola {{cliente}}, tu equipo {{modelo}} cambio a estado {{estado}}."),
    },
    inventory: Array.isArray(input?.inventory) ? input!.inventory.map((item) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      sku: String(item.sku || ""),
      category: String(item.category || ""),
      stock: Number(item.stock || 0),
      minStock: Number(item.minStock || 0),
      cost: Number(item.cost || 0),
      supplierId: String(item.supplierId || ""),
    })) : [],
    suppliers: Array.isArray(input?.suppliers) ? input!.suppliers.map((supplier) => ({
      id: String(supplier.id || ""),
      name: String(supplier.name || ""),
      specialty: String(supplier.specialty || ""),
      distance: String(supplier.distance || ""),
      rating: Number(supplier.rating || 0),
      phone: String(supplier.phone || ""),
    })) : [],
    orders: Array.isArray(input?.orders) ? input!.orders.map((order) => ({
      id: String(order.id || ""),
      customer: String(order.customer || ""),
      phone: String(order.phone || ""),
      whatsapp: String(order.whatsapp || ""),
      brand: String(order.brand || ""),
      model: String(order.model || ""),
      imei: String(order.imei || ""),
      issue: String(order.issue || ""),
      status: String(order.status || "received"),
      technician: String(order.technician || ""),
      estimatedTotal: Number(order.estimatedTotal || 0),
      deposit: Number(order.deposit || 0),
      createdAt: String(order.createdAt || ""),
      eta: String(order.eta || ""),
      notes: Array.isArray(order.notes) ? order.notes.map((note) => ({ at: String(note.at || ""), text: String(note.text || "") })) : [],
      timeline: Array.isArray(order.timeline) ? order.timeline.map((step) => ({ label: String(step.label || ""), at: String(step.at || ""), state: String(step.state || "pending") })) : [],
    })) : [],
  };
}

function createEmptyOrder(technician = ""): Order {
  return {
    id: "",
    customer: "",
    phone: "",
    whatsapp: "",
    brand: "",
    model: "",
    imei: "",
    issue: "",
    status: "received",
    technician,
    estimatedTotal: 0,
    deposit: 0,
    createdAt: "",
    eta: "",
    notes: [],
    timeline: [],
  };
}

function buildAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("FixFlow boundary error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.centerScreen}>
          <StatusBar style="dark" />
          <Text style={styles.title}>Algo salio mal</Text>
          <Text style={styles.subtitle}>Cierra y vuelve a abrir la app. Si persiste, reinstala la APK mas reciente.</Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { width } = useWindowDimensions();
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [store, setStore] = useState<StoreState | null>(null);
  const [view, setView] = useState("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [ordersLimit, setOrdersLimit] = useState(20);
  const [inventoryLimit, setInventoryLimit] = useState(30);
  const [usersLimit, setUsersLimit] = useState(20);
  const [loginEmail, setLoginEmail] = useState("omarvargas290@gmail.com");
  const [loginPassword, setLoginPassword] = useState("Andy2706");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [orderForm, setOrderForm] = useState<Order>(createEmptyOrder());
  const [inventoryForm, setInventoryForm] = useState<InventoryItem>({
    id: "",
    name: "",
    sku: "",
    category: "",
    stock: 0,
    minStock: 1,
    cost: 0,
    supplierId: "",
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Tecnico",
    password: "",
  });
  const [settingsForm, setSettingsForm] = useState<Settings | null>(null);
  const isTablet = width >= 768;
  const metricCardWidth = isTablet ? (width - 64) / 2 : width - 32;
  const isAdmin = String(session?.role || "").toLowerCase() === "administrador";

  useEffect(() => {
    bootstrapApp();
  }, []);

  useEffect(() => {
    if (session) {
      setOrderForm((current) => (current.id ? current : createEmptyOrder(session.name)));
    }
  }, [session]);

  useEffect(() => {
    setOrdersLimit(20);
  }, [orderQuery]);

  const selectedOrder = useMemo(
    () => (Array.isArray(store?.orders) ? store!.orders.find((order) => order.id === selectedOrderId) || store!.orders[0] || null : null),
    [store, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    const source = Array.isArray(store?.orders) ? store!.orders : [];
    if (!query) return source;
    return source.filter((order) =>
      [order.id, order.customer, order.brand, order.model, order.phone, order.whatsapp]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [orderQuery, store]);

  const visibleOrders = useMemo(() => filteredOrders.slice(0, ordersLimit), [filteredOrders, ordersLimit]);
  const visibleInventory = useMemo(
    () => (Array.isArray(store?.inventory) ? store!.inventory.slice(0, inventoryLimit) : []),
    [inventoryLimit, store]
  );
  const visibleUsers = useMemo(() => users.slice(0, usersLimit), [users, usersLimit]);

  async function bootstrapApp() {
    setIsBootstrapping(true);
    try {
      const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
      if (!sessionRaw) return;
      const saved = JSON.parse(sessionRaw) as { token?: string };
      if (!saved.token) {
        await AsyncStorage.removeItem(SESSION_KEY);
        return;
      }
      setSessionToken(saved.token);
      const user = await loadSession(saved.token);
      setSession(user);
      await loadBootstrap(saved.token);
      await loadStore(user.id, saved.token);
    } catch {
      setSessionToken("");
      setSession(null);
      setStore(null);
      await AsyncStorage.removeItem(SESSION_KEY);
      Alert.alert("Conexion", "No se pudo cargar la app. Revisa tu conexion con el servidor.");
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function loadSession(token: string) {
    const res = await fetch(`${BACKEND_URL}/api/session`, {
      headers: buildAuthHeaders(token),
    });
    if (!res.ok) throw new Error("session_failed");
    const data = await res.json();
    return data.user as User;
  }

  async function loadBootstrap(token: string) {
    const res = await fetch(`${BACKEND_URL}/api/bootstrap`, {
      headers: buildAuthHeaders(token),
    });
    if (!res.ok) throw new Error("bootstrap_failed");
    const data: Bootstrap = await res.json();
    setUsers(data.users || []);
    return data;
  }

  async function loadStore(userId: string, token = sessionToken) {
    const res = await fetch(`${BACKEND_URL}/api/state?userId=${encodeURIComponent(userId)}`, {
      headers: buildAuthHeaders(token),
    });
    if (!res.ok) throw new Error("store_failed");
    const data = normalizeStore(await res.json());
    setStore(data);
    setSettingsForm(data.settings);
    setSelectedOrderId(data.orders[0]?.id || "");
  }

  async function saveStore(nextStore: StoreState, token = sessionToken) {
    setStore(nextStore);
    setSettingsForm(nextStore.settings);
    const res = await fetch(`${BACKEND_URL}/api/state?userId=${encodeURIComponent(nextStore.ownerUserId)}`, {
      method: "PUT",
      headers: {
        ...buildAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextStore),
    });
    if (!res.ok) throw new Error("save_failed");
  }

  async function onLogin() {
    setIsBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      if (res.status === 401) {
        Alert.alert("Login", "Credenciales invalidas");
        return;
      }

      if (res.status === 403) {
        Alert.alert("Login", "Tu cuenta aun no ha sido aprobada por el administrador");
        return;
      }

      if (res.status === 429) {
        Alert.alert("Login", "Demasiados intentos. Espera unos minutos e intenta de nuevo.");
        return;
      }

      if (!res.ok) {
        Alert.alert("Login", "No se pudo iniciar sesion");
        return;
      }

      const data: AuthResponse = await res.json();
      setSessionToken(data.token);
      setSession(data.user);
      await loadBootstrap(data.token);
      await loadStore(data.user.id, data.token);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token }));
    } catch {
      setSessionToken("");
      setSession(null);
      setStore(null);
      Alert.alert("Login", "No se pudo iniciar sesion con el servidor");
    } finally {
      setIsBusy(false);
    }
  }

  async function onChangeOrderStatus(status: string) {
    if (!store || !selectedOrder) return;
    const next = {
      ...store,
      orders: store.orders.map((order) =>
        order.id === selectedOrder.id
          ? {
              ...order,
              status,
              timeline: buildTimeline(order.createdAt, status),
              notes: [
                { at: new Date().toISOString(), text: `Estado actualizado a ${status}` },
                ...order.notes,
              ],
            }
          : order
      ),
    };
    setIsBusy(true);
    try {
      await saveStore(next);
    } catch {
      Alert.alert("Ordenes", "No se pudo actualizar el estado");
    } finally {
      setIsBusy(false);
    }
  }

  async function onSaveOrder() {
    if (!store || !session) return;

    const customer = orderForm.customer.trim();
    const brand = orderForm.brand.trim();
    const model = orderForm.model.trim();
    const issue = orderForm.issue.trim();

    if (!customer || !brand || !model || !issue) {
      Alert.alert("Ordenes", "Completa cliente, marca, modelo y falla");
      return;
    }

    const now = new Date();
    const createdAt = orderForm.createdAt || now.toISOString();
    const orderId =
      orderForm.id ||
      `RO-${Math.max(8841, ...store.orders.map((item) => Number(item.id.replace(/\D/g, "")) || 0)) + 1}`;

    const nextOrder: Order = {
      ...orderForm,
      id: orderId,
      customer,
      phone: orderForm.phone.trim(),
      whatsapp: (orderForm.whatsapp || orderForm.phone).trim(),
      brand,
      model,
      imei: orderForm.imei.trim(),
      issue,
      technician: orderForm.technician.trim() || session.name,
      estimatedTotal: Number(orderForm.estimatedTotal || 0),
      deposit: Number(orderForm.deposit || 0),
      createdAt,
      eta: orderForm.eta || createdAt.slice(0, 10),
      notes: orderForm.notes.length ? orderForm.notes : [{ at: createdAt, text: "Orden creada desde app movil." }],
      timeline: orderForm.timeline.length ? orderForm.timeline : buildTimeline(createdAt, "received"),
      status: orderForm.status || "received",
    };

    const nextOrders = orderForm.id
      ? store.orders.map((item) => (item.id === orderForm.id ? nextOrder : item))
      : [nextOrder, ...store.orders];

    setIsBusy(true);
    try {
      await saveStore({ ...store, orders: nextOrders });
      setSelectedOrderId(nextOrder.id);
      setOrderForm(createEmptyOrder(session.name));
      Alert.alert("Ordenes", orderForm.id ? "Orden actualizada" : "Orden creada");
    } catch {
      Alert.alert("Ordenes", "No se pudo guardar la orden");
    } finally {
      setIsBusy(false);
    }
  }

  async function onPrintTicket() {
    if (!store || !selectedOrder) return;

    const balance = Number(selectedOrder.estimatedTotal || 0) - Number(selectedOrder.deposit || 0);
    const trackingLink = store.settings.publicTracking
      ? `${BACKEND_URL.replace(/\/api$/, "")}/?u=${encodeURIComponent(store.ownerUserId)}&tracking=${encodeURIComponent(selectedOrder.id)}`
      : "";
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font-family: Arial, sans-serif; color: #111; width: 72mm; margin: 0 auto; font-size: 12px; }
      h1, h2, p { margin: 0; }
      .center { text-align: center; }
      .muted { color: #555; }
      .block { margin-top: 8px; }
      .line { border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .strong { font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="center">
      <h1>${escapeHtml(store.settings.ticketHeader || store.settings.businessName)}</h1>
      <p>${escapeHtml(store.settings.branchName || "")}</p>
      <p>${escapeHtml(store.settings.phone || "")}</p>
    </div>
    <div class="line"></div>
    <div class="block">
      <p class="strong">Folio: ${escapeHtml(selectedOrder.id)}</p>
      <p>Fecha: ${escapeHtml(formatDate(selectedOrder.createdAt))}</p>
      <p>Cliente: ${escapeHtml(selectedOrder.customer)}</p>
      <p>Telefono: ${escapeHtml(selectedOrder.phone || selectedOrder.whatsapp || "")}</p>
    </div>
    <div class="line"></div>
    <div class="block">
      <p class="strong">Equipo</p>
      <p>${escapeHtml(selectedOrder.brand)} ${escapeHtml(selectedOrder.model)}</p>
      <p>IMEI/Serie: ${escapeHtml(selectedOrder.imei || "N/D")}</p>
      <p>Falla: ${escapeHtml(selectedOrder.issue)}</p>
      <p>Estatus: ${escapeHtml(statusLabel(selectedOrder.status))}</p>
    </div>
    <div class="line"></div>
    <div class="block">
      <div class="row"><p>Total</p><p>${escapeHtml(money(selectedOrder.estimatedTotal, store.settings.currency))}</p></div>
      <div class="row"><p>Anticipo</p><p>${escapeHtml(money(selectedOrder.deposit, store.settings.currency))}</p></div>
      <div class="row strong"><p>Saldo</p><p>${escapeHtml(money(balance, store.settings.currency))}</p></div>
    </div>
    <div class="line"></div>
    <div class="block center muted">
      <p>Conserva este ticket para recoger tu equipo.</p>
      ${trackingLink ? `<p>Seguimiento: ${escapeHtml(trackingLink)}</p>` : ""}
      <p>Gracias por tu preferencia.</p>
    </div>
  </body>
</html>`;

    try {
      const file = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Compartir ticket",
        });
      } else {
        Alert.alert("Ticket", "Se genero el ticket en PDF, pero compartir no esta disponible en este dispositivo.");
      }
    } catch {
      Alert.alert("Ticket", "No se pudo generar el ticket");
    }
  }

  async function onSaveInventory() {
    if (!store) return;
    const item = { ...inventoryForm, stock: Number(inventoryForm.stock), minStock: Number(inventoryForm.minStock), cost: Number(inventoryForm.cost) };
    const nextItems = item.id
      ? store.inventory.map((current) => (current.id === item.id ? item : current))
      : [{ ...item, id: `INV-${Math.max(100, ...store.inventory.map((i) => Number(i.id.replace(/\D/g, "")) || 0)) + 1}` }, ...store.inventory];

    setIsBusy(true);
    try {
      await saveStore({ ...store, inventory: nextItems });
      setInventoryForm({ id: "", name: "", sku: "", category: "", stock: 0, minStock: 1, cost: 0, supplierId: "" });
    } catch {
      Alert.alert("Inventario", "No se pudo guardar el repuesto");
    } finally {
      setIsBusy(false);
    }
  }

  async function onCreateUser() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email.trim())) {
      Alert.alert("Usuarios", "Email invalido");
      return;
    }

    setIsBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(sessionToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        Alert.alert("Usuarios", "No se pudo crear el usuario");
        return;
      }

      await loadBootstrap(sessionToken);
      setNewUser({ name: "", email: "", role: "Tecnico", password: "" });
    } catch {
      Alert.alert("Usuarios", "No se pudo crear el usuario");
    } finally {
      setIsBusy(false);
    }
  }

  async function onRegister() {
    const payload = {
      name: registerForm.name.trim(),
      email: registerForm.email.trim().toLowerCase(),
      password: registerForm.password,
      role: "Tecnico",
    };

    if (!payload.name) {
      Alert.alert("Registro", "Ingresa tu nombre");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      Alert.alert("Registro", "Email invalido");
      return;
    }

    if (payload.password.length < 6) {
      Alert.alert("Registro", "La contrasena debe tener al menos 6 caracteres");
      return;
    }

    if (payload.password !== registerForm.confirmPassword) {
      Alert.alert("Registro", "Las contrasenas no coinciden");
      return;
    }

    setIsBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        Alert.alert("Registro", "Ese correo ya esta registrado");
        return;
      }

      if (!res.ok) {
        Alert.alert("Registro", "No se pudo completar el registro");
        return;
      }

      await res.json();
      setRegisterForm({ name: "", email: "", password: "", confirmPassword: "" });
      setLoginEmail(payload.email);
      setLoginPassword("");
      setAuthMode("login");
      Alert.alert("Registro", "Tu solicitud fue enviada. Espera aprobacion del administrador para ingresar.");
    } catch {
      Alert.alert("Registro", "No se pudo completar el registro");
    } finally {
      setIsBusy(false);
    }
  }

  async function onDeleteUser(userId: string) {
    if (session?.id === userId) {
      Alert.alert("Usuarios", "No puedes eliminar tu propia sesion");
      return;
    }

    setIsBusy(true);
    try {
      await fetch(`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: buildAuthHeaders(sessionToken),
      });
      await loadBootstrap(sessionToken);
    } catch {
      Alert.alert("Usuarios", "No se pudo eliminar el usuario");
    } finally {
      setIsBusy(false);
    }
  }

  async function onApproveUser(userId: string) {
    setIsBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${encodeURIComponent(userId)}/approve`, {
        method: "POST",
        headers: buildAuthHeaders(sessionToken),
      });
      if (!res.ok) {
        Alert.alert("Usuarios", "No se pudo aprobar el usuario");
        return;
      }
      await loadBootstrap(sessionToken);
    } catch {
      Alert.alert("Usuarios", "No se pudo aprobar el usuario");
    } finally {
      setIsBusy(false);
    }
  }

  async function onSaveSettings() {
    if (!store || !settingsForm) return;
    setIsBusy(true);
    try {
      await saveStore({ ...store, settings: settingsForm });
      Alert.alert("Configuracion", "Datos del negocio actualizados");
    } catch {
      Alert.alert("Configuracion", "No se pudo guardar la configuracion");
    } finally {
      setIsBusy(false);
    }
  }

  async function onRefreshStore() {
    if (!session) return;
    setIsBusy(true);
    try {
      await loadBootstrap(sessionToken);
      await loadStore(session.id, sessionToken);
    } catch {
      Alert.alert("Sincronizacion", "No se pudo refrescar la informacion");
    } finally {
      setIsBusy(false);
    }
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1152d4" />
        <Text style={styles.loadingText}>Cargando FixFlow Mobile...</Text>
      </SafeAreaView>
    );
  }

  if (!session || !store) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <Text style={styles.badge}>FixFlow Mobile</Text>
          <Text style={styles.title}>{authMode === "login" ? "Inicio de sesion" : "Registro"}</Text>
          <Text style={styles.subtitle}>Backend: {BACKEND_URL}</Text>
          {authMode === "login" ? (
            <>
              <TextInput style={styles.input} value={loginEmail} onChangeText={setLoginEmail} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={loginPassword} onChangeText={setLoginPassword} placeholder="Contrasena" secureTextEntry />
              <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onLogin} disabled={isBusy}>
                <Text style={styles.primaryText}>Entrar</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setAuthMode("register")} disabled={isBusy}>
                <Text style={styles.secondaryText}>Crear cuenta</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput style={styles.input} value={registerForm.name} onChangeText={(value) => setRegisterForm({ ...registerForm, name: value })} placeholder="Nombre completo" />
              <TextInput style={styles.input} value={registerForm.email} onChangeText={(value) => setRegisterForm({ ...registerForm, email: value })} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={registerForm.password} onChangeText={(value) => setRegisterForm({ ...registerForm, password: value })} placeholder="Contrasena" secureTextEntry />
              <TextInput style={styles.input} value={registerForm.confirmPassword} onChangeText={(value) => setRegisterForm({ ...registerForm, confirmPassword: value })} placeholder="Confirmar contrasena" secureTextEntry />
              <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onRegister} disabled={isBusy}>
                <Text style={styles.primaryText}>Registrarme</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setAuthMode("login")} disabled={isBusy}>
                <Text style={styles.secondaryText}>Ya tengo cuenta</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>{store.settings.businessName}</Text>
          <Text style={styles.headerTitle}>{session.name}</Text>
          <Text style={styles.subtitle}>{session.role} - {store.ownerUserId}</Text>
        </View>
        <Pressable
          style={styles.ghostButton}
          onPress={async () => {
            await AsyncStorage.removeItem(SESSION_KEY);
            setSessionToken("");
            setSession(null);
            setStore(null);
            setUsers([]);
            setSettingsForm(null);
            setAuthMode("login");
          }}
        >
          <Text style={styles.ghostText}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isBusy && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color="#1152d4" />
            <Text style={styles.syncText}>Sincronizando...</Text>
          </View>
        )}

        <View style={styles.navRow}>
          {["dashboard", "orders", "inventory", "settings"].map((item) => (
            <Pressable key={item} style={[styles.navButton, view === item && styles.navButtonActive]} onPress={() => setView(item)}>
              <Text style={[styles.navText, view === item && styles.navTextActive]}>{item}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.navButton} onPress={onRefreshStore}>
            <Text style={styles.navText}>refrescar</Text>
          </Pressable>
        </View>

        {view === "dashboard" && (
          <View style={styles.grid}>
            <Card title="Activas" value={String(store.orders.filter((o) => ["received", "in_progress", "waiting_parts"].includes(o.status)).length)} width={metricCardWidth} />
            <Card title="Listas" value={String(store.orders.filter((o) => o.status === "ready").length)} width={metricCardWidth} />
            <Card title="Entregadas" value={String(store.orders.filter((o) => o.status === "delivered").length)} width={metricCardWidth} />
            <Card title="Stock bajo" value={String(store.inventory.filter((i) => i.stock <= i.minStock).length)} width={metricCardWidth} />
            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>Accesos rapidos</Text>
              <View style={styles.navRow}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    setView("orders");
                    setOrderForm(createEmptyOrder(session.name));
                  }}
                >
                  <Text style={styles.primaryText}>Agregar orden</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={onRefreshStore}>
                  <Text style={styles.secondaryText}>Refrescar datos</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {view === "orders" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordenes</Text>
            <TextInput
              style={styles.input}
              value={orderQuery}
              onChangeText={setOrderQuery}
              placeholder="Buscar por folio, cliente o modelo"
            />
            {visibleOrders.map((order) => (
              <Pressable key={order.id} style={styles.listCard} onPress={() => setSelectedOrderId(order.id)}>
                <Text style={styles.cardTitle}>{order.customer}</Text>
                <Text style={styles.cardText}>{order.id} - {order.brand} {order.model}</Text>
                <Text style={styles.cardText}>{statusLabel(order.status)} - {money(order.estimatedTotal, store.settings.currency)}</Text>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => {
                    setSelectedOrderId(order.id);
                    setOrderForm(order);
                  }}
                >
                  <Text style={styles.smallButtonText}>Editar</Text>
                </Pressable>
              </Pressable>
            ))}
            {filteredOrders.length > visibleOrders.length && (
              <Pressable style={styles.secondaryButton} onPress={() => setOrdersLimit((current) => current + 20)}>
                <Text style={styles.secondaryText}>Cargar mas ordenes</Text>
              </Pressable>
            )}

            {selectedOrder ? (
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>{selectedOrder.id}</Text>
                <Text style={styles.cardText}>{selectedOrder.customer} - {selectedOrder.issue}</Text>
                <Text style={styles.cardText}>Equipo: {selectedOrder.brand} {selectedOrder.model}</Text>
                <Text style={styles.cardText}>Tecnico: {selectedOrder.technician || "Sin asignar"}</Text>
                <Text style={styles.cardText}>Entrega promesa: {selectedOrder.eta || "Sin fecha"}</Text>
                <Text style={styles.cardText}>Anticipo: {money(selectedOrder.deposit, store.settings.currency)}</Text>
                <Text style={styles.cardText}>Saldo: {money(selectedOrder.estimatedTotal - selectedOrder.deposit, store.settings.currency)}</Text>
                <View style={styles.navRow}>
                  {["received", "in_progress", "waiting_parts", "ready", "delivered"].map((status) => (
                    <Pressable key={status} style={styles.smallButton} onPress={() => onChangeOrderStatus(status)}>
                      <Text style={styles.smallButtonText}>{statusLabel(status)}</Text>
                    </Pressable>
                  ))}
                  <Pressable style={styles.smallButton} onPress={onPrintTicket}>
                    <Text style={styles.smallButtonText}>Ticket</Text>
                  </Pressable>
                </View>
                <View style={styles.timelineBlock}>
                  {selectedOrder.timeline.map((step, index) => (
                    <View key={`${step.label}-${index}`} style={styles.timelineRow}>
                      <View style={[styles.timelineDot, step.state === "current" && styles.timelineDotCurrent, step.state === "done" && styles.timelineDotDone]} />
                      <View style={styles.timelineCopy}>
                        <Text style={styles.cardTitle}>{step.label}</Text>
                        <Text style={styles.cardText}>{step.at ? formatDate(step.at) : "Pendiente"}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Sin ordenes</Text>
                <Text style={styles.cardText}>No hay ordenes disponibles para esta cuenta.</Text>
              </View>
            )}

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>{orderForm.id ? "Editar orden" : "Nueva orden"}</Text>
              <TextInput style={styles.input} value={orderForm.customer} onChangeText={(value) => setOrderForm({ ...orderForm, customer: value })} placeholder="Cliente" />
              <TextInput style={styles.input} value={orderForm.phone} onChangeText={(value) => setOrderForm({ ...orderForm, phone: value })} placeholder="Telefono" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={orderForm.whatsapp} onChangeText={(value) => setOrderForm({ ...orderForm, whatsapp: value })} placeholder="WhatsApp" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={orderForm.brand} onChangeText={(value) => setOrderForm({ ...orderForm, brand: value })} placeholder="Marca" />
              <TextInput style={styles.input} value={orderForm.model} onChangeText={(value) => setOrderForm({ ...orderForm, model: value })} placeholder="Modelo" />
              <TextInput style={styles.input} value={orderForm.imei} onChangeText={(value) => setOrderForm({ ...orderForm, imei: value })} placeholder="IMEI o serie" />
              <TextInput style={styles.input} value={orderForm.issue} onChangeText={(value) => setOrderForm({ ...orderForm, issue: value })} placeholder="Falla reportada" multiline />
              <TextInput style={styles.input} value={String(orderForm.estimatedTotal)} onChangeText={(value) => setOrderForm({ ...orderForm, estimatedTotal: Number(value || 0) })} placeholder="Total estimado" keyboardType="numeric" />
              <TextInput style={styles.input} value={String(orderForm.deposit)} onChangeText={(value) => setOrderForm({ ...orderForm, deposit: Number(value || 0) })} placeholder="Anticipo" keyboardType="numeric" />
              <TextInput style={styles.input} value={orderForm.eta} onChangeText={(value) => setOrderForm({ ...orderForm, eta: value })} placeholder="Fecha promesa YYYY-MM-DD" />
              <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onSaveOrder} disabled={isBusy}>
                <Text style={styles.primaryText}>{orderForm.id ? "Guardar orden" : "Crear orden"}</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setOrderForm(createEmptyOrder(session.name))}
              >
                <Text style={styles.secondaryText}>Limpiar formulario</Text>
              </Pressable>
            </View>
          </View>
        )}

        {view === "inventory" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inventario</Text>
            {visibleInventory.map((item) => (
              <Pressable key={item.id} style={styles.listCard} onPress={() => setInventoryForm(item)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardText}>{item.sku} - {item.category}</Text>
                <Text style={styles.cardText}>Stock {item.stock} - Min {item.minStock} - {money(item.cost, store.settings.currency)}</Text>
              </Pressable>
            ))}
            {Array.isArray(store.inventory) && store.inventory.length > visibleInventory.length && (
              <Pressable style={styles.secondaryButton} onPress={() => setInventoryLimit((current) => current + 30)}>
                <Text style={styles.secondaryText}>Cargar mas inventario</Text>
              </Pressable>
            )}

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>{inventoryForm.id ? "Editar repuesto" : "Nuevo repuesto"}</Text>
              <TextInput style={styles.input} value={inventoryForm.name} onChangeText={(v) => setInventoryForm({ ...inventoryForm, name: v })} placeholder="Nombre" />
              <TextInput style={styles.input} value={inventoryForm.sku} onChangeText={(v) => setInventoryForm({ ...inventoryForm, sku: v })} placeholder="SKU" />
              <TextInput style={styles.input} value={inventoryForm.category} onChangeText={(v) => setInventoryForm({ ...inventoryForm, category: v })} placeholder="Categoria" />
              <TextInput style={styles.input} value={String(inventoryForm.stock)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, stock: Number(v || 0) })} placeholder="Stock" keyboardType="numeric" />
              <TextInput style={styles.input} value={String(inventoryForm.minStock)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, minStock: Number(v || 0) })} placeholder="Minimo" keyboardType="numeric" />
              <TextInput style={styles.input} value={String(inventoryForm.cost)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, cost: Number(v || 0) })} placeholder="Costo" keyboardType="numeric" />
              <TextInput style={styles.input} value={inventoryForm.supplierId} onChangeText={(v) => setInventoryForm({ ...inventoryForm, supplierId: v })} placeholder="ID proveedor" />
              <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onSaveInventory} disabled={isBusy}>
                <Text style={styles.primaryText}>{inventoryForm.id ? "Guardar cambios" : "Agregar repuesto"}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {view === "settings" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Negocio</Text>
            {settingsForm && (
              <View style={styles.formCard}>
                <TextInput style={styles.input} value={settingsForm.businessName} onChangeText={(value) => setSettingsForm({ ...settingsForm, businessName: value })} placeholder="Nombre del negocio" />
                <TextInput style={styles.input} value={settingsForm.branchName} onChangeText={(value) => setSettingsForm({ ...settingsForm, branchName: value })} placeholder="Sucursal" />
                <TextInput style={styles.input} value={settingsForm.phone} onChangeText={(value) => setSettingsForm({ ...settingsForm, phone: value })} placeholder="Telefono" keyboardType="phone-pad" />
                <TextInput style={styles.input} value={settingsForm.whatsapp} onChangeText={(value) => setSettingsForm({ ...settingsForm, whatsapp: value })} placeholder="WhatsApp" keyboardType="phone-pad" />
                <TextInput style={styles.input} value={settingsForm.address} onChangeText={(value) => setSettingsForm({ ...settingsForm, address: value })} placeholder="Direccion" />
                <TextInput style={styles.input} value={settingsForm.ticketHeader} onChangeText={(value) => setSettingsForm({ ...settingsForm, ticketHeader: value })} placeholder="Encabezado de ticket" />
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.cardTitle}>Seguimiento publico</Text>
                    <Text style={styles.cardText}>Permite compartir la liga de seguimiento al cliente.</Text>
                  </View>
                  <Switch value={settingsForm.publicTracking} onValueChange={(value) => setSettingsForm({ ...settingsForm, publicTracking: value })} />
                </View>
                <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onSaveSettings} disabled={isBusy}>
                  <Text style={styles.primaryText}>Guardar negocio</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.sectionTitle}>Usuarios</Text>
            <Text style={styles.cardText}>Cada usuario nuevo recibe un espacio independiente de ordenes, inventario y configuracion.</Text>
            {visibleUsers.map((user) => (
              <View key={user.id} style={styles.listCard}>
                <Text style={styles.cardTitle}>{user.name}</Text>
                <Text style={styles.cardText}>{user.email} - {user.role} - {user.active ? "Activo" : "Pendiente"}</Text>
                {isAdmin && (
                  <View style={styles.navRow}>
                    {!user.active && (
                      <Pressable style={styles.smallButton} onPress={() => onApproveUser(user.id)}>
                        <Text style={styles.smallButtonText}>Aprobar</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.smallButton} onPress={() => onDeleteUser(user.id)}>
                      <Text style={styles.smallButtonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            {users.length > visibleUsers.length && (
              <Pressable style={styles.secondaryButton} onPress={() => setUsersLimit((current) => current + 20)}>
                <Text style={styles.secondaryText}>Cargar mas usuarios</Text>
              </Pressable>
            )}

            {isAdmin ? (
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Nuevo usuario</Text>
                <TextInput style={styles.input} value={newUser.name} onChangeText={(v) => setNewUser({ ...newUser, name: v })} placeholder="Nombre" />
                <TextInput style={styles.input} value={newUser.email} onChangeText={(v) => setNewUser({ ...newUser, email: v })} placeholder="Correo" />
                <TextInput style={styles.input} value={newUser.role} onChangeText={(v) => setNewUser({ ...newUser, role: v })} placeholder="Rol" />
                <TextInput style={styles.input} value={newUser.password} onChangeText={(v) => setNewUser({ ...newUser, password: v })} placeholder="Contrasena" secureTextEntry />
                <Pressable style={[styles.primaryButton, isBusy && styles.buttonDisabled]} onPress={onCreateUser} disabled={isBusy}>
                  <Text style={styles.primaryText}>Crear usuario</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Acceso restringido</Text>
                <Text style={styles.cardText}>Solo un administrador puede crear o eliminar usuarios.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildTimeline(createdAt: string, status: string): TimelineItem[] {
  const now = new Date().toISOString();
  if (status === "received") return [{ label: "Recibido", at: createdAt, state: "current" }];
  if (status === "in_progress") return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "En reparacion", at: now, state: "current" }];
  if (status === "waiting_parts") return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "Esperando repuestos", at: now, state: "current" }];
  if (status === "ready") return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "Listo para entrega", at: now, state: "current" }];
  return [{ label: "Recibido", at: createdAt, state: "done" }, { label: "Entregado", at: now, state: "current" }];
}

function formatDate(value: string) {
  if (!value) return "N/D";
  try {
    return new Date(value).toLocaleString("es-MX");
  } catch {
    return value;
  }
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: string) {
  if (status === "received") return "Recibido";
  if (status === "in_progress") return "En reparacion";
  if (status === "waiting_parts") return "Esperando repuestos";
  if (status === "ready") return "Listo";
  if (status === "delivered") return "Entregado";
  return status || "Sin estado";
}

function Card({ title, value, width }: { title: string; value: string; width?: number }) {
  return (
    <View style={[styles.metricCard, width ? { width } : null]}>
      <Text style={styles.cardText}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6fb" },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f6fb", gap: 12 },
  loadingText: { color: "#152033", fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e8f0ff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncText: { color: "#1152d4", fontWeight: "700" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#d8e1ef",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: { color: "#1152d4", fontWeight: "700", textTransform: "uppercase", fontSize: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#152033" },
  subtitle: { color: "#64748b", marginTop: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#152033" },
  loginCard: {
    margin: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8e1ef",
    gap: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e1ef",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: "#1152d4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    backgroundColor: "#eef3fb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#1152d4", fontWeight: "700" },
  ghostButton: {
    backgroundColor: "#eef3fb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostText: { color: "#152033", fontWeight: "700" },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#eef3fb" },
  navButtonActive: { backgroundColor: "#1152d4" },
  navText: { color: "#152033", fontWeight: "700", textTransform: "capitalize" },
  navTextActive: { color: "#fff" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#152033" },
  grid: { gap: 12 },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8e1ef",
    padding: 18,
  },
  metricValue: { fontSize: 32, fontWeight: "800", color: "#152033", marginTop: 8 },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d8e1ef",
    padding: 16,
    gap: 6,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8e1ef",
    padding: 16,
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  switchCopy: { flex: 1, gap: 2 },
  timelineBlock: { marginTop: 8, gap: 10 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    marginTop: 4,
  },
  timelineDotCurrent: { backgroundColor: "#1152d4" },
  timelineDotDone: { backgroundColor: "#16a34a" },
  timelineCopy: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#152033" },
  cardText: { color: "#64748b" },
  smallButton: {
    alignSelf: "flex-start",
    backgroundColor: "#eef3fb",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  smallButtonText: { color: "#152033", fontWeight: "700" },
});

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
