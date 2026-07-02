import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axiosInstance from "axios";
import { useQuery } from "@tanstack/react-query";

type DateFilterType = "all" | "today" | "week" | "month";

// Standalone memoized component for History card item to optimize VirtualizedList
interface HistoryItemProps {
  item: any;
  getFormattedDate: (d: string) => string;
  getFormattedTime: (d: string) => string;
}

const HistoryItem = React.memo(({ item, getFormattedDate, getFormattedTime }: HistoryItemProps) => {
  const isMasuk = item.type === "MASUK";

  return (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        {/* Badge Transaksi */}
        <View style={[styles.badge, isMasuk ? styles.badgeIn : styles.badgeOut]}>
          <MaterialCommunityIcons 
            name={isMasuk ? "arrow-down-bold" : "arrow-up-bold"} 
            size={14} 
            color={isMasuk ? "#16a34a" : "#ef4444"} 
            style={{ marginRight: 4 }} 
          />
          <Text style={[styles.badgeText, isMasuk ? styles.textSuccess : styles.textDanger]}>
            {isMasuk ? "Barang Masuk" : "Barang Keluar"}
          </Text>
        </View>
        <Text style={styles.transCode}>{item.kodeTransaksi}</Text>
      </View>

      <Text style={styles.itemName}>{item.namaBarang}</Text>
      <Text style={styles.itemCode}>Kode: {item.kodeBarang}</Text>

      <View style={styles.cardInfoRow}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Jumlah</Text>
          <Text style={styles.infoVal}>
            {item.jumlah} <Text style={styles.unitVal}>{item.satuan}</Text>
          </Text>
        </View>
        
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Petugas</Text>
          <Text style={styles.infoVal}>{item.userName || "Admin"}</Text>
        </View>
      </View>

      {/* Date and Time Details */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeCol}>
          <MaterialCommunityIcons name="calendar-month-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.dateTimeText}>{getFormattedDate(item.tanggal)}</Text>
        </View>
        <View style={styles.dateTimeCol}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.dateTimeText}>{getFormattedTime(item.tanggal)}</Text>
        </View>
      </View>

      {item.catatan && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Catatan:</Text>
          <Text style={styles.notesVal}>{item.catatan}</Text>
        </View>
      )}
    </View>
  );
});

