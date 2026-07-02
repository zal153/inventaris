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
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useAuth, API_URL } from "../../context/AuthContext";
import { Search, Package, AlertTriangle, Info, Plus, Edit, Trash2, X, Save, FileText } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";

export default function ProductsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Form states
  const [categories, setCategories] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [kodeBarang, setKodeBarang] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [satuan, setSatuan] = useState("pcs");
  const [hargaBeli, setHargaBeli] = useState("0");
  const [hargaJual, setHargaJual] = useState("0");
  const [stok, setStok] = useState("0");
  const [minimumStok, setMinimumStok] = useState("5");
  const [stokIdeal, setStokIdeal] = useState("20");
  const [barcode, setBarcode] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

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

  const openAddModal = () => {
    setIsEditing(false);
    setProductId("");
    setKodeBarang("");
    setNamaBarang("");
    setCategoryId(categories[0]?.id || "");
    setCategoryName(categories[0]?.name || "Pilih Kategori");
    setSatuan("pcs");
    setHargaBeli("0");
    setHargaJual("0");
    setStok("0");
    setMinimumStok("5");
    setStokIdeal("20");
    setBarcode("");
    setDeskripsi("");
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setIsEditing(true);
    setProductId(item.id);
    setKodeBarang(item.kodeBarang);
    setNamaBarang(item.namaBarang);
    setCategoryId(item.categoryId);
    setCategoryName(item.category?.name || "Pilih Kategori");
    setSatuan(item.satuan || "pcs");
    setHargaBeli(String(item.hargaBeli || 0));
    setHargaJual(String(item.hargaJual || 0));
    setStok(String(item.stok || 0));
    setMinimumStok(String(item.minimumStok || 5));
    setStokIdeal(String(item.stokIdeal || 20));
    setBarcode(item.barcode || "");
    setDeskripsi(item.deskripsi || "");
    setModalVisible(true);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    Alert.alert(
      "Hapus Barang",
      `Apakah Anda yakin ingin menghapus barang "${name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.delete(`${API_URL}/products/${id}`);
              if (res.data.success) {
                Alert.alert("Sukses", "Barang berhasil dihapus");
                fetchProducts(searchQuery);
              }
            } catch (err: any) {
              console.error("Gagal menghapus barang:", err);
              const errMsg = err.response?.data?.message || "Gagal menghapus barang";
              Alert.alert("Error", errMsg);
            }
          },
        },
      ]
    );
  };

  const handleSaveProduct = async () => {
    if (!kodeBarang.trim()) {
      Alert.alert("Validasi Gagal", "Kode barang wajib diisi");
      return;
    }
    if (!namaBarang.trim()) {
      Alert.alert("Validasi Gagal", "Nama barang wajib diisi");
      return;
    }
    if (!categoryId) {
      Alert.alert("Validasi Gagal", "Kategori wajib dipilih");
      return;
    }
    if (!satuan.trim()) {
      Alert.alert("Validasi Gagal", "Satuan wajib diisi");
      return;
    }

    const payload = {
      kodeBarang: kodeBarang.trim(),
      namaBarang: namaBarang.trim(),
      categoryId,
      satuan: satuan.trim(),
      hargaBeli: Number(hargaBeli) || 0,
      hargaJual: Number(hargaJual) || 0,
      stok: Number(stok) || 0,
      minimumStok: Number(minimumStok) || 0,
      stokIdeal: Number(stokIdeal) || 0,
      barcode: barcode.trim() || null,
      deskripsi: deskripsi.trim() || null,
    };

    setIsSubmitting(true);
    try {
      let res;
      if (isEditing) {
        res = await axios.put(`${API_URL}/products/${productId}`, payload);
      } else {
        res = await axios.post(`${API_URL}/products`, payload);
      }

      if (res.data.success) {
        Alert.alert("Sukses", isEditing ? "Barang berhasil diperbarui" : "Barang berhasil ditambahkan");
        setModalVisible(false);
        fetchProducts(searchQuery);
      }
    } catch (err: any) {
      console.error("Gagal menyimpan barang:", err);
      const errMsg = err.response?.data?.message || "Terjadi kesalahan pada server";
      Alert.alert("Error", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (products.length === 0) {
      Alert.alert("Info", "Tidak ada barang untuk diexport");
      return;
    }

    setIsExporting(true);
    try {
      const dateStr = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Hitung statistik
      const totalBarang = products.length;
      const totalStok = products.reduce((acc, p) => acc + (p.stok || 0), 0);
      const stokMenipis = products.filter(p => p.stok > 0 && p.stok <= p.minimumStok).length;
      const stokHabis = products.filter(p => p.stok === 0).length;

      // Susun baris tabel HTML
      const tableRows = products
        .map((p, idx) => {
          const isLow = p.stok > 0 && p.stok <= p.minimumStok;
          const isOut = p.stok === 0;
          let statusText = "Aman";
          let statusColor = "#16a34a"; // green
          if (isOut) {
            statusText = "Habis";
            statusColor = "#ef4444"; // red
          } else if (isLow) {
            statusText = "Menipis";
            statusColor = "#d97706"; // orange
          }

          return `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${p.kodeBarang}</td>
              <td>${p.namaBarang}</td>
              <td>${p.category?.name || "Umum"}</td>
              <td style="text-align: right;">Rp ${p.hargaJual.toLocaleString("id-ID")}</td>
              <td style="text-align: center; font-weight: bold; color: ${statusColor};">${p.stok}</td>
              <td>${p.satuan}</td>
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
                <div class="stat-val" style="color: #d97706;">${stokMenipis}</div>
                <div class="stat-label" style="color: #d97706;">Stok Menipis</div>
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
                <th style="width: 5%; text-align: center;">No</th>
                <th style="width: 15%;">Kode</th>
                <th style="width: 30%;">Nama Barang</th>
                <th style="width: 15%;">Kategori</th>
                <th style="width: 12%; text-align: right;">Harga Jual</th>
                <th style="width: 8%; text-align: center;">Stok</th>
                <th style="width: 7%;">Satuan</th>
                <th style="width: 8%; text-align: center;">Status</th>
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

      // Generate PDF file
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share PDF file
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Laporan Stok Barang",
        UTI: "com.adobe.pdf",
      });

    } catch (err: any) {
      console.error("Gagal export PDF:", err);
      Alert.alert(
        "Error",
        "Gagal mengekspor laporan ke PDF: " + (err?.message || String(err))
      );
    } finally {
      setIsExporting(false);
    }
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

            {isAdmin && (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.editBtn]} 
                  onPress={() => openEditModal(item)}
                >
                  <Edit size={14} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.deleteBtn]} 
                  onPress={() => handleDeleteProduct(item.id, item.namaBarang)}
                >
                  <Trash2 size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteBtnText}>Hapus</Text>
                </TouchableOpacity>
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
      {/* Search and Export Header */}
      <View style={styles.headerRow}>
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari barang..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.exportBtn} 
          onPress={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <>
              <FileText size={18} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.exportBtnText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
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

      {/* ─── ADD/EDIT BARANG MODAL ─── */}
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
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
              {/* Kode Barang */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kode Barang *</Text>
                <TextInput
                  style={[styles.formInput, isEditing && styles.disabledInput]}
                  value={kodeBarang}
                  onChangeText={setKodeBarang}
                  placeholder="E.g., BRG-001"
                  placeholderTextColor="#94a3b8"
                  editable={!isEditing && !isSubmitting}
                />
              </View>

              {/* Nama Barang */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Barang *</Text>
                <TextInput
                  style={styles.formInput}
                  value={namaBarang}
                  onChangeText={setNamaBarang}
                  placeholder="E.g., Bawang Merah 100gr"
                  placeholderTextColor="#94a3b8"
                  editable={!isSubmitting}
                />
              </View>

              {/* Kategori Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setShowCategoryModal(true)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.selectTriggerText}>{categoryName}</Text>
                </TouchableOpacity>
              </View>

              {/* Satuan */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Satuan *</Text>
                <TextInput
                  style={styles.formInput}
                  value={satuan}
                  onChangeText={setSatuan}
                  placeholder="E.g., pcs, Kg, Karton"
                  placeholderTextColor="#94a3b8"
                  editable={!isSubmitting}
                />
              </View>

              {/* Barcode */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Barcode</Text>
                <TextInput
                  style={styles.formInput}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="E.g., 899123456789"
                  placeholderTextColor="#94a3b8"
                  editable={!isSubmitting}
                />
              </View>

              {/* Harga Beli & Harga Jual */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Harga Beli</Text>
                  <TextInput
                    style={styles.formInput}
                    value={hargaBeli}
                    onChangeText={setHargaBeli}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    editable={!isSubmitting}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Harga Jual</Text>
                  <TextInput
                    style={styles.formInput}
                    value={hargaJual}
                    onChangeText={setHargaJual}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Stok & Minimum Stok */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Stok Awal</Text>
                  <TextInput
                    style={[styles.formInput, isEditing && styles.disabledInput]}
                    value={stok}
                    onChangeText={setStok}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    editable={!isEditing && !isSubmitting}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Minimum Stok</Text>
                  <TextInput
                    style={styles.formInput}
                    value={minimumStok}
                    onChangeText={setMinimumStok}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#94a3b8"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Stok Ideal */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stok Ideal</Text>
                <TextInput
                  style={styles.formInput}
                  value={stokIdeal}
                  onChangeText={setStokIdeal}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor="#94a3b8"
                  editable={!isSubmitting}
                />
              </View>

              {/* Deskripsi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Deskripsi</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, textAlignVertical: "top" }]}
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                  placeholder="Tambahkan catatan/deskripsi barang..."
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                  numberOfLines={3}
                  editable={!isSubmitting}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveProduct}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Simpan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                <X size={20} color="#64748b" />
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
                    setCategoryId(item.id);
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

      {/* ─── FLOATING ACTION BUTTON (ADMIN ONLY) ─── */}
      {isAdmin && (
        <TouchableOpacity style={styles.fabBtn} onPress={openAddModal}>
          <Plus size={24} color="#fff" />
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 8,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exportBtnText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
    color: "#0f172a",
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#0f172a",
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  selectTriggerText: {
    fontSize: 14,
    color: "#0f172a",
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
    height: 44,
    borderRadius: 10,
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
    height: 44,
    backgroundColor: "#2563eb",
    borderRadius: 10,
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
    color: "#0f172a",
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
});
