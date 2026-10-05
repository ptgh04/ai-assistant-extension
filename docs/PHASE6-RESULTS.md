# Phase 6 — implementation and verification

## Approved three-provider update — 2026-10-01

The current build includes OpenAI, Anthropic, and Google Gemini following the
user's explicit scope amendment. See [ADR-024](adr/0024-three-provider-vault.md).
The original Phase 6 report below is retained as a historical single-provider
baseline; its test counts and host-permission description are superseded here.

- Setup and Settings select the provider and its model explicitly.
- Native OpenAI Responses, Anthropic Messages, and Gemini streamGenerateContent
  requests use separate credentials and provider-specific streaming events.
- Version-2 Vault encrypts all provider keys with one passphrase; version-1
  OpenAI vaults remain readable and migrate on a successful key save.
- Adding/replacing one key preserves other keys and conversation history.
- Missing keys block requests; HTTP and stream failures never switch providers.
- Lock clears all decrypted keys. Reset removes all provider keys, preserving history.
- Manifest host access is limited to the three exact API hosts; no all-URLs permission.

| Current check | Result |
| --- | --- |
| TypeScript strict compilation | PASS |
| Bun tests | PASS: 40 tests, 197 assertions |
| Production Chrome MV3 build | PASS |
| Chrome for Testing smoke | PASS: Anthropic setup, adding OpenAI/Gemini, native requests for all three, ciphertext storage, saved-provider reload/unlock, history, tools, reset and narrow layout |
| Uncaught exceptions in exercised extension page | None |
| Live provider authentication/generation/quota | NOT RUN — tests use synthetic keys and intercepted responses |
| Native Chrome toolbar/Side Panel/context-menu gestures | NOT RUN — existing limitation of headless extension-page smoke |

Protocol/model references: [Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming),
[Anthropic browser authentication headers](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/client.ts),
[Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview),
[Gemini GenerateContent API](https://ai.google.dev/api/generate-content),
[Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash),
and the OpenAI references in the historical report below. Model/account access
is verified through Test Connection, not assumed from a mocked test.

## Objective and scope

Integrate the Simplified MVP's setup, encrypted BYOK vault, chat, conversation
history, page context, selection menu, and exactly four AI tools. No backend or
additional provider was added. Historical broader ADR deviations are documented
in `MVP-MANUAL-TESTS.md`; the Simplified MVP is the current scope.

## Implemented

- Four-step setup with persisted non-secret progress; unsaved secrets stay in memory.
- Loading, No API Key, Vault Locked and storage-error entry screens.
- Settings/API key management: validate/save, test, model, lock, reset/key replacement.
- Vault reset requires RESET and preserves conversations; it does not revoke the provider key.
- Lock waits for an in-flight response and prevents additional sends.
- Chat states: waiting, streaming, response saved, error; incomplete streams keep partial text.
- Failed storage writes preserve the draft; saved assistant messages are not duplicated on retry.
- Safer extraction of hidden descendant text; untrusted page data uses user-level context.
- Narrow-panel controls and scrollable tools/context region.
- Manual acceptance suite with all 10 requested scenarios and explicit limitations.

## Architecture

Side Panel → Settings gate → Setup / Unlock / Chat.
Chat/tools → chatStore → AI client/stream → local conversation history.
Context Menu → background → pending PageContent → Side Panel.
Page action → activeTab + scripting → Smart Extraction → attached context.
Vault → Chrome Storage (ciphertext) + Web Crypto → memory while unlocked.

## Verification performed

| Check | Result | What it establishes |
| --- | --- | --- |
| Bun dependency installation | PASS | linkedom dev dependency installed; lockfile updated; WXT prepare ran |
| TypeScript strict compilation | PASS | Source compiles against generated WXT types |
| `bun run test` | PASS: 23 tests, 102 assertions | Real crypto/store/parser logic with mocked Chrome/network; DOM fixtures and background handlers |
| `bun run build` | PASS | Chrome MV3 production output, 298.22 kB |
| `bun tests/browser-smoke.js` | PASS | Built extension loaded in Chrome for Testing; real React UI and Chrome Storage; OpenAI responses intercepted |
| Browser workflow | PASS | Setup, chat, reload/lock/unlock, history CRUD, selection handoff, four tools, reset preserving history |
| Narrow layout | PASS | 360px and 320px, including a 500px-high viewport; no horizontal overflow; composer reachable |
| Browser exceptions | PASS | No uncaught Runtime exceptions in the exercised extension page |
| Native toolbar/Side Panel/context-menu gestures | NOT RUN | Headless smoke opens sidepanel.html as an extension page; handler tests do not prove native gestures |
| Live OpenAI chat/quality/quota | NOT RUN | No user API key supplied; mocks do not establish provider access |

Chrome profiles and `phase6-chat.png` were generated only under the authorized,
gitignored `temp/` folder. They contain synthetic test credentials and fixture
data, not a user's API key. Tests do not modify a personal Chrome profile.

## Run and load

```powershell
bun install
bun run compile
bun run test
bun run dev
bun run build
```

Load `.output/chrome-mv3` through chrome://extensions → Developer mode → Load
unpacked. Chrome 116+ is enforced by the manifest. For the optional browser
smoke use `bun tests/browser-smoke.js` and set CHROME_PATH to Chrome for Testing.

## Security and API notes

The production manifest has storage, activeTab, scripting, sidePanel,
contextMenus, and only the OpenAI API host. No all-URLs permission, backend,
embedded provider credentials, or declarative content script was added.

OpenAI Docs was used to confirm the existing model IDs against the
[official model catalog](https://developers.openai.com/api/docs/models) and to
check [stream lifecycle events](https://developers.openai.com/api/docs/guides/streaming-responses).
A transport EOF without response.completed is no longer reported as success.

## Completion status

Implementation and automated verification are complete. Release acceptance is
pending the native Chrome gestures and live-provider checks listed above.
Do not change those results to PASS without running them. Use
`MVP-MANUAL-TESTS.md` to record manual outcomes.
