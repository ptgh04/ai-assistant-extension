import { isProviderId, type ProviderId } from '@/ai-backend/ai/types';
import { decryptString, encryptString } from './crypto';
import { cacheApiKeys, clearCachedApiKey } from './key-manager';
import { VAULT_STORAGE_KEY, type VaultRecord, type VaultSecret } from './types';

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultError';
  }
}

export function validateCredentials(apiKey: string, passphrase: string): void {
  if (apiKey.trim().length < 20) throw new VaultError('Enter a valid API key.');
  if (passphrase.length < 12) throw new VaultError('Vault passphrase must contain at least 12 characters.');
}

function damaged(): never {
  throw new VaultError('The saved vault is damaged or unsupported. It has not been overwritten.');
}

export async function getVaultRecord(): Promise<VaultRecord | null> {
  const result = await chrome.storage.local.get(VAULT_STORAGE_KEY);
  const value: unknown = result[VAULT_STORAGE_KEY];
  if (value === undefined) return null;
  if (!value || typeof value !== 'object') damaged();
  const record = value as Record<string, unknown>;
  if ((record.version !== 1 && record.version !== 2) ||
      !isProviderId(record.provider) || typeof record.model !== 'string' ||
      typeof record.ciphertext !== 'string' || typeof record.salt !== 'string' ||
      typeof record.iv !== 'string' || typeof record.updatedAt !== 'number') damaged();
  if (record.version === 1 && record.provider !== 'openai') damaged();
  if (record.version === 2) {
    if (!record.models || typeof record.models !== 'object' || Array.isArray(record.models)) damaged();
    const models = record.models as Record<string, unknown>;
    if (!Object.entries(models).every(([provider, model]) => isProviderId(provider) && typeof model === 'string')) damaged();
    if (models[record.provider as ProviderId] !== record.model) damaged();
  }
  return value as VaultRecord;
}

export function getVaultModels(record: VaultRecord): Partial<Record<ProviderId, string>> {
  return record.version === 1 ? { openai: record.model } : { ...record.models };
}

async function decryptKeys(record: VaultRecord, passphrase: string): Promise<VaultSecret['keys']> {
  try {
    const value: unknown = JSON.parse(await decryptString(record.ciphertext, passphrase, record.salt, record.iv));
    if (!value || typeof value !== 'object') damaged();
    const secret = value as Record<string, unknown>;
    if (record.version === 1) {
      if (secret.marker !== 'ai-helper-vault-v1' || typeof secret.apiKey !== 'string' || secret.apiKey.length < 20) damaged();
      return { openai: secret.apiKey };
    }
    if (secret.marker !== 'ai-helper-vault-v2' || !secret.keys || typeof secret.keys !== 'object' || Array.isArray(secret.keys)) damaged();
    const entries = Object.entries(secret.keys);
    if (!entries.length || !entries.every(([provider, key]) => isProviderId(provider) && typeof key === 'string' && key.length >= 20)) damaged();
    const keys = secret.keys as VaultSecret['keys'];
    if (Object.keys(getVaultModels(record)).some((provider) => !keys[provider as ProviderId]) ||
        Object.keys(keys).some((provider) => !getVaultModels(record)[provider as ProviderId])) damaged();
    return keys;
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError('Incorrect passphrase or damaged vault.');
  }
}

export async function resetVault(): Promise<void> {
  await chrome.storage.local.remove(VAULT_STORAGE_KEY);
  clearCachedApiKey();
}

export async function createVault(
  apiKey: string, passphrase: string, model: string, provider: ProviderId = 'openai',
): Promise<VaultRecord> {
  const normalizedApiKey = apiKey.trim();
  validateCredentials(normalizedApiKey, passphrase);
  const existing = await getVaultRecord();
  // Re-authenticate before merging, so adding a provider never replaces other keys.
  const keys = existing ? await decryptKeys(existing, passphrase) : {};
  const secret: VaultSecret = { marker: 'ai-helper-vault-v2', keys: { ...keys, [provider]: normalizedApiKey } };
  const encrypted = await encryptString(JSON.stringify(secret), passphrase);
  const record: VaultRecord = {
    version: 2, provider, model,
    models: { ...(existing ? getVaultModels(existing) : {}), [provider]: model },
    ...encrypted, updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: record });
  cacheApiKeys(secret.keys);
  return record;
}

export async function unlockVault(passphrase: string): Promise<VaultRecord> {
  const record = await getVaultRecord();
  if (!record) throw new VaultError('No saved vault was found.');
  const keys = await decryptKeys(record, passphrase);
  cacheApiKeys(keys);
  return record;
}

export async function updateVaultModel(model: string, provider: ProviderId = 'openai'): Promise<VaultRecord> {
  const record = await getVaultRecord();
  if (!record) throw new VaultError('No saved vault was found.');
  if (!getVaultModels(record)[provider]) throw new VaultError('Save an API key for this provider first.');
  const updated: VaultRecord = record.version === 1
    ? { ...record, model, updatedAt: Date.now() }
    : { ...record, provider, model, models: { ...record.models, [provider]: model }, updatedAt: Date.now() };
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: updated });
  return updated;
}

export function lockVault(): void {
  clearCachedApiKey();
}
