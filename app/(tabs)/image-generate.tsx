import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Image, ActivityIndicator, Alert,
  Dimensions, FlatList,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useApp } from '@/lib/app-context';
import { COLORS } from '@/constants/salviax';

const { width: W } = Dimensions.get('window');
const IMG_SIZE = (W - 48) / 2;

// ─── Style Presets ─────────────────────────────────────────────────────────────
const STYLE_PRESETS = [
  { id: 'none',        label: 'بدون استایل', en: '',                         icon: '✨' },
  { id: 'realistic',  label: 'واقع‌گرایانه', en: 'photorealistic, 8k, detailed', icon: '📷' },
  { id: 'anime',      label: 'انیمه',        en: 'anime style, vibrant colors',  icon: '🎌' },
  { id: 'oil',        label: 'نقاشی رنگ‌روغن', en: 'oil painting, artistic',     icon: '🎨' },
  { id: 'cinematic',  label: 'سینمایی',      en: 'cinematic, dramatic lighting', icon: '🎬' },
  { id: 'watercolor', label: 'آبرنگ',        en: 'watercolor painting, soft',    icon: '💧' },
  { id: 'pixel',      label: 'پیکسل آرت',   en: 'pixel art, retro game style',  icon: '👾' },
  { id: 'sketch',     label: 'طراحی',        en: 'pencil sketch, black and white', icon: '✏️' },
] as const;

const SIZE_OPTIONS = [
  { id: '512', label: '512×512', w: 512, h: 512 },
  { id: '768', label: '768×768', w: 768, h: 768 },
  { id: '1024', label: '1024×1024', w: 1024, h: 1024 },
] as const;

// ─── Puter Image Gen HTML ──────────────────────────────────────────────────────
function buildPuterImageHTML(prompt: string): string {
  return `<!DOCTYPE html><html><head><script src="https://js.puter.com/v2/"></script></head><body><script>
(async()=>{
  try {
    const r = await puter.ai.txt2img(${JSON.stringify(prompt)});
    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      canvas.width=img.width; canvas.height=img.height;
      canvas.getContext('2d').drawImage(img,0,0);
      const b64 = canvas.toDataURL('image/png');
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'image',data:b64}));
    };
    img.onerror=()=>{ window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:'Failed to load image'})); };
    if(r && r.blob){ const url=URL.createObjectURL(r.blob); img.src=url; }
    else if(typeof r==='string'){ img.src=r; }
    else { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:'No image returned'})); }
  } catch(e){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:e.message||String(e)})); }
})();
</script></body></html>`;
}

// ─── Generated Image Item ──────────────────────────────────────────────────────
interface GenImage { id: string; uri: string; prompt: string; timestamp: number; }

const GenImageItem = React.memo(({ item, onShare, onSave }: {
  item: GenImage;
  onShare: (uri: string) => void;
  onSave: (uri: string) => void;
}) => (
  <View style={galleryStyles.item}>
    <Image source={{ uri: item.uri }} style={galleryStyles.img} resizeMode="cover" />
    <View style={galleryStyles.overlay}>
      <Text style={galleryStyles.prompt} numberOfLines={2}>{item.prompt}</Text>
      <View style={galleryStyles.actions}>
        <Pressable onPress={() => onSave(item.uri)} style={({ pressed }) => [galleryStyles.btn, pressed && { opacity: 0.6 }]}>
          <Text style={galleryStyles.btnText}>💾</Text>
        </Pressable>
        <Pressable onPress={() => onShare(item.uri)} style={({ pressed }) => [galleryStyles.btn, pressed && { opacity: 0.6 }]}>
          <Text style={galleryStyles.btnText}>📤</Text>
        </Pressable>
      </View>
    </View>
  </View>
));

