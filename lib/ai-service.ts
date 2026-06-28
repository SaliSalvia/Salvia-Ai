/**
 * SalviaX AI Service
 * Handles AI API calls via Puter.js (WebView bridge) and direct API calls
 */

import { AppSettings, ModelId, AI_MODELS } from '@/constants/salviax';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

// ─── OpenRouter / Groq direct streaming ───────────────────────────────────────
export async function streamFromOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  try {
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
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      callbacks.onError(`OpenRouter Error: ${response.status} - ${err}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError('No response body'); return; }

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
          // Skip malformed lines
        }
      }
    }
    callbacks.onComplete();
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError(err.message ?? 'Unknown error');
  }
}

export async function streamFromGroq(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  try {
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
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      callbacks.onError(`Groq Error: ${response.status} - ${err}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { callbacks.onError('No response body'); return; }

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
          // Skip
        }
      }
    }
    callbacks.onComplete();
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError(err.message ?? 'Unknown error');
  }
}

// ─── Puter.js HTML for WebView ─────────────────────────────────────────────────
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
  try {
    const messages = ${messagesJson};
    const model = ${modelJson};
    
    // Convert messages to Puter format
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const history = messages.slice(0, -1);
    
    const response = await puter.ai.chat(lastUserMsg.content, {
      model: model,
      stream: true,
    });
    
    for await (const chunk of response) {
      const token = chunk?.text || chunk?.delta?.content || '';
      if (token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', data: token }));
      }
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'done' }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: err.message || String(err) }));
  }
})();
</script>
</body>
</html>`;
}

// ─── Model routing ─────────────────────────────────────────────────────────────
export function getModelProvider(modelId: ModelId, settings: AppSettings): 'puter' | 'openrouter' | 'groq' {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (!model) return 'puter';

  if ((model.provider as string) === 'openrouter' && settings.openrouterApiKey) return 'openrouter';
  if ((model.provider as string) === 'groq' && settings.groqApiKey) return 'groq';
  return 'puter';
}

// ─── Image Generation ──────────────────────────────────────────────────────────
export async function generateImageStability(
  prompt: string,
  apiKey: string
): Promise<string> {
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
    }
  );

  if (!response.ok) throw new Error(`Stability AI error: ${response.status}`);
  const data = await response.json();
  const base64 = data.artifacts?.[0]?.base64;
  if (!base64) throw new Error('No image generated');
  return `data:image/png;base64,${base64}`;
}
