import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { useAuth, API_URL } from "../../context/AuthContext";
import {
  Package,
  Tags,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  LogOut,
  User,
  Shield,
} from "lucide-react-native";
import axios from "axios";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/dashboard`);
      if (res.data.success) {
        setStats(res.data.stats);
        setLowStockList(res.data.lowStockProducts || []);
      }
    } catch (err) {
      console.error("Gagal memuat statistik dashboard:", err);
      setError("Gagal memuat data dari server");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Memuat statistik...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
      }
    >
      {/* Profile Header Widget */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <User size={24} color="#2563eb" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Shield size={12} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.userRole}>{user?.role}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDashboardData}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Overview Cards */}
      <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
      <View style={styles.grid}>
        {/* Card: Total Produk */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#eff6ff" }]}>
            <Package size={22} color="#2563eb" />
          </View>
          <Text style={styles.cardVal}>{stats?.totalProducts || 0}</Text>
          <Text style={styles.cardLabel}>Total Barang</Text>
        </View>

        {/* Card: Kategori */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#faf5ff" }]}>
            <Tags size={22} color="#9333ea" />
          </View>
          <Text style={styles.cardVal}>{stats?.totalCategories || 0}</Text>
          <Text style={styles.cardLabel}>Kategori</Text>
        </View>

        {/* Card: Masuk Hari Ini */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
            <ArrowDownCircle size={22} color="#16a34a" />
          </View>
          <Text style={styles.cardVal}>{stats?.stockInToday || 0}</Text>
          <Text style={styles.cardLabel}>Barang Masuk</Text>
        </View>

        {/* Card: Keluar Hari Ini */}
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#fffbeb" }]}>
            <ArrowUpCircle size={22} color="#d97706" />
          </View>
          <Text style={styles.cardVal}>{stats?.stockOutToday || 0}</Text>
          <Text style={styles.cardLabel}>Barang Keluar</Text>
        </View>
      </View>

      {/* Stock Warning Box */}
      <View style={styles.alertRow}>
        <View style={[styles.alertCard, { backgroundColor: "#fffbeb", borderColor: "#fef3c7" }]}>
          <AlertTriangle size={20} color="#d97706" />
          <Text style={[styles.alertText, { color: "#b45309", fontWeight: "700" }]}>
            {stats?.lowStockCount || 0} <Text style={{ fontWeight: "400", color: "#64748b" }}>Stok Menipis</Text>
          </Text>
        </View>
        <View style={[styles.alertCard, { backgroundColor: "#fef2f2", borderColor: "#fee2e2" }]}>
          <AlertTriangle size={20} color="#ef4444" />
          <Text style={[styles.alertText, { color: "#b91c1c", fontWeight: "700" }]}>
            {stats?.outOfStockCount || 0} <Text style={{ fontWeight: "400", color: "#64748b" }}>Stok Habis</Text>
          </Text>
        </View>
      </View>

      {/* Low Stock List */}
      <Text style={styles.sectionTitle}>Peringatan Stok Menipis</Text>
      <View style={styles.listCard}>
        {lowStockList.length > 0 ? (
          lowStockList.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.namaBarang}</Text>
                <Text style={styles.itemCode}>{item.kodeBarang}</Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={[styles.itemStock, item.stok === 0 ? styles.textDanger : styles.textWarning]}>
                  {item.stok} {item.satuan}
                </Text>
                <Text style={styles.minStockLabel}>Min. {item.minimumStok}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Package size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>Semua stok barang aman / tercukupi</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // slate 50
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardVal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  alertCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  listCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemCode: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748b",
    marginTop: 2,
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  itemStock: {
    fontSize: 14,
    fontWeight: "700",
  },
  textWarning: {
    color: "#d97706",
  },
  textDanger: {
    color: "#ef4444",
  },
  minStockLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
});
