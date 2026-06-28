import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/salviax';

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────
function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'ios' ? insets.bottom : 8;

  const TABS = [
    { name: 'index',          icon: '💬', label: 'چت' },
    { name: 'image-generate', icon: '🎨', label: 'تولید تصویر' },
    { name: 'image-edit',     icon: '✏️', label: 'ویرایش تصویر' },
  ];

  return (
    <View style={[tabStyles.container, { paddingBottom: bottomPad }]}>
      {TABS.map((tab, index) => {
        const route = state.routes[index];
        if (!route) return null;
        const isFocused = state.index === index;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={({ pressed }) => [
              tabStyles.tab,
              isFocused && tabStyles.tabActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={tabStyles.icon}>{tab.icon}</Text>
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
              {tab.label}
            </Text>
            {isFocused && <View style={tabStyles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.sidebar,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    gap: 3,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: COLORS.violetDim,
  },
  icon: { fontSize: 20 },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: '500' },
  labelActive: { color: COLORS.violet, fontWeight: '700' },
  dot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.violet,
  },
});

// ─── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'چت' }} />
      <Tabs.Screen name="image-generate" options={{ title: 'تولید تصویر' }} />
      <Tabs.Screen name="image-edit" options={{ title: 'ویرایش تصویر' }} />
    </Tabs>
  );
}
