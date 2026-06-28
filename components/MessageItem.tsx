import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Clipboard,
  I18nManager, Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message, COLORS } from '@/constants/salviax';

// ─── Thinking Indicator ───────────────────────────────────────────────────────
const ThinkingDots = memo(() => {
  const [dots, setDots] = React.useState('');
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <View style={styles.thinkingContainer}>
      <View style={[styles.dot, dots.length >= 1 && styles.dotActive]} />
      <View style={[styles.dot, dots.length >= 2 && styles.dotActive]} />
      <View style={[styles.dot, dots.length >= 3 && styles.dotActive]} />
    </View>
  );
});

// ─── Markdown Styles ──────────────────────────────────────────────────────────
const markdownStyles = StyleSheet.create({
  body: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  heading1: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginVertical: 8 },
  heading2: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginVertical: 6 },
  heading3: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginVertical: 4 },
  paragraph: { color: COLORS.text, fontSize: 14, lineHeight: 22, marginVertical: 4 },
  code_block: {
    backgroundColor: '#0d0d1f',
    borderRadius: 8,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#a78bfa',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  code_inline: {
    backgroundColor: '#0d0d1f',
    color: '#a78bfa',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.violet,
    paddingLeft: 12,
    marginVertical: 8,
  },
  list_item: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  bullet_list_icon: { color: COLORS.violet },
  strong: { color: COLORS.text, fontWeight: '700' },
  em: { color: COLORS.text, fontStyle: 'italic' },
  link: { color: COLORS.violet },
  hr: { backgroundColor: COLORS.border, height: 1, marginVertical: 12 },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, overflow: 'hidden' },
  th: { backgroundColor: COLORS.surface2, padding: 8, color: COLORS.text, fontWeight: '600' },
  td: { padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border, color: COLORS.text },
});

// ─── MessageItem ──────────────────────────────────────────────────────────────
interface MessageItemProps {
  message: Message;
  isRTL: boolean;
}

const MessageItem = memo(({ message, isRTL }: MessageItemProps) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  const handleCopy = useCallback(() => {
    Clipboard.setString(message.content);
  }, [message.content]);

  // Auto-detect RTL for this specific message
  const msgIsRTL = /[\u0600-\u06FF]/.test(message.content.slice(0, 50));

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.aiBubble,
        { maxWidth: '85%' },
      ]}>
        {message.isStreaming && message.content === '' ? (
          <ThinkingDots />
        ) : isUser ? (
          <Text
            style={[styles.userText, msgIsRTL && styles.rtlText]}
            textBreakStrategy="simple"
          >
            {message.content}
          </Text>
        ) : (
          <Markdown style={markdownStyles as any}>
            {message.content}
          </Markdown>
        )}
        {!message.isStreaming && message.content !== '' && (
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.copyText}>📋</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}, (prev, next) => {
  // Custom comparison: only re-render if content or streaming state changed
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.isRTL === next.isRTL
  );
});

MessageItem.displayName = 'MessageItem';
export default MessageItem;

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.violet,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.aiBubble,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  copyBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    opacity: 0.6,
  },
  copyText: {
    fontSize: 12,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.muted,
  },
  dotActive: {
    backgroundColor: COLORS.violet,
  },
  errorContainer: {
    marginVertical: 6,
    marginHorizontal: 12,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 20,
  },
});
