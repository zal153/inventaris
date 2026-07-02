import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Alert,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { useAuth, API_URL } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Standalone memoized component for Product Card to optimize VirtializedList performance
interface ProductItemProps {
  item: any;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isAdmin: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string, name: string) => void;
}

const ProductItem = React.memo(({ item, isSelected, onToggle, isAdmin, onEdit, onDelete }: ProductItemProps) => {
  const isLowStock = item.stok > 0 && item.stok <= item.minimumStok;
  const isOutOfStock = item.stok === 0;

  // Get Rak Location
  const locationStr = item.lokasiRak || item.rak || item.deskripsi?.match(/rak\s*:\s*([^\n,]+)/i)?.[1] || "";

  return (
    <View style={styles.productCard}>
      <View style={styles.cardHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.namaBarang}</Text>
          <Text style={styles.itemCode}>{item.kodeBarang}</Text>
          <View style={styles.metaBadgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category?.name || "Umum"}</Text>
            </View>
            {locationStr ? (
              <View style={styles.rakBadge}>
                <MaterialCommunityIcons name="locker" size={10} color="#64748b" style={{ marginRight: 2 }} />
                <Text style={styles.rakBadgeText}>Rak: {locationStr}</Text>
              </View>
            ) : null}
          </View>
        </View>
        
        <View
          style={[
            styles.stockBadge,
            isOutOfStock
              ? styles.badgeDanger
              : isLowStock
              ? styles.badgeWarning
              : styles.badgeSuccess,
          ]}
        >
          <Text
            style={[
              styles.stockVal,
              isOutOfStock
                ? styles.textDanger
                : isLowStock
                ? styles.textWarning
                : styles.textSuccess,
            ]}
          >
            {item.stok}
          </Text>
          <Text
            style={[
              styles.unitVal,
              isOutOfStock
                ? styles.textDanger
                : isLowStock
                ? styles.textWarning
                : styles.textSuccess,
            ]}
          >
            {item.satuan}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Limit Minimum</Text>
          <Text style={styles.detailVal}>{item.minimumStok} {item.satuan}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Limit Ideal</Text>
          <Text style={styles.detailVal}>{item.stokIdeal} {item.satuan}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.infoBtn} 
          onPress={() => onToggle(item.id)}
        >
          <MaterialCommunityIcons 
            name={isSelected ? "chevron-up" : "information-outline"} 
            size={18} 
            color="#2563eb" 
          />
        </TouchableOpacity>
      </View>

      {isSelected && (
        <View style={styles.expandedDetails}>
          <View style={styles.expandedRow}>
            <Text style={styles.expandedLabel}>Barcode:</Text>
            <Text style={styles.expandedVal}>{item.barcode || "—"}</Text>
          </View>
          <View style={styles.expandedRow}>
            <Text style={styles.expandedLabel}>Lokasi Rak:</Text>
            <Text style={styles.expandedVal}>{locationStr || "—"}</Text>
          </View>
          {item.deskripsi && (
            <View style={[styles.expandedRow, { flexDirection: "column", alignItems: "flex-start", marginTop: 4 }]}>
              <Text style={styles.expandedLabel}>Deskripsi:</Text>
              <Text style={[styles.expandedVal, { marginTop: 2, color: "#64748b" }]}>{item.deskripsi}</Text>
            </View>
          )}

          {isAdmin && (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]} 
                onPress={() => onEdit(item)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]} 
                onPress={() => onDelete(item.id, item.namaBarang)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const productFormSchema = z.object({
  kodeBarang: z.string().min(1, "Kode barang wajib diisi"),
  namaBarang: z.string().min(1, "Nama barang wajib diisi"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  stok: z.number().min(0, "Stok awal minimal 0"),
  minimumStok: z.number().min(0, "Minimum stok minimal 0"),
  stokIdeal: z.number().min(0, "Stok ideal minimal 0"),
  barcode: z.string().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
  lokasiRak: z.string().nullable().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function ProductsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Sorting & Filtering parameters
  const [sortType, setSortType] = useState<"nama-asc" | "nama-desc" | "stok-asc" | "stok-desc" | "stok-menipis">("nama-asc");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Modal display states
  const [modalVisible, setModalVisible] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productId, setProductId] = useState("");
  const [categoryName, setCategoryName] = useState("Pilih Kategori");

  // Barcode Scanner states for search
  const [isScanningSearch, setIsScanningSearch] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState(false);

  // Shimmer loading animation ref
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  // React Queries
  const { data: products = [], isLoading: isLoadingProducts, refetch: refetchProducts, isFetching: isRefreshingProducts } = useQuery<any[]>({
    queryKey: ["products", searchQuery],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/products?search=${searchQuery}`);
      if (res.data.success) {
        return res.data.products || [];
      }
      throw new Error(res.data.message || "Gagal memuat barang");
    },
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/categories`);
      if (res.data.success) {
        return res.data.categories || [];
      }
      throw new Error(res.data.message || "Gagal memuat kategori");
    },
  });

  // React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
  });

  const categoryId = watch("categoryId");

  // React Query Mutations
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing) {
        return axios.put(`${API_URL}/products/${productId}`, {
          ...payload,
          hargaBeli: 0,
          hargaJual: 0,
          barcode: payload.barcode?.trim() || null,
          deskripsi: payload.deskripsi?.trim() || null,
          lokasiRak: payload.lokasiRak?.trim() || null,
        });
      } else {
        return axios.post(`${API_URL}/products`, {
          ...payload,
          hargaBeli: 0,
          hargaJual: 0,
          barcode: payload.barcode?.trim() || null,
          deskripsi: payload.deskripsi?.trim() || null,
          lokasiRak: payload.lokasiRak?.trim() || null,
        });
      }
    },
    onSuccess: (res) => {
      if (res.data.success) {
        Alert.alert("Sukses", isEditing ? "Barang berhasil diperbarui" : "Barang berhasil ditambahkan");
        setModalVisible(false);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } else {
        Alert.alert("Error", res.data.message || "Terjadi kesalahan");
      }
    },
    onError: (err: any) => {
      console.error("Gagal menyimpan barang:", err);
      const errMsg = err.response?.data?.message || "Terjadi kesalahan pada server";
      Alert.alert("Error", errMsg);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`${API_URL}/products/${id}`);
    },
    onSuccess: (res) => {
      if (res.data.success) {
        Alert.alert("Sukses", "Barang berhasil dihapus");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } else {
        Alert.alert("Error", res.data.message || "Gagal menghapus barang");
      }
    },
    onError: (err: any) => {
      console.error("Gagal menghapus barang:", err);
      const errMsg = err.response?.data?.message || "Gagal menghapus barang";
      Alert.alert("Error", errMsg);
    },
  });

  // Shimmer animation effect
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isLoadingProducts) {
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
  }, [isLoadingProducts, shimmerAnim]);

  // Handle live search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const onRefresh = () => {
    refetchProducts();
  };

  // Open Barcode Scanner for Search
  const startSearchScan = async () => {
    if (!cameraPermission) return;
    if (!cameraPermission.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert("Izin Kamera Ditolak", "Izin kamera diperlukan untuk memindai barcode.");
        return;
      }
    }
    setScannedCode(false);
    setIsScanningSearch(true);
  };

  const handleSearchBarcodeScanned = ({ data }: { data: string }) => {
    setScannedCode(true);
    setIsScanningSearch(false);
    handleSearch(data);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setProductId("");
    reset({
      kodeBarang: "",
      namaBarang: "",
      categoryId: categories[0]?.id || "",
      satuan: "pcs",
      stok: 0,
      minimumStok: 5,
      stokIdeal: 20,
      barcode: "",
      deskripsi: "",
      lokasiRak: "",
    });
    setCategoryName(categories[0]?.name || "Pilih Kategori");
    setModalVisible(true);
  };

  const openEditModal = useCallback((item: any) => {
    setIsEditing(true);
    setProductId(item.id);
    reset({
      kodeBarang: item.kodeBarang,
      namaBarang: item.namaBarang,
      categoryId: item.categoryId,
      satuan: item.satuan || "pcs",
      stok: item.stok || 0,
      minimumStok: item.minimumStok || 5,
      stokIdeal: item.stokIdeal || 20,
      barcode: item.barcode || "",
      deskripsi: item.deskripsi || "",
      lokasiRak: item.lokasiRak || item.rak || "",
    });
    setCategoryName(item.category?.name || "Pilih Kategori");
    setModalVisible(true);
  }, [reset]);

  const handleDeleteProduct = useCallback((id: string, name: string) => {
    Alert.alert(
      "Hapus Barang",
      `Apakah Anda yakin ingin menghapus barang "${name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            deleteProductMutation.mutate(id);
          },
        },
      ]
    );
  }, [deleteProductMutation]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (products.length === 0) {
      Alert.alert("Info", "Tidak ada barang untuk diexport");
      return;
    }

    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const fileDateStr = `${day}-${month}-${year}`;
      const customFileName = `Laporan Stok Barang - ${fileDateStr}.pdf`;

      const totalBarang = products.length;
      const totalStok = products.reduce((acc, p) => acc + (p.stok || 0), 0);
      const stokMenipis = products.filter(p => p.stok > 0 && p.stok <= p.minimumStok).length;
      const stokHabis = products.filter(p => p.stok === 0).length;

      const tableRows = products
        .map((p, idx) => {
          const isLow = p.stok > 0 && p.stok <= p.minimumStok;
          const isOut = p.stok === 0;
          let statusText = "Aman";
          let statusColor = "#16a34a";
          if (isOut) {
            statusText = "Habis";
            statusColor = "#ef4444";
          } else if (isLow) {
            statusText = "Menipis";
            statusColor = "#f59e0b";
          }

          return `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${p.kodeBarang}</td>
              <td>${p.namaBarang}</td>
              <td style="text-align: center; font-weight: bold; color: ${statusColor};">${p.stok}</td>
              <td style="text-align: center; font-weight: bold; color: ${statusColor};">${statusText}</td>
            </tr>
          `;
        })
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Laporan Stok Barang</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              padding: 20px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin: 0;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin-top: 5px;
            }
            .stats-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .stats-table td {
              border: none !important;
              padding: 15px 10px;
              text-align: center;
              width: 25%;
            }
            .stats-table td:not(:last-child) {
              border-right: 1px solid #cbd5e1 !important;
            }
            .stat-val {
              font-size: 18px;
              font-weight: bold;
              color: #0f172a;
            }
            .stat-label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            .data-table th, .data-table td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: left;
            }
            .data-table th {
              background-color: #2563eb;
              color: #ffffff;
              font-weight: bold;
              text-transform: uppercase;
            }
            .data-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">LAPORAN STOK BARANG</h1>
            <div class="subtitle">Dicetak pada: ${dateStr} | Sistem StockSync</div>
          </div>
          <table class="stats-table">
            <tr>
              <td>
                <div class="stat-val">${totalBarang}</div>
                <div class="stat-label">Jenis Barang</div>
              </td>
              <td>
                <div class="stat-val">${totalStok}</div>
                <div class="stat-label">Total Stok Fisik</div>
              </td>
              <td>
                <div class="stat-val" style="color: #f59e0b;">${stokMenipis}</div>
                <div class="stat-label" style="color: #f59e0b;">Stok Menipis</div>
              </td>
              <td>
                <div class="stat-val" style="color: #ef4444;">${stokHabis}</div>
                <div class="stat-label" style="color: #ef4444;">Stok Habis</div>
              </td>
            </tr>
          </table>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">No</th>
                <th style="width: 22%;">Kode</th>
                <th style="width: 46%;">Nama Barang</th>
                <th style="width: 12%; text-align: center;">Stok</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            Dokumen ini dibuat otomatis oleh Aplikasi StockSync Offline Mobile Client.
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const customUri = `${FileSystem.documentDirectory}${customFileName}`;
      await FileSystem.copyAsync({ from: uri, to: customUri });
      await Sharing.shareAsync(customUri, {
        mimeType: "application/pdf",
        dialogTitle: "Laporan Stok Barang",
        UTI: "com.adobe.pdf",
      });

    } catch (err: any) {
      console.error("Gagal export PDF:", err);
      Alert.alert("Error", "Gagal mengekspor laporan ke PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side Filtering and Sorting logic
  const getFilteredAndSortedProducts = () => {
    return products
      .filter((p) => {
        if (selectedCategoryFilter !== "all" && p.categoryId !== selectedCategoryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortType === "nama-asc") return a.namaBarang.localeCompare(b.namaBarang);
        if (sortType === "nama-desc") return b.namaBarang.localeCompare(a.namaBarang);
        if (sortType === "stok-asc") return a.stok - b.stok;
        if (sortType === "stok-desc") return b.stok - a.stok;
        if (sortType === "stok-menipis") {
          const aRatio = a.stok - a.minimumStok;
          const bRatio = b.stok - b.minimumStok;
          return aRatio - bRatio;
        }
        return 0;
      });
  };

  const processedProducts = getFilteredAndSortedProducts();

  // Stable toggle function for card selection using useCallback
  const handleToggleProduct = useCallback((id: string) => {
    setSelectedProduct((prev: any) => (prev === id ? null : id));
  }, []);

  // Render Product Item Card using memoized component
  const renderProductItem = useCallback(({ item }: { item: any }) => {
    return (
      <ProductItem
        item={item}
        isSelected={selectedProduct === item.id}
        onToggle={handleToggleProduct}
        isAdmin={isAdmin}
        onEdit={openEditModal}
        onDelete={handleDeleteProduct}
      />
    );
  }, [selectedProduct, handleToggleProduct, isAdmin, openEditModal, handleDeleteProduct]);

  return (
    <View style={styles.container}>
      {/* Search, Sort, and Barcode scan tools */}
      <View style={styles.headerRow}>
        <View style={styles.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama / kode barang..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.scanSearchBtn} onPress={startSearchScan}>
            <MaterialCommunityIcons name="barcode-scan" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModalVisible(true)}>
          <MaterialCommunityIcons name="tune" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exportBtn} 
          onPress={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <MaterialCommunityIcons name="file-pdf-box" size={22} color="#2563eb" />
          )}
        </TouchableOpacity>
      </View>

      {/* Horizontal Scrollable Category Filter Chips */}
      <View style={styles.filterChipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity
            style={[styles.chip, selectedCategoryFilter === "all" && styles.chipActive]}
            onPress={() => setSelectedCategoryFilter("all")}
          >
            <Text style={[styles.chipText, selectedCategoryFilter === "all" && styles.chipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selectedCategoryFilter === cat.id && styles.chipActive]}
              onPress={() => setSelectedCategoryFilter(cat.id)}
            >
              <Text style={[styles.chipText, selectedCategoryFilter === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoadingProducts && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.productCardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.productCardSkeleton, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.productCardSkeleton, { opacity: shimmerAnim }]} />
        </View>
      ) : (
        <FlatList
          data={processedProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={isRefreshingProducts} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Barang tidak ditemukan</Text>
              <Text style={styles.emptySubText}>Gunakan kata kunci atau filter lainnya</Text>
            </View>
          }
        />
      )}

      {/* ─── ADD/EDIT BARANG MODAL (NO PRICE) ─── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit Barang" : "Tambah Barang Baru"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
              {/* Kode Barang */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kode Barang *</Text>
                <Controller
                  control={control}
                  name="kodeBarang"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.kodeBarang && styles.inputError,
                        isEditing && styles.disabledInput
                      ]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="E.g., BRG-001"
                      placeholderTextColor="#94a3b8"
                      editable={!isEditing && !saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.kodeBarang && (
                  <Text style={styles.fieldErrorText}>{errors.kodeBarang.message}</Text>
                )}
              </View>

              {/* Nama Barang */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Barang *</Text>
                <Controller
                  control={control}
                  name="namaBarang"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.formInput, errors.namaBarang && styles.inputError]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="E.g., Bawang Merah 100gr"
                      placeholderTextColor="#94a3b8"
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.namaBarang && (
                  <Text style={styles.fieldErrorText}>{errors.namaBarang.message}</Text>
                )}
              </View>

              {/* Kategori Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field: { value } }) => (
                    <TouchableOpacity
                      style={[styles.selectTrigger, errors.categoryId && styles.inputError]}
                      onPress={() => setShowCategoryModal(true)}
                      disabled={saveProductMutation.isPending}
                    >
                      <Text style={styles.selectTriggerText}>{categoryName}</Text>
                    </TouchableOpacity>
                  )}
                />
                {errors.categoryId && (
                  <Text style={styles.fieldErrorText}>{errors.categoryId.message}</Text>
                )}
              </View>

              {/* Satuan */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Satuan *</Text>
                <Controller
                  control={control}
                  name="satuan"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.formInput, errors.satuan && styles.inputError]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="E.g., pcs, Kg, Karton"
                      placeholderTextColor="#94a3b8"
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.satuan && (
                  <Text style={styles.fieldErrorText}>{errors.satuan.message}</Text>
                )}
              </View>

              {/* Barcode */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Barcode</Text>
                <Controller
                  control={control}
                  name="barcode"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.formInput, errors.barcode && styles.inputError]}
                      onBlur={onBlur}
                      onChangeText={(val) => onChange(val || "")}
                      value={value || ""}
                      placeholder="E.g., 899123456789"
                      placeholderTextColor="#94a3b8"
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.barcode && (
                  <Text style={styles.fieldErrorText}>{errors.barcode.message}</Text>
                )}
              </View>

              {/* Lokasi Rak */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Lokasi Rak (Jika ada)</Text>
                <Controller
                  control={control}
                  name="lokasiRak"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.formInput, errors.lokasiRak && styles.inputError]}
                      onBlur={onBlur}
                      onChangeText={(val) => onChange(val || "")}
                      value={value || ""}
                      placeholder="E.g., Rak A-1"
                      placeholderTextColor="#94a3b8"
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.lokasiRak && (
                  <Text style={styles.fieldErrorText}>{errors.lokasiRak.message}</Text>
                )}
              </View>

              {/* Stok & Minimum Stok (No Price) */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Stok Awal</Text>
                  <Controller
                    control={control}
                    name="stok"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.formInput,
                          errors.stok && styles.inputError,
                          isEditing && styles.disabledInput
                        ]}
                        onBlur={onBlur}
                        onChangeText={(val) => onChange(val ? Number(val) : 0)}
                        value={String(value)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        editable={!isEditing && !saveProductMutation.isPending}
                      />
                    )}
                  />
                  {errors.stok && (
                    <Text style={styles.fieldErrorText}>{errors.stok.message}</Text>
                  )}
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Minimum Stok</Text>
                  <Controller
                    control={control}
                    name="minimumStok"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.formInput, errors.minimumStok && styles.inputError]}
                        onBlur={onBlur}
                        onChangeText={(val) => onChange(val ? Number(val) : 0)}
                        value={String(value)}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor="#94a3b8"
                        editable={!saveProductMutation.isPending}
                      />
                    )}
                  />
                  {errors.minimumStok && (
                    <Text style={styles.fieldErrorText}>{errors.minimumStok.message}</Text>
                  )}
                </View>
              </View>

              {/* Stok Ideal */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stok Ideal</Text>
                <Controller
                  control={control}
                  name="stokIdeal"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.formInput, errors.stokIdeal && styles.inputError]}
                      onBlur={onBlur}
                      onChangeText={(val) => onChange(val ? Number(val) : 0)}
                      value={String(value)}
                      keyboardType="numeric"
                      placeholder="20"
                      placeholderTextColor="#94a3b8"
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.stokIdeal && (
                  <Text style={styles.fieldErrorText}>{errors.stokIdeal.message}</Text>
                )}
              </View>

              {/* Deskripsi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Deskripsi</Text>
                <Controller
                  control={control}
                  name="deskripsi"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.deskripsi && styles.inputError,
                        { height: 80, textAlignVertical: "top" }
                      ]}
                      onBlur={onBlur}
                      onChangeText={(val) => onChange(val || "")}
                      value={value || ""}
                      placeholder="Tambahkan catatan/deskripsi barang..."
                      placeholderTextColor="#94a3b8"
                      multiline={true}
                      numberOfLines={3}
                      editable={!saveProductMutation.isPending}
                    />
                  )}
                />
                {errors.deskripsi && (
                  <Text style={styles.fieldErrorText}>{errors.deskripsi.message}</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saveProductMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit((data) => saveProductMutation.mutate(data))}
                disabled={saveProductMutation.isPending}
              >
                {saveProductMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Simpan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Urutkan MODAL ─── */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortModalContent}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Urutkan Barang</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortType("nama-asc"); setSortModalVisible(false); }}>
              <Text style={[styles.sortOptionText, sortType === "nama-asc" && styles.activeSortText]}>Nama (A - Z)</Text>
              {sortType === "nama-asc" && <MaterialCommunityIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortType("nama-desc"); setSortModalVisible(false); }}>
              <Text style={[styles.sortOptionText, sortType === "nama-desc" && styles.activeSortText]}>Nama (Z - A)</Text>
              {sortType === "nama-desc" && <MaterialCommunityIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortType("stok-asc"); setSortModalVisible(false); }}>
              <Text style={[styles.sortOptionText, sortType === "stok-asc" && styles.activeSortText]}>Stok Terendah</Text>
              {sortType === "stok-asc" && <MaterialCommunityIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortType("stok-desc"); setSortModalVisible(false); }}>
              <Text style={[styles.sortOptionText, sortType === "stok-desc" && styles.activeSortText]}>Stok Tertinggi</Text>
              {sortType === "stok-desc" && <MaterialCommunityIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortType("stok-menipis"); setSortModalVisible(false); }}>
              <Text style={[styles.sortOptionText, sortType === "stok-menipis" && styles.activeSortText]}>Prioritas Stok Menipis</Text>
              {sortType === "stok-menipis" && <MaterialCommunityIcons name="check" size={18} color="#2563eb" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── NESTED CATEGORY SELECTION MODAL ─── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.nestedOverlay}>
          <View style={styles.nestedContent}>
            <View style={styles.nestedHeader}>
              <Text style={styles.nestedTitle}>Pilih Kategori</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(cat) => cat.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categorySelectItem,
                    categoryId === item.id && styles.activeCategorySelect,
                  ]}
                  onPress={() => {
                    setValue("categoryId", item.id);
                    setCategoryName(item.name);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categorySelectText,
                      categoryId === item.id && styles.activeCategorySelectText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* ─── BARCODE CAMERA SEARCH MODAL ─── */}
      {isScanningSearch && (
        <Modal animationType="slide" transparent={false} visible={isScanningSearch}>
          <View style={styles.scannerModal}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scannedCode ? undefined : handleSearchBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "code128", "qr", "upc_a"],
              }}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scanTargetBox}>
                <View style={styles.targetCornerTL} />
                <View style={styles.targetCornerTR} />
                <View style={styles.targetCornerBL} />
                <View style={styles.targetCornerBR} />
              </View>
              <Text style={styles.scannerGuideText}>Arahkan kamera ke barcode barang</Text>
              
              <TouchableOpacity
                style={styles.closeScannerBtn}
                onPress={() => {
                  setIsScanningSearch(false);
                  setScannedCode(false);
                }}
              >
                <MaterialCommunityIcons name="close-circle" size={48} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── FLOATING ACTION BUTTON (ADMIN ONLY) ─── */}
      {isAdmin && (
        <TouchableOpacity style={styles.fabBtn} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 48,
    marginRight: 8,
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
  scanSearchBtn: {
    padding: 6,
  },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  exportBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  productCard: {
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
  productCardSkeleton: {
    height: 120,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    color: "#1e293b",
  },
  itemCode: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#64748b",
    marginTop: 2,
  },
  metaBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700",
  },
  rakBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
    marginBottom: 4,
  },
  rakBadgeText: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "700",
  },
  stockBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
  },
  badgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
  },
  badgeDanger: {
    backgroundColor: "#fee2e2",
  },
  stockVal: {
    fontSize: 20,
    fontWeight: "800",
  },
  unitVal: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
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
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  infoBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  expandedDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
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
    fontWeight: "700",
    color: "#334155",
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
    padding: 16,
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtn: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    marginRight: 6,
  },
  editBtnText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    marginLeft: 6,
  },
  deleteBtnText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: "#1e293b",
  },
  disabledInput: {
    backgroundColor: "#e2e8f0",
    color: "#64748b",
  },
  formRow: {
    flexDirection: "row",
  },
  selectTrigger: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
  selectTriggerText: {
    fontSize: 14,
    color: "#1e293b",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  cancelBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  submitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sortModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  activeSortText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  nestedOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  nestedContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  nestedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
    marginBottom: 8,
  },
  nestedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  categorySelectItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  activeCategorySelect: {
    backgroundColor: "#eff6ff",
  },
  categorySelectText: {
    fontSize: 14,
    color: "#475569",
  },
  activeCategorySelectText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scannerModal: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "transparent",
    position: "relative",
  },
  targetCornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2563eb",
  },
  targetCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2563eb",
  },
  targetCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2563eb",
  },
  targetCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2563eb",
  },
  scannerGuideText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 24,
    textAlign: "center",
  },
  closeScannerBtn: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  fieldErrorText: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
});

