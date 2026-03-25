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
  themeMode?: "light" | "dark";
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
  address?: string;
  website?: string;
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

type SessionCache = {
  token?: string;
  legacyUserId?: string;
  legacyEmail?: string;
  mode?: "modern" | "legacy";
};

type StoreState = {
  ownerUserId: string;
  settings: Settings;
  inventory: InventoryItem[];
  suppliers: Supplier[];
  orders: Order[];
};

const VIEW_LABELS: Record<string, string> = {
  dashboard: "Resumen",
  orders: "Ordenes",
  inventory: "Inventario",
  settings: "Ajustes",
};

const NAV_ITEMS = ["dashboard", "orders", "inventory", "settings"];

const SUPPLIER_CATALOG: Record<string, Supplier[]> = {
  cdmx_centro: [
    {
      id: "SUP-01",
      name: "Capital Movil - Matriz Bolivar",
      specialty: "Pantallas, herramientas y refacciones",
      distance: "Centro Historico CDMX",
      rating: 4.8,
      phone: "56 3621 6962",
      address: "Simon Bolivar 85, Centro Historico, CDMX",
      website: "https://www.capitalmovil.com.mx/pages/sucursales",
    },
    {
      id: "SUP-02",
      name: "Capital Movil - Plaza Central",
      specialty: "Refacciones y accesorios para celulares",
      distance: "Eje Central 87, CDMX",
      rating: 4.7,
      phone: "56 3353 8311",
      address: "Plaza Central, Eje Central Lazaro Cardenas 87, Local 117-B, Centro, CDMX",
      website: "https://www.capitalmovil.com.mx/pages/sucursales",
    },
    {
      id: "SUP-03",
      name: "IPLUS Refacciones - Salvador Meave",
      specialty: "Displays y refacciones para smartphone",
      distance: "Zona Meave, CDMX",
      rating: 4.7,
      phone: "55 7470 7607",
      address: "Plaza Salvador Meave, Local 8B y 9B, Centro, CDMX",
      website: "https://iplusrefacciones.com/sucursales",
    },
  ],
  cdmx_norte: [
    {
      id: "SUP-11",
      name: "Capital Movil - Lindavista",
      specialty: "Refacciones y servicio tecnico",
      distance: "Lindavista, CDMX",
      rating: 4.6,
      phone: "56 3353 8311",
      address: "Zona Lindavista, CDMX",
      website: "https://www.capitalmovil.com.mx/pages/sucursales",
    },
    {
      id: "SUP-12",
      name: "RGB Cell",
      specialty: "Pantallas certificadas y mayoreo",
      distance: "Cobertura CDMX norte",
      rating: 4.6,
      phone: "Contacto via web",
      address: "Operacion en CDMX / envio",
      website: "https://www.rgbcell.mx/",
    },
  ],
  cdmx_sur: [
    {
      id: "SUP-21",
      name: "Capital Movil - Coapa",
      specialty: "Refacciones y accesorios",
      distance: "Coapa, CDMX",
      rating: 4.6,
      phone: "56 3353 8311",
      address: "Zona Coapa, CDMX",
      website: "https://www.capitalmovil.com.mx/pages/sucursales",
    },
    {
      id: "SUP-22",
      name: "IPLUS Refacciones",
      specialty: "Displays y refacciones",
      distance: "Cobertura CDMX sur",
      rating: 4.7,
      phone: "55 7470 7607",
      address: "Cobertura por sucursal CDMX",
      website: "https://iplusrefacciones.com/sucursales",
    },
  ],
  guadalajara: [
    {
      id: "SUP-31",
      name: "RGB Cell",
      specialty: "Pantallas y refacciones premium",
      distance: "Envio a Guadalajara",
      rating: 4.6,
      phone: "Contacto via web",
      address: "Cobertura nacional",
      website: "https://www.rgbcell.mx/",
    },
  ],
  monterrey: [
    {
      id: "SUP-41",
      name: "RGB Cell",
      specialty: "Pantallas y refacciones premium",
      distance: "Envio a Monterrey",
      rating: 4.6,
      phone: "Contacto via web",
      address: "Cobertura nacional",
      website: "https://www.rgbcell.mx/",
    },
  ],
  default: [
    {
      id: "SUP-90",
      name: "RGB Cell",
      specialty: "Pantallas y refacciones premium",
      distance: "Cobertura nacional",
      rating: 4.6,
      phone: "Contacto via web",
      address: "Cobertura nacional",
      website: "https://www.rgbcell.mx/",
    },
  ],
};

