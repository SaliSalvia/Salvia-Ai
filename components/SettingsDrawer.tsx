import React, { memo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Animated, Dimensions, Modal,
} from 'react-native';
import { useApp } from '@/lib/app-context';
import { COLORS } from '@/constants/salviax';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ApiKeyFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}

const ApiKeyField = memo(({ label, value, placeholder, onChangeText }: ApiKeyFieldProps) => {
  const [visible, setVisible] = useState(false);
  const hasValue = value.length > 0;

  return (
    <View style={fieldStyles.container}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {hasValue && (
          <View style={fieldStyles.badge}>
            <Text style={fieldStyles.badgeText}>✓ فعال</Text>
          </View>
        )}
      </View>
      <View style={fieldStyles.inputRow}>
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setVisible(v => !v)}
          style={({ pressed }) => [fieldStyles.eyeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={fieldStyles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
        </Pressable>
      </View>
      {hasValue && (
        <View style={fieldStyles.progressBar}>
          <View style={[fieldStyles.progressFill, { width: '100%' }]} />
        </View>
      )}
    </View>
  );
});

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  badge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#22c55e', fontSize: 10, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 10,
    fontFamily: 'monospace',
  },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 16 },
  progressBar: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 1,
  },
});

// ─── Main SettingsDrawer ───────────────────────────────────────────────────────
const SettingsDrawer = memo(() => {
  const { state, dispatch, updateSettings } = useApp();
  const { isSettingsOpen, settings } = state;

  const handleClose = useCallback(() => {
    dispatch({ type: 'TOGGLE_SETTINGS' });
  }, [dispatch]);

  const handleSave = useCallback(async (key: string, value: string) => {
    await updateSettings({ [key]: value } as any);
  }, [updateSettings]);

  return (
    <Modal
      visible={isSettingsOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ تنظیمات</Text>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>زبان رابط کاربری</Text>
              <View style={styles.langToggle}>
                <Pressable
                  onPress={() => updateSettings({ language: 'fa' })}
                  style={[styles.langBtn, settings.language === 'fa' && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, settings.language === 'fa' && styles.langBtnTextActive]}>
                    فارسی
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updateSettings({ language: 'en' })}
                  style={[styles.langBtn, settings.language === 'en' && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, settings.language === 'en' && styles.langBtnTextActive]}>
                    English
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* API Keys */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>کلیدهای API شخصی</Text>
              <Text style={styles.sectionDesc}>
                برای استفاده از مدل‌های پیشرفته‌تر، کلید API خود را وارد کنید.
              </Text>

              <ApiKeyField
                label="Groq API Key"
                value={settings.groqApiKey}
                placeholder="gsk_..."
                onChangeText={v => handleSave('groqApiKey', v)}
              />
              <ApiKeyField
                label="OpenRouter API Key"
                value={settings.openrouterApiKey}
                placeholder="sk-or-..."
                onChangeText={v => handleSave('openrouterApiKey', v)}
              />
              <ApiKeyField
                label="Stability AI API Key"
                value={settings.stabilityApiKey}
                placeholder="sk-..."
                onChangeText={v => handleSave('stabilityApiKey', v)}
              />
              <ApiKeyField
                label="Google AI Studio API Key"
                value={settings.googleAiApiKey}
                placeholder="AIza..."
                onChangeText={v => handleSave('googleAiApiKey', v)}
              />
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>درباره</Text>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>SalviaX AI</Text>
                <Text style={styles.aboutVersion}>نسخه ۱.۰.۰</Text>
                <Text style={styles.aboutDesc}>
                  دستیار هوش مصنوعی قدرتمند با پشتیبانی از GPT-4o، Claude، Gemini و DeepSeek
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

SettingsDrawer.displayName = 'SettingsDrawer';
export default SettingsDrawer;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  drawer: {
    backgroundColor: COLORS.sidebar,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: COLORS.muted, fontSize: 18 },
  content: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionDesc: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    gap: 3,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: COLORS.violet,
  },
  langBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  langBtnTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  aboutCard: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  aboutTitle: {
    color: COLORS.violet,
    fontSize: 18,
    fontWeight: '700',
  },
  aboutVersion: {
    color: COLORS.muted,
    fontSize: 12,
  },
  aboutDesc: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
