import React, {
  useCallback, useRef, useState, useEffect, useMemo
} from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  KeyboardAvoidingView, Platform, StatusBar,
  InteractionManager, Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/lib/app-context';
import { buildPuterHTML, streamFromOpenRouter, streamFromGroq, getModelProvider } from '@/lib/ai-service';
import { Message, COLORS, AI_MODELS } from '@/constants/salviax';
import MessageItem from '@/components/MessageItem';
import InputBar from '@/components/InputBar';
import Sidebar from '@/components/Sidebar';
import SettingsDrawer from '@/components/SettingsDrawer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;

// ─── Empty State ─────────────────────────────────────────────────────────
const EmptyState = React.memo(({ isRTL }: { isRTL: boolean }) => (
  <View style={emptyStyles.container}>
    <Text style={emptyStyles.logo}>SalviaX</Text>
    <Text style={emptyStyles.subtitle}>
      {isRTL ? 'دستیار هوش مصنوعی پیشرفته' : 'Advanced AI Assistant'}
    </Text>
    <View style={emptyStyles.chips}>
      {(isRTL
        ? ['✍️ نوشتن متن', '💻 کدنویسی', '🔍 تحلیل', '🌐 ترجمه']
        : ['✍️ Writing', '💻 Coding', '🔍 Analysis', '🌐 Translation']
      ).map(chip => (
        <View key={chip} style={emptyStyles.chip}>
          <Text style={emptyStyles.chipText}>{chip}</Text>
        </View>
      ))}
    </View>
  </View>
));

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  logo: { color: COLORS.violet, fontSize: 36, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  chip: {
    backgroundColor: COLORS.violetDim,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.muted, fontSize: 13 },
});

