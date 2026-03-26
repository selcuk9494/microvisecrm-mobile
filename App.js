import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const Colors = {
  bg: "#ffffff",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  primary: "#2563eb",
  danger: "#dc2626",
  card: "#f8fafc",
};

function getApiBaseUrl() {
  const fromExtra =
    Constants?.expoConfig?.extra?.apiBaseUrl ||
    Constants?.manifest?.extra?.apiBaseUrl ||
    null;
  return String(fromExtra || "https://microvisecrm-api.vercel.app").replace(/\/+$/, "");
}

async function apiRequest(path, { method = "GET", token, body } = {}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `HTTP_${res.status}`);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

async function saveTokens({ access_token, refresh_token }) {
  if (access_token) await SecureStore.setItemAsync("access_token", String(access_token));
  if (refresh_token) await SecureStore.setItemAsync("refresh_token", String(refresh_token));
}

async function clearTokens() {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
}

function TabButton({ active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: active ? "#eff6ff" : Colors.bg,
      }}
    >
      <Text style={{ color: active ? Colors.primary : Colors.sub, fontWeight: active ? "700" : "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ title, right }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.text }}>{title}</Text>
      {right || null}
    </View>
  );
}

function Card({ title, value }) {
  return (
    <View
      style={{
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        flexGrow: 1,
      }}
    >
      <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "600" }}>{title}</Text>
      <Text style={{ marginTop: 6, color: Colors.text, fontSize: 22, fontWeight: "800" }}>{String(value ?? "-")}</Text>
    </View>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Email ve şifre zorunlu");
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (e) {
      setError("Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: Colors.text, marginBottom: 18 }}>Giriş</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 12,
            color: Colors.text,
          }}
        />
        <TextInput
          placeholder="Şifre"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            marginBottom: 12,
            color: Colors.text,
          }}
        />
        {error ? <Text style={{ color: Colors.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Pressable
          onPress={submit}
          disabled={loading}
          style={{
            backgroundColor: Colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Giriş Yap</Text>}
        </Pressable>
        <Text style={{ marginTop: 16, color: Colors.sub, fontSize: 12 }}>
          Sunucu: {getApiBaseUrl()}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function DashboardScreen({ token, onGoWorkOrders, onOpenWorkOrder }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [assigned, setAssigned] = useState([]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [data, mine] = await Promise.all([apiRequest("/dashboard/stats", { token }), apiRequest("/work-orders/assigned/me", { token })]);
      setStats(data || null);
      setAssigned(Array.isArray(mine?.data) ? mine.data : []);
    } catch (e) {
      setError("Veriler alınamadı");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle
        title="Dashboard"
        right={
          <Pressable onPress={load} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.text, fontWeight: "700" }}>Yenile</Text>
          </Pressable>
        }
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text style={{ color: Colors.danger }}>{error}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card title="Toplam Müşteri" value={stats?.customers} />
            <Card title="Aktif Hat" value={stats?.activeLines} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card title="Yaklaşan Hatlar" value={stats?.linesExpiring} />
            <Card title="Süresi Dolmuş Hatlar" value={stats?.linesExpired} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card title="Aktif Lisans" value={stats?.activeLicenses} />
            <Card title="Açık İş Emirleri" value={stats?.openWorkOrders} />
          </View>
          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: Colors.text, fontWeight: "900" }}>Bana Atanan (Aktif)</Text>
              <Pressable onPress={onGoWorkOrders} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
                <Text style={{ color: Colors.text, fontWeight: "800" }}>Tümü</Text>
              </Pressable>
            </View>
            {assigned.length ? (
              assigned.slice(0, 5).map((it) => (
                <Pressable
                  key={String(it.id)}
                  onPress={() => onOpenWorkOrder?.(it.id)}
                  style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border }}
                >
                  <Text style={{ color: Colors.text, fontWeight: "900" }}>{it.orderNumber || "-"}</Text>
                  <Text style={{ color: Colors.sub, fontSize: 12, marginTop: 4 }}>
                    {it.customer?.customerName ? `Müşteri: ${it.customer.customerName}` : ""}
                    {it.customer?.customerName && it.type?.name ? "  •  " : ""}
                    {it.type?.name ? `Tip: ${it.type.name}` : ""}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: Colors.sub }}>Kayıt yok</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function CustomersScreen({ token }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));
        if (q.trim()) params.set("q", q.trim());
        const data = await apiRequest(`/customers?${params.toString()}`, { token });
        setTotal(Number(data?.total || 0));
        setPage(Number(data?.page || nextPage));
        const items = Array.isArray(data?.data) ? data.data : [];
        setRows((prev) => (append ? [...prev, ...items] : items));
      } finally {
        setLoading(false);
      }
    },
    [q, pageSize, token, loading]
  );

  useEffect(() => {
    load({ nextPage: 1, append: false });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ nextPage: 1, append: false });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const canLoadMore = rows.length < total;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Müşteriler" />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <TextInput
          placeholder="Ara..."
          placeholderTextColor="#94a3b8"
          value={q}
          onChangeText={setQ}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: Colors.text,
          }}
        />
        <Pressable
          onPress={() => load({ nextPage: 1, append: false })}
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text style={{ color: Colors.text, fontWeight: "800" }}>Ara</Text>
        </Pressable>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (!canLoadMore) return;
          load({ nextPage: page + 1, append: true });
        }}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}>
            <Text style={{ color: Colors.text, fontWeight: "800" }}>{item.customerName || "-"}</Text>
            <Text style={{ color: Colors.sub, marginTop: 2 }}>{item.companyName || ""}</Text>
            {(item.phone || item.email) ? (
              <Text style={{ color: Colors.sub, marginTop: 6, fontSize: 12 }}>
                {item.phone ? `Tel: ${item.phone}` : ""}
                {item.phone && item.email ? "  •  " : ""}
                {item.email ? `Email: ${item.email}` : ""}
              </Text>
            ) : null}
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function WorkOrdersScreen({ token, reloadKey, onNew, onOpen }) {
  const [tab, setTab] = useState("aktif");
  const [sortMode, setSortMode] = useState("due");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (loading) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));
        if (tab === "aktif") params.set("filter[status]", "acik,devam");
        else if (tab) params.set("filter[status]", tab);
        if (sortMode === "due") {
          params.set("sort_by", "dueDate");
          params.set("sort_dir", "asc");
        } else {
          params.set("sort_by", "createdAt");
          params.set("sort_dir", "desc");
        }
        const data = await apiRequest(`/work-orders?${params.toString()}`, { token });
        setTotal(Number(data?.total || 0));
        setPage(Number(data?.page || nextPage));
        const items = Array.isArray(data?.data) ? data.data : [];
        setRows((prev) => (append ? [...prev, ...items] : items));
      } catch (e) {
        setError("Liste alınamadı");
      } finally {
        setLoading(false);
      }
    },
    [tab, token, pageSize, loading, sortMode]
  );

  useEffect(() => {
    load({ nextPage: 1, append: false });
  }, [load, reloadKey]);

  const canLoadMore = rows.length < total;

  const tabButton = (key, label) => (
    <Pressable
      onPress={() => setTab(key)}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
        backgroundColor: tab === key ? Colors.primary : Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Text style={{ color: tab === key ? "#fff" : Colors.text, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle
        title="İş Emirleri"
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setSortMode((m) => (m === "due" ? "new" : "due"))}
              style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg }}
            >
              <Text style={{ color: Colors.text, fontWeight: "800" }}>{sortMode === "due" ? "Sıra: Süre" : "Sıra: Yeni"}</Text>
            </Pressable>
            <Pressable
              onPress={onNew}
              style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg }}
            >
              <Text style={{ color: Colors.text, fontWeight: "800" }}>Yeni</Text>
            </Pressable>
          </View>
        }
      />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        {tabButton("aktif", "Aktif")}
        {tabButton("acik", "Açık")}
        {tabButton("devam", "Devam")}
        {tabButton("kapali", "Kapalı")}
      </View>
      {error ? <Text style={{ color: Colors.danger, marginBottom: 10 }}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => {
          if (!canLoadMore) return;
          load({ nextPage: page + 1, append: true });
        }}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => {
          const due = item?.dueDate ? String(item.dueDate).slice(0, 10) : "";
          return (
            <Pressable
              onPress={() => onOpen?.(item)}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.orderNumber || "-"}</Text>
                {due ? <Text style={{ color: Colors.sub, fontWeight: "800", fontSize: 12 }}>Bitiş: {due}</Text> : null}
              </View>
              <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
                {item.customer?.customerName ? `Müşteri: ${item.customer.customerName}` : ""}
                {item.customer?.customerName && item.branch?.name ? "  •  " : ""}
                {item.branch?.name ? `Şube: ${item.branch.name}` : ""}
              </Text>
              <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
                {item.type?.name ? `Tip: ${item.type.name}  •  ` : ""}
                Durum: {item.status}  •  Öncelik: {item.priority}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function WorkOrderCreateModal({ token, visible, onClose, onCreated }) {
  const [step, setStep] = useState("pickCustomer");
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [orderNumber, setOrderNumber] = useState("");
  const [branchId, setBranchId] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [priority, setPriority] = useState("orta");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const reset = useCallback(() => {
    setStep("pickCustomer");
    setQ("");
    setCustomers([]);
    setCustomer(null);
    setBranches([]);
    setUsers([]);
    setTypes([]);
    setError("");
    setOrderNumber("");
    setBranchId("");
    setDescription("");
    setAssignedUserId("");
    setTypeId("");
    setPriority("orta");
    setNotes("");
    setDueDate("");
  }, []);

  useEffect(() => {
    if (!visible) return;
    reset();
  }, [visible, reset]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "200");
      if (q.trim()) params.set("q", q.trim());
      const data = await apiRequest(`/customers?${params.toString()}`, { token });
      setCustomers(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError("Müşteriler alınamadı");
    } finally {
      setLoading(false);
    }
  }, [q, token]);

  useEffect(() => {
    if (!visible) return;
    if (step !== "pickCustomer") return;
    loadCustomers();
  }, [visible, step, loadCustomers]);

  const selectCustomer = useCallback(
    async (c) => {
      setCustomer(c);
      setStep("form");
      setLoading(true);
      setError("");
      try {
        const [br, us, ty] = await Promise.all([
          apiRequest(`/customers/${encodeURIComponent(c.id)}/branches`, { token }),
          apiRequest("/users", { token }),
          apiRequest("/work-order-types", { token }),
        ]);
        setBranches(Array.isArray(br?.data) ? br.data : []);
        setUsers(Array.isArray(us?.data) ? us.data : []);
        setTypes(Array.isArray(ty?.data) ? ty.data : []);
      } catch (e) {
        setError("Form verileri alınamadı");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fillNextNumber = useCallback(async () => {
    setError("");
    try {
      const data = await apiRequest("/work-orders/next-number", { token });
      if (data?.next) setOrderNumber(String(data.next));
    } catch (e) {
      setError("Otomatik numara alınamadı");
    }
  }, [token]);

  const submit = useCallback(async () => {
    setError("");
    if (!customer?.id) {
      setError("Müşteri seçiniz");
      return;
    }
    if (!description.trim()) {
      setError("Detay zorunlu");
      return;
    }
    setSaving(true);
    try {
      const body = {
        order_number: orderNumber.trim() || undefined,
        customer_id: customer.id,
        branch_id: branchId || undefined,
        description: description.trim(),
        assigned_user_id: assignedUserId || undefined,
        type_id: typeId || undefined,
        priority,
        notes: notes.trim() || undefined,
        due_date: dueDate.trim() || undefined,
      };
      await apiRequest("/work-orders", { method: "POST", token, body });
      onCreated?.();
      onClose?.();
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("order_number_in_use")) {
        setError("İş emri numarası kullanımda. Otomatik numara ile tekrar deneyin.");
      } else if (e?.status === 401) {
        setError("Oturum süresi doldu. Tekrar giriş yapın.");
      } else if (e?.status === 403) {
        setError("Yetkiniz yok (admin gerekli olabilir).");
      } else {
        setError("Kaydedilemedi");
      }
    } finally {
      setSaving(false);
    }
  }, [assignedUserId, branchId, customer, description, dueDate, notes, onClose, onCreated, orderNumber, priority, token, typeId]);

  if (!visible) return null;

  return (
    <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: Colors.text }}>Yeni İş Emri</Text>
        <Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.text, fontWeight: "800" }}>Kapat</Text>
        </Pressable>
      </View>

      {step === "pickCustomer" ? (
        <View style={{ flex: 1, padding: 16 }}>
          <TextInput
            placeholder="Müşteri ara..."
            placeholderTextColor="#94a3b8"
            value={q}
            onChangeText={setQ}
            style={{
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: Colors.text,
              marginBottom: 10,
            }}
          />
          <Pressable
            onPress={loadCustomers}
            style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 }}
          >
            <Text style={{ color: Colors.text, fontWeight: "800" }}>Ara</Text>
          </Pressable>
          {error ? <Text style={{ color: Colors.danger, marginBottom: 10 }}>{error}</Text> : null}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectCustomer(item)}
                  style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}
                >
                  <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.customerName || "-"}</Text>
                  <Text style={{ color: Colors.sub, marginTop: 2 }}>{item.companyName || ""}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
            <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Müşteri</Text>
            <Text style={{ color: Colors.text, fontWeight: "900", marginTop: 4 }}>{customer?.customerName || "-"}</Text>
            <Pressable onPress={() => setStep("pickCustomer")} style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignSelf: "flex-start" }}>
              <Text style={{ color: Colors.text, fontWeight: "800" }}>Değiştir</Text>
            </Pressable>
          </View>

          {error ? <Text style={{ color: Colors.danger, marginBottom: 10 }}>{error}</Text> : null}

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <TextInput
              placeholder="İş emri numarası (opsiyonel)"
              placeholderTextColor="#94a3b8"
              value={orderNumber}
              onChangeText={setOrderNumber}
              style={{ flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text }}
            />
            <Pressable onPress={fillNextNumber} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontWeight: "800" }}>Otomatik</Text>
            </Pressable>
          </View>

          <TextInput
            placeholder="Detay"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Not (opsiyonel)"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Bitiş tarihi (YYYY-MM-DD) opsiyonel"
            placeholderTextColor="#94a3b8"
            value={dueDate}
            onChangeText={setDueDate}
            style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
          />

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <Pressable
              onPress={() => setPriority("dusuk")}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: priority === "dusuk" ? Colors.primary : Colors.card, borderWidth: 1, borderColor: Colors.border }}
            >
              <Text style={{ color: priority === "dusuk" ? "#fff" : Colors.text, fontWeight: "800" }}>Düşük</Text>
            </Pressable>
            <Pressable
              onPress={() => setPriority("orta")}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: priority === "orta" ? Colors.primary : Colors.card, borderWidth: 1, borderColor: Colors.border }}
            >
              <Text style={{ color: priority === "orta" ? "#fff" : Colors.text, fontWeight: "800" }}>Orta</Text>
            </Pressable>
            <Pressable
              onPress={() => setPriority("yuksek")}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: priority === "yuksek" ? Colors.primary : Colors.card, borderWidth: 1, borderColor: Colors.border }}
            >
              <Text style={{ color: priority === "yuksek" ? "#fff" : Colors.text, fontWeight: "800" }}>Yüksek</Text>
            </Pressable>
          </View>

          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 10 }}>
            <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Şube</Text>
            <FlatList
              data={[{ id: "", name: "Şube seçilmedi" }, ...branches]}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setBranchId(String(item.id))}
                  style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: branchId === String(item.id) ? "#eff6ff" : Colors.card }}
                >
                  <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 12 }}>{item.name || "Şube"}</Text>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 10 }}>
            <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Tip</Text>
            <FlatList
              data={[{ id: "", name: "Tip seçilmedi" }, ...types]}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setTypeId(String(item.id))}
                  style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: typeId === String(item.id) ? "#eff6ff" : Colors.card }}
                >
                  <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 12 }}>{item.name || "Tip"}</Text>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
            <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Atanan</Text>
            <FlatList
              data={[{ id: "", name: "Atama yok" }, ...users]}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setAssignedUserId(String(item.id))}
                  style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: assignedUserId === String(item.id) ? "#eff6ff" : Colors.card }}
                >
                  <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 12 }}>{item.name || "Kullanıcı"}</Text>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={saving || loading}
            style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: saving || loading ? 0.7 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Kaydet</Text>}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function LineCreateModal({ token, customer, visible, onClose, onCreated }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [status, setStatus] = useState("aktif");
  const [endDate, setEndDate] = useState("");
  const [imeiNumber, setImeiNumber] = useState("");
  const [description, setDescription] = useState("");

  const reset = useCallback(() => {
    setOperators([]);
    setError("");
    setLineNumber("");
    setOperatorId("");
    setStatus("aktif");
    setEndDate("");
    setImeiNumber("");
    setDescription("");
  }, []);

  useEffect(() => {
    if (!visible) return;
    reset();
  }, [visible, reset]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError("");
    apiRequest("/operators", { token })
      .then((data) => setOperators(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setError("Operatörler alınamadı"))
      .finally(() => setLoading(false));
  }, [token, visible]);

  const submit = useCallback(async () => {
    setError("");
    if (!customer?.id) {
      setError("Müşteri bulunamadı");
      return;
    }
    if (!lineNumber.trim()) {
      setError("Hat numarası zorunlu");
      return;
    }
    setSaving(true);
    try {
      const body = {
        customer_id: customer.id,
        line_number: lineNumber.trim(),
        operator_id: operatorId || undefined,
        status,
        end_date: endDate.trim() || undefined,
        imei_number: imeiNumber.trim() || undefined,
        description: description.trim() || undefined,
      };
      await apiRequest("/lines", { method: "POST", token, body });
      onCreated?.();
      onClose?.();
    } catch (e) {
      if (e?.status === 403) setError("Hat tanımlamak için admin yetkisi gerekiyor.");
      else setError("Hat kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }, [customer, description, endDate, imeiNumber, lineNumber, onClose, onCreated, operatorId, status, token]);

  if (!visible) return null;

  return (
    <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: Colors.text }}>Hat Tanımla</Text>
        <Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.text, fontWeight: "800" }}>Kapat</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
          <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Müşteri</Text>
          <Text style={{ color: Colors.text, fontWeight: "900", marginTop: 4 }}>{customer?.customerName || "-"}</Text>
        </View>

        {error ? <Text style={{ color: Colors.danger, marginBottom: 10 }}>{error}</Text> : null}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <TextInput
              placeholder="Hat numarası"
              placeholderTextColor="#94a3b8"
              value={lineNumber}
              onChangeText={setLineNumber}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
            />
            <TextInput
              placeholder="IMEI (opsiyonel)"
              placeholderTextColor="#94a3b8"
              value={imeiNumber}
              onChangeText={setImeiNumber}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
            />
            <TextInput
              placeholder="Bitiş tarihi (YYYY-MM-DD) opsiyonel"
              placeholderTextColor="#94a3b8"
              value={endDate}
              onChangeText={setEndDate}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <Pressable
                onPress={() => setStatus("aktif")}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: status === "aktif" ? Colors.primary : Colors.card, borderWidth: 1, borderColor: Colors.border }}
              >
                <Text style={{ color: status === "aktif" ? "#fff" : Colors.text, fontWeight: "800" }}>Aktif</Text>
              </Pressable>
              <Pressable
                onPress={() => setStatus("pasif")}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: status === "pasif" ? Colors.primary : Colors.card, borderWidth: 1, borderColor: Colors.border }}
              >
                <Text style={{ color: status === "pasif" ? "#fff" : Colors.text, fontWeight: "800" }}>Pasif</Text>
              </Pressable>
            </View>
            <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 10 }}>
              <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Operatör</Text>
              <FlatList
                data={[{ id: "", name: "Seçilmedi" }, ...operators]}
                horizontal
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setOperatorId(String(item.id))}
                    style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: operatorId === String(item.id) ? "#eff6ff" : Colors.card }}
                  >
                    <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 12 }}>{item.name || "Operatör"}</Text>
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
            <TextInput
              placeholder="Açıklama (opsiyonel)"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 12 }}
            />
            <Pressable
              onPress={submit}
              disabled={saving}
              style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Kaydet</Text>}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function WorkOrderDetailModal({ token, workOrderId, visible, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wo, setWo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [showClose, setShowClose] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showLineCreate, setShowLineCreate] = useState(false);

  const [branchId, setBranchId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError("");
    try {
      const item = await apiRequest(`/work-orders/${encodeURIComponent(workOrderId)}`, { token });
      setWo(item || null);
      setBranchId(String(item?.branchId || ""));
      if (item?.customer?.id) {
        const br = await apiRequest(`/customers/${encodeURIComponent(item.customer.id)}/branches`, { token });
        setBranches(Array.isArray(br?.data) ? br.data : []);
      } else {
        setBranches([]);
      }
    } catch (e) {
      setError("Detay alınamadı");
    } finally {
      setLoading(false);
    }
  }, [token, workOrderId]);

  useEffect(() => {
    if (!visible) return;
    setShowClose(false);
    setShowPayment(false);
    setPaymentAmount("");
    setPaymentNote("");
    load();
  }, [visible, load]);

  const closeWorkOrder = useCallback(async () => {
    if (!wo?.id) return;
    setLoading(true);
    setError("");
    try {
      await apiRequest(`/work-orders/${encodeURIComponent(wo.id)}/status`, {
        method: "PATCH",
        token,
        body: {
          status: "kapali",
          branch_id: branchId || undefined,
          payment_amount: paymentAmount.trim() || undefined,
          payment_note: paymentNote.trim() || undefined,
        },
      });
      await load();
      onUpdated?.();
      setShowClose(false);
    } catch (e) {
      setError("Kapatma işlemi başarısız");
    } finally {
      setLoading(false);
    }
  }, [branchId, load, onUpdated, paymentAmount, paymentNote, token, wo]);

  const addPayment = useCallback(async () => {
    if (!wo?.id) return;
    setLoading(true);
    setError("");
    try {
      await apiRequest(`/work-orders/${encodeURIComponent(wo.id)}/payments`, {
        method: "POST",
        token,
        body: { amount: Number(paymentAmount), note: paymentNote.trim() || undefined },
      });
      setPaymentAmount("");
      setPaymentNote("");
      await load();
      onUpdated?.();
      setShowPayment(false);
    } catch (e) {
      setError("Ödeme eklenemedi");
    } finally {
      setLoading(false);
    }
  }, [load, onUpdated, paymentAmount, paymentNote, token, wo]);

  if (!visible) return null;

  const headerTitle = wo?.orderNumber || "İş Emri";

  return (
    <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: Colors.text }}>{headerTitle}</Text>
        <Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.text, fontWeight: "800" }}>Kapat</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {error ? <Text style={{ color: Colors.danger, marginBottom: 10 }}>{error}</Text> : null}
            <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
              <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Müşteri</Text>
              <Text style={{ color: Colors.text, fontWeight: "900", marginTop: 4 }}>{wo?.customer?.customerName || "-"}</Text>
              <Text style={{ color: Colors.sub, marginTop: 6, fontSize: 12 }}>
                {wo?.type?.name ? `Tip: ${wo.type.name}  •  ` : ""}
                Durum: {wo?.status}  •  Öncelik: {wo?.priority}
              </Text>
              <Text style={{ color: Colors.sub, marginTop: 6, fontSize: 12 }}>
                Şube: {wo?.branch?.name || "—"} {wo?.dueDate ? ` • Bitiş: ${String(wo.dueDate).slice(0, 10)}` : ""}
              </Text>
              {wo?.assignedUser?.name ? <Text style={{ color: Colors.sub, marginTop: 6, fontSize: 12 }}>Atanan: {wo.assignedUser.name}</Text> : null}
            </View>

            <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
              <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700" }}>Detay</Text>
              <Text style={{ color: Colors.text, marginTop: 6, fontWeight: "700" }}>{wo?.description || "-"}</Text>
              {wo?.notes ? <Text style={{ color: Colors.sub, marginTop: 8 }}>{wo.notes}</Text> : null}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <Pressable
                onPress={() => {
                  setShowPayment((v) => !v);
                  setShowClose(false);
                }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg }}
              >
                <Text style={{ color: Colors.text, fontWeight: "900" }}>Ödeme Ekle</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowLineCreate(true)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg }}
              >
                <Text style={{ color: Colors.text, fontWeight: "900" }}>Hat Tanımla</Text>
              </Pressable>
            </View>

            {wo?.status !== "kapali" ? (
              <Pressable
                onPress={() => {
                  setShowClose((v) => !v);
                  setShowPayment(false);
                }}
                style={{ paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: Colors.primary, marginBottom: 12 }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>{showClose ? "Kapatma Formunu Gizle" : "İş Emrini Kapat"}</Text>
              </Pressable>
            ) : null}

            {showPayment ? (
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
                <Text style={{ color: Colors.text, fontWeight: "900", marginBottom: 8 }}>Ödeme</Text>
                <TextInput
                  placeholder="Tutar"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
                />
                <TextInput
                  placeholder="Not (opsiyonel)"
                  placeholderTextColor="#94a3b8"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
                />
                <Pressable onPress={addPayment} style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "900" }}>Kaydet</Text>
                </Pressable>
              </View>
            ) : null}

            {showClose ? (
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg, marginBottom: 12 }}>
                <Text style={{ color: Colors.text, fontWeight: "900", marginBottom: 8 }}>Kapatma</Text>
                <Text style={{ color: Colors.sub, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>Şube</Text>
                <FlatList
                  data={[{ id: "", name: "Değiştirme" }, ...branches]}
                  horizontal
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setBranchId(String(item.id))}
                      style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: branchId === String(item.id) ? "#eff6ff" : Colors.card }}
                    >
                      <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 12 }}>{item.name || "Şube"}</Text>
                    </Pressable>
                  )}
                  showsHorizontalScrollIndicator={false}
                />
                <TextInput
                  placeholder="Tahsilat tutarı (opsiyonel)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginTop: 10, marginBottom: 10 }}
                />
                <TextInput
                  placeholder="Tahsilat notu (opsiyonel)"
                  placeholderTextColor="#94a3b8"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, marginBottom: 10 }}
                />
                <Pressable onPress={closeWorkOrder} style={{ backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "900" }}>Kapat</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg }}>
              <Text style={{ color: Colors.text, fontWeight: "900", marginBottom: 8 }}>Tahsilatlar</Text>
              {Array.isArray(wo?.payments) && wo.payments.length ? (
                wo.payments.slice(0, 10).map((p) => (
                  <View key={String(p.id)} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                    <Text style={{ color: Colors.text, fontWeight: "900" }}>{p.amount}</Text>
                    <Text style={{ color: Colors.sub, fontSize: 12 }}>{p.paidAt ? String(p.paidAt).slice(0, 10) : ""}</Text>
                    {p.note ? <Text style={{ color: Colors.sub, marginTop: 4 }}>{p.note}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: Colors.sub }}>Kayıt yok</Text>
              )}
            </View>
          </>
        )}
      </View>

      <LineCreateModal
        token={token}
        customer={wo?.customer}
        visible={showLineCreate}
        onClose={() => setShowLineCreate(false)}
        onCreated={() => {
          setShowLineCreate(false);
        }}
      />
    </SafeAreaView>
  );
}

