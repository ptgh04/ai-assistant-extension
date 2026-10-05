# AI Helper

AI Helper is a Chrome Manifest V3 extension built with WXT, React, TypeScript,
Tailwind CSS, and Zustand. The project is currently at **Phase 6** of the
Simplified MVP with the approved three-provider update: the Side Panel streams
OpenAI, Anthropic, or Google Gemini responses, protects each BYOK key
in an encrypted local vault, persists conversation history locally, and reads
selected text or the active page only after an explicit user action. It also
provides the four scoped AI tools: Summarize, Explain, Translate, and Rewrite.

The four-step Setup Wizard gates chat until the vault is saved. Reloading the
panel shows an unlock screen. Settings supports connection tests, model saving,
queued locking, and vault reset/key replacement without deleting conversations.

## Choose a provider

During setup, select OpenAI, Anthropic, or Google Gemini and enter that provider's
key. To add another provider later, open Settings, select the provider, enter its
key and your **existing vault passphrase**, then click **Validate & Save**.
Saved keys remain separate. **Replace API key** changes only the selected key.
Select a saved provider/model and click **Save Provider & Model** to make it the
default after reopening. Each request goes to the selected provider; there is
no automatic fallback. Switching an existing conversation sends its recent
messages and attached context to the newly selected provider.

Version-1 OpenAI vaults still unlock. They migrate to version 2 on the next
successful key save, keeping the OpenAI key and conversation history.
Reset vault removes all provider keys. Model access and generation quota depend
on the account; Test Connection checks model metadata access only.

### Model dropdowns

Setup and Settings share a curated text-chat catalog (checked October 1, 2026):

- **OpenAI — 7 models:** GPT-6 Luna, GPT-6.1 Sol, GPT-6 Astra, GPT-6 Sol,
  GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna.
- **Anthropic — 7 models:** Claude Sonnet 5, Sonnet 5.5, Opus 5.5, Haiku 4.5,
  Opus 5, Sonnet 4.6, and Opus 4.6.
- **Google Gemini — 7 models:** Gemini 3.5 Flash, 3.8 Flash, 3.7 Flash, 3.6 Flash,
  3.5 Flash-Lite, 3.1 Flash-Lite, and 3.1 Pro (Preview).

The dropdown changes with the provider. Select a model, optionally use
**Test Connection**, then **Save Provider & Model**. Saved choices are remembered
separately for each provider after reload. Existing defaults are unchanged; a saved
model outside the catalog remains visible as **Saved model**, never silently replaced.
This is not a live list of models enabled for your account. Access, quota, and billing
depend on the provider; preview availability may change. Image, audio, embedding,
and managed-agent models are outside this text-chat catalog.