export default function HistoryScreen() {
  // Filtering & Search
  const [filterType, setFilterType] = useState<"all" | "stock-in" | "stock-out">("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination (Infinite Scroll)
  const [visibleCount, setVisibleCount] = useState(10);

  // React Queries
  const { data: historyList = [], isLoading: isLoadingHistory, refetch: refetchHistory, isFetching: isRefreshingHistory } = useQuery<any[]>({
    queryKey: ["transactionsHistory", filterType],
    queryFn: async () => {
      const res = await axiosInstance.get(`${API_URL}/transactions/history?type=${filterType}`);
      if (res.data.success) {
        return res.data.history || [];
      }
      throw new Error(res.data.message || "Gagal memuat riwayat transaksi");
    },
  });

  // Shimmer skeleton animation
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isLoadingHistory) {
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
      if (anim) anim.stop();
    };
  }, [isLoadingHistory, shimmerAnim]);

  const onRefresh = () => {
    setVisibleCount(10);
    refetchHistory();
  };

  const loadMoreData = () => {
    if (visibleCount < processedHistory.length) {
      setVisibleCount((prev) => prev + 10);
    }
  };

  // Memoized date formatting helpers
  const getFormattedDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const getFormattedTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  }, []);

  // Client-side search and date filtering
  const getProcessedHistory = () => {
    return historyList.filter((item) => {
      // 1. Search Query filter (matches name, code, transaction code, user name)
      const matchesSearch =
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeTransaksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.userName && item.userName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Date filter
      if (dateFilter === "all") return true;

      const transDate = new Date(item.tanggal);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - transDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === "today") {
        return transDate.toDateString() === now.toDateString();
      }
      if (dateFilter === "week") {
        return diffDays <= 7;
      }
      if (dateFilter === "month") {
        return diffDays <= 30;
      }

      return true;
    });
  };

  const processedHistory = getProcessedHistory();
  const paginatedHistory = processedHistory.slice(0, visibleCount);

  // Memoized render item function
  const renderHistoryItem = useCallback(({ item }: { item: any }) => {
    return (
      <HistoryItem
        item={item}
        getFormattedDate={getFormattedDate}
        getFormattedTime={getFormattedTime}
      />
    );
  }, [getFormattedDate, getFormattedTime]);

  return (
    <View style={styles.container}>
      {/* Search and Date Filter bar */}
      <View style={styles.headerRow}>
        <View style={styles.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama, kode, petugas..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Date Filter Chips (Horizontal Scrollable) */}
      <View style={styles.filterChipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity
            style={[styles.chip, dateFilter === "all" && styles.chipActive]}
            onPress={() => setDateFilter("all")}
          >
            <Text style={[styles.chipText, dateFilter === "all" && styles.chipTextActive]}>Semua Waktu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, dateFilter === "today" && styles.chipActive]}
            onPress={() => setDateFilter("today")}
          >
            <Text style={[styles.chipText, dateFilter === "today" && styles.chipTextActive]}>Hari Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, dateFilter === "week" && styles.chipActive]}
            onPress={() => setDateFilter("week")}
          >
            <Text style={[styles.chipText, dateFilter === "week" && styles.chipTextActive]}>7 Hari Terakhir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, dateFilter === "month" && styles.chipActive]}
            onPress={() => setDateFilter("month")}
          >
            <Text style={[styles.chipText, dateFilter === "month" && styles.chipTextActive]}>30 Hari Terakhir</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Mutasi Type Filter tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "all" && styles.filterBtnActive]}
          onPress={() => setFilterType("all")}
        >
          <Text style={[styles.filterBtnText, filterType === "all" && styles.filterBtnTextActive]}>
            Semua Mutasi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "stock-in" && styles.filterBtnActiveIn]}
          onPress={() => setFilterType("stock-in")}
        >
          <Text style={[styles.filterBtnText, filterType === "stock-in" && styles.filterBtnTextActiveIn]}>
            Masuk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "stock-out" && styles.filterBtnActiveOut]}
          onPress={() => setFilterType("stock-out")}
        >
          <Text style={[styles.filterBtnText, filterType === "stock-out" && styles.filterBtnTextActiveOut]}>
            Keluar
          </Text>
        </TouchableOpacity>
      </View>

      {isLoadingHistory && historyList.length === 0 ? (
        <View style={styles.listContent}>
          <Animated.View style={[styles.historyCardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.historyCardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.historyCardSkeleton, { opacity: shimmerAnim }]} />
        </View>
      ) : (
        <FlatList
          data={paginatedHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={isRefreshingHistory} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            visibleCount < processedHistory.length ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Tidak ada riwayat transaksi</Text>
              <Text style={styles.emptySubText}>Gunakan filter lain atau catat transaksi baru</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 48,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    height: "100%",
  },
  filterChipContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipScroll: {
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 8,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  filterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  filterBtnActive: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  filterBtnActiveIn: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  filterBtnActiveOut: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterBtnTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  filterBtnTextActiveIn: {
    color: "#16a34a",
    fontWeight: "700",
  },
  filterBtnTextActiveOut: {
    color: "#ef4444",
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  historyCardSkeleton: {
    height: 140,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeIn: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  badgeOut: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  transCode: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748b",
    fontWeight: "600",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 4,
  },
  itemCode: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  cardInfoRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  unitVal: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "400",
  },
  dateTimeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  dateTimeCol: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginVertical: 2,
  },
  dateTimeText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  notesBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  notesVal: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    fontStyle: "italic",
  },
  textSuccess: {
    color: "#16a34a",
  },
  textDanger: {
    color: "#ef4444",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "700",
  },
  emptySubText: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
});
