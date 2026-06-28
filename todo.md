# SalviaX AI - Project TODO

## Setup & Configuration
- [x] Configure dark theme colors (#07071a, #101012, #8b5cf6)
- [x] Install @shopify/flash-list for virtualized chat list
- [x] Install react-native-markdown-display for markdown rendering
- [x] Install react-native-webview for Puter.js bridge
- [x] Install react-native-keyboard-controller
- [x] Configure fonts: Vazirmatn (Farsi) and Inter (English)
- [x] Update app.config.ts with SalviaX branding and com.salviax.ai package

## Core UI Components
- [x] App layout with sidebar + main chat area (no tab bar)
- [x] Collapsible left sidebar (260px) with model selector
- [x] Chat area with FlashList virtualized message list
- [x] Pinned input bar at bottom (auto-expanding TextArea)
- [x] RTL/LTR auto-detection and toggle (EN | فارسی)
- [x] Language toggle button in top bar

## Chat Features
- [x] MessageItem component with React.memo()
- [x] User message bubble (right-aligned, violet)
- [x] AI message bubble (left-aligned, dark surface)
- [x] Markdown rendering with syntax highlighted code blocks
- [x] Copy button per message
- [x] Thinking/loading 3-dot animated indicator
- [x] Error message display (red style)
- [x] Full conversation history with AsyncStorage persistence

## AI Integration
- [x] Puter.js integration via WebView bridge
- [x] Support: GPT-4o, GPT-4o Mini, Claude 4, Gemini 2.0, DeepSeek V3, Llama 3.1
- [x] Streaming response with AbortController
- [x] Abort previous stream when new message is sent
- [x] Settings drawer with custom API keys (Groq, OpenRouter, Stability AI, Google AI Studio)
- [x] API key persistence via AsyncStorage
- [x] Usage indicator progress bar for API keys

## Performance Optimizations
- [x] FlashList for chat messages
- [x] React.memo() on every MessageItem
- [x] useCallback for all event handlers
- [x] useMemo for message list
- [x] InteractionManager.runAfterInteractions() for heavy computations
- [x] KeyboardAvoidingView for Android keyboard handling
- [x] Streaming token append (not replace whole message)
- [x] AbortController for stream cancellation

## Build & Deployment
- [x] GitHub Actions workflow (.github/workflows/build-apk.yml)
- [x] EAS Build configuration (eas.json)
- [x] Splash screen with #07071a background
- [x] Generate app logo/icon
- [x] README with setup and build instructions

## GitHub
- [x] Push all files to SaliSalvia/Salvia-Ai repository

## Image Generation & Editing Tab
- [x] Image Generation screen: text-to-image with Stability AI + Puter.js fallback
- [x] Style presets (Realistic, Anime, Oil Painting, Cinematic, etc.)
- [x] Negative prompt support
- [x] Image size selector (512x512, 768x768, 1024x1024)
- [x] Generated image gallery with download/share
- [x] Image Editing screen: prompt-based edit (img2img / inpainting)
- [x] Pick image from gallery or camera
- [x] Prompt-based edit: describe what to change (e.g. "make the sky purple")
- [x] Strength slider (how much to change the image)
- [x] Before/After comparison slider
- [x] Edit history (undo chain)
- [x] Bottom tab bar: Chat | Image | Edit
- [ ] Push updated code to GitHub
