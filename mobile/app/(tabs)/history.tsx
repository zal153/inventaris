import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { ClipboardList, Filter, ArrowDownLeft, ArrowUpRight, Search } from "lucide-react-native";
import axios from "axios";

export default function HistoryScreen() {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "stock-in" | "stock-out">("all");

  const fetchHistory = useCallback(async (type = "all") => {
    try {
      const res = await axios.get(`${API_URL}/transactions/history?type=${type}`);
      if (res.data.success) {
        setHistoryList(res.data.history || []);
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat transaksi:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(filterType);
  }, [filterType, fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(filterType);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render Single History Item
  const renderHistoryItem = ({ item }: { item: any }) => {
    const isMasuk = item.type === "MASUK";

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          {/* Badge Transaksi */}
          <View style={[styles.badge, isMasuk ? styles.badgeIn : styles.badgeOut]}>
            {isMasuk ? (
              <ArrowDownLeft size={14} color="#16a34a" style={{ marginRight: 4 }} />
            ) : (
              <ArrowUpRight size={14} color="#ef4444" style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.badgeText, isMasuk ? styles.textSuccess : styles.textDanger]}>
              {isMasuk ? "Barang Masuk" : "Barang Keluar"}
            </Text>
          </View>
          <Text style={styles.itemTime}>{formatDate(item.tanggal)}</Text>
        </View>

        <Text style={styles.itemName}>{item.namaBarang}</Text>
        <Text style={styles.itemCode}>Kode: {item.kodeBarang} | Code: {item.kodeTransaksi}</Text>

        <View style={styles.cardInfoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Jumlah</Text>
            <Text style={styles.infoVal}>
              {item.jumlah} <Text style={styles.unitVal}>{item.satuan}</Text>
            </Text>
          </View>
          {item.tujuan && (
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Tujuan</Text>
              <Text style={styles.infoVal}>{item.tujuan}</Text>
            </View>
          )}
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Petugas</Text>
            <Text style={styles.infoVal}>{item.userName}</Text>
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
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Filter Buttons */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "all" && styles.filterBtnActive]}
          onPress={() => {
            setIsLoading(true);
            setFilterType("all");
          }}
        >
          <Text style={[styles.filterBtnText, filterType === "all" && styles.filterBtnTextActive]}>
            Semua Mutasi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "stock-in" && styles.filterBtnActive]}
          onPress={() => {
            setIsLoading(true);
            setFilterType("stock-in");
          }}
        >
          <Text style={[styles.filterBtnText, filterType === "stock-in" && styles.filterBtnTextActive]}>
            Masuk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterType === "stock-out" && styles.filterBtnActive]}
          onPress={() => {
            setIsLoading(true);
            setFilterType("stock-out");
          }}
        >
          <Text style={[styles.filterBtnText, filterType === "stock-out" && styles.filterBtnTextActive]}>
            Keluar
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && historyList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat riwayat transaksi...</Text>
        </View>
      ) : (
        <FlatList
          data={historyList}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ClipboardList size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
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
  filterBar: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
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
  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterBtnTextActive: {
    color: "#2563eb",
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    fontSize: 11,
    fontWeight: "700",
  },
  itemTime: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemCode: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  cardInfoRow: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
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
    fontWeight: "600",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  unitVal: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "400",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "700",
  },
  emptySubText: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
});
