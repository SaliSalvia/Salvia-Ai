// SalviaX AI - App Constants

export const COLORS = {
  bg: '#07071a',
  sidebar: '#101012',
  surface: '#101012',
  surface2: '#1a1a2e',
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  violetDim: 'rgba(139,92,246,0.15)',
  text: '#e2e8f0',
  muted: '#7c7aaa',
  border: 'rgba(139,92,246,0.2)',
  borderBright: 'rgba(139,92,246,0.4)',
  input: '#0f0f1e',
  userBubble: 'rgba(139,92,246,0.2)',
  aiBubble: '#101012',
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.1)',
  white: '#ffffff',
  black: '#000000',
} as const;

// Production-grade models with proven stability
export const AI_MODELS = [
  { id: 'gpt-4o',       label: 'GPT-4o',        provider: 'puter', icon: '🤖' },
  { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',   provider: 'puter', icon: '⚡' },
  { id: 'claude-sonnet-4', label: 'Claude 4', provider: 'puter', icon: '🧠' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0', provider: 'puter', icon: '✨' },
  { id: 'deepseek-chat', label: 'DeepSeek V3',   provider: 'puter', icon: '🔍' },
  // Fast & reliable with Groq
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B (Groq)', provider: 'groq', icon: '🦙' },
  // OpenRouter models - stable with API key
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B', provider: 'openrouter', icon: '🚀' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo (OR)', provider: 'openrouter', icon: '⚙️' },
] as const;

export type ModelId = typeof AI_MODELS[number]['id'];

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  selectedModel: ModelId;
  language: 'fa' | 'en';
  groqApiKey: string;
  openrouterApiKey: string;
  stabilityApiKey: string;
  googleAiApiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  selectedModel: 'gpt-4o',
  language: 'fa',
  groqApiKey: '',
  openrouterApiKey: '',
  stabilityApiKey: '',
  googleAiApiKey: '',
};

export const STORAGE_KEYS = {
  SETTINGS: '@salviax_settings',
  CONVERSATIONS: '@salviax_conversations',
  CURRENT_CONVERSATION: '@salviax_current_conv',
} as const;
