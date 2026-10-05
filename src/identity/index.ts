/**
 * Identity Bounded Context
 * Responsibility: User identity, settings, API key management, onboarding, vault security.
 * See CONTEXT.md & ADR-017.
 */

export { useSettingsStore } from './stores/settingsStore';
export { getCachedApiKey } from './security';
export type { VaultStatus } from './security';
