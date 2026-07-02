import { Tabs } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ name, focused }: { name: keyof typeof MaterialCommunityIcons.glyphMap; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          backgroundColor: focused ? '#dbeafe' : 'transparent', // Blue 100 pill background
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 2,
        }}
      >
        <MaterialCommunityIcons
          name={name}
          size={22}
          color={focused ? '#2563eb' : '#64748b'}
        />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const activeColor = '#2563eb'; // Blue 600
  const inactiveColor = colorScheme === 'dark' ? '#94a3b8' : '#64748b';

  // Calculate dynamic heights
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: true,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: colorScheme === 'dark' ? '#ffffff' : '#1e293b',
        },
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
          height: tabHeight,
          paddingBottom: bottomPadding - 2,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: 'below-icon',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'StockSync Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'view-dashboard' : 'view-dashboard-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Stok Barang',
          headerTitle: 'Daftar Stok Gudang',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'package-variant' : 'package-variant-closed'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Catat Mutasi',
          headerTitle: 'Catat Keluar / Masuk',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'swap-vertical-bold' : 'swap-vertical'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          headerTitle: 'Riwayat Transaksi',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'history' : 'history'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
