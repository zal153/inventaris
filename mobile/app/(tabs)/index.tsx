import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { useAuth, API_URL } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [lastSync, setLastSync] = useState<string>("");

  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard`);
      if (res.data.success) {
        return res.data;
      }
      throw new Error(res.data.message || "Gagal memuat data dari server");
    },
  });

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 11) return "Selamat Pagi";
    if (hr < 15) return "Selamat Siang";
    if (hr < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  useEffect(() => {
    if (data) {
      const now = new Date();
      setLastSync(
        now.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
          ", " +
          now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    }
  }, [data]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isLoading) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      shimmerAnim.setValue(1);
    }
    return () => {
      if (anim) {
        anim.stop();
      }
    };
  }, [isLoading, shimmerAnim]);

  const handleQuickAction = (route: string, params?: any) => {
    router.push({ pathname: route as any, params });
  };

  const stats = data?.stats;
  const lowStockList = data?.lowStockProducts || [];

  const totalProducts = stats?.totalProducts || 0;
  const warningCount = (stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0);
  const safeCount = Math.max(0, totalProducts - warningCount);
  const safePercentage = totalProducts > 0 ? (safeCount / totalProducts) * 100 : 100;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.profileCardSkeleton, { opacity: shimmerAnim }]} />
        <View style={styles.skeletonTitle} />
        <View style={styles.grid}>
          <Animated.View style={[styles.cardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.cardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.cardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.cardSkeleton, { opacity: shimmerAnim }]} />
        </View>
        <Animated.View style={[styles.alertBarSkeleton, { opacity: shimmerAnim }]} />
        <View style={styles.skeletonTitle} />
        <Animated.View style={[styles.listSkeleton, { opacity: shimmerAnim }]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} colors={["#2563eb"]} />
      }
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={22} color="#2563eb" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="shield-check" size={12} color="#2563eb" style={{ marginRight: 2 }} />
              <Text style={styles.userRole}>{user?.role}</Text>
            </View>
            {lastSync ? (
              <Text style={styles.syncText}>• Sinkron: {lastSync}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : "Gagal memuat data dari server"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Aksi Cepat Admin</Text>
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleQuickAction("/(tabs)/transactions", { scan: "true" })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: "#eff6ff" }]}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color="#2563eb" />
          </View>
          <Text style={styles.actionLabel}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleQuickAction("/(tabs)/transactions", { type: "in" })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: "#f0fdf4" }]}>
            <MaterialCommunityIcons name="arrow-down-bold-circle-outline" size={24} color="#16a34a" />
          </View>
          <Text style={styles.actionLabel}>Barang Masuk</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleQuickAction("/(tabs)/transactions", { type: "out" })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: "#fffbeb" }]}>
            <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.actionLabel}>Barang Keluar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" style={{ marginRight: 6 }} />
            <Text style={styles.progressTitle}>Kondisi Stok Gudang</Text>
          </View>
          <Text style={styles.progressPercentage}>{Math.round(safePercentage)}% Aman</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarForeground, { width: `${safePercentage}%` }]} />
        </View>
        <Text style={styles.progressSubtext}>
          {safeCount} dari {totalProducts} jenis barang dalam stok aman.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#eff6ff" }]}>
            <MaterialCommunityIcons name="package-variant" size={22} color="#2563eb" />
          </View>
          <Text style={styles.cardVal}>{stats?.totalProducts || 0}</Text>
          <Text style={styles.cardLabel}>Total Barang</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#faf5ff" }]}>
            <MaterialCommunityIcons name="tag-multiple" size={22} color="#9333ea" />
          </View>
          <Text style={styles.cardVal}>{stats?.totalCategories || 0}</Text>
          <Text style={styles.cardLabel}>Kategori</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
            <MaterialCommunityIcons name="arrow-down-circle" size={22} color="#16a34a" />
          </View>
          <Text style={styles.cardVal}>{stats?.stockInToday || 0}</Text>
          <Text style={styles.cardLabel}>Barang Masuk</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: "#fffbeb" }]}>
            <MaterialCommunityIcons name="arrow-up-circle" size={22} color="#f59e0b" />
          </View>
          <Text style={styles.cardVal}>{stats?.stockOutToday || 0}</Text>
          <Text style={styles.cardLabel}>Barang Keluar</Text>
        </View>
      </View>

      <View style={styles.alertRow}>
        <View style={[styles.alertCard, { backgroundColor: "#fffbeb", borderColor: "#fef3c7" }]}>
          <MaterialCommunityIcons name="alert" size={20} color="#f59e0b" />
          <Text style={[styles.alertText, { color: "#b45309", fontWeight: "700" }]}>
            {stats?.lowStockCount || 0} <Text style={{ fontWeight: "400", color: "#64748b" }}>Stok Menipis</Text>
          </Text>
        </View>
        <View style={[styles.alertCard, { backgroundColor: "#fef2f2", borderColor: "#fee2e2" }]}>
          <MaterialCommunityIcons name="alert" size={20} color="#ef4444" />
          <Text style={[styles.alertText, { color: "#b91c1c", fontWeight: "700" }]}>
            {stats?.outOfStockCount || 0} <Text style={{ fontWeight: "400", color: "#64748b" }}>Stok Habis</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Peringatan Stok Menipis</Text>
      <View style={styles.listCard}>
        {lowStockList.length > 0 ? (
          lowStockList.map((item: any) => (
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
            <MaterialCommunityIcons name="package-variant" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
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
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  profileCardSkeleton: {
    height: 72,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  skeletonTitle: {
    height: 16,
    width: 140,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginBottom: 12,
    marginTop: 12,
  },
  cardSkeleton: {
    width: "48%",
    height: 110,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  alertBarSkeleton: {
    height: 60,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  listSkeleton: {
    height: 150,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
  greetingText: {
    fontSize: 12,
    color: "#64748b",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  userRole: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  syncText: {
    fontSize: 10,
    color: "#94a3b8",
    marginLeft: 6,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 12,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },
  quickActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e293b",
  },
  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16a34a",
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarForeground: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 11,
    color: "#64748b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
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
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  alertCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
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
    color: "#f59e0b",
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
