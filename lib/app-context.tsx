import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Message, Conversation, AppSettings, DEFAULT_SETTINGS,
  STORAGE_KEYS, ModelId
} from '@/constants/salviax';

// ─── State ─────────────────────────────────────────────────────────────────
interface AppState {
  settings: AppSettings;
  conversations: Conversation[];
  currentConversationId: string | null;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isLoading: boolean;
}

const initialState: AppState = {
  settings: DEFAULT_SETTINGS,
  conversations: [],
  currentConversationId: null,
  isSidebarOpen: false,
  isSettingsOpen: false,
  isLoading: true,
};

// ─── Actions ────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; messageId: string; content: string; isStreaming?: boolean } }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversationId: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.payload, ...state.conversations] };
    case 'ADD_MESSAGE': {
      const convs = state.conversations.map(c =>
        c.id === action.payload.conversationId
          ? { ...c, messages: [...c.messages, action.payload.message], updatedAt: Date.now() }
          : c
      );
      return { ...state, conversations: convs };
    }
    case 'UPDATE_MESSAGE': {
      const convs = state.conversations.map(c => {
        if (c.id !== action.payload.conversationId) return c;
        const msgs = c.messages.map(m =>
          m.id === action.payload.messageId
            ? { ...m, content: action.payload.content, isStreaming: action.payload.isStreaming ?? false }
            : m
        );
        return { ...c, messages: msgs, updatedAt: Date.now() };
      });
      return { ...state, conversations: convs };
    }
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'TOGGLE_SETTINGS':
      return { ...state, isSettingsOpen: !state.isSettingsOpen };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  currentConversation: Conversation | null;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  createNewConversation: () => string;
  saveConversations: (convs: Conversation[]) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      try {
        const [settingsStr, convsStr, currentId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION),
        ]);
        if (settingsStr) dispatch({ type: 'SET_SETTINGS', payload: JSON.parse(settingsStr) });
        if (convsStr) dispatch({ type: 'SET_CONVERSATIONS', payload: JSON.parse(convsStr) });
        if (currentId) dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: currentId });
      } catch (e) {
        console.error('Failed to load persisted data', e);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, []);

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
    const current = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const merged = { ...(current ? JSON.parse(current) : DEFAULT_SETTINGS), ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
  }, []);

  const saveConversations = useCallback(async (convs: Conversation[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  }, []);

  const createNewConversation = useCallback((): string => {
    const id = `conv_${Date.now()}`;
    const conv: Conversation = {
      id,
      title: 'گفتگوی جدید',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: conv });
    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: id });
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
    return id;
  }, []);

  const currentConversation = state.conversations.find(
    c => c.id === state.currentConversationId
  ) ?? null;

  return (
    <AppContext.Provider value={{
      state, dispatch, currentConversation,
      updateSettings, createNewConversation, saveConversations,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