function resolveBackendUrl() {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra?.apiUrl as string) ||
    "";

  if (Platform.OS === "web") {
    if (!configured) return "http://localhost:3000";
    return configured.replace(/^(https?:\/\/)(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/, "$1localhost");
  }

  return configured || (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");
}

const BACKEND_URL = resolveBackendUrl();

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
      businessName: String(input?.settings?.businessName || ""),
      branchName: String(input?.settings?.branchName || ""),
      phone: String(input?.settings?.phone || ""),
      whatsapp: String(input?.settings?.whatsapp || ""),
      address: String(input?.settings?.address || ""),
      currency: String(input?.settings?.currency || "MXN"),
      language: String(input?.settings?.language || "es-MX"),
      publicTracking: Boolean(input?.settings?.publicTracking ?? true),
      lowStockAlert: Number(input?.settings?.lowStockAlert || 5),
      ticketHeader: String(input?.settings?.ticketHeader || ""),
      whatsappTemplate: String(input?.settings?.whatsappTemplate || "Hola {{cliente}}, tu equipo {{modelo}} cambio a estado {{estado}}."),
      themeMode: input?.settings?.themeMode === "dark" ? "dark" : "light",
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
      address: String(supplier.address || ""),
      website: String(supplier.website || ""),
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

function createPalette(mode: "light" | "dark") {
  if (mode === "dark") {
    return {
      background: "#07111f",
      surface: "#0f1b2d",
      surfaceAlt: "#14243b",
      border: "#223553",
      text: "#f4f7fb",
      textMuted: "#93a7c2",
      primary: "#6ee7f9",
      primaryStrong: "#22d3ee",
      primaryText: "#082f49",
      secondary: "#16263d",
      secondaryText: "#dbe7f5",
      success: "#34d399",
      danger: "#fb7185",
      warning: "#fbbf24",
      overlay: "#0d1a2b",
      accent: "#8b5cf6",
    };
  }

  return {
    background: "#f4f7fb",
    surface: "#ffffff",
    surfaceAlt: "#edf3fb",
    border: "#d8e1ef",
    text: "#152033",
    textMuted: "#64748b",
    primary: "#1d4ed8",
    primaryStrong: "#1e40af",
    primaryText: "#ffffff",
    secondary: "#eef4fb",
    secondaryText: "#1d4ed8",
    success: "#16a34a",
    danger: "#e11d48",
    warning: "#d97706",
    overlay: "#e7eefc",
    accent: "#7c3aed",
  };
}

function modeAwareText(background: string, palette: ReturnType<typeof createPalette>) {
  return background === palette.success || background === palette.warning ? "#04130d" : "#fff";
}

function displayNumberInput(value: number) {
  return value ? String(value) : "";
}

function inferSupplierZone(address: string) {
  const value = String(address || "").toLowerCase();
  if (value.includes("guadalajara") || value.includes("jalisco")) return "guadalajara";
  if (value.includes("monterrey") || value.includes("nuevo leon")) return "monterrey";
  if (value.includes("coapa") || value.includes("coyoacan") || value.includes("xochimilco") || value.includes("tlalpan") || value.includes("sur")) return "cdmx_sur";
  if (value.includes("lindavista") || value.includes("gustavo a madero") || value.includes("gam") || value.includes("norte")) return "cdmx_norte";
  if (value.includes("centro") || value.includes("reforma") || value.includes("historico") || value.includes("meave") || value.includes("cuauhtemoc") || value.includes("ciudad de mexico") || value.includes("cdmx")) return "cdmx_centro";
  return "default";
}

function getSuppliersForAddress(address: string) {
  const zone = inferSupplierZone(address);
  return (SUPPLIER_CATALOG[zone] || SUPPLIER_CATALOG.default).map((supplier) => ({ ...supplier }));
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
        <SafeAreaView style={[styles.centerScreen, { backgroundColor: "#f3f6fb" }]}>
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
  const [backendMode, setBackendMode] = useState<"modern" | "legacy">("modern");
  const [store, setStore] = useState<StoreState | null>(null);
  const [view, setView] = useState("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [ordersLimit, setOrdersLimit] = useState(20);
  const [inventoryLimit, setInventoryLimit] = useState(30);
  const [usersLimit, setUsersLimit] = useState(20);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
    minStock: 0,
    cost: 0,
    supplierId: "",
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [settingsForm, setSettingsForm] = useState<Settings | null>(null);
  const isWeb = Platform.OS === "web";
  const isTablet = width >= 768;
  const isDesktop = width >= 1080;
  const sidebarEnabled = isWeb && isDesktop;
  const contentMaxWidth = isWeb ? Math.min(width - 32, 1180) : width - 32;
  const metricCardWidth = isDesktop
    ? (contentMaxWidth - 36) / 4
    : isTablet
      ? (contentMaxWidth - 12) / 2
      : contentMaxWidth;
  const splitColumnWidth = isDesktop ? (contentMaxWidth - 12) / 2 : contentMaxWidth;
  const isAdmin = String(session?.role || "").toLowerCase() === "administrador";
  const palette = createPalette(settingsForm?.themeMode === "dark" ? "dark" : "light");
  const cardSurfaceStyle = { backgroundColor: palette.surface, borderColor: palette.border };
  const inputThemeStyle = { borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text };
  const placeholderColor = palette.textMuted;
  const primaryButtonThemeStyle = { backgroundColor: palette.primary, shadowColor: palette.primary };
  const primaryTextThemeStyle = { color: palette.primaryText };
  const secondaryButtonThemeStyle = { backgroundColor: palette.secondary, borderColor: palette.border };
  const secondaryTextThemeStyle = { color: palette.secondaryText };
  const successButtonThemeStyle = { backgroundColor: palette.success, borderColor: palette.success, shadowColor: palette.success };
  const successTextThemeStyle = { color: modeAwareText(palette.success, palette) };
  const dangerButtonThemeStyle = { backgroundColor: palette.danger, borderColor: palette.danger, shadowColor: palette.danger };
  const dangerTextThemeStyle = { color: modeAwareText(palette.danger, palette) };
  const neutralButtonThemeStyle = { backgroundColor: palette.surfaceAlt, borderColor: palette.border };
  const neutralTextThemeStyle = { color: palette.text };
  const cardTitleThemeStyle = { color: palette.text };
  const cardTextThemeStyle = { color: palette.textMuted };
  const smallButtonThemeStyle = { backgroundColor: palette.secondary, borderColor: palette.border };
  const smallButtonTextThemeStyle = { color: palette.secondaryText };

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
      const saved = JSON.parse(sessionRaw) as SessionCache;
      if (saved.mode === "legacy" && saved.legacyUserId) {
        const data = await loadBootstrap("");
        const user =
          data.users.find((item) => item.id === saved.legacyUserId && item.active) ||
          data.users.find((item) => item.email.toLowerCase() === String(saved.legacyEmail || "").toLowerCase() && item.active);
        if (!user) {
          await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }
        setBackendMode("legacy");
        setSession(user);
        await loadStore(user.id, "");
        return;
      }
      if (!saved.token) {
        await AsyncStorage.removeItem(SESSION_KEY);
        return;
      }
      setSessionToken(saved.token);
      const user = await loadSession(saved.token);
      setBackendMode("modern");
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
    const headers = token ? buildAuthHeaders(token) : undefined;
    const res = await fetch(`${BACKEND_URL}/api/bootstrap`, headers ? { headers } : undefined);
    if (!res.ok) throw new Error("bootstrap_failed");
    const data: Bootstrap = await res.json();
    setUsers(data.users || []);
    return data;
  }

  async function loadStore(userId: string, token = sessionToken) {
    const headers = token ? buildAuthHeaders(token) : undefined;
    const res = await fetch(`${BACKEND_URL}/api/state?userId=${encodeURIComponent(userId)}`, headers ? { headers } : undefined);
    if (!res.ok) throw new Error("store_failed");
    const data = normalizeStore(await res.json());
    if (!Array.isArray(data.suppliers) || data.suppliers.length === 0) {
      data.suppliers = getSuppliersForAddress(data.settings.address);
    }
    setStore(data);
    setSettingsForm(data.settings);
    setSelectedOrderId(data.orders[0]?.id || "");
  }

  async function saveStore(nextStore: StoreState, token = sessionToken) {
    setStore(nextStore);
    setSettingsForm(nextStore.settings);
    const headers = token
      ? { ...buildAuthHeaders(token), "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
    const res = await fetch(`${BACKEND_URL}/api/state?userId=${encodeURIComponent(nextStore.ownerUserId)}`, {
      method: "PUT",
      headers,
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
      setBackendMode("modern");
      setSessionToken(data.token);
      setSession(data.user);
      await loadBootstrap(data.token);
      await loadStore(data.user.id, data.token);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, mode: "modern" }));
    } catch {
      try {
        const legacy = await loadBootstrap("");
        const user = legacy.users.find(
          (item) =>
            item.active &&
            item.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
            (item as User & { password?: string }).password === loginPassword
        );
        if (!user) {
          setSessionToken("");
          setSession(null);
          setStore(null);
          Alert.alert("Login", "Credenciales invalidas");
          return;
        }
        setBackendMode("legacy");
        setSessionToken("");
        setSession(user);
        await loadStore(user.id, "");
        await AsyncStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ mode: "legacy", legacyUserId: user.id, legacyEmail: user.email })
        );
      } catch {
        setSessionToken("");
        setSession(null);
        setStore(null);
        Alert.alert("Login", "No se pudo iniciar sesion con el servidor");
      }
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
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
      }
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
      setInventoryForm({ id: "", name: "", sku: "", category: "", stock: 0, minStock: 0, cost: 0, supplierId: "" });
    } catch {
      Alert.alert("Inventario", "No se pudo guardar el repuesto");
    } finally {
      setIsBusy(false);
    }
  }

  async function onDeleteInventory() {
    if (!store || !inventoryForm.id) {
      Alert.alert("Inventario", "Selecciona un repuesto para eliminar");
      return;
    }

    setIsBusy(true);
    try {
      const nextItems = store.inventory.filter((item) => item.id !== inventoryForm.id);
      await saveStore({ ...store, inventory: nextItems });
      setInventoryForm({ id: "", name: "", sku: "", category: "", stock: 0, minStock: 0, cost: 0, supplierId: "" });
      Alert.alert("Inventario", "Repuesto eliminado");
    } catch {
      Alert.alert("Inventario", "No se pudo eliminar el repuesto");
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
        headers:
          backendMode === "modern"
            ? {
                ...buildAuthHeaders(sessionToken),
                "Content-Type": "application/json",
              }
            : { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        Alert.alert("Usuarios", "No se pudo crear el usuario");
        return;
      }

      await loadBootstrap(backendMode === "modern" ? sessionToken : "");
      setNewUser({ name: "", email: "", role: "", password: "" });
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
      const res = await fetch(`${BACKEND_URL}/${backendMode === "modern" ? "api/register" : "api/users"}`, {
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
        headers: backendMode === "modern" ? buildAuthHeaders(sessionToken) : undefined,
      });
      await loadBootstrap(backendMode === "modern" ? sessionToken : "");
    } catch {
      Alert.alert("Usuarios", "No se pudo eliminar el usuario");
    } finally {
      setIsBusy(false);
    }
  }

  async function onApproveUser(userId: string) {
    if (backendMode !== "modern") {
      Alert.alert("Usuarios", "La aprobacion requiere el backend actualizado en produccion");
      return;
    }
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
      const dynamicSuppliers = getSuppliersForAddress(settingsForm.address);
      await saveStore({ ...store, settings: settingsForm, suppliers: dynamicSuppliers });
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
      await loadBootstrap(backendMode === "modern" ? sessionToken : "");
      await loadStore(session.id, backendMode === "modern" ? sessionToken : "");
    } catch {
      Alert.alert("Sincronizacion", "No se pudo refrescar la informacion");
    } finally {
      setIsBusy(false);
    }
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={[styles.centerScreen, { backgroundColor: palette.background }]}>
        <StatusBar style={settingsForm?.themeMode === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: palette.text }]}>Cargando FixFlow Mobile...</Text>
      </SafeAreaView>
    );
  }

  if (!session || !store) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <StatusBar style="light" />
        <View style={[styles.loginShell, isWeb && styles.loginShellWeb]}>
          <View style={[styles.loginFrame, isTablet && styles.loginFrameWide]}>
            <View style={[styles.loginIntro, { backgroundColor: palette.primaryStrong }]}>
              <Text style={[styles.badge, { color: "#dbeafe" }]}>FixFlow Suite</Text>
              <Text style={styles.loginHeroTitle}>Controla ordenes, inventario y tickets desde una sola vista.</Text>
              <Text style={styles.loginHeroText}>Una interfaz mas clara para mostrador, tecnico y administracion.</Text>
              <View style={styles.loginFeatureStack}>
                {["Seguimiento claro", "Tickets listos", "Inventario por usuario"].map((item) => (
                  <View key={item} style={styles.loginFeaturePill}>
                    <Text style={styles.loginFeatureText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.loginCard, { backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.text }]}>
              <Text style={[styles.badge, { color: palette.primary }]}>{authMode === "login" ? "Acceso seguro" : "Solicitud de acceso"}</Text>
              <Text style={[styles.title, { color: palette.text }]}>{authMode === "login" ? "Inicia sesion" : "Crear cuenta"}</Text>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                {authMode === "login" ? "Ingresa con tu cuenta para continuar al panel del taller." : "Tu registro quedara pendiente hasta aprobacion del administrador."}
              </Text>
              {authMode === "login" ? (
                <>
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={loginEmail} onChangeText={setLoginEmail} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={loginPassword} onChangeText={setLoginPassword} placeholder="Contrasena" secureTextEntry />
                  <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onLogin} disabled={isBusy}>
                    <Text style={[styles.primaryText, primaryTextThemeStyle]}>Entrar al panel</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, secondaryButtonThemeStyle]} onPress={() => setAuthMode("register")} disabled={isBusy}>
                    <Text style={[styles.secondaryText, secondaryTextThemeStyle]}>Solicitar acceso</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={registerForm.name} onChangeText={(value) => setRegisterForm({ ...registerForm, name: value })} placeholder="Nombre completo" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={registerForm.email} onChangeText={(value) => setRegisterForm({ ...registerForm, email: value })} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={registerForm.password} onChangeText={(value) => setRegisterForm({ ...registerForm, password: value })} placeholder="Contrasena" secureTextEntry />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={registerForm.confirmPassword} onChangeText={(value) => setRegisterForm({ ...registerForm, confirmPassword: value })} placeholder="Confirmar contrasena" secureTextEntry />
                  <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onRegister} disabled={isBusy}>
                    <Text style={[styles.primaryText, primaryTextThemeStyle]}>Enviar solicitud</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, secondaryButtonThemeStyle]} onPress={() => setAuthMode("login")} disabled={isBusy}>
                    <Text style={[styles.secondaryText, secondaryTextThemeStyle]}>Volver a inicio</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={settingsForm?.themeMode === "dark" ? "light" : "dark"} />
      <View style={[styles.header, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.headerInner, isWeb && { maxWidth: 1180 }]}>
          <View>
            <Text style={[styles.badge, { color: palette.primary }]}>{store.settings.businessName || "Tu taller"}</Text>
            <Text style={[styles.headerTitle, { color: palette.text }]}>{session.name}</Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>{session.role} - {store.ownerUserId}</Text>
          </View>
          <Pressable
            style={[styles.ghostButton, { backgroundColor: palette.secondary, borderColor: palette.border }]}
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
            <Text style={[styles.ghostText, { color: palette.secondaryText }]}>Salir</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.contentInner, isWeb && { maxWidth: 1180 }]}>
          <View style={[styles.workspaceShell, sidebarEnabled && styles.workspaceShellDesktop]}>
            {sidebarEnabled ? (
              <View style={[styles.sidebarCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.badge, { color: palette.primary }]}>Workspace</Text>
                <Text style={[styles.sidebarTitle, { color: palette.text }]}>{store.settings.businessName || "Tu taller"}</Text>
                <Text style={[styles.cardText, { color: palette.textMuted }]}>{session.name}</Text>
                <View style={styles.sidebarNav}>
                  {NAV_ITEMS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.sidebarNavButton,
                        { backgroundColor: palette.secondary, borderColor: palette.border },
                        view === item && { backgroundColor: palette.primary, borderColor: palette.primary },
                      ]}
                      onPress={() => setView(item)}
                    >
                      <Text style={[styles.sidebarNavText, { color: palette.text }, view === item && { color: palette.primaryText }]}>{VIEW_LABELS[item]}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.sidebarMetricCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Ordenes activas</Text>
                  <Text style={[styles.sidebarMetricValue, { color: palette.text }]}>{store.orders.filter((o) => ["received", "in_progress", "waiting_parts"].includes(o.status)).length}</Text>
                </View>
                <View style={[styles.sidebarMetricCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Stock bajo</Text>
                  <Text style={[styles.sidebarMetricValue, { color: palette.text }]}>{store.inventory.filter((i) => i.stock <= i.minStock).length}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.workspaceMain}>
          <View style={[styles.heroPanel, isWeb && isDesktop && styles.heroPanelWeb, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.heroCopy, isWeb && isDesktop && styles.heroCopyWeb]}>
              <Text style={[styles.heroEyebrow, { color: palette.primary }]}>Panel operativo</Text>
              <Text style={[styles.heroTitle, { color: palette.text }]}>{VIEW_LABELS[view] || "Panel"} de {store.settings.businessName || "tu taller"}</Text>
              <Text style={[styles.heroSubtitle, { color: palette.textMuted }]}>Administra equipos, repuestos y configuracion en una sola interfaz mas clara para celular, tablet y web.</Text>
            </View>
            <View style={[styles.heroActions, isWeb && isDesktop && styles.heroActionsWeb]}>
              <Pressable
                style={[styles.primaryButton, primaryButtonThemeStyle]}
                onPress={() => {
                  setView("orders");
                  setOrderForm(createEmptyOrder(session.name));
                }}
              >
                <Text style={[styles.primaryText, primaryTextThemeStyle]}>Nueva orden</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, neutralButtonThemeStyle]} onPress={onRefreshStore}>
                <Text style={[styles.secondaryText, neutralTextThemeStyle]}>Actualizar panel</Text>
              </Pressable>
            </View>
          </View>

          {isBusy && (
            <View style={[styles.syncBanner, { backgroundColor: palette.overlay }]}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={[styles.syncText, { color: palette.primary }]}>Sincronizando...</Text>
            </View>
          )}

          <View style={[styles.navRow, isWeb && styles.navRowWeb]}>
            {["dashboard", "orders", "inventory", "settings"].map((item) => (
              <Pressable key={item} style={[styles.navButton, isWeb && styles.navButtonWeb, { backgroundColor: palette.secondary, borderColor: palette.border }, view === item && { backgroundColor: palette.primary, borderColor: palette.primary }]} onPress={() => setView(item)}>
                <Text style={[styles.navText, { color: palette.text }, view === item && { color: palette.primaryText }]}>{VIEW_LABELS[item] || item}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.navButton, isWeb && styles.navButtonWeb, { backgroundColor: palette.secondary, borderColor: palette.border }]} onPress={onRefreshStore}>
              <Text style={[styles.navText, { color: palette.text }]}>Refrescar</Text>
            </Pressable>
          </View>

          {isWeb && isDesktop && (
            <View style={styles.desktopUtilityRow}>
              <View style={[styles.desktopUtilityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Vista actual</Text>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{VIEW_LABELS[view] || "Panel"}</Text>
                <Text style={[styles.cardText, { color: palette.textMuted }]}>Sesion activa de {session.name}</Text>
              </View>
              <View style={[styles.desktopUtilityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Operacion</Text>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{store.orders.filter((o) => ["received", "in_progress", "waiting_parts"].includes(o.status)).length} ordenes abiertas</Text>
                <Text style={[styles.cardText, { color: palette.textMuted }]}>Control rapido para mostrador y taller</Text>
              </View>
              <View style={[styles.desktopUtilityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Inventario</Text>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{store.inventory.filter((i) => i.stock <= i.minStock).length} piezas criticas</Text>
                <Text style={[styles.cardText, { color: palette.textMuted }]}>Prioriza stock bajo y compra de refacciones</Text>
              </View>
            </View>
          )}

          {view === "dashboard" && (
            <View style={[styles.grid, isWeb && isDesktop && styles.gridWeb]}>
              <Card title="Activas" value={String(store.orders.filter((o) => ["received", "in_progress", "waiting_parts"].includes(o.status)).length)} width={metricCardWidth} palette={palette} />
              <Card title="Listas" value={String(store.orders.filter((o) => o.status === "ready").length)} width={metricCardWidth} palette={palette} />
              <Card title="Entregadas" value={String(store.orders.filter((o) => o.status === "delivered").length)} width={metricCardWidth} palette={palette} />
              <Card title="Stock bajo" value={String(store.inventory.filter((i) => i.stock <= i.minStock).length)} width={metricCardWidth} palette={palette} />
              <View style={[styles.featurePanel, cardSurfaceStyle]}>
                <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Accesos rapidos</Text>
                <Text style={[styles.cardText, cardTextThemeStyle]}>Abre las tareas principales del dia sin moverte entre varios modulos.</Text>
                <View style={styles.navRow}>
                  <Pressable
                    style={[styles.primaryButton, primaryButtonThemeStyle]}
                    onPress={() => {
                      setView("orders");
                      setOrderForm(createEmptyOrder(session.name));
                    }}
                  >
                    <Text style={[styles.primaryText, primaryTextThemeStyle]}>Agregar orden</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, neutralButtonThemeStyle]} onPress={onRefreshStore}>
                    <Text style={[styles.secondaryText, neutralTextThemeStyle]}>Refrescar datos</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

        {view === "orders" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, cardTitleThemeStyle]}>Ordenes</Text>
            <TextInput
              style={[styles.input, inputThemeStyle]}
              value={orderQuery}
              onChangeText={setOrderQuery}
              placeholder="Buscar por folio, cliente o modelo"
              placeholderTextColor={placeholderColor}
            />
            <View style={styles.responsiveRow}>
              <View style={[styles.responsiveColumn, { width: splitColumnWidth }]}>
                <View style={[styles.sectionPanelHeader, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Ordenes existentes</Text>
                  <Text style={[styles.cardText, cardTextThemeStyle]}>Consulta, filtra y abre una orden para revisarla o editarla.</Text>
                </View>
                {sidebarEnabled ? (
                  <View style={[styles.tableHeaderRow, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 1.4 }]}>Cliente</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 1.2 }]}>Equipo</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 1 }]}>Estado</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 0.8, textAlign: "right" }]}>Total</Text>
                  </View>
                ) : null}
                {visibleOrders.map((order) => (
                  <Pressable key={order.id} style={[styles.listCard, sidebarEnabled && styles.tableRowCard, cardSurfaceStyle, selectedOrderId === order.id && { borderColor: palette.primary, backgroundColor: palette.surfaceAlt }]} onPress={() => setSelectedOrderId(order.id)}>
                    {sidebarEnabled ? (
                      <View style={styles.tableRowInner}>
                        <View style={{ flex: 1.4 }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{order.customer}</Text>
                          <Text style={[styles.cardText, cardTextThemeStyle]}>{order.id}</Text>
                        </View>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{order.brand} {order.model}</Text>
                          <Text style={[styles.cardText, cardTextThemeStyle]}>{order.technician || "Sin tecnico"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.statusPill, { backgroundColor: palette.overlay, alignSelf: "flex-start" }]}>
                            <Text style={[styles.statusPillText, { color: palette.primary }]}>{statusLabel(order.status)}</Text>
                          </View>
                        </View>
                        <View style={{ flex: 0.8, alignItems: "flex-end" }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{money(order.estimatedTotal, store.settings.currency)}</Text>
                          <Pressable
                            style={[styles.smallButton, smallButtonThemeStyle]}
                            onPress={() => {
                              setSelectedOrderId(order.id);
                              setOrderForm(order);
                            }}
                          >
                            <Text style={[styles.smallButtonText, smallButtonTextThemeStyle]}>Editar</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.orderRowHead}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{order.customer}</Text>
                          <View style={[styles.statusPill, { backgroundColor: palette.overlay }]}>
                            <Text style={[styles.statusPillText, { color: palette.primary }]}>{statusLabel(order.status)}</Text>
                          </View>
                        </View>
                        <Text style={[styles.cardText, cardTextThemeStyle]}>{order.id} - {order.brand} {order.model}</Text>
                        <Text style={[styles.cardText, cardTextThemeStyle]}>{money(order.estimatedTotal, store.settings.currency)}</Text>
                        <Pressable
                          style={[styles.smallButton, smallButtonThemeStyle]}
                          onPress={() => {
                            setSelectedOrderId(order.id);
                            setOrderForm(order);
                          }}
                        >
                          <Text style={[styles.smallButtonText, smallButtonTextThemeStyle]}>Editar</Text>
                        </Pressable>
                      </>
                    )}
                  </Pressable>
                ))}
                {filteredOrders.length > visibleOrders.length && (
                  <Pressable style={[styles.secondaryButton, neutralButtonThemeStyle]} onPress={() => setOrdersLimit((current) => current + 20)}>
                    <Text style={[styles.secondaryText, neutralTextThemeStyle]}>Cargar mas ordenes</Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.responsiveColumn, { width: splitColumnWidth }]}>
                <View style={[styles.sectionPanelHeader, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{orderForm.id ? "Edicion de orden" : "Nueva orden"}</Text>
                  <Text style={[styles.cardText, cardTextThemeStyle]}>
                    {orderForm.id ? "Actualiza la orden seleccionada y guarda los cambios." : "Captura una nueva orden sin mezclarla con el listado operativo."}
                  </Text>
                </View>
                {selectedOrder ? (
                  <View style={[styles.featurePanel, cardSurfaceStyle]}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{selectedOrder.id}</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>{selectedOrder.customer} - {selectedOrder.issue}</Text>
                    <View style={styles.detailGrid}>
                      <View style={[styles.detailChip, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Equipo</Text>
                        <Text style={[styles.detailValue, { color: palette.text }]}>{selectedOrder.brand} {selectedOrder.model}</Text>
                      </View>
                      <View style={[styles.detailChip, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Tecnico</Text>
                        <Text style={[styles.detailValue, { color: palette.text }]}>{selectedOrder.technician || "Sin asignar"}</Text>
                      </View>
                      <View style={[styles.detailChip, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Promesa</Text>
                        <Text style={[styles.detailValue, { color: palette.text }]}>{selectedOrder.eta || "Sin fecha"}</Text>
                      </View>
                      <View style={[styles.detailChip, { backgroundColor: palette.surfaceAlt }]}>
                        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Saldo</Text>
                        <Text style={[styles.detailValue, { color: palette.text }]}>{money(selectedOrder.estimatedTotal - selectedOrder.deposit, store.settings.currency)}</Text>
                      </View>
                    </View>
                    <View style={styles.navRow}>
                      {["received", "in_progress", "waiting_parts", "ready", "delivered"].map((status) => (
                        <Pressable key={status} style={[styles.smallButton, neutralButtonThemeStyle]} onPress={() => onChangeOrderStatus(status)}>
                          <Text style={[styles.smallButtonText, smallButtonTextThemeStyle]}>{statusLabel(status)}</Text>
                        </Pressable>
                      ))}
                      <Pressable style={[styles.smallButton, secondaryButtonThemeStyle]} onPress={onPrintTicket}>
                        <Text style={[styles.smallButtonText, secondaryTextThemeStyle]}>Ticket</Text>
                      </Pressable>
                    </View>
                    <View style={styles.timelineBlock}>
                      {selectedOrder.timeline.map((step, index) => (
                        <View key={`${step.label}-${index}`} style={styles.timelineRow}>
                          <View style={[styles.timelineDot, step.state === "current" && styles.timelineDotCurrent, step.state === "done" && styles.timelineDotDone]} />
                          <View style={styles.timelineCopy}>
                            <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{step.label}</Text>
                            <Text style={[styles.cardText, cardTextThemeStyle]}>{step.at ? formatDate(step.at) : "Pendiente"}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={[styles.featurePanel, cardSurfaceStyle]}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Sin ordenes</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>No hay ordenes disponibles para esta cuenta.</Text>
                  </View>
                )}

                <View style={[styles.formCard, cardSurfaceStyle]}>
                  <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{orderForm.id ? "Editar orden" : "Nueva orden"}</Text>
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.customer} onChangeText={(value) => setOrderForm({ ...orderForm, customer: value })} placeholder="Cliente" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.phone} onChangeText={(value) => setOrderForm({ ...orderForm, phone: value })} placeholder="Telefono" keyboardType="phone-pad" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.whatsapp} onChangeText={(value) => setOrderForm({ ...orderForm, whatsapp: value })} placeholder="WhatsApp" keyboardType="phone-pad" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.brand} onChangeText={(value) => setOrderForm({ ...orderForm, brand: value })} placeholder="Marca" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.model} onChangeText={(value) => setOrderForm({ ...orderForm, model: value })} placeholder="Modelo" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.imei} onChangeText={(value) => setOrderForm({ ...orderForm, imei: value })} placeholder="IMEI o serie" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.issue} onChangeText={(value) => setOrderForm({ ...orderForm, issue: value })} placeholder="Falla reportada" multiline />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={displayNumberInput(orderForm.estimatedTotal)} onChangeText={(value) => setOrderForm({ ...orderForm, estimatedTotal: Number(value || 0) })} placeholder="Total estimado" keyboardType="numeric" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={displayNumberInput(orderForm.deposit)} onChangeText={(value) => setOrderForm({ ...orderForm, deposit: Number(value || 0) })} placeholder="Anticipo" keyboardType="numeric" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={orderForm.eta} onChangeText={(value) => setOrderForm({ ...orderForm, eta: value })} placeholder="Fecha promesa YYYY-MM-DD" />
                  <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onSaveOrder} disabled={isBusy}>
                    <Text style={[styles.primaryText, primaryTextThemeStyle]}>{orderForm.id ? "Guardar orden" : "Crear orden"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, secondaryButtonThemeStyle]}
                    onPress={() => setOrderForm(createEmptyOrder(session.name))}
                  >
                    <Text style={[styles.secondaryText, secondaryTextThemeStyle]}>Limpiar formulario</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {view === "inventory" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, cardTitleThemeStyle]}>Inventario</Text>
            <View style={styles.responsiveRow}>
              <View style={[styles.responsiveColumn, { width: splitColumnWidth }]}>
                {sidebarEnabled ? (
                  <View style={[styles.tableHeaderRow, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 1.5 }]}>Repuesto</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 1 }]}>SKU</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 0.7, textAlign: "center" }]}>Stock</Text>
                    <Text style={[styles.tableHeaderText, { color: palette.textMuted, flex: 0.8, textAlign: "right" }]}>Costo</Text>
                  </View>
                ) : null}
                {visibleInventory.map((item) => (
                  <Pressable key={item.id} style={[styles.listCard, sidebarEnabled && styles.tableRowCard, cardSurfaceStyle]} onPress={() => setInventoryForm(item)}>
                    {sidebarEnabled ? (
                      <View style={styles.tableRowInner}>
                        <View style={{ flex: 1.5 }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{item.name}</Text>
                          <Text style={[styles.cardText, cardTextThemeStyle]}>{item.category}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{item.sku}</Text>
                          <Text style={[styles.cardText, cardTextThemeStyle]}>{item.supplierId || "Sin proveedor"}</Text>
                        </View>
                        <View style={{ flex: 0.7, alignItems: "center" }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{item.stock}</Text>
                          <Text style={[styles.cardText, cardTextThemeStyle]}>Min {item.minStock}</Text>
                        </View>
                        <View style={{ flex: 0.8, alignItems: "flex-end" }}>
                          <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{money(item.cost, store.settings.currency)}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{item.name}</Text>
                        <Text style={[styles.cardText, cardTextThemeStyle]}>{item.sku} - {item.category}</Text>
                        <Text style={[styles.cardText, cardTextThemeStyle]}>Stock {item.stock} - Min {item.minStock} - {money(item.cost, store.settings.currency)}</Text>
                      </>
                    )}
                  </Pressable>
                ))}
                {Array.isArray(store.inventory) && store.inventory.length > visibleInventory.length && (
                  <Pressable style={[styles.secondaryButton, neutralButtonThemeStyle]} onPress={() => setInventoryLimit((current) => current + 30)}>
                    <Text style={[styles.secondaryText, neutralTextThemeStyle]}>Cargar mas inventario</Text>
                  </Pressable>
                )}
              </View>
              <View style={[styles.responsiveColumn, { width: splitColumnWidth }]}>
                <View style={[styles.formCard, cardSurfaceStyle]}>
                  <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{inventoryForm.id ? "Editar repuesto" : "Nuevo repuesto"}</Text>
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={inventoryForm.name} onChangeText={(v) => setInventoryForm({ ...inventoryForm, name: v })} placeholder="Nombre" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={inventoryForm.sku} onChangeText={(v) => setInventoryForm({ ...inventoryForm, sku: v })} placeholder="SKU" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={inventoryForm.category} onChangeText={(v) => setInventoryForm({ ...inventoryForm, category: v })} placeholder="Categoria" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={displayNumberInput(inventoryForm.stock)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, stock: Number(v || 0) })} placeholder="Stock" keyboardType="numeric" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={displayNumberInput(inventoryForm.minStock)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, minStock: Number(v || 0) })} placeholder="Minimo" keyboardType="numeric" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={displayNumberInput(inventoryForm.cost)} onChangeText={(v) => setInventoryForm({ ...inventoryForm, cost: Number(v || 0) })} placeholder="Costo" keyboardType="numeric" />
                  <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={inventoryForm.supplierId} onChangeText={(v) => setInventoryForm({ ...inventoryForm, supplierId: v })} placeholder="ID proveedor" />
                  <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onSaveInventory} disabled={isBusy}>
                    <Text style={[styles.primaryText, primaryTextThemeStyle]}>{inventoryForm.id ? "Guardar cambios" : "Agregar repuesto"}</Text>
                  </Pressable>
                  {inventoryForm.id ? (
                    <Pressable style={[styles.secondaryButton, dangerButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onDeleteInventory} disabled={isBusy}>
                      <Text style={[styles.secondaryText, dangerTextThemeStyle]}>Eliminar repuesto</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={[styles.featurePanel, cardSurfaceStyle]}>
                  <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Proveedores cercanos</Text>
                  <Text style={[styles.cardText, cardTextThemeStyle]}>
                    Base inicial sugerida para la zona configurada del negocio: {store.settings.address || "Centro de CDMX"}.
                  </Text>
                  <Text style={[styles.cardText, { color: palette.primary }]}>
                    Zona detectada: {inferSupplierZone(store.settings.address).replace(/_/g, " ")}
                  </Text>
                  {store.suppliers.map((supplier) => (
                    <View key={supplier.id} style={[styles.listCard, cardSurfaceStyle]}>
                      <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{supplier.name}</Text>
                      <Text style={[styles.cardText, cardTextThemeStyle]}>{supplier.specialty}</Text>
                      <Text style={[styles.cardText, cardTextThemeStyle]}>{supplier.distance} - Calificacion {supplier.rating}</Text>
                      <Text style={[styles.cardText, cardTextThemeStyle]}>{supplier.phone}</Text>
                      {supplier.address ? <Text style={[styles.cardText, cardTextThemeStyle]}>{supplier.address}</Text> : null}
                      {supplier.website ? <Text style={[styles.cardText, { color: palette.primary }]}>{supplier.website}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

          {view === "settings" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, cardTitleThemeStyle]}>Negocio</Text>
            <View style={styles.responsiveRow}>
            {settingsForm && (
              <View style={[styles.formCard, cardSurfaceStyle, { width: splitColumnWidth }]}>
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.businessName} onChangeText={(value) => setSettingsForm({ ...settingsForm, businessName: value })} placeholder="Nombre del negocio" />
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.branchName} onChangeText={(value) => setSettingsForm({ ...settingsForm, branchName: value })} placeholder="Sucursal" />
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.phone} onChangeText={(value) => setSettingsForm({ ...settingsForm, phone: value })} placeholder="Telefono" keyboardType="phone-pad" />
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.whatsapp} onChangeText={(value) => setSettingsForm({ ...settingsForm, whatsapp: value })} placeholder="WhatsApp" keyboardType="phone-pad" />
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.address} onChangeText={(value) => setSettingsForm({ ...settingsForm, address: value })} placeholder="Direccion" />
                <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={settingsForm.ticketHeader} onChangeText={(value) => setSettingsForm({ ...settingsForm, ticketHeader: value })} placeholder="Encabezado de ticket" />
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Modo oscuro</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>Activa una apariencia oscura para toda la app.</Text>
                  </View>
                  <Switch value={settingsForm.themeMode === "dark"} onValueChange={(value) => setSettingsForm({ ...settingsForm, themeMode: value ? "dark" : "light" })} />
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Seguimiento publico</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>Permite compartir la liga de seguimiento al cliente.</Text>
                  </View>
                  <Switch value={settingsForm.publicTracking} onValueChange={(value) => setSettingsForm({ ...settingsForm, publicTracking: value })} />
                </View>
                <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onSaveSettings} disabled={isBusy}>
                  <Text style={[styles.primaryText, primaryTextThemeStyle]}>Guardar negocio</Text>
                </Pressable>
              </View>
            )}

              <View style={[styles.responsiveColumn, { width: splitColumnWidth }]}>
                <Text style={[styles.sectionTitle, cardTitleThemeStyle]}>Usuarios</Text>
                <Text style={[styles.cardText, cardTextThemeStyle]}>Cada usuario nuevo recibe un espacio independiente de ordenes, inventario y configuracion.</Text>
                {visibleUsers.map((user) => (
                  <View key={user.id} style={[styles.listCard, cardSurfaceStyle]}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>{user.name}</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>{user.email} - {user.role} - {user.active ? "Activo" : "Pendiente"}</Text>
                    {isAdmin && (
                      <View style={styles.navRow}>
                        {!user.active && (
                          <Pressable style={[styles.smallButton, successButtonThemeStyle]} onPress={() => onApproveUser(user.id)}>
                            <Text style={[styles.smallButtonText, successTextThemeStyle]}>Aprobar</Text>
                          </Pressable>
                        )}
                        <Pressable style={[styles.smallButton, dangerButtonThemeStyle]} onPress={() => onDeleteUser(user.id)}>
                          <Text style={[styles.smallButtonText, dangerTextThemeStyle]}>Eliminar</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
                {users.length > visibleUsers.length && (
                  <Pressable style={[styles.secondaryButton, neutralButtonThemeStyle]} onPress={() => setUsersLimit((current) => current + 20)}>
                    <Text style={[styles.secondaryText, neutralTextThemeStyle]}>Cargar mas usuarios</Text>
                  </Pressable>
                )}

                {isAdmin ? (
                  <View style={[styles.formCard, cardSurfaceStyle]}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Nuevo usuario</Text>
                    <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={newUser.name} onChangeText={(v) => setNewUser({ ...newUser, name: v })} placeholder="Nombre" />
                    <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={newUser.email} onChangeText={(v) => setNewUser({ ...newUser, email: v })} placeholder="Correo" />
                    <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={newUser.role} onChangeText={(v) => setNewUser({ ...newUser, role: v })} placeholder="Rol" />
                    <TextInput style={[styles.input, inputThemeStyle]} placeholderTextColor={placeholderColor} value={newUser.password} onChangeText={(v) => setNewUser({ ...newUser, password: v })} placeholder="Contrasena" secureTextEntry />
                    <Pressable style={[styles.primaryButton, primaryButtonThemeStyle, isBusy && styles.buttonDisabled]} onPress={onCreateUser} disabled={isBusy}>
                      <Text style={[styles.primaryText, primaryTextThemeStyle]}>Crear usuario</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.formCard, cardSurfaceStyle]}>
                    <Text style={[styles.cardTitle, cardTitleThemeStyle]}>Acceso restringido</Text>
                    <Text style={[styles.cardText, cardTextThemeStyle]}>Solo un administrador puede crear o eliminar usuarios.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          )}
            </View>
          </View>
        </View>
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

function Card({
  title,
  value,
  width,
  palette,
}: {
  title: string;
  value: string;
  width?: number;
  palette: ReturnType<typeof createPalette>;
}) {
  return (
    <View style={[styles.metricCard, width ? { width } : null, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.cardText, { color: palette.textMuted }]}>{title}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6fb" },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f6fb", gap: 12 },
  loadingText: { color: "#152033", fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  contentInner: {
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  workspaceShell: {
    gap: 16,
  },
  workspaceShellDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  workspaceMain: {
    flex: 1,
    gap: 16,
    minWidth: 0,
  },
  loginShell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loginShellWeb: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  loginFrame: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    gap: 18,
  },
  loginFrameWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  loginIntro: {
    borderRadius: 28,
    padding: 26,
    minHeight: 260,
    justifyContent: "space-between",
    gap: 16,
    flex: 1,
  },
  loginHeroTitle: {
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
  },
  loginHeroText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 22,
  },
  loginFeatureStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  loginFeaturePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  loginFeatureText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  sidebarCard: {
    width: 248,
    borderWidth: 1,
    borderRadius: 26,
    padding: 18,
    gap: 14,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  sidebarNav: {
    gap: 8,
  },
  sidebarNavButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sidebarNavText: {
    fontWeight: "800",
    fontSize: 14,
  },
  sidebarMetricCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  sidebarMetricValue: {
    fontSize: 22,
    fontWeight: "900",
  },
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
  heroPanel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  heroPanelWeb: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  heroCopy: { gap: 8 },
  heroCopyWeb: {
    flex: 1,
    maxWidth: 760,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroActionsWeb: {
    width: 240,
    justifyContent: "center",
    alignItems: "stretch",
  },
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
  headerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: { color: "#1152d4", fontWeight: "700", textTransform: "uppercase", fontSize: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#152033" },
  subtitle: { color: "#64748b", marginTop: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#152033" },
  loginCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8e1ef",
    gap: 14,
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryText: { fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  ghostButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  ghostText: { color: "#152033", fontWeight: "700" },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navRowWeb: { gap: 10 },
  navButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, borderWidth: 1 },
  navButtonWeb: { minWidth: 122, alignItems: "center" },
  navButtonActive: { backgroundColor: "#1152d4" },
  navText: { color: "#152033", fontWeight: "700", textTransform: "capitalize" },
  navTextActive: { color: "#fff" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#152033" },
  grid: { gap: 12 },
  gridWeb: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  desktopUtilityRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  desktopUtilityCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  featurePanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  sectionPanelHeader: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  responsiveRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-start",
  },
  responsiveColumn: {
    flexGrow: 1,
    gap: 12,
    minWidth: 280,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  metricValue: { fontSize: 32, fontWeight: "800", color: "#152033", marginTop: 8 },
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  tableRowCard: {
    paddingVertical: 12,
  },
  tableRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  switchCopy: { flex: 1, gap: 2 },
  timelineBlock: { marginTop: 8, gap: 10 },
  orderRowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailChip: {
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "800",
  },
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
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
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
