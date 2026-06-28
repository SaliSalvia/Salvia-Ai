# SalviaX AI 🤖

یک اپلیکیشن Android هوش مصنوعی پرفورمنس بالا، ساخته شده با React Native + Expo.

[![Build Android APK](https://github.com/SaliSalvia/Salvia-Ai/actions/workflows/build-apk.yml/badge.svg)](https://github.com/SaliSalvia/Salvia-Ai/actions/workflows/build-apk.yml)

---

## ✨ ویژگی‌ها

| ویژگی | توضیح |
|-------|-------|
| **مدل‌های AI** | GPT-4o، GPT-4o Mini، Claude 4، Gemini 2.0، DeepSeek V3، Llama 3.1 |
| **بدون نیاز به API Key** | از طریق Puter.js — رایگان و بدون ثبت‌نام |
| **پشتیبانی فارسی/انگلیسی** | تشخیص خودکار RTL/LTR |
| **Streaming** | پاسخ‌های real-time با AbortController |
| **پرفورمنس بالا** | FlashList + React.memo + Hermes Engine |
| **تاریخچه گفتگو** | ذخیره‌سازی محلی با AsyncStorage |
| **تنظیمات API** | پشتیبانی از Groq، OpenRouter، Stability AI، Google AI |
| **تولید تصویر** | از طریق Stability AI |

---

## 🚀 اجرای محلی

### پیش‌نیازها

- Node.js 20+
- pnpm 9+
- Android Studio (برای اجرا روی دستگاه)
- Expo Go (برای تست سریع)

### نصب و اجرا

```bash
# کلون کردن پروژه
git clone https://github.com/SaliSalvia/Salvia-Ai.git
cd Salvia-Ai

# نصب وابستگی‌ها
pnpm install

# اجرا در حالت توسعه (وب)
pnpm dev

# اجرا روی Android
pnpm android

# اسکن QR با Expo Go
pnpm qr
```

---

## 📦 ساخت APK

### روش ۱: GitHub Actions (توصیه شده)

هر بار که به شاخه `main` push کنید، APK به صورت خودکار ساخته می‌شود.

برای دانلود APK:
1. به تب **Actions** در GitHub بروید
2. آخرین workflow را باز کنید
3. از بخش **Artifacts** فایل `SalviaX-AI-APK` را دانلود کنید

### روش ۲: ساخت محلی

```bash
# نصب EAS CLI
npm install -g eas-cli

# Prebuild
npx expo prebuild --clean --platform android

# ساخت APK
cd android
./gradlew assembleRelease

# APK در این مسیر قرار می‌گیرد:
# android/app/build/outputs/apk/release/app-release.apk
```

### روش ۳: EAS Build (Cloud)

```bash
# لاگین به Expo
eas login

# ساخت APK در فضای ابری
eas build -p android --profile preview
```

---

## 🏗️ ساختار پروژه

```
salviax-app/
├── app/
│   ├── _layout.tsx          ← Root layout با AppProvider
│   └── (tabs)/
│       ├── _layout.tsx      ← Stack layout (بدون tab bar)
│       └── index.tsx        ← صفحه اصلی چت
├── components/
│   ├── MessageItem.tsx      ← کامپوننت پیام (React.memo)
│   ├── InputBar.tsx         ← نوار ورودی پیام
│   ├── Sidebar.tsx          ← سایدبار کشویی
│   └── SettingsDrawer.tsx   ← کشوی تنظیمات
├── constants/
│   └── salviax.ts           ← رنگ‌ها، مدل‌ها، تایپ‌ها
├── lib/
│   ├── app-context.tsx      ← State management با Context + useReducer
│   └── ai-service.ts        ← سرویس AI (Puter.js + OpenRouter + Groq)
├── assets/images/           ← آیکون‌ها و splash screen
├── .github/workflows/
│   └── build-apk.yml        ← GitHub Actions workflow
└── eas.json                 ← تنظیمات EAS Build
```

---

## ⚡ بهینه‌سازی‌های پرفورمنس

پروژه از تکنیک‌های زیر برای دستیابی به 60fps استفاده می‌کند:

**FlashList** به جای FlatList معمولی برای virtualization لیست پیام‌ها با هزاران آیتم.

**React.memo** روی تمام کامپوننت‌های `MessageItem` برای جلوگیری از re-render غیرضروری.

**AbortController** برای لغو stream قبلی هنگام ارسال پیام جدید.

**InteractionManager.runAfterInteractions** برای عملیات سنگین بعد از پایان انیمیشن‌ها.

**Hermes Engine** فعال شده برای اجرای سریع‌تر JavaScript.

**useCallback و useMemo** برای تمام event handler‌ها و محاسبات سنگین.

---

## 🔑 API Keys

برای استفاده از مدل‌های پیشرفته‌تر، کلیدهای API خود را در تنظیمات اپ وارد کنید:

| سرویس | توضیح | دریافت کلید |
|-------|-------|-------------|
| Groq | مدل‌های سریع Llama | [console.groq.com](https://console.groq.com) |
| OpenRouter | دسترسی به صدها مدل | [openrouter.ai](https://openrouter.ai) |
| Stability AI | تولید تصویر | [platform.stability.ai](https://platform.stability.ai) |
| Google AI Studio | Gemini پیشرفته | [aistudio.google.com](https://aistudio.google.com) |

---

## 📱 نصب APK روی گوشی

```bash
# فعال کردن USB Debugging روی گوشی
# سپس:
adb install SalviaX-AI.apk
```

یا فایل APK را مستقیماً روی گوشی کپی کرده و نصب کنید.

---

## 📄 لایسنس

MIT License — آزاد برای استفاده شخصی و تجاری.
