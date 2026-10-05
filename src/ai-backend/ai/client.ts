import { buildChatInput } from './prompt';
import { consumeResponseStream } from './stream';
import { getProvider, type AiErrorCode, type ProviderId, type StreamChatOptions } from './types';

const API_URLS: Record<ProviderId, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

export class AiServiceError extends Error {
  constructor(public readonly code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function headers(provider: ProviderId, apiKey: string): Record<string, string> {
  const common = { 'Content-Type': 'application/json' };
  if (provider === 'anthropic') return {
    ...common, 'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (provider === 'gemini') return { ...common, 'x-goog-api-key': apiKey };
  return { ...common, Authorization: `Bearer ${apiKey}` };
}

async function checkResponse(response: Response, provider: ProviderId): Promise<void> {
  if (response.ok) return;
  const name = getProvider(provider).label;
  let invalidKey = response.status === 401;
  // Google reports malformed keys as 400, not 401. Never surface raw error bodies.
  if (provider === 'gemini' && response.status === 400) {
    const payload: unknown = await response.json().catch(() => null);
    const details = object(object(payload).error).details;
    invalidKey = Array.isArray(details) && details.some((detail) => object(detail).reason === 'API_KEY_INVALID');
  }
  if (invalidKey) throw new AiServiceError('invalid_api_key', `Invalid ${name} API key.`);
  if (response.status === 403) throw new AiServiceError('forbidden', `${name}: this key cannot access the selected model.`);
  if (response.status === 429) throw new AiServiceError('rate_limit', `${name} rate limit or usage limit reached. Please try again later.`);
  if (response.status >= 500) throw new AiServiceError('server_error', `${name} is temporarily unavailable. Please try again.`);
  throw new AiServiceError('invalid_response', `${name} request failed with status ${response.status}. Check the model and account access.`);
}

async function withTimeout(
  provider: ProviderId, timeoutMs: number, operation: (signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const controller = new AbortController();
  if (globalThis.navigator?.onLine === false) {
    throw new AiServiceError('network_error', 'You are offline. Reconnect before sending a request.');
  }
  const offline = () => controller.abort('offline');
  window.addEventListener?.('offline', offline);
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await operation(controller.signal);
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (controller.signal.reason === 'offline') throw new AiServiceError('network_error', 'You are offline. Reconnect before sending a request.');
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new AiServiceError('timeout', `The ${getProvider(provider).label} request timed out.`);
    }
    if (error instanceof TypeError) throw new AiServiceError('network_error', 'Network error. Check your connection and try again.');
    throw new AiServiceError('invalid_response', 'The AI service returned an invalid response stream.');
  } finally {
    window.clearTimeout(timeout);
    window.removeEventListener?.('offline', offline);
  }
}

export async function testConnection(provider: ProviderId, apiKey: string, model: string): Promise<void> {
  if (apiKey.trim().length < 20) throw new AiServiceError('invalid_api_key', 'Enter a valid API key.');
  await withTimeout(provider, 15_000, async (signal) => {
    const response = await fetch(`${API_URLS[provider]}/models/${encodeURIComponent(model)}`, {
      headers: headers(provider, apiKey.trim()), signal, redirect: 'error',
    });
    await checkResponse(response, provider);
  });
}

export const testOpenAiConnection = (apiKey: string, model: string): Promise<void> =>
  testConnection('openai', apiKey, model);

function chatRequest(options: StreamChatOptions, provider: ProviderId) {
  const input = buildChatInput(options.messages, options.pageContent, options.responseLanguage);
  const system = input.filter((item) => item.role === 'developer').map((item) => item.content).join('\n');
  const messages = input.filter((item) => item.role !== 'developer');
  if (provider === 'anthropic') return {
    path: '/messages',
    body: { model: options.model, max_tokens: 4096, system, messages, stream: true },
  };
  if (provider === 'gemini') return {
    path: `/models/${encodeURIComponent(options.model)}:streamGenerateContent?alt=sse`,
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }],
      })),
      generationConfig: { maxOutputTokens: 8192 },
    },
  };
  return { path: '/responses', body: { model: options.model, input, stream: true, store: false } };
}

function incomplete(): never {
  throw new AiServiceError('invalid_response', 'The response is incomplete or blocked. Partial text was kept; try again.');
}

export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const provider = options.provider ?? 'openai';
  const request = chatRequest(options, provider);
  let completed = false;
  let anthropicStopped = false;
  await withTimeout(provider, 60_000, async (signal) => {
    const response = await fetch(`${API_URLS[provider]}${request.path}`, {
      method: 'POST', headers: headers(provider, options.apiKey), signal,
      redirect: 'error', body: JSON.stringify(request.body),
    });
    await checkResponse(response, provider);
    if (!response.body) throw new AiServiceError('invalid_response', 'The AI service returned an empty response stream.');
    await consumeResponseStream(response.body, (value) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) incomplete();
      const event = object(value);
      if (event.type === 'error' || event.error) {
        const type = object(event.error).type;
        const code: AiErrorCode = type === 'overloaded_error' ? 'server_error' : type === 'rate_limit_error' ? 'rate_limit' : 'invalid_response';
        throw new AiServiceError(code, `${getProvider(provider).label} returned a streaming error. Please try again.`);
      }
      if (provider === 'openai') {
        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') options.onDelta(event.delta);
        if (event.type === 'response.completed') completed = true;
        if (event.type === 'response.failed' || event.type === 'response.incomplete') incomplete();
      } else if (provider === 'anthropic') {
        const delta = object(event.delta);
        if (event.type === 'content_block_delta' && delta.type === 'text_delta' && typeof delta.text === 'string') options.onDelta(delta.text);
        if (event.type === 'message_delta' && delta.stop_reason) {
          if (delta.stop_reason !== 'end_turn' && delta.stop_reason !== 'stop_sequence') incomplete();
          anthropicStopped = true;
        }
        if (event.type === 'message_stop') completed = anthropicStopped;
      } else {
        if (object(event.promptFeedback).blockReason) incomplete();
        const candidate = object(Array.isArray(event.candidates) ? event.candidates[0] : null);
        const parts = object(candidate.content).parts;
        if (Array.isArray(parts)) for (const part of parts) {
          const item = object(part);
          if (item.thought !== true && typeof item.text === 'string') options.onDelta(item.text);
        }
        if (candidate.finishReason) {
          if (candidate.finishReason !== 'STOP') incomplete();
          completed = true;
        }
      }
    });
    if (!completed) throw new AiServiceError('network_error', 'The stream ended early. Partial text was kept; try again.');
  });
}
