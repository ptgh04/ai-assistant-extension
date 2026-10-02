# AI Helper UI/UX update

Implemented the user's requested interaction and appearance changes on 2026-10-01.

## Behavior

The selection context menu is now named **AI Helper**. Its click handler opens
the Side Panel synchronously in the user gesture. The selected PageContent is
handed off through local storage, closes Settings/history overlays, and brings
focus to the action heading. Setup/unlock still protects the vault; the selection
remains available after unlocking.

Actions sit above the conversation and show named progress while running.
New tool conversations get a concise action/source title. Streaming stays
incremental, and automatic scrolling stops when the user scrolls up to read.
Animations respect prefers-reduced-motion.

History search matches titles and saved message text, case-insensitively and
without Vietnamese accents. Deleting the active conversation atomically removes
its saved messages and replaces it with a blank chat; deleting an inactive one
keeps the current messages/context. Navigation operations block competing sends.

Light/Dark/System and English/Tiếng Việt preferences use a separate
chrome.storage.local entry, survive reload and vault reset, and are available
on setup/unlock screens. System theme follows matchMedia changes.

Translate now offers Auto, English and Vietnamese. Auto instructs the model to
translate Vietnamese into English and any other main source language into
Vietnamese. It is a prompt instruction, not a separate local language detector.

Offline/reconnect events show a banner. Offline sends are blocked before saving
a user message; drafts remain editable. If connectivity is lost during an API
request, the request is aborted and available partial text is kept. General API
network failures also show a readable error.

## Verification

- Bun unit/integration tests: 46 passed, including active/inactive deletion,
  offline send blocking, action titles, Auto prompts, preference persistence,
  history search, all three providers and existing vault migration.
- TypeScript strict check and production Chrome MV3 build: passed.
- Chrome for Testing with intercepted provider APIs: setup, three-provider
  chat, search/rename/delete, selection handoff revealing actions, activity
  headings, all translation choices, offline/reconnect draft retention,
  English/Vietnamese UI, all theme modes, reload persistence, and 320/360px
  layouts passed.
- Screenshots: temp/ui-settings-dark.png and temp/ui-chat-light.png.
- Native Chrome right-click menu/toolbar gestures and live-provider translation
  quality remain manual checks; the headless browser exercises the extension
  page and the context-menu handler is covered separately by automated tests.

The context-menu implementation follows Chrome's
[Side Panel user-gesture API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel#user-interaction).

## Follow-up: response language

Settings now separates **Interface language** from **Response language**. Both
offer English and Tiếng Việt. The response preference is saved automatically in
the existing preferences entry, survives reload and vault reset, and is also
available through the shared controls in setup/unlock. Older stored preferences
without this field use their existing interface language initially. The app waits
for preferences to load before rendering the interactive screens.

Chat, page questions, Summarize, Explain, and Rewrite attach the chosen language
to the provider's instruction message. Each request snapshots the preference;
changes affect subsequent requests only, and do not rewrite saved messages.
Translate omits this instruction so its English/Vietnamese/Auto target stays
authoritative. Explicit translation requests typed in chat are also allowed to
use their requested target language. The instruction/data separation follows
[OpenAI Docs](https://developers.openai.com/api/docs/guides/prompt-engineering).

Verification after this update: **86 Bun tests / 520 assertions passed**, strict
TypeScript and production MV3 build passed. Chrome for Testing confirmed both
dropdowns, independent language choices, native request instructions for all
three providers, translation-target precedence, reload persistence, and reset
retention. All provider responses were mocked; real AI language compliance still
requires the live-key checks in the manual suite.
