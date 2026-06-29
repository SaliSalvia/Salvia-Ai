/**
 * SalviaX AI Service - Production Grade
 * Handles AI API calls with timeout, retry logic, and robust error handling
 */

import { AppSettings, ModelId, AI_MODELS } from '@/constants/salviax';

const STREAM_TIMEOUT = 45000; // 45 seconds for initial response
const CHUNK_TIMEOUT = 5000;   // 5 seconds between chunks
const MAX_RETRIES = 2;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ─── OpenRouter with timeout & retry ──────────────────────────────────────
export async function streamFromOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  let retries = 0;
  const maxRetries = MAX_RETRIES;

  while (retries <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT);
      const combinedSignal = AbortSignal.any([signal, controller.signal]);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://salviax.ai',
          'X-Title': 'SalviaX AI',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 2048, // Reduced from 4096
          temperature: 0.7,
        }),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) {
          throw new Error('Rate limited - please wait before retrying');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let lastChunkTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lastChunkTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const token = json.choices?.[0]?.delta?.content;
            if (token) callbacks.onToken(token);
          } catch {
            // Skip malformed JSON
          }
        }
      }
      callbacks.onComplete();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError('Request cancelled');
        return;
      }

      if (err instanceof TimeoutError || err.message.includes('timeout')) {
        if (retries < maxRetries) {
          retries++;
          await new Promise(r => setTimeout(r, 1000 * retries)); // Exponential backoff
          continue;
        }
        callbacks.onError('Response timeout - try with a shorter prompt');
        return;
      }

      callbacks.onError(err.message || 'Unknown error');
      return;
    }
  }
}

// ─── Groq with timeout & retry ────────────────────────────────────────────
export async function streamFromGroq(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  let retries = 0;
  const maxRetries = MAX_RETRIES;

  while (retries <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT);
      const combinedSignal = AbortSignal.any([signal, controller.signal]);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model === 'groq-llama' ? 'llama-3.3-70b-versatile' : model,
          messages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) {
          throw new Error('Rate limited - wait before retry');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const token = json.choices?.[0]?.delta?.content;
            if (token) callbacks.onToken(token);
          } catch {
            // Skip malformed JSON
          }
        }
      }
      callbacks.onComplete();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError('Request cancelled');
        return;
      }

      if (err instanceof TimeoutError || err.message.includes('timeout')) {
        if (retries < maxRetries) {
          retries++;
          await new Promise(r => setTimeout(r, 1000 * retries));
          continue;
        }
        callbacks.onError('Response timeout - try again');
        return;
      }

      callbacks.onError(err.message || 'Unknown error');
      return;
    }
  }
}

// ─── Puter.js HTML with timeout handling ──────────────────────────────────
export function buildPuterHTML(
  messages: Array<{ role: string; content: string }>,
  model: string
): string {
  const messagesJson = JSON.stringify(messages);
  const modelJson = JSON.stringify(model);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://js.puter.com/v2/"></script>
</head>
<body>
<script>
(async function() {
  let timeoutId = null;
  try {
    if (!window.ReactNativeWebView) {
      throw new Error('WebView not available');
    }

    const messages = ${messagesJson};
    const model = ${modelJson};
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();

    // 45 second timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Puter timeout')), 45000);
    });

    const response = await Promise.race([
      puter.ai.chat(lastUserMsg.content, {
        model: model,
        stream: true,
      }),
      timeoutPromise
    ]);

    let tokenCount = 0;
    for await (const chunk of response) {
      if (timeoutId) clearTimeout(timeoutId);
      const token = chunk?.text || chunk?.delta?.content || '';
      if (token) {
        tokenCount++;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', data: token }));
      }
    }
    
    if (tokenCount === 0) {
      throw new Error('No response received');
    }
    
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'done' }));
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const errorMsg = err.message || String(err);
    window.ReactNativeWebView?.postMessage(JSON.stringify({
      type: 'error',
      data: errorMsg.includes('timeout') ? 'Service timeout' : errorMsg
    }));
  }
})();
</script>
</body>
</html>`;
}

// ─── Model routing ────────────────────────────────────────────────────────
export function getModelProvider(modelId: ModelId, settings: AppSettings): 'puter' | 'openrouter' | 'groq' {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (!model) return 'puter';

  // Prioritize paid APIs for stability
  if ((model.provider as string) === 'groq' && settings.groqApiKey) return 'groq';
  if ((model.provider as string) === 'openrouter' && settings.openrouterApiKey) return 'openrouter';
  return 'puter';
}

// ─── Image Generation ─────────────────────────────────────────────────────
export async function generateImageStability(
  prompt: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt, weight: 1 }],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) throw new Error(`Stability AI error: ${response.status}`);
    const data = await response.json();
    const base64 = data.artifacts?.[0]?.base64;
    if (!base64) throw new Error('No image generated');
    return `data:image/png;base64,${base64}`;
  } finally {
    clearTimeout(timeoutId);
  }
}
