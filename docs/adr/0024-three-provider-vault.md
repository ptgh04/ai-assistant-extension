# ADR-024: Three explicitly selected BYOK providers

Accepted on 2026-10-01 following the user's explicit confirmation of OpenAI,
Anthropic, and Google Gemini in the MVP. This supersedes the Simplified MVP's
single-provider restriction, but does not enable the broader fallback-chain
architecture in the original domain documents. Each request uses exactly the
provider selected by the user, its native streaming API, and its own API key;
there is no automatic retry against another provider. The existing PBKDF2 and
AES-GCM vault encrypts a version-2 payload containing a provider-key map under
one passphrase. Version-1 OpenAI vaults remain readable and migrate only after a
successful credential save with the existing passphrase. A failed decrypt,
validation, or storage write must not replace the existing vault or session
keys. Switching providers requires a saved key for that provider; resetting
the vault deletes all provider keys but preserves conversations. This adds
three native protocol adapters and migration tests, while avoiding a backend,
provider SDK dependencies, fallback routing, or any other expansion of MVP
scope. Public provider/model metadata remains unencrypted; keys and the
passphrase are never persisted in plaintext.