const galleryStyles = StyleSheet.create({
  item: { width: IMG_SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface2 },
  img: { width: IMG_SIZE, height: IMG_SIZE },
  overlay: { padding: 8, backgroundColor: 'rgba(7,7,26,0.85)' },
  prompt: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  btn: { padding: 4 },
  btnText: { fontSize: 16 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ImageGenerateScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { settings } = state;

  const [prompt, setPrompt] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<typeof STYLE_PRESETS[number]['id']>('none');
  const [selectedSize, setSelectedSize] = useState<typeof SIZE_OPTIONS[number]['id']>('512');
  const [isGenerating, setIsGenerating] = useState(false);
  const [puterHTML, setPuterHTML] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GenImage[]>([]);
  const [showNeg, setShowNeg] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      Alert.alert('خطا', 'لطفاً یک توضیح برای تصویر وارد کنید');
      return;
    }
    setIsGenerating(true);

    const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
    const sizeOpt = SIZE_OPTIONS.find(s => s.id === selectedSize)!;
    const fullPrompt = [
      prompt.trim(),
      stylePreset?.en ?? '',
      negPrompt ? `--no ${negPrompt}` : '',
    ].filter(Boolean).join(', ');

    if (settings.stabilityApiKey) {
      // Use Stability AI directly
      generateWithStability(fullPrompt, sizeOpt.w, sizeOpt.h);
    } else {
      // Fall back to Puter.js
      setPuterHTML(buildPuterImageHTML(fullPrompt));
    }
  }, [prompt, negPrompt, selectedStyle, selectedSize, settings.stabilityApiKey]);

  const generateWithStability = useCallback(async (fullPrompt: string, w: number, h: number) => {
    try {
      const resp = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.stabilityApiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text_prompts: [
              { text: fullPrompt, weight: 1 },
              ...(negPrompt ? [{ text: negPrompt, weight: -1 }] : []),
            ],
            cfg_scale: 7,
            height: Math.min(h, 1024),
            width: Math.min(w, 1024),
            steps: 30,
            samples: 1,
          }),
        }
      );
      if (!resp.ok) throw new Error(`Stability AI: ${resp.status}`);
      const data = await resp.json();
      const b64 = data.artifacts?.[0]?.base64;
      if (!b64) throw new Error('No image in response');
      addToGallery(`data:image/png;base64,${b64}`, prompt);
    } catch (e: any) {
      Alert.alert('خطا', e.message ?? 'خطا در تولید تصویر');
    } finally {
      setIsGenerating(false);
    }
  }, [settings.stabilityApiKey, negPrompt, prompt]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'image') {
        addToGallery(msg.data, prompt);
      } else if (msg.type === 'error') {
        Alert.alert('خطا', msg.data ?? 'خطا در تولید تصویر');
      }
    } catch {}
    setIsGenerating(false);
    setPuterHTML(null);
  }, [prompt]);

  const addToGallery = useCallback((uri: string, p: string) => {
    setGallery(prev => [{
      id: `img_${Date.now()}`,
      uri,
      prompt: p,
      timestamp: Date.now(),
    }, ...prev]);
  }, []);

  const handleSave = useCallback(async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('دسترسی رد شد', 'برای ذخیره تصویر، دسترسی به گالری لازم است');
        return;
      }
      // Save base64 to file first if needed
      let fileUri = uri;
      if (uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        fileUri = FileSystem.cacheDirectory + `salviax_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      }
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('ذخیره شد ✅', 'تصویر در گالری ذخیره شد');
    } catch (e: any) {
      Alert.alert('خطا', e.message ?? 'خطا در ذخیره تصویر');
    }
  }, []);

  const handleShare = useCallback(async (uri: string) => {
    try {
      let fileUri = uri;
      if (uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        fileUri = FileSystem.cacheDirectory + `salviax_share_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      }
      await Sharing.shareAsync(fileUri, { mimeType: 'image/png' });
    } catch (e: any) {
      Alert.alert('خطا', e.message ?? 'خطا در اشتراک‌گذاری');
    }
  }, []);

  const renderGalleryItem = useCallback(({ item }: { item: GenImage }) => (
    <GenImageItem item={item} onShare={handleShare} onSave={handleSave} />
  ), [handleShare, handleSave]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Hidden Puter WebView */}
      {puterHTML && (
        <WebView
          source={{ html: puterHTML }}
          onMessage={handleWebViewMessage}
          style={styles.hiddenWebView}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onError={() => {
            Alert.alert('خطا', 'خطا در اتصال به Puter.js');
            setIsGenerating(false);
            setPuterHTML(null);
          }}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎨 تولید تصویر</Text>
        {!settings.stabilityApiKey && (
          <Text style={styles.headerBadge}>Puter.js</Text>
        )}
        {settings.stabilityApiKey && (
          <Text style={[styles.headerBadge, styles.headerBadgePro]}>Stability AI</Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt Input */}
        <View style={styles.card}>
          <Text style={styles.label}>توضیح تصویر</Text>
          <TextInput
            style={styles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="مثال: یک گربه نارنجی روی سقف خانه در غروب آفتاب..."
            placeholderTextColor={COLORS.muted}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />

          {/* Negative Prompt Toggle */}
          <Pressable
            onPress={() => setShowNeg(v => !v)}
            style={({ pressed }) => [styles.negToggle, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.negToggleText}>
              {showNeg ? '▲' : '▼'} پرامپت منفی (چه چیزی نباشد)
            </Text>
          </Pressable>
          {showNeg && (
            <TextInput
              style={[styles.promptInput, { marginTop: 8, minHeight: 60 }]}
              value={negPrompt}
              onChangeText={setNegPrompt}
              placeholder="مثال: ugly, blurry, low quality, watermark..."
              placeholderTextColor={COLORS.muted}
              multiline
              textAlignVertical="top"
            />
          )}
        </View>

        {/* Style Presets */}
        <View style={styles.card}>
          <Text style={styles.label}>استایل تصویر</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {STYLE_PRESETS.map(preset => (
              <Pressable
                key={preset.id}
                onPress={() => setSelectedStyle(preset.id)}
                style={({ pressed }) => [
                  styles.presetChip,
                  selectedStyle === preset.id && styles.presetChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={[
                  styles.presetLabel,
                  selectedStyle === preset.id && styles.presetLabelActive,
                ]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Size Options */}
        <View style={styles.card}>
          <Text style={styles.label}>اندازه تصویر</Text>
          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedSize(opt.id)}
                style={({ pressed }) => [
                  styles.sizeBtn,
                  selectedSize === opt.id && styles.sizeBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  styles.sizeBtnText,
                  selectedSize === opt.id && styles.sizeBtnTextActive,
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          style={({ pressed }) => [
            styles.generateBtn,
            (!prompt.trim() || isGenerating) && styles.generateBtnDisabled,
            pressed && prompt.trim() && !isGenerating && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          {isGenerating ? (
            <View style={styles.generateBtnInner}>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.generateBtnText}>در حال ساخت تصویر...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>✨ ساخت تصویر</Text>
          )}
        </Pressable>

        {/* Gallery */}
        {gallery.length > 0 && (
          <View style={styles.gallerySection}>
            <Text style={styles.label}>تصاویر ساخته شده ({gallery.length})</Text>
            <FlatList
              data={gallery}
              renderItem={renderGalleryItem}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={styles.galleryRow}
              scrollEnabled={false}
            />
          </View>
        )}

        {gallery.length === 0 && !isGenerating && (
          <View style={styles.emptyGallery}>
            <Text style={styles.emptyGalleryIcon}>🖼️</Text>
            <Text style={styles.emptyGalleryText}>
              تصاویر ساخته شده اینجا نمایش داده می‌شوند
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hiddenWebView: { position: 'absolute', width: 1, height: 1, opacity: 0, zIndex: -1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  headerBadge: {
    backgroundColor: COLORS.violetDim,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerBadgePro: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  promptInput: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    minHeight: 90,
    textAlign: 'right',
  },
  negToggle: { alignSelf: 'flex-start' },
  negToggleText: { color: COLORS.muted, fontSize: 12 },
  presetScroll: { marginHorizontal: -4 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    marginHorizontal: 3,
  },
  presetChipActive: {
    backgroundColor: COLORS.violetDim,
    borderColor: COLORS.violet,
  },
  presetIcon: { fontSize: 14 },
  presetLabel: { color: COLORS.muted, fontSize: 12 },
  presetLabelActive: { color: COLORS.violet, fontWeight: '600' },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: COLORS.violetDim, borderColor: COLORS.violet },
  sizeBtnText: { color: COLORS.muted, fontSize: 13 },
  sizeBtnTextActive: { color: COLORS.violet, fontWeight: '600' },
  generateBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  generateBtnDisabled: { backgroundColor: COLORS.surface2, opacity: 0.5 },
  generateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  gallerySection: { gap: 10 },
  galleryRow: { gap: 12, marginBottom: 12 },
  emptyGallery: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyGalleryIcon: { fontSize: 48, opacity: 0.4 },
  emptyGalleryText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
});
