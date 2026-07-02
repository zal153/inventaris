import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Camera,
  Search,
  Package,
  Calendar,
  AlertTriangle,
  ChevronDown,
  X,
} from "lucide-react-native";
import axios from "axios";

type TransType = "in" | "out";

export default function TransactionsScreen() {
  const [transType, setTransType] = useState<TransType>("in");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form states
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [jumlah, setJumlah] = useState("");
  const [hargaBeli, setHargaBeli] = useState(""); // Hanya untuk Masuk
  const [tujuan, setTujuan] = useState(""); // Hanya untuk Keluar
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barcode scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Search product modal states
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load products list on mount
  useEffect(() => {
    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const res = await axios.get(`${API_URL}/products`);
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      } catch (err) {
        console.error("Gagal mengambil data barang:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Filter products based on search in modal
  const filteredProducts = products.filter(
    (p) =>
      p.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle barcode scanned from camera
  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setIsScanning(false);
    setIsLoadingProducts(true);

    try {
      // Cari produk di API berdasarkan barcode yang dipindai
      const res = await axios.get(`${API_URL}/products/${data}`);
      if (res.data.success && res.data.product) {
        const prod = res.data.product;
        setSelectedProduct(prod);
        // Pre-fill hargaBeli jika tipe transaksi adalah Barang Masuk
        if (transType === "in") {
          setHargaBeli(prod.hargaBeli.toString());
        }
        Alert.alert("Barang Ditemukan", `${prod.namaBarang} (${prod.kodeBarang}) berhasil dipilih.`);
      } else {
        Alert.alert("Barang Tidak Ditemukan", `Kode Barcode "${data}" tidak terdaftar di sistem.`);
      }
    } catch (err: any) {
      console.error("Lookup barcode failed:", err);
      const msg = err.response?.data?.message || "Koneksi ke server gagal.";
      Alert.alert("Error", `Pencarian barcode gagal: ${msg}`);
    } finally {
      setIsLoadingProducts(false);
      setScanned(false);
    }
  };

  const startScan = async () => {
    if (!permission) {
      // Permission is still loading
      return;
    }
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Izin Kamera Ditolak", "Izin kamera diperlukan untuk melakukan pemindaian barcode.");
        return;
      }
    }
    setIsScanning(true);
  };

  const handleSelectProduct = (prod: any) => {
    setSelectedProduct(prod);
    if (transType === "in") {
      setHargaBeli(prod.hargaBeli.toString());
    }
    setIsSearchModalVisible(false);
    setSearchQuery("");
  };

  // Submit Transaction Handler
  const handleSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert("Error", "Silakan pilih barang terlebih dahulu.");
      return;
    }
    const qty = Number(jumlah);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Error", "Jumlah barang keluar/masuk harus minimal 1.");
      return;
    }

    if (transType === "out") {
      if (!tujuan) {
        Alert.alert("Error", "Silakan pilih tujuan pengeluaran.");
        return;
      }
      if (selectedProduct.stok < qty) {
        Alert.alert("Stok Tidak Cukup", `Stok saat ini hanya tersedia ${selectedProduct.stok} ${selectedProduct.satuan}.`);
        return;
      }
    } else {
      const price = Number(hargaBeli);
      if (isNaN(price) || price < 0) {
        Alert.alert("Error", "Harga beli tidak valid.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let endpoint = `${API_URL}/transactions/stock-in`;
      let payload: any = {
        productId: selectedProduct.id,
        jumlah: qty,
        tanggal: new Date().toISOString(),
        catatan,
      };

      if (transType === "in") {
        payload.hargaBeli = Number(hargaBeli);
      } else {
        endpoint = `${API_URL}/transactions/stock-out`;
        payload.tujuan = tujuan;
      }

      const res = await axios.post(endpoint, payload);

      if (res.data.success) {
        Alert.alert("Berhasil", res.data.message || "Transaksi berhasil dicatat!");
        
        // Reset form
        setSelectedProduct(null);
        setJumlah("");
        setHargaBeli("");
        setTujuan("");
        setCatatan("");
        
        // Refresh products list in background to update stock count
        const refreshRes = await axios.get(`${API_URL}/products`);
        if (refreshRes.data.success) {
          setProducts(refreshRes.data.products || []);
        }
      } else {
        Alert.alert("Gagal", res.data.message || "Gagal mencatat transaksi.");
      }
    } catch (err: any) {
      console.error("Submit transaction error:", err);
      const msg = err.response?.data?.message || "Terjadi kesalahan koneksi.";
      Alert.alert("Gagal mencatat transaksi", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Transaction Type Segment Controller */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, transType === "in" && styles.segmentBtnActive]}
          onPress={() => {
            setTransType("in");
            setSelectedProduct(null);
            setJumlah("");
            setCatatan("");
          }}
        >
          <ArrowDownCircle size={18} color={transType === "in" ? "#2563eb" : "#64748b"} />
          <Text style={[styles.segmentBtnText, transType === "in" && styles.segmentBtnTextActive]}>
            Barang Masuk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, transType === "out" && styles.segmentBtnActive]}
          onPress={() => {
            setTransType("out");
            setSelectedProduct(null);
            setJumlah("");
            setCatatan("");
          }}
        >
          <ArrowUpCircle size={18} color={transType === "out" ? "#ef4444" : "#64748b"} />
          <Text style={[styles.segmentBtnText, transType === "out" && styles.segmentBtnTextActive]}>
            Barang Keluar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          {/* Barcode Scanner Trigger */}
          <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
            <Camera size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.scanBtnText}>Scan Barcode Barang</Text>
          </TouchableOpacity>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>atau cari manual</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Product Select Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pilih Barang *</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setIsSearchModalVisible(true)}
            >
              <Text style={selectedProduct ? styles.selectedProdText : styles.placeholderText}>
                {selectedProduct
                  ? `${selectedProduct.namaBarang} (${selectedProduct.kodeBarang})`
                  : "Cari & pilih barang..."}
              </Text>
              <ChevronDown size={18} color="#64748b" />
            </TouchableOpacity>

            {selectedProduct && (
              <Text style={styles.helperText}>
                Stok saat ini:{" "}
                <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                  {selectedProduct.stok} {selectedProduct.satuan}
                </Text>
              </Text>
            )}
          </View>

          {/* Quantity Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Jumlah Barang *</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              placeholder="E.g., 10"
              placeholderTextColor="#94a3b8"
              value={jumlah}
              onChangeText={setJumlah}
            />
          </View>

          {/* Conditional Input: Purchase Price (Only for Inbound) */}
          {transType === "in" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Harga Beli Satuan (Rp) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="E.g., 5000"
                placeholderTextColor="#94a3b8"
                value={hargaBeli}
                onChangeText={setHargaBeli}
              />
            </View>
          )}

          {/* Conditional Input: Destination (Only for Outbound) */}
          {transType === "out" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tujuan Pengeluaran *</Text>
              <View style={styles.selectWrapper}>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => {
                    Alert.alert(
                      "Pilih Tujuan",
                      "Silakan tentukan tujuan pengeluaran:",
                      [
                        { text: "Penjualan / Toko", onPress: () => setTujuan("Penjualan") },
                        { text: "Retur Barang", onPress: () => setTujuan("Retur") },
                        { text: "Barang Rusak / Kadaluarsa", onPress: () => setTujuan("Rusak") },
                        { text: "Kebutuhan Internal Gudang", onPress: () => setTujuan("Kebutuhan Internal") },
                        { text: "Lain-lain", onPress: () => setTujuan("Lain-lain") },
                      ]
                    );
                  }}
                >
                  <Text style={tujuan ? styles.selectedProdText : styles.placeholderText}>
                    {tujuan || "Pilih tujuan..."}
                  </Text>
                  <ChevronDown size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Catatan / Keterangan</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Tambahkan keterangan transaksi..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={catatan}
              onChangeText={setCatatan}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              transType === "out" ? styles.submitBtnOut : styles.submitBtnIn,
              isSubmitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {transType === "in" ? "Catat Barang Masuk" : "Catat Barang Keluar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- MODAL CAMERA SCANNER --- */}
      {isScanning && (
        <Modal animationType="slide" transparent={false} visible={isScanning}>
          <View style={styles.scannerModal}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "code128", "qr", "upc_a"],
              }}
            />
            {/* Scanner Target Guide Overlay */}
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
                  setIsScanning(false);
                  setScanned(false);
                }}
              >
                <X size={20} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4 }}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* --- MODAL MANUAL SEARCH --- */}
      <Modal animationType="slide" transparent={true} visible={isSearchModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cari Barang</Text>
              <TouchableOpacity onPress={() => setIsSearchModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Ketik nama atau kode barang..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {isLoadingProducts ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchItem}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <Package size={20} color="#2563eb" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchItemName}>{item.namaBarang}</Text>
                      <Text style={styles.searchItemSub}>
                        {item.kodeBarang} | Stok: {item.stok} {item.satuan}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                ListEmptyComponent={
                  <Text style={styles.emptySearchText}>Barang tidak ditemukan</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginHorizontal: 4,
  },
  segmentBtnActive: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  segmentBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentBtnTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  scanBtn: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  scanBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  orText: {
    marginHorizontal: 12,
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    height: 44,
  },
  placeholderText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 14,
  },
  selectedProdText: {
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
    height: 44,
  },
  selectWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    height: 44,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  submitBtn: {
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnIn: {
    backgroundColor: "#16a34a",
  },
  submitBtnOut: {
    backgroundColor: "#ef4444",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  scannerModal: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
    position: "relative",
  },
  targetCornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#3b82f6",
  },
  targetCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#3b82f6",
  },
  targetCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#3b82f6",
  },
  targetCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#3b82f6",
  },
  scannerGuideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeScannerBtn: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    height: 40,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    height: "100%",
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  searchItemSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  emptySearchText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    marginTop: 32,
  },
});