function LinesScreen({ token }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));
        if (status) params.set("filter[status]", status);
        const data = await apiRequest(`/lines?${params.toString()}`, { token });
        setTotal(Number(data?.total || 0));
        setPage(Number(data?.page || nextPage));
        const items = Array.isArray(data?.data) ? data.data : [];
        setRows((prev) => (append ? [...prev, ...items] : items));
      } finally {
        setLoading(false);
      }
    },
    [status, token, pageSize, loading]
  );

  useEffect(() => {
    load({ nextPage: 1, append: false });
  }, [load]);

  const canLoadMore = rows.length < total;

  const chip = (key, label) => (
    <Pressable
      onPress={() => setStatus(key)}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: status === key ? Colors.primary : Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Text style={{ color: status === key ? "#fff" : Colors.text, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Hatlar" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {chip("", "Tümü")}
        {chip("aktif", "Aktif")}
        {chip("pasif", "Pasif")}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => {
          if (!canLoadMore) return;
          load({ nextPage: page + 1, append: true });
        }}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.lineNumber || "-"}</Text>
              <Text style={{ color: item.status === "aktif" ? "#16a34a" : Colors.sub, fontWeight: "800", fontSize: 12 }}>
                {String(item.status || "-").toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
              {item.customer?.customerName ? `Müşteri: ${item.customer.customerName}` : ""}
              {item.customer?.customerName && item.operator?.name ? "  •  " : ""}
              {item.operator?.name ? `Operatör: ${item.operator.name}` : ""}
            </Text>
            <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
              Bitiş: {item.endDate ? String(item.endDate).slice(0, 10) : "-"} {item.hasLicense ? " • Lisans var" : ""}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function LicensesScreen({ token }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));
        if (status) params.set("filter[status]", status);
        const data = await apiRequest(`/licenses?${params.toString()}`, { token });
        setTotal(Number(data?.total || 0));
        setPage(Number(data?.page || nextPage));
        const items = Array.isArray(data?.data) ? data.data : [];
        setRows((prev) => (append ? [...prev, ...items] : items));
      } finally {
        setLoading(false);
      }
    },
    [status, token, pageSize, loading]
  );

  useEffect(() => {
    load({ nextPage: 1, append: false });
  }, [load]);

  const canLoadMore = rows.length < total;

  const chip = (key, label) => (
    <Pressable
      onPress={() => setStatus(key)}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: status === key ? Colors.primary : Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Text style={{ color: status === key ? "#fff" : Colors.text, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Lisanslar" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {chip("", "Tümü")}
        {chip("aktif", "Aktif")}
        {chip("pasif", "Pasif")}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => {
          if (!canLoadMore) return;
          load({ nextPage: page + 1, append: true });
        }}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.licenseName || "-"}</Text>
              <Text style={{ color: item.status === "aktif" ? "#16a34a" : Colors.sub, fontWeight: "800", fontSize: 12 }}>
                {String(item.status || "-").toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>Bitiş: {item.endDate ? String(item.endDate).slice(0, 10) : "-"}</Text>
            <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
              {item.hasLine ? "Hat bağlı" : "Hat bağlı değil"} {item.customerId ? ` • Müşteri: ${String(item.customerId).slice(0, 8)}…` : ""}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function ReportsScreen({ token }) {
  const [tab, setTab] = useState("payments");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "payments" ? await apiRequest("/reports/payments", { token }) : await apiRequest("/reports/branches", { token });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Raporlar" />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Pressable
          onPress={() => setTab("payments")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: tab === "payments" ? Colors.primary : Colors.card,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Text style={{ color: tab === "payments" ? "#fff" : Colors.text, fontWeight: "800" }}>Tahsilatlar</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("branches")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: tab === "branches" ? Colors.primary : Colors.card,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Text style={{ color: tab === "branches" ? "#fff" : Colors.text, fontWeight: "800" }}>Şubeler</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, idx) => String(item?.id || item?.branchId || idx)}
          renderItem={({ item }) =>
            tab === "payments" ? (
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}>
                <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.customer?.customerName || "Müşteri"}</Text>
                <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>{item.workOrder?.orderNumber || ""}</Text>
                <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
                  Tutar: {item.amount}  •  {item.paidAt ? String(item.paidAt).slice(0, 10) : ""}
                </Text>
              </View>
            ) : (
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}>
                <Text style={{ color: Colors.text, fontWeight: "900" }}>{item.name || "-"}</Text>
                <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>{item.address || ""}</Text>
                <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>
                  Açık: {item.open} • Devam: {item.progress} • Kapalı: {item.closed}
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function SettingsScreen({ user, onLogout }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Ayarlar" />
      <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.bg }}>
        <Text style={{ color: Colors.text, fontWeight: "900" }}>{user?.name || "Kullanıcı"}</Text>
        <Text style={{ color: Colors.sub, marginTop: 4 }}>{user?.email || ""}</Text>
        <Text style={{ color: Colors.sub, marginTop: 4, fontSize: 12 }}>Rol: {user?.role || "-"}</Text>
      </View>
      <Pressable
        onPress={onLogout}
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: Colors.danger,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: Colors.danger, fontWeight: "900" }}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}

