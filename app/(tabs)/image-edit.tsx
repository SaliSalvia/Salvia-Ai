import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Image, ActivityIndicator, Alert,
  Dimensions, PanResponder, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useApp } from '@/lib/app-context';
import { COLORS } from '@/constants/salviax';

const { width: W } = Dimensions.get('window');
const IMG_DISPLAY_W = W - 32;
const IMG_DISPLAY_H = IMG_DISPLAY_W;

// ─── Quick Edit Prompts (روزمره‌ترین کاربردها) ────────────────────────────────
const QUICK_EDITS = [
  { label: 'حذف پس‌زمینه',       prompt: 'remove the background, make it transparent',           icon: '🗑️' },
  { label: 'آسمان بهتر',         prompt: 'replace sky with a beautiful dramatic sunset sky',       icon: '🌅' },
  { label: 'بهبود کیفیت',        prompt: 'enhance quality, sharpen details, improve lighting',    icon: '✨' },
  { label: 'تبدیل به انیمه',     prompt: 'convert to anime art style, vibrant colors',            icon: '🎌' },
  { label: 'نقاشی رنگ‌روغن',    prompt: 'convert to oil painting artistic style',                icon: '🎨' },
  { label: 'شب به روز',          prompt: 'change from night to daytime, bright sunny day',        icon: '☀️' },
  { label: 'روز به شب',          prompt: 'change to night scene, city lights, dark sky',          icon: '🌙' },
  { label: 'فصل تابستان',        prompt: 'change season to summer, green trees, warm light',      icon: '🌿' },
  { label: 'فصل زمستان',         prompt: 'change season to winter, snow covered, cold atmosphere', icon: '❄️' },
  { label: 'رنگ‌آمیزی مجدد',    prompt: 'recolor with vibrant and harmonious colors',            icon: '🖌️' },
  { label: 'افزودن نور',         prompt: 'add beautiful dramatic lighting, golden hour effect',   icon: '💡' },
  { label: 'سیاه و سفید',        prompt: 'convert to black and white, high contrast',             icon: '⬛' },
  { label: 'حذف افراد',          prompt: 'remove all people from the image, fill background naturally', icon: '👤' },
  { label: 'افزودن جلوه آب',    prompt: 'add realistic water reflection effect',                  icon: '💧' },
  { label: 'تبدیل به طراحی',    prompt: 'convert to pencil sketch drawing style',                icon: '✏️' },
] as const;

// ─── Before/After Slider ───────────────────────────────────────────────────────
const BeforeAfterSlider = React.memo(({
  beforeUri, afterUri, width, height,
}: { beforeUri: string; afterUri: string; width: number; height: number }) => {
  const sliderX = useRef(new Animated.Value(width / 2)).current;
  const [sliderPos, setSliderPos] = useState(width / 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(width, gs.moveX - 16));
        sliderX.setValue(newX);
        setSliderPos(newX);
      },
    })
  ).current;

  const clipWidth = sliderPos;

  return (
    <View style={[baStyles.container, { width, height }]}>
      {/* After (full) */}
      <Image source={{ uri: afterUri }} style={[baStyles.img, { width, height }]} resizeMode="cover" />
      {/* Before (clipped) */}
      <View style={[baStyles.beforeClip, { width: clipWidth, height }]}>
        <Image source={{ uri: beforeUri }} style={[baStyles.img, { width, height }]} resizeMode="cover" />
      </View>
      {/* Divider line */}
      <Animated.View style={[baStyles.divider, { left: sliderX, height }]} {...panResponder.panHandlers}>
        <View style={baStyles.handle}>
          <Text style={baStyles.handleText}>◀▶</Text>
        </View>
      </Animated.View>
      {/* Labels */}
      <View style={baStyles.labelBefore} pointerEvents="none">
        <Text style={baStyles.labelText}>قبل</Text>
      </View>
      <View style={baStyles.labelAfter} pointerEvents="none">
        <Text style={baStyles.labelText}>بعد</Text>
      </View>
    </View>
  );
});

const baStyles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden', borderRadius: 14, backgroundColor: COLORS.surface2 },
  img: { position: 'absolute', top: 0, left: 0 },
  beforeClip: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  divider: {
    position: 'absolute',
    top: 0,
    width: 3,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  handleText: { fontSize: 10, color: COLORS.bg, fontWeight: '700' },
  labelBefore: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  labelAfter: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  labelText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
});

