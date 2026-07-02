import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { LayoutDashboard, Package, ArrowUpDown, History } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#2563eb'; // Blue 600
  const inactiveColor = colorScheme === 'dark' ? '#94a3b8' : '#64748b';

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
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
