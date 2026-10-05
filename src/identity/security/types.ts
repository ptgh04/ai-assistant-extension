import type { ProviderId } from '@/ai-backend/ai/types';

export const VAULT_STORAGE_KEY = 'aiHelperVault';

interface EncryptedRecord {
  model: string;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
}

export interface LegacyVaultRecord extends EncryptedRecord {
  version: 1;
  provider: 'openai';
}

export interface MultiProviderVaultRecord extends EncryptedRecord {
  version: 2;
  provider: ProviderId;
  models: Partial<Record<ProviderId, string>>;
}

export type VaultRecord = LegacyVaultRecord | MultiProviderVaultRecord;

export interface VaultSecret {
  marker: 'ai-helper-vault-v2';
  keys: Partial<Record<ProviderId, string>>;
}

export type VaultStatus = 'loading' | 'missing' | 'locked' | 'unlocked' | 'error';
