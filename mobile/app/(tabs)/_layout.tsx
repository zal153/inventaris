import { Tabs } from 'expo-router';
import React from 'react';
import { LayoutDashboard, Package, ArrowUpDown, History } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const activeColor = '#2563eb'; // Blue 600
  const inactiveColor = colorScheme === 'dark' ? '#94a3b8' : '#64748b';

  // Hitung tinggi dan padding bawah secara dinamis berdasarkan safe area inset
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 52 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: true,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: colorScheme === 'dark' ? '#ffffff' : '#0f172a',
        },
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: 'below-icon',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'StockSync Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Stok Barang',
          headerTitle: 'Daftar Stok Gudang',
          tabBarIcon: ({ color }) => <Package size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Catat Mutasi',
          headerTitle: 'Catat Keluar / Masuk',
          tabBarIcon: ({ color }) => <ArrowUpDown size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          headerTitle: 'Riwayat Transaksi',
          tabBarIcon: ({ color }) => <History size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
