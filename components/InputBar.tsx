import React, { memo, useCallback, useRef, useState } from 'react';
import {
  View, TextInput, StyleSheet, Pressable, Text,
  Platform, ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/salviax';

interface InputBarProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onAbort: () => void;
  isRTL: boolean;
  placeholder?: string;
}

const InputBar = memo(({ onSend, isStreaming, onAbort, isRTL, placeholder }: InputBarProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  }, [text, isStreaming, onSend]);

  const handleKeyPress = useCallback((e: any) => {
    // On web, Enter sends (Shift+Enter for newline)
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      handleSend();
    }
  }, [handleSend]);

  const canSend = text.trim().length > 0 && !isStreaming;

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            isRTL && styles.inputRTL,
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? (isRTL ? 'پیام خود را بنویسید...' : 'Type a message...')}
          placeholderTextColor={COLORS.muted}
          multiline
          maxLength={8000}
          onKeyPress={handleKeyPress}
          textAlignVertical="center"
          textAlign={isRTL ? 'right' : 'left'}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isStreaming ? (
            <Pressable
              onPress={onAbort}
              style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.stopIcon} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendBtn,
                canSend && styles.sendBtnActive,
                pressed && canSend && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={[styles.sendIcon, canSend && styles.sendIconActive]}>↑</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isStreaming && (
        <View style={styles.streamingIndicator}>
          <ActivityIndicator size="small" color={COLORS.violet} />
          <Text style={styles.streamingText}>
            {isRTL ? 'در حال تولید پاسخ...' : 'Generating response...'}
          </Text>
        </View>
      )}
    </View>
  );
});

InputBar.displayName = 'InputBar';
export default InputBar;

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.input,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 160,
    paddingVertical: 6,
    textAlignVertical: 'top',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtnActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  sendIcon: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  sendIconActive: {
    color: COLORS.white,
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.error,
    borderRadius: 2,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  streamingText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});
