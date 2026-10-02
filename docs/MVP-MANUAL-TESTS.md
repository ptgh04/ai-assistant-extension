# Simplified MVP — manual acceptance tests

Do not mark a test PASS just because the build succeeds. Use Chrome 116+,
the production `.output/chrome-mv3` directory, a normal HTTPS page, and your
own keys for OpenAI, Anthropic, and Google Gemini with model access and quota. Enter keys in the extension,
not in chat, source files, screenshots, or test reports.

Automated tests use synthetic credentials and mocked network responses.
They test application behavior, not live model availability or response quality.
Record date, Chrome version, build, result, and failure details for each test.

| Test | Procedure | Expected result | Manual result |
| --- | --- | --- | --- |
| 01 Installation | Build; enable Developer mode in chrome://extensions; Load unpacked; pin and click AI Helper. | Side Panel opens; no uncaught extension/console errors. | NOT RUN |
| 02 Setup | Complete passphrase → provider/model → API key → Validate & Save for any of the three providers; reload extension; unlock. Add the other keys in Settings using the same passphrase. Also close setup midway and reopen. | Ciphertext persists; reload locks; correct passphrase unlocks all saved keys; adding a provider preserves other keys; wizard progress persists but secrets must be entered again. | NOT RUN |
| 03 Chat | Select each saved provider and send a question with a valid, funded key. Save Provider & Model; reload and unlock. Select a provider without a saved key. | One real AI answer per request; correct provider restored; a missing key prevents requests rather than using another provider. | NOT RUN — live keys required |
| 04 Streaming | Send a question needing a long answer. | Waiting changes to Streaming; text appears incrementally; final state is Response saved. Closing/reloading during generation may interrupt it. | NOT RUN — live key required |
| 05 Conversation | New Chat; send; Rename; search title and message content; reopen first; continue; delete active/inactive chats; reload. | Search supports Vietnamese without accents; confirmation before delete; deleted messages removed; deleting active chat opens a blank chat, while deleting another preserves current chat. | NOT RUN |
| 06 Context Menu | Highlight text; right-click → AI Helper with panel closed, open, locked, and Settings/history visible. | Panel opens, overlays close, selected text and actions appear at the top; locked vault keeps selection until unlock; no AI call until an action is chosen. | NOT RUN |
| 07 Page Context | Click extension toolbar on an HTTPS article; Ask AI about this page. Repeat after navigating domains. | Readable context and AI answer; scripts/styles/iframes/forms/hidden text excluded. If permission expired, re-click toolbar to grant activeTab. | NOT RUN — live key required |
| 08 AI Tools | With selection, then with page context: Summarize, Explain, Translate Vietnamese/English/Auto, Rewrite Formal/Simple/Shorter/Professional. | Named action progress; appropriate conversation title; Auto translates Vietnamese to English and other languages to Vietnamese; output streams and saves. | NOT RUN — live key required |
| 09 Security | Inspect storage, source, console; reload; test wrong passphrase; lock during a reply; add/replace keys; migrate a v1 OpenAI vault; reset with and without RESET. | No plaintext keys/passphrase in storage or logs; keys only in their provider's authentication headers (never URL parameters); wrong passphrase leaves existing keys intact; lock clears all keys; reset removes all keys but preserves history. | NOT RUN |
| 10 Errors | Invalid key; mock/trigger 401/403/429/5xx; DevTools Offline; timeout; interrupted SSE; empty page; long page; chrome:// page; storage write failure. | Readable error, controls recover, no false success; partial answer retained where possible; oversized content truncated. | NOT RUN (automated coverage available) |

## Additional UI checks

- Choose Light, Dark, and System in Settings; change the OS theme while in
  System mode; reload and verify the preference persists.
- Switch English/Tiếng Việt; Settings, actions, history and setup/unlock update;
  reload and verify the language persists. Vault reset keeps these preferences.
- Set **Response language** to Vietnamese while keeping the interface in English,
  and then reverse them. For each provider, check new chat, page, summarize,
  explain and rewrite replies follow the response language. Reload and verify the
  selection remains. Translation must still follow its English/Vietnamese/Auto
  target, even when different from the response language. Change the setting during
  a response: only the next request uses the new language. Existing messages stay
  unchanged. Live output-language compliance remains **NOT RUN — live keys required**.
- Go offline with a draft entered: a banner appears and send/actions are disabled.
  Reconnect: recovery notice appears and the draft is unchanged.
- Enable reduced motion: decorative animation is suppressed.

- At widths 320, 360, and 600px and short window heights: no horizontal overflow;
  tools/options, context preview, chat, and composer remain reachable by scrolling.
- Keyboard Tab reaches labeled inputs/buttons; Shift+Enter inserts a newline;
  Enter during IME composition does not send.
- No API Key shows setup; Vault Locked shows unlock; corrupt/unreadable vault
  shows an error and retry rather than overwriting stored data.
- Removing a context card means the next request sends no page context. Existing
  context is a frozen snapshot; it is not automatically refreshed on navigation.
- Reset vault explicitly explains that it does not revoke keys at their providers.
- Open an existing v1 OpenAI vault, unlock, add another provider and verify the
  OpenAI key and history still work. Try a wrong passphrase and failed storage
  write while adding a key: the original vault must remain intact.
- Switch provider while streaming: the selector is disabled until completion.
- Confirm requests use only the selected API host, even after 429 or network errors.

## Privacy and known boundaries

- All API keys are encrypted together at rest (PBKDF2-HMAC-SHA-256, 600,000 iterations,
  random salt; AES-GCM-256 with random IV). Passphrase is never persisted.
- Keys are kept in the Side Panel's memory while unlocked. Reopening/reloading
  the panel requires unlock. This is narrower than the older browser-session ADR.
- Chat messages/history are local plaintext, not encrypted by the vault.
- Selected text is temporarily handed off through local storage, then consumed.
  Attached PageContent is an in-memory snapshot, not a live page attachment.
- The provider receives the question, the latest 20 messages, and attached
  context. OpenAI requests use `store: false`; this is not a claim of zero
  retention at any provider. Switching provider sends recent conversation
  messages and attached content to that newly selected provider.
- Page limits are 12,000 characters and 3,000 **estimated** tokens (four characters
  per token). This heuristic is not exact tokenization, especially for Vietnamese,
  CJK, or emoji. It does not cap total conversation tokens.
- Test Connection checks model metadata access. A successful test does not
  guarantee generation quota; actual chat can still return 429 or other errors.
- One active Side Panel is the MVP usage target; simultaneous writes from
  multiple browser windows are not transactionally synchronized.

## Scope precedence

The user-approved Simplified MVP supersedes the larger historical ADR scope:
three explicitly selected BYOK providers (approved in ADR-024), four explicit tools, on-demand smart extraction, latest-N
history, no rolling summary/branching/agentic/Skill Engine. This implementation
does not claim full compliance with ADR-011/017/023: validation is metadata-based,
unlock is panel-scoped, v1 vaults are read and migrate to a v2 encrypted key map,
and the bundled common-password blocklist is not implemented.

## Future Work (not implemented)

Fallback chain; Omnibox; Skill Engine and skills.sh; agentic;
ActionProposal/ActionResult; Human-in-the-Loop; Artifact Engine; PPTX/PDF/XLSX;
private backend; cloud sync; database server; rolling summary; full extraction;
multiple context strategies.
