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
  Platform,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type TransType = "in" | "out";

export default function TransactionsScreen() {
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [transType, setTransType] = useState<TransType>("in");

  // Scan status feedback inline
  const [scanStatus, setScanStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Barcode scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Search product modal states
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // React Queries
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/products`);
      if (res.data.success) {
        return res.data.products || [];
      }
      throw new Error(res.data.message || "Gagal memuat data barang");
    },
  });

  // Watch product matching to run dynamic validations
  const getProductById = (id: string) => products.find((p) => p.id === id) || null;

  // Zod schema with dynamic refinement
  const transactionFormSchema = z.object({
    productId: z.string().min(1, "Barang wajib dipilih"),
    jumlah: z.number({ message: "Jumlah barang harus berupa angka!" })
      .refine((val) => !isNaN(val), "Jumlah barang harus berupa angka!")
      .refine((val) => val >= 1, "Jumlah harus minimal 1!"),
    catatan: z.string().optional(),
  }).refine(
    (data) => {
      const selectedProduct = getProductById(data.productId);
      if (transType === "out" && selectedProduct) {
        return data.jumlah <= selectedProduct.stok;
      }
      return true;
    },
    {
      message: "Stok tidak cukup untuk barang keluar!",
      path: ["jumlah"],
    }
  );

  type TransactionFormData = z.infer<typeof transactionFormSchema>;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      productId: "",
      jumlah: undefined,
      catatan: "",
    },
  });

  const productId = watch("productId");
  const selectedProduct = getProductById(productId);

  // React Query Mutations
  const transactionMutation = useMutation({
    mutationFn: async (data: any) => {
      let endpoint = `${API_URL}/transactions/stock-in`;
      let payload: any = {
        productId: data.productId,
        jumlah: data.jumlah,
        tanggal: new Date().toISOString(),
        catatan: data.catatan,
      };

      if (transType === "in") {
        payload.hargaBeli = 0;
      } else {
        endpoint = `${API_URL}/transactions/stock-out`;
        payload.tujuan = "Mutasi Keluar Internal";
      }

      return axios.post(endpoint, payload);
    },
    onSuccess: (res) => {
      if (res.data.success) {
        Alert.alert("Berhasil", res.data.message || "Transaksi berhasil dicatat!");
        reset({
          productId: "",
          jumlah: undefined,
          catatan: "",
        });
        setScanStatus(null);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["transactionsHistory"] });
      } else {
        Alert.alert("Gagal", res.data.message || "Gagal mencatat transaksi.");
      }
    },
    onError: (err: any) => {
      console.error("Submit transaction error:", err);
      const msg = err.response?.data?.message || "Terjadi kesalahan koneksi.";
      Alert.alert("Gagal mencatat transaksi", msg);
    },
  });

  // Listen to router params for Quick Action triggers
  useEffect(() => {
    if (params.type === "in" || params.type === "out") {
      setTransType(params.type as TransType);
      reset({
        productId: "",
        jumlah: undefined,
        catatan: "",
      });
      setScanStatus(null);
    }
    if (params.scan === "true") {
      startScan();
    }
  }, [params, reset]);

  // Filter products based on search in modal
  const filteredProducts = products.filter(
    (p) =>
      p.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle barcode scanned from camera
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setIsScanning(false);
    setScanStatus(null);

    try {
      const res = await axios.get(`${API_URL}/products/${data}`);
      if (res.data.success && res.data.product) {
        const prod = res.data.product;
        setValue("productId", prod.id);
        setScanStatus({
          success: true,
          message: `✓ Barang ditemukan: ${prod.namaBarang}`,
        });
      } else {
        setValue("productId", "");
        setScanStatus({
          success: false,
          message: `✗ Barcode "${data}" tidak terdaftar di sistem!`,
        });
      }
    } catch (err: any) {
      console.error("Lookup barcode failed:", err);
      const msg = err.response?.data?.message || "Koneksi ke server gagal.";
      setScanStatus({
        success: false,
        message: `✗ Pencarian gagal: ${msg}`,
      });
    } finally {
      setScanned(false);
    }
  };

  const startScan = async () => {
    if (!permission) return;
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
    setValue("productId", prod.id);
    setScanStatus({
      success: true,
      message: `✓ Barang dipilih: ${prod.namaBarang}`,
    });
    setIsSearchModalVisible(false);
    setSearchQuery("");
  };

  return (
    <View style={styles.container}>
      {/* Transaction Type Segment Controller */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, transType === "in" && styles.segmentBtnActive]}
          onPress={() => {
            setTransType("in");
            reset({
              productId: "",
              jumlah: undefined,
              catatan: "",
            });
            setScanStatus(null);
          }}
        >
          <MaterialCommunityIcons 
            name="arrow-down-bold-circle-outline" 
            size={20} 
            color={transType === "in" ? "#2563eb" : "#64748b"} 
          />
          <Text style={[styles.segmentBtnText, transType === "in" && styles.segmentBtnTextActive]}>
            Barang Masuk
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.segmentBtn, transType === "out" && styles.segmentBtnActiveOut]}
          onPress={() => {
            setTransType("out");
            reset({
              productId: "",
              jumlah: undefined,
              catatan: "",
            });
            setScanStatus(null);
          }}
        >
          <MaterialCommunityIcons 
            name="arrow-up-bold-circle-outline" 
            size={20} 
            color={transType === "out" ? "#ef4444" : "#64748b"} 
          />
          <Text style={[styles.segmentBtnText, transType === "out" && styles.segmentBtnTextActiveOut]}>
            Barang Keluar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          {/* Barcode Scanner Trigger */}
          <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
            <MaterialCommunityIcons name="barcode-scan" size={20} color="#ffffff" style={{ marginRight: 8 }} />
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
              style={[styles.dropdownSelector, errors.productId && styles.textInputError]}
              onPress={() => setIsSearchModalVisible(true)}
            >
              <Text style={selectedProduct ? styles.selectedProdText : styles.placeholderText}>
                {selectedProduct
                  ? `${selectedProduct.namaBarang} (${selectedProduct.kodeBarang})`
                  : "Cari & pilih barang..."}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            {errors.productId && (
              <Text style={styles.validationErrorText}>{errors.productId.message}</Text>
            )}

            {/* Scan Status Inline Feedback */}
            {scanStatus && (
              <View style={[
                styles.scanFeedbackCard,
                scanStatus.success ? styles.scanFeedbackSuccess : styles.scanFeedbackError
              ]}>
                <MaterialCommunityIcons 
                  name={scanStatus.success ? "check-circle" : "alert-circle"} 
                  size={16} 
                  color={scanStatus.success ? "#16a34a" : "#ef4444"} 
                  style={{ marginRight: 6 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.scanFeedbackText,
                    scanStatus.success ? styles.textSuccess : styles.textDanger
                  ]}>
                    {scanStatus.message}
                  </Text>
                  {scanStatus.success && selectedProduct && (
                    <Text style={styles.scanFeedbackSubtext}>
                      Stok saat ini: {selectedProduct.stok} {selectedProduct.satuan}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Quantity Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Jumlah Barang *</Text>
            <Controller
              control={control}
              name="jumlah"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.textInput,
                    errors.jumlah && styles.textInputError
                  ]}
                  keyboardType="numeric"
                  placeholder="E.g., 10"
                  placeholderTextColor="#94a3b8"
                  onBlur={onBlur}
                  onChangeText={(val) => onChange(val ? Number(val) : undefined)}
                  value={value !== undefined ? String(value) : ""}
                  editable={!transactionMutation.isPending}
                />
              )}
            />
            {errors.jumlah && (
              <Text style={styles.validationErrorText}>{errors.jumlah.message}</Text>
            )}
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Catatan / Keterangan</Text>
            <Controller
              control={control}
              name="catatan"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Tambahkan keterangan transaksi..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!transactionMutation.isPending}
                />
              )}
            />
          </View>

          {/* Submit Button with Loading states */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              transType === "out" ? styles.submitBtnOut : styles.submitBtnIn,
              transactionMutation.isPending && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit((data) => transactionMutation.mutate(data))}
            disabled={transactionMutation.isPending}
          >
            {transactionMutation.isPending ? (
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
                <MaterialCommunityIcons name="close" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Batal</Text>
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
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={{ marginRight: 8 }} />
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
                    <MaterialCommunityIcons name="package-variant-closed" size={22} color="#2563eb" style={{ marginRight: 12 }} />
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
    borderBottomColor: "#f1f5f9",
    padding: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginHorizontal: 4,
  },
  segmentBtnActive: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  segmentBtnActiveOut: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
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
  segmentBtnTextActiveOut: {
    color: "#ef4444",
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  scanBtn: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
    backgroundColor: "#e2e8f0",
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
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    height: 48,
  },
  placeholderText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 14,
  },
  selectedProdText: {
    flex: 1,
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "600",
  },
  scanFeedbackCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  scanFeedbackSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  scanFeedbackError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  scanFeedbackText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scanFeedbackSubtext: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1e293b",
    height: 48,
  },
  textInputError: {
    borderColor: "#fecaca",
    backgroundColor: "#fff8f8",
  },
  validationErrorText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  submitBtn: {
    borderRadius: 12,
    height: 48,
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
    opacity: 0.4,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
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
    borderColor: "#2563eb",
  },
  targetCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2563eb",
  },
  targetCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#2563eb",
  },
  targetCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#2563eb",
  },
  scannerGuideText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
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
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
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
    color: "#1e293b",
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
  textSuccess: {
    color: "#16a34a",
  },
  textDanger: {
    color: "#ef4444",
  },
});