// ─── Main ChatScreen ───────────────────────────────────────────────────────
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch, currentConversation, createNewConversation, saveConversations } = useApp();
  const { settings, isSidebarOpen } = state;

  const isRTL = settings.language === 'fa';
  const flashListRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [puterHTML, setPuterHTML] = useState<string | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const streamBufferRef = useRef<string>('');

  // Sidebar animation
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sidebarAnim, {
        toValue: isSidebarOpen ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isSidebarOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSidebarOpen]);

  // Ensure there's always a conversation
  useEffect(() => {
    if (!state.currentConversationId && !state.isLoading) {
      createNewConversation();
    }
  }, [state.currentConversationId, state.isLoading]);

  const messages = useMemo(
    () => currentConversation?.messages ?? [],
    [currentConversation?.messages]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  // ─── Abort current stream ──────────────────────────────────────────────────
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPuterHTML(null);
    setIsStreaming(false);

    // Finalize any streaming message
    if (streamingMsgIdRef.current && state.currentConversationId) {
      const finalContent = streamBufferRef.current || (isRTL ? 'توقف داده شد' : 'Stopped');
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId: state.currentConversationId,
          messageId: streamingMsgIdRef.current,
          content: finalContent,
          isStreaming: false,
        },
      });
      streamingMsgIdRef.current = null;
      streamBufferRef.current = '';
    }
  }, [state.currentConversationId, dispatch, isRTL]);

  // ─── Handle Puter WebView messages ────────────────────────────────────────
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      const convId = state.currentConversationId;
      const msgId = streamingMsgIdRef.current;
      if (!convId || !msgId) return;

      if (msg.type === 'token') {
        streamBufferRef.current += msg.data;
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: convId,
            messageId: msgId,
            content: streamBufferRef.current,
            isStreaming: true,
          },
        });
      } else if (msg.type === 'done') {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: convId,
            messageId: msgId,
            content: streamBufferRef.current,
            isStreaming: false,
          },
        });
        streamingMsgIdRef.current = null;
        streamBufferRef.current = '';
        setPuterHTML(null);
        setIsStreaming(false);

        // Persist conversations
        InteractionManager.runAfterInteractions(() => {
          saveConversations(state.conversations);
        });
      } else if (msg.type === 'error') {
        let errorMsg = msg.data || (isRTL ? 'خطا در دریافت پاسخ' : 'Error receiving response');
        if (errorMsg.includes('timeout')) {
          errorMsg = isRTL ? '⏱️ مهلت زمانی تمام شد' : '⏱️ Request timeout';
        }
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: convId,
            messageId: msgId,
            content: errorMsg,
            isStreaming: false,
          },
        });
        streamingMsgIdRef.current = null;
        streamBufferRef.current = '';
        setPuterHTML(null);
        setIsStreaming(false);
      }
    } catch (e) {
      console.error('WebView message parse error:', e);
    }
  }, [state.currentConversationId, state.conversations, dispatch, saveConversations, isRTL]);

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    // Abort any ongoing stream
    if (isStreaming) abortStream();

    let convId = state.currentConversationId;
    if (!convId) convId = createNewConversation();

    // Add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: convId, message: userMsg } });

    // Add placeholder AI message
    const aiMsgId = `msg_${Date.now()}_ai`;
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      model: settings.selectedModel,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: convId, message: aiMsg } });

    streamingMsgIdRef.current = aiMsgId;
    streamBufferRef.current = '';
    setIsStreaming(true);

    // Build message history for context
    const history = (currentConversation?.messages ?? [])
      .filter(m => m.role !== 'error')
      .slice(-20)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    history.push({ role: 'user', content: text });

    const provider = getModelProvider(settings.selectedModel, settings);

    if (provider === 'puter') {
      // Use Puter.js via WebView
      const html = buildPuterHTML(history, settings.selectedModel);
      setPuterHTML(html);
    } else {
      // Direct API streaming with timeout
      abortControllerRef.current = new AbortController();
      const callbacks = {
        onToken: (token: string) => {
          streamBufferRef.current += token;
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              conversationId: convId!,
              messageId: aiMsgId,
              content: streamBufferRef.current,
              isStreaming: true,
            },
          });
        },
        onComplete: () => {
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              conversationId: convId!,
              messageId: aiMsgId,
              content: streamBufferRef.current,
              isStreaming: false,
            },
          });
          streamingMsgIdRef.current = null;
          streamBufferRef.current = '';
          setIsStreaming(false);
          InteractionManager.runAfterInteractions(() => {
            saveConversations(state.conversations);
          });
        },
        onError: (error: string) => {
          let errorMsg = error;
          if (error.includes('timeout')) {
            errorMsg = isRTL ? '⏱️ مهلت زمانی تمام شد - دوباره تلاش کنید' : '⏱️ Request timeout - try again';
          } else if (error.includes('Invalid API')) {
            errorMsg = isRTL ? '🔑 API Key نامعتبر است' : '🔑 Invalid API Key';
          } else if (error.includes('Rate limited')) {
            errorMsg = isRTL ? '⚠️ محدودیت درخواست - چند لحظه صبر کنید' : '⚠️ Rate limited - wait a moment';
          }
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              conversationId: convId!,
              messageId: aiMsgId,
              content: errorMsg,
              isStreaming: false,
            },
          });
          streamingMsgIdRef.current = null;
          streamBufferRef.current = '';
          setIsStreaming(false);
        },
      };

      if (provider === 'openrouter') {
        streamFromOpenRouter(history, settings.selectedModel, settings.openrouterApiKey, callbacks, abortControllerRef.current.signal);
      } else {
        streamFromGroq(history, settings.selectedModel, settings.groqApiKey, callbacks, abortControllerRef.current.signal);
      }
    }
  }, [isStreaming, state.currentConversationId, state.conversations, settings, currentConversation, dispatch, createNewConversation, saveConversations, abortStream, isRTL]);

  // ─── Render Message ────────────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageItem message={item} isRTL={isRTL} />
  ), [isRTL]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // ─── Current model label ───────────────────────────────────────────────────
  const currentModelLabel = useMemo(() => {
    return AI_MODELS.find(m => m.id === settings.selectedModel)?.label ?? settings.selectedModel;
  }, [settings.selectedModel]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Hidden Puter WebView for AI calls */}
      {puterHTML && (
        <WebView
          source={{ html: puterHTML }}
          onMessage={handleWebViewMessage}
          style={styles.hiddenWebView}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onError={() => {
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                conversationId: state.currentConversationId!,
                messageId: streamingMsgIdRef.current!,
                content: isRTL ? '❌ خطا در اتصال' : '❌ Connection error',
                isStreaming: false,
              },
            });
            setPuterHTML(null);
            setIsStreaming(false);
          }}
          onRenderProcessGone={() => {
            abortStream();
          }}
        />
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>SalviaX</Text>
          <Text style={styles.topModel}>{currentModelLabel}</Text>
        </View>

        <Pressable
          onPress={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          style={({ pressed }) => [styles.langBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.langBtnText}>
            {isRTL ? 'EN' : 'فا'}
          </Text>
        </Pressable>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Chat List */}
        <View style={styles.flex}>
          {messages.length === 0 ? (
            <EmptyState isRTL={isRTL} />
          ) : (
            <FlashList
              ref={flashListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={100}
            />
          )}
        </View>

        {/* Input Bar */}
        <InputBar
          onSend={handleSend}
          isStreaming={isStreaming}
          onAbort={abortStream}
          isRTL={isRTL}
        />
      </KeyboardAvoidingView>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents={isSidebarOpen ? 'auto' : 'none'}
        >
          <Pressable
            style={styles.overlayPressable}
            onPress={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Sidebar slideAnim={sidebarAnim} />

      {/* Settings Drawer */}
      <SettingsDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: { flex: 1 },
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
    gap: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  menuIcon: {
    color: COLORS.text,
    fontSize: 20,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topTitle: {
    color: COLORS.violet,
    fontSize: 17,
    fontWeight: '700',
  },
  topModel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 1,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.violetDim,
  },
  langBtnText: {
    color: COLORS.violet,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  overlayPressable: {
    flex: 1,
  },
});