function MoreScreen({ onNavigate }) {
  const item = (key, label) => (
    <Pressable
      onPress={() => onNavigate(key)}
      style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: Colors.bg }}
    >
      <Text style={{ color: Colors.text, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionTitle title="Daha" />
      {item("lines", "Hatlar")}
      {item("licenses", "Lisanslar")}
      {item("reports", "Raporlar")}
      {item("settings", "Ayarlar")}
    </View>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);
  const [workOrdersReloadKey, setWorkOrdersReloadKey] = useState(0);
  const [showWorkOrderDetail, setShowWorkOrderDetail] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);

  const loadSession = useCallback(async () => {
    setBooting(true);
    try {
      const [at, rt] = await Promise.all([
        SecureStore.getItemAsync("access_token"),
        SecureStore.getItemAsync("refresh_token"),
      ]);
      if (at) {
        setToken(at);
        try {
          const me = await apiRequest("/auth/me", { token: at });
          setUser(me || null);
          return;
        } catch (e) {
          if (e?.status !== 401 || !rt) throw e;
        }
      }
      if (rt) {
        const refreshed = await apiRequest("/auth/refresh", { method: "POST", body: { refresh_token: rt } });
        const newToken = refreshed?.access_token;
        if (newToken) {
          await saveTokens({ access_token: newToken });
          setToken(newToken);
          const me = await apiRequest("/auth/me", { token: newToken });
          setUser(me || null);
          return;
        }
      }
      await clearTokens();
      setToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    loadSession();
  }, [loadSession]);

  const onLogin = useCallback(async (email, password) => {
    const data = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
    await saveTokens(data);
    setToken(data?.access_token || null);
    const me = await apiRequest("/auth/me", { token: data?.access_token });
    setUser(me || null);
    setTab("dashboard");
  }, []);

  const onLogout = useCallback(async () => {
    await clearTokens();
    setToken(null);
    setUser(null);
    setTab("dashboard");
  }, []);

  const screen = useMemo(() => {
    if (!token) return null;
    if (tab === "dashboard")
      return (
        <DashboardScreen
          token={token}
          onGoWorkOrders={() => setTab("workOrders")}
          onOpenWorkOrder={(id) => {
            setSelectedWorkOrderId(id);
            setShowWorkOrderDetail(true);
          }}
        />
      );
    if (tab === "customers") return <CustomersScreen token={token} />;
    if (tab === "workOrders")
      return (
        <WorkOrdersScreen
          token={token}
          reloadKey={workOrdersReloadKey}
          onNew={() => setShowCreateWorkOrder(true)}
          onOpen={(item) => {
            setSelectedWorkOrderId(item.id);
            setShowWorkOrderDetail(true);
          }}
        />
      );
    if (tab === "lines") return <LinesScreen token={token} />;
    if (tab === "licenses") return <LicensesScreen token={token} />;
    if (tab === "reports") return <ReportsScreen token={token} />;
    if (tab === "settings") return <SettingsScreen user={user} onLogout={onLogout} />;
    return <MoreScreen onNavigate={setTab} />;
  }, [tab, token, user, onLogout, workOrdersReloadKey]);

  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ color: Colors.text, fontWeight: "800" }}>Bu uygulama iOS/Android içindir.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (booting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) return <LoginScreen onLogin={onLogin} />;

  const mainTab = ["lines", "licenses", "reports", "settings", "more"].includes(tab) ? "more" : tab;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={{ flex: 1 }}>{screen}</View>
      <View style={{ flexDirection: "row" }}>
        <TabButton active={mainTab === "dashboard"} label="Anasayfa" onPress={() => setTab("dashboard")} />
        <TabButton active={mainTab === "workOrders"} label="İş Emirleri" onPress={() => setTab("workOrders")} />
        <TabButton active={mainTab === "customers"} label="Müşteriler" onPress={() => setTab("customers")} />
        <TabButton active={mainTab === "more"} label="Daha" onPress={() => setTab("more")} />
      </View>
      <WorkOrderCreateModal
        token={token}
        visible={showCreateWorkOrder}
        onClose={() => setShowCreateWorkOrder(false)}
        onCreated={() => setWorkOrdersReloadKey((k) => k + 1)}
      />
      <WorkOrderDetailModal
        token={token}
        workOrderId={selectedWorkOrderId}
        visible={showWorkOrderDetail}
        onClose={() => setShowWorkOrderDetail(false)}
        onUpdated={() => setWorkOrdersReloadKey((k) => k + 1)}
      />
    </SafeAreaView>
  );
}
