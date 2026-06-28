import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import { useApp } from '@/lib/app-context';
import { AI_MODELS, COLORS, ModelId } from '@/constants/salviax';

const SIDEBAR_WIDTH = 260;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SidebarProps {
  slideAnim: Animated.Value;
}

const Sidebar = memo(({ slideAnim }: SidebarProps) => {
  const { state, dispatch, createNewConversation, updateSettings } = useApp();
  const { settings, conversations, currentConversationId } = state;

  const handleModelSelect = useCallback((modelId: ModelId) => {
    updateSettings({ selectedModel: modelId });
  }, [updateSettings]);

  const handleConversationSelect = useCallback((id: string) => {
    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: id });
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, [dispatch]);

  const handleNewChat = useCallback(() => {
    createNewConversation();
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, [createNewConversation, dispatch]);

  return (
    <Animated.View style={[
      styles.container,
      { transform: [{ translateX: slideAnim }] },
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>SalviaX</Text>
        <Pressable
          onPress={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* New Chat Button */}
      <Pressable
        onPress={handleNewChat}
        style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.newChatText}>+ گفتگوی جدید</Text>
      </Pressable>

      {/* Model Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>مدل هوش مصنوعی</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.modelList}>
          {AI_MODELS.map(model => (
            <Pressable
              key={model.id}
              onPress={() => handleModelSelect(model.id as ModelId)}
              style={({ pressed }) => [
                styles.modelItem,
                settings.selectedModel === model.id && styles.modelItemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.modelIcon}>{model.icon}</Text>
              <Text style={[
                styles.modelLabel,
                settings.selectedModel === model.id && styles.modelLabelActive,
              ]}>
                {model.label}
              </Text>
              {settings.selectedModel === model.id && (
                <View style={styles.modelCheck}>
                  <Text style={styles.modelCheckText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Conversation History */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>تاریخچه</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {conversations.slice(0, 20).map(conv => (
            <Pressable
              key={conv.id}
              onPress={() => handleConversationSelect(conv.id)}
              style={({ pressed }) => [
                styles.convItem,
                currentConversationId === conv.id && styles.convItemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.convTitle} numberOfLines={1}>
                {conv.title}
              </Text>
            </Pressable>
          ))}
          {conversations.length === 0 && (
            <Text style={styles.emptyText}>هنوز گفتگویی وجود ندارد</Text>
          )}
        </ScrollView>
      </View>

      {/* Settings Button */}
      <Pressable
        onPress={() => {
          dispatch({ type: 'TOGGLE_SIDEBAR' });
          dispatch({ type: 'TOGGLE_SETTINGS' });
        }}
        style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.settingsBtnText}>⚙️ تنظیمات</Text>
      </Pressable>
    </Animated.View>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.sidebar,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    zIndex: 100,
    paddingTop: 48,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    color: COLORS.violet,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: COLORS.muted,
    fontSize: 16,
  },
  newChatBtn: {
    margin: 12,
    backgroundColor: COLORS.violetDim,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  newChatText: {
    color: COLORS.violet,
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 12,
    maxHeight: 240,
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modelList: {
    maxHeight: 180,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
    gap: 8,
  },
  modelItemActive: {
    backgroundColor: COLORS.violetDim,
  },
  modelIcon: {
    fontSize: 16,
  },
  modelLabel: {
    color: COLORS.muted,
    fontSize: 13,
    flex: 1,
  },
  modelLabelActive: {
    color: COLORS.text,
    fontWeight: '500',
  },
  modelCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCheckText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  convItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  convItemActive: {
    backgroundColor: COLORS.violetDim,
  },
  convTitle: {
    color: COLORS.muted,
    fontSize: 13,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
    opacity: 0.6,
  },
  settingsBtn: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  settingsBtnText: {
    color: COLORS.muted,
    fontSize: 14,
  },
});
