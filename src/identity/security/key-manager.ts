import type { ProviderId } from '@/ai-backend/ai/types';

let sessionKeys: Partial<Record<ProviderId, string>> = {};

export function cacheApiKey(apiKey: string, provider: ProviderId = 'openai'): void {
  sessionKeys[provider] = apiKey;
}

export function cacheApiKeys(keys: Partial<Record<ProviderId, string>>): void {
  sessionKeys = { ...keys };
}

export function getCachedApiKey(provider: ProviderId = 'openai'): string | null {
  return sessionKeys[provider] ?? null;
}

export function hasCachedApiKeys(): boolean {
  return Object.keys(sessionKeys).length > 0;
}

export function clearCachedApiKey(): void {
  sessionKeys = {};
}
