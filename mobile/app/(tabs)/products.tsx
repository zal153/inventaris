import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { Search, Package, AlertTriangle, Eye, Info } from "lucide-react-native";
import axios from "axios";

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const fetchProducts = useCallback(async (query = "") => {
    try {
      const res = await axios.get(`${API_URL}/products?search=${query}`);
      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error("Gagal memuat barang:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle live search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsLoading(true);
    fetchProducts(text);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(searchQuery);
  };

  const formatRupiah = (val: number) => {
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  // Render Single Product Item
  const renderProductItem = ({ item }: { item: any }) => {
    const isLowStock = item.stok > 0 && item.stok <= item.minimumStok;
    const isOutOfStock = item.stok === 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.cardHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.namaBarang}</Text>
            <Text style={styles.itemCode}>{item.kodeBarang}</Text>
          </View>
          <View style={styles.stockBadge}>
            <Text
              style={[
                styles.stockVal,
                isOutOfStock ? styles.textDanger : isLowStock ? styles.textWarning : styles.textSuccess,
              ]}
            >
              {item.stok}
            </Text>
            <Text style={styles.unitVal}>{item.satuan}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Harga Jual</Text>
            <Text style={styles.detailVal}>{formatRupiah(item.hargaJual)}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailVal}>{item.category?.name || "Umum"}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.infoBtn} 
            onPress={() => setSelectedProduct(selectedProduct?.id === item.id ? null : item)}
          >
            <Info size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Expandable Info Detail Drawer */}
        {selectedProduct?.id === item.id && (
          <View style={styles.expandedDetails}>
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Harga Beli:</Text>
              <Text style={styles.expandedVal}>{formatRupiah(item.hargaBeli)}</Text>
            </View>
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Barcode:</Text>
              <Text style={styles.expandedVal}>{item.barcode || "—"}</Text>
            </View>
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Minimum Stok:</Text>
              <Text style={styles.expandedVal}>{item.minimumStok} {item.satuan}</Text>
            </View>
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Stok Ideal:</Text>
              <Text style={styles.expandedVal}>{item.stokIdeal} {item.satuan}</Text>
            </View>
            {item.deskripsi && (
              <View style={[styles.expandedRow, { flexDirection: "column", alignItems: "flex-start", marginTop: 4 }]}>
                <Text style={styles.expandedLabel}>Deskripsi:</Text>
                <Text style={[styles.expandedVal, { marginTop: 2, color: "#64748b" }]}>{item.deskripsi}</Text>
              </View>
            )}
          </View>
        )}

        {(isLowStock || isOutOfStock) && (
          <View style={[styles.warningBanner, isOutOfStock ? styles.bannerDanger : styles.bannerWarning]}>
            <AlertTriangle size={14} color={isOutOfStock ? "#ef4444" : "#d97706"} />
            <Text style={[styles.warningText, isOutOfStock ? styles.warningTextDanger : styles.warningTextWarning]}>
              {isOutOfStock ? "Stok habis! Silakan lakukan barang masuk." : "Stok menipis di bawah jumlah minimum."}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Search size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari berdasarkan nama, kode, atau barcode..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {isLoading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat daftar barang...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Barang tidak ditemukan</Text>
              <Text style={styles.emptySubText}>Coba gunakan kata kunci lainnya</Text>
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
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    height: "100%",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  productCard: {
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
    alignItems: "flex-start",
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemCode: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748b",
    marginTop: 2,
  },
  stockBadge: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 54,
  },
  stockVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  unitVal: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  detailVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  infoBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
  },
  expandedDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  expandedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  expandedLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  expandedVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
  },
  bannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fef3c7",
  },
  bannerDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
  },
  warningText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
  },
  warningTextWarning: {
    color: "#b45309",
  },
  warningTextDanger: {
    color: "#b91c1c",
  },
  textSuccess: {
    color: "#16a34a",
  },
  textWarning: {
    color: "#d97706",
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