Catalog sources: [OpenAI models](https://developers.openai.com/api/docs/models),
[Claude models](https://platform.claude.com/docs/en/models/overview) and
[model lifecycle](https://platform.claude.com/docs/en/about-claude/model-deprecations),
[Gemini models](https://ai.google.dev/gemini-api/docs/models).

## Everyday use and appearance

- Highlight text on a website → right-click → **AI Helper**. The Side Panel opens
  with the selected text and **Summarize / Explain / Translate / Rewrite** actions
  at the top. If the vault is locked, unlock it first; the selection is kept.
- Each action has a named progress indicator and a title for a new conversation.
  Text is sent only when you choose an action or send a message.
- History search matches conversation titles and saved message content, including
  Vietnamese queries without accents.
- Deleting the current conversation removes its messages from storage and opens
  a blank chat. Deleting another conversation keeps the current chat unchanged.
- Settings → **Appearance**: Light, Dark, or System. System follows OS changes.
- Settings → **Interface language**: English or Tiếng Việt. Preferences persist separately
  from the vault and remain available during setup and unlock.
- Translate supports English, Vietnamese, and Auto. Auto translates Vietnamese
  to English, and other source languages to Vietnamese.
- Settings → **Response language**: English or Tiếng Việt, saved automatically.
  This is independent of interface language and guides new chat, page, summarize,
  explain, and rewrite replies on all three providers. Translate retains its own
  English/Vietnamese/Auto target. Existing replies are not rewritten. Changes made
  during a request apply to the next one. On upgrade, a missing response-language
  preference starts with the existing interface language (English on a new install).
  The preference survives panel reload and vault reset.
- Offline/reconnected banners show network changes. Sending is disabled offline,
  while drafts and history stay available.
- Drawer, message, and activity animations honor the system's reduced-motion setting.

## Requirements

- Bun 1.2 or newer
- Google Chrome 116 or newer

## Install

```powershell
bun install
```

## Develop

```powershell
bun run dev
```

WXT starts a dedicated Chrome profile and loads the development extension with
hot reload enabled.

## Verify

```powershell
bun run compile
bun run test
bun run build
```

The production extension is generated in `.output/chrome-mv3`.

## Load the production build in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3` from this project.
5. Pin **AI Helper** and click its toolbar icon.
6. Confirm that the Side Panel opens and displays the empty chat state.

## Phase 6 acceptance

Run the full [10-test manual acceptance suite](docs/MVP-MANUAL-TESTS.md).
Automated tests mock all three APIs; they do not prove live API connectivity or quality.
For an isolated browser smoke test, build first, then run
`bun tests/browser-smoke.js` with `CHROME_PATH` pointing to Chrome for Testing.
Its generated profile and screenshot are written to the gitignored `temp/` folder.

## Manual checklist

- [ ] `bun install` completes.
- [ ] `bun run compile` reports no TypeScript errors.
- [ ] `bun run dev` opens Chrome with the extension loaded.
- [ ] Clicking the toolbar icon opens the Side Panel.
- [ ] A blocking Setup Wizard appears before initial setup.
- [ ] Setup and Settings offer OpenAI, Anthropic, and Google Gemini.
- [ ] Each provider has multiple model choices in both Setup and Settings.
- [ ] Saving a non-default model survives provider switching and panel reload.
- [ ] Each provider uses its own key, model, and native streaming API.
- [ ] Adding/replacing one key preserves the other provider keys.
- [ ] Existing OpenAI vaults still unlock and migrate safely.
- [ ] A provider without a saved key cannot send a request.
- [ ] API errors do not trigger calls to another provider.
- [ ] Test Connection rejects an invalid API key safely.
- [ ] Validate & Save requires a passphrase of at least 12 characters.
- [ ] Saved storage contains ciphertext and never the plaintext API key.
- [ ] Lock vault removes the decrypted key from session memory.
- [ ] Unlock vault accepts the correct passphrase and rejects an incorrect one.
- [ ] Sending a message streams the assistant response incrementally.
- [ ] Reloading the extension restores conversations and messages.
- [ ] New Chat creates and opens a blank conversation.
- [ ] The first user message automatically becomes the conversation title.
- [ ] Rename updates the conversation title.
- [ ] Opening another conversation restores its messages.
- [ ] Delete requires confirmation and removes the selected conversation.
- [ ] Deleting the final conversation creates a fresh New Chat.
- [ ] AI requests use no more than the latest 20 messages as context.
- [ ] Selecting text and choosing **AI Helper** opens the Side Panel and displays
      the selected text.
- [ ] **Ask AI about this page** extracts readable content and sends it to the
      configured AI provider.
- [ ] Script, style, iframe, hidden, navigation, form, and footer content is
      excluded from page extraction.
- [ ] PageContent is capped at 12,000 characters and approximately 3,000
      tokens before leaving the tab.
- [ ] Chrome internal pages and empty pages show readable errors.
- [ ] The production manifest contains no `<all_urls>` permission.
- [ ] Summarize produces a concise overview and important points.
- [ ] Explain uses plain, easy-to-understand language.
- [ ] Translate supports Vietnamese, English, and Auto.
- [ ] Rewrite supports exactly Formal, Simple, Shorter, and Professional.
- [ ] Each AI tool uses selected text when selected text is attached.
- [ ] Each AI tool reads the current page when no PageContent is attached.
- [ ] AI tool output streams into the active conversation and is persisted.
- [ ] 401, 403, 429, network, timeout, and 5xx errors show readable messages.
- [ ] Shift + Enter inserts a line break without sending.
- [ ] The UI remains usable at narrow Side Panel widths.
- [ ] `bun run build` creates `.output/chrome-mv3`.
- [ ] The unpacked production build loads without serious console errors.

See `CONTRIBUTING.md` for the Git workflow and `CONTEXT.md` plus
`docs/adr/ADR.md` for the existing domain documentation.
See the acceptance suite for Simplified MVP scope precedence, privacy boundaries,
and Future Work. Never paste a real API key into the repository or test report.