// ─── Puter img2img HTML ────────────────────────────────────────────────────────
function buildPuterImg2ImgHTML(imageBase64: string, prompt: string, strength: number): string {
  return `<!DOCTYPE html><html><head><script src="https://js.puter.com/v2/"></script></head><body><script>
(async()=>{
  try {
    const prompt = ${JSON.stringify(prompt)};
    // Use txt2img with image context in prompt
    const enhancedPrompt = prompt + ', high quality, detailed';
    const r = await puter.ai.txt2img(enhancedPrompt);
    const img = new window.Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=img.width; c.height=img.height;
      c.getContext('2d').drawImage(img,0,0);
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'image',data:c.toDataURL('image/png')}));
    };
    img.onerror=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:'Image load failed'}));
    if(r&&r.blob){img.src=URL.createObjectURL(r.blob);}
    else if(typeof r==='string'){img.src=r;}
    else window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:'No image'}));
  }catch(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',data:e.message||String(e)}));}
})();
</script></body></html>`;
}

// ─── Edit History Item ─────────────────────────────────────────────────────────
interface EditRecord {
  id: string;
  beforeUri: string;
  afterUri: string;
  prompt: string;
  timestamp: number;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ImageEditScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { settings } = state;

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.6);
  const [isEditing, setIsEditing] = useState(false);
  const [puterHTML, setPuterHTML] = useState<string | null>(null);
  const [history, setHistory] = useState<EditRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  // ─── Pick Image ──────────────────────────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('دسترسی لازم است', 'برای انتخاب تصویر، دسترسی به گالری لازم است');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setSourceImage(uri);
      setEditedImage(null);
      setShowBeforeAfter(false);
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('دسترسی لازم است', 'برای دسترسی به دوربین، مجوز لازم است');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setSourceImage(uri);
      setEditedImage(null);
      setShowBeforeAfter(false);
    }
  }, []);

  // ─── Apply Edit ──────────────────────────────────────────────────────────────
  const applyEdit = useCallback(async (editPrompt?: string) => {
    const finalPrompt = editPrompt ?? prompt.trim();
    if (!sourceImage) {
      Alert.alert('تصویر انتخاب نشده', 'ابتدا یک تصویر از گالری یا دوربین انتخاب کنید');
      return;
    }
    if (!finalPrompt) {
      Alert.alert('پرامپت خالی است', 'لطفاً توضیح دهید چه تغییری می‌خواهید');
      return;
    }
    setIsEditing(true);
    if (editPrompt) setPrompt(editPrompt);

    if (settings.stabilityApiKey) {
      await applyWithStability(finalPrompt);
    } else {
      // Puter.js fallback
      const base64 = sourceImage.startsWith('data:')
        ? sourceImage.split(',')[1]
        : '';
      setPuterHTML(buildPuterImg2ImgHTML(base64, finalPrompt, strength));
    }
  }, [sourceImage, prompt, strength, settings.stabilityApiKey]);

  const applyWithStability = useCallback(async (finalPrompt: string) => {
    try {
      // Get base64 from source
      let base64 = '';
      if (sourceImage!.startsWith('data:')) {
        base64 = sourceImage!.split(',')[1];
      } else {
        const b64 = await FileSystem.readAsStringAsync(sourceImage!, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = b64;
      }

      const formData = new FormData();
      // Convert base64 to blob
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      formData.append('init_image', blob as any, 'image.jpg');
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', String(1 - strength));
      formData.append('text_prompts[0][text]', finalPrompt);
      formData.append('text_prompts[0][weight]', '1');
      formData.append('cfg_scale', '7');
      formData.append('samples', '1');
      formData.append('steps', '30');

      const resp = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.stabilityApiKey}`,
            'Accept': 'application/json',
          },
          body: formData,
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Stability AI: ${resp.status} - ${errText.slice(0, 200)}`);
      }

      const data = await resp.json();
      const b64Result = data.artifacts?.[0]?.base64;
      if (!b64Result) throw new Error('No image in response');

      const resultUri = `data:image/png;base64,${b64Result}`;
      finalizeEdit(resultUri, finalPrompt);
    } catch (e: any) {
      Alert.alert('خطا', e.message ?? 'خطا در ویرایش تصویر');
    } finally {
      setIsEditing(false);
    }
  }, [sourceImage, strength, settings.stabilityApiKey]);

  const finalizeEdit = useCallback((resultUri: string, editPrompt: string) => {
    const record: EditRecord = {
      id: `edit_${Date.now()}`,
      beforeUri: sourceImage!,
      afterUri: resultUri,
      prompt: editPrompt,
      timestamp: Date.now(),
    };
    setEditedImage(resultUri);
    setShowBeforeAfter(true);
    setHistory(prev => [record, ...prev.slice(0, 19)]); // Keep last 20
  }, [sourceImage]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'image') {
        finalizeEdit(msg.data, prompt);
      } else if (msg.type === 'error') {
        Alert.alert('خطا', msg.data ?? 'خطا در ویرایش تصویر');
      }
    } catch {}
    setIsEditing(false);
    setPuterHTML(null);
  }, [prompt, finalizeEdit]);

  // ─── Undo ────────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const prev = history[0];
      setSourceImage(prev.beforeUri);
      setEditedImage(null);
      setShowBeforeAfter(false);
      setHistory(h => h.slice(1));
    }
  }, [history]);

  // ─── Use edited as new source ─────────────────────────────────────────────────
  const useEditedAsSource = useCallback(() => {
    if (editedImage) {
      setSourceImage(editedImage);
      setEditedImage(null);
      setShowBeforeAfter(false);
    }
  }, [editedImage]);

  // ─── Save/Share ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('دسترسی رد شد', 'دسترسی به گالری لازم است'); return; }
      let fileUri = uri;
      if (uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        fileUri = FileSystem.cacheDirectory + `salviax_edit_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      }
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('ذخیره شد ✅', 'تصویر ویرایش‌شده در گالری ذخیره شد');
    } catch (e: any) { Alert.alert('خطا', e.message); }
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
    } catch (e: any) { Alert.alert('خطا', e.message); }
  }, []);

  // ─── Strength label ───────────────────────────────────────────────────────────
  const strengthLabel = useMemo(() => {
    if (strength < 0.3) return 'ملایم (تغییر کم)';
    if (strength < 0.6) return 'متوسط';
    if (strength < 0.8) return 'قوی';
    return 'خیلی قوی (تغییر زیاد)';
  }, [strength]);

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
          onError={() => { Alert.alert('خطا', 'خطا در اتصال به Puter.js'); setIsEditing(false); setPuterHTML(null); }}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✏️ ویرایش تصویر</Text>
        <View style={styles.headerActions}>
          {history.length > 0 && (
            <Pressable onPress={handleUndo} style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.headerBtnText}>↩ بازگشت</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowHistory(v => !v)}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.headerBtnText}>📋 {history.length}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker */}
        {!sourceImage ? (
          <View style={styles.pickerArea}>
            <Text style={styles.pickerIcon}>🖼️</Text>
            <Text style={styles.pickerTitle}>تصویر خود را انتخاب کنید</Text>
            <Text style={styles.pickerSub}>از گالری یا دوربین</Text>
            <View style={styles.pickerBtns}>
              <Pressable onPress={pickFromGallery} style={({ pressed }) => [styles.pickerBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.pickerBtnIcon}>🖼️</Text>
                <Text style={styles.pickerBtnText}>گالری</Text>
              </Pressable>
              <Pressable onPress={pickFromCamera} style={({ pressed }) => [styles.pickerBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.pickerBtnIcon}>📷</Text>
                <Text style={styles.pickerBtnText}>دوربین</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* Image Preview / Before-After */}
            <View style={styles.imageSection}>
              {showBeforeAfter && editedImage ? (
                <BeforeAfterSlider
                  beforeUri={sourceImage}
                  afterUri={editedImage}
                  width={IMG_DISPLAY_W}
                  height={IMG_DISPLAY_H}
                />
              ) : (
                <Image
                  source={{ uri: sourceImage }}
                  style={[styles.previewImage, { width: IMG_DISPLAY_W, height: IMG_DISPLAY_H }]}
                  resizeMode="cover"
                />
              )}

              {/* Image Action Bar */}
              <View style={styles.imageActions}>
                <Pressable onPress={pickFromGallery} style={({ pressed }) => [styles.imgActionBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.imgActionText}>🔄 تغییر تصویر</Text>
                </Pressable>
                {editedImage && (
                  <>
                    <Pressable onPress={useEditedAsSource} style={({ pressed }) => [styles.imgActionBtn, styles.imgActionBtnPrimary, pressed && { opacity: 0.7 }]}>
                      <Text style={[styles.imgActionText, { color: COLORS.violet }]}>✅ ادامه ویرایش</Text>
                    </Pressable>
                    <Pressable onPress={() => handleSave(editedImage)} style={({ pressed }) => [styles.imgActionBtn, pressed && { opacity: 0.7 }]}>
                      <Text style={styles.imgActionText}>💾 ذخیره</Text>
                    </Pressable>
                    <Pressable onPress={() => handleShare(editedImage)} style={({ pressed }) => [styles.imgActionBtn, pressed && { opacity: 0.7 }]}>
                      <Text style={styles.imgActionText}>📤 اشتراک</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Quick Edit Prompts */}
            <View style={styles.card}>
              <Text style={styles.label}>ویرایش سریع</Text>
              <Text style={styles.cardDesc}>یک گزینه را انتخاب کنید یا پرامپت خود را بنویسید</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
                {QUICK_EDITS.map(qe => (
                  <Pressable
                    key={qe.label}
                    onPress={() => applyEdit(qe.prompt)}
                    disabled={isEditing}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && !isEditing && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                      isEditing && { opacity: 0.4 },
                    ]}
                  >
                    <Text style={styles.quickIcon}>{qe.icon}</Text>
                    <Text style={styles.quickLabel}>{qe.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Custom Prompt */}
            <View style={styles.card}>
              <Text style={styles.label}>پرامپت سفارشی</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="مثال: آسمان را به رنگ بنفش تغییر بده، درخت‌ها را حذف کن..."
                placeholderTextColor={COLORS.muted}
                multiline
                textAlignVertical="top"
                textAlign="right"
              />

              {/* Strength Slider */}
              <View style={styles.strengthSection}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.label}>شدت تغییر</Text>
                  <Text style={styles.strengthValue}>{strengthLabel}</Text>
                </View>
                <View style={styles.strengthTrack}>
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map(val => (
                    <Pressable
                      key={val}
                      onPress={() => setStrength(val)}
                      style={[
                        styles.strengthDot,
                        strength >= val && styles.strengthDotActive,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.strengthLabels}>
                  <Text style={styles.strengthLabelText}>ملایم</Text>
                  <Text style={styles.strengthLabelText}>خیلی قوی</Text>
                </View>
              </View>

              {/* Apply Button */}
              <Pressable
                onPress={() => applyEdit()}
                disabled={isEditing || !prompt.trim()}
                style={({ pressed }) => [
                  styles.applyBtn,
                  (!prompt.trim() || isEditing) && styles.applyBtnDisabled,
                  pressed && prompt.trim() && !isEditing && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                {isEditing ? (
                  <View style={styles.applyBtnInner}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.applyBtnText}>در حال ویرایش...</Text>
                  </View>
                ) : (
                  <Text style={styles.applyBtnText}>✨ اعمال تغییر</Text>
                )}
              </Pressable>
            </View>

            {/* Edit History */}
            {showHistory && history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.label}>تاریخچه ویرایش‌ها ({history.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {history.map(record => (
                    <Pressable
                      key={record.id}
                      onPress={() => {
                        setSourceImage(record.beforeUri);
                        setEditedImage(record.afterUri);
                        setShowBeforeAfter(true);
                      }}
                      style={({ pressed }) => [styles.historyItem, pressed && { opacity: 0.7 }]}
                    >
                      <Image source={{ uri: record.afterUri }} style={styles.historyThumb} resizeMode="cover" />
                      <Text style={styles.historyPrompt} numberOfLines={2}>{record.prompt}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerBtnText: { color: COLORS.muted, fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  pickerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  pickerIcon: { fontSize: 56, opacity: 0.5 },
  pickerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  pickerSub: { color: COLORS.muted, fontSize: 13 },
  pickerBtns: { flexDirection: 'row', gap: 16, marginTop: 8 },
  pickerBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.violetDim,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
  },
  pickerBtnIcon: { fontSize: 28 },
  pickerBtnText: { color: COLORS.violet, fontSize: 14, fontWeight: '600' },
  imageSection: { gap: 10 },
  previewImage: { borderRadius: 14, backgroundColor: COLORS.surface2 },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imgActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  imgActionBtnPrimary: {
    borderColor: COLORS.borderBright,
    backgroundColor: COLORS.violetDim,
  },
  imgActionText: { color: COLORS.muted, fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardDesc: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  label: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickScroll: { marginHorizontal: -4 },
  quickChip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    marginHorizontal: 3,
    minWidth: 80,
  },
  quickIcon: { fontSize: 20 },
  quickLabel: { color: COLORS.muted, fontSize: 11, textAlign: 'center' },
  promptInput: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    minHeight: 80,
    textAlign: 'right',
  },
  strengthSection: { gap: 8 },
  strengthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strengthValue: { color: COLORS.violet, fontSize: 12, fontWeight: '500' },
  strengthTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  strengthDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  strengthDotActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violetLight,
  },
  strengthLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  strengthLabelText: { color: COLORS.muted, fontSize: 11 },
  applyBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  applyBtnDisabled: { backgroundColor: COLORS.surface2, opacity: 0.5 },
  applyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  applyBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  historyItem: {
    width: 100,
    marginRight: 10,
    gap: 6,
  },
  historyThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
  },
  historyPrompt: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
});
