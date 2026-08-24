# Architecture Decision Records (ADRs)

**Project:** Chrome AI Assistant Extension

---

## ADR-001: Multi-Entry-Point Interaction Model

**Status:** Accepted  
**Date:** 2026-08-15

### Context
The extension needs to be convenient for general consumers. A single interaction model (e.g., omnibar-only) cannot serve all use cases: quick queries, deep conversations, and text actions each need different UI affordances.

### Decision
Support three entry points: **Omnibar** (quick queries → routes to side panel), **Side Panel** (full chat), and **Context Menu** (text actions). All output is ultimately rendered in the side panel for consistency.

### Consequences
- **+** Maximum convenience — users can engage from wherever they are
- **+** Consistent output location (side panel) regardless of entry point
- **-** Three UI surfaces to build and maintain
- **-** Omnibar API has limited input length and no rich formatting

---

## ADR-002: BYOK-Only Backend Strategy

**Status:** Accepted (supersedes original free-tier + BYOK decision; amended 2026-08-17 to promote Google Gemini to MVP)  
**Date:** 2026-08-15

### Context
The original design proposed a free-tier proxy alongside BYOK. Operating a hosted proxy introduces infrastructure cost, abuse prevention complexity, and identity/rate-limiting decisions — all of which add scope without contributing to core product value. The target audience is expected to have or obtain API keys.

### Decision
The extension is **BYOK-only**. Users must configure at least one BYOKProvider (**OpenAI, Anthropic, or Google Gemini at MVP; OpenRouter post-MVP**) before the extension is functional. Google Gemini is supported via the **Gemini API (AI Studio) key** — a plain API key with pay-as-you-go billing — not Vertex AI's OAuth/service-account auth, which is the wrong fit for a consumer extension. There is no hosted proxy and no free tier. The extension is a zero-infrastructure, fully client-side product.

### Consequences
- **+** No server infrastructure to operate or fund
- **+** No abuse prevention complexity
- **+** Users have full visibility and control over their own API costs
- **+** Three MVP providers make the fallback chain meaningful — a transient failure on one provider fails over to the next rather than dead-ending
- **-** Higher onboarding barrier — users without an API key cannot use the extension at all
- **-** Extension is not accessible to users unwilling to obtain an API key
- **-** First-run wizard must be well-designed to minimize drop-off at key configuration (see ADR-011)
- **-** A third provider adapter — Gemini's SSE streaming, tool-calling, and system-instruction formats differ from OpenAI/Anthropic — adds bounded integration cost

---

## ADR-003: Human-in-the-Loop Agentic Safety Model

**Status:** Accepted (amended 2026-08-17: RiskLevel friction model and Forbidden blocklist per ADR-018)  
**Date:** 2026-08-15

### Context
Full agentic capability (AI acting on the page) is powerful but dangerous for consumers. An AI accidentally clicking "Buy" or "Delete Account" is a critical liability.

### Decision
All **allowed** agentic actions follow the RiskLevel friction model (ADR-018): **low-risk** actions (read/scroll) auto-approve and execute immediately with an audit-trail record; **medium-risk** actions (input/navigate) show a proposal card with an optional "Allow all similar" toggle; **high-risk** actions (submit/reversible-delete) show a proposal card with no "Allow all similar" toggle and always require explicit per-action confirmation. **Forbidden** actions (purchase, irreversible-delete) are blocked at the proposal level and never reach the approval UI. Users can block agentic features on specific sites (e.g., banking). See ADR-013 for the "Allow all similar" scope and ADR-018 for the full RiskLevel/friction model.

### Consequences
- **+** Consumer safety — no irreversible or monetary actions without explicit consent (or at all, for forbidden actions)
- **+** User trust — transparent about what the AI wants to do
- **+** Low-risk auto-approval removes friction for harmless read/scroll operations
- **-** Medium and high actions require a click to approve — slower workflow remains for interactive/destructive actions
- **-** Approval fatigue — users may blindly approve after many medium/high actions (mitigated by low-risk auto-approval and the "Allow all similar" toggle, scoped per ADR-013)
- **-** The forbidden blocklist must be maintained as new Action types are introduced

---

## ADR-004: Built-in + User-Defined Skill System with skills.sh Import

**Status:** Accepted  
**Date:** 2026-08-15

### Context
A skill/plugin system enables extensibility. A full internally-hosted marketplace requires curation, security sandboxing, and review infrastructure — too complex for MVP. skills.sh is an existing public platform for sharing prompt scripts, offering community discoverability without the extension owning a registry.

### Decision
Ship **built-in skills** (summarize, explain, translate, rewrite, search, qna) plus **user-defined skills** as YAML prompt templates + tool definitions. Skills may also be imported from **skills.sh** as a single trusted external source. No internally hosted marketplace. All skills — user-authored or imported — are subject to identical validation: required fields checked, tool invocations restricted to the declared `tools` whitelist, undeclared calls rejected at runtime. skills.sh skills are fetched once at import time via a user-pasted YAML URL, stored locally, and version-pinned; the extension does not poll for updates.

### Consequences
- **+** Simple implementation — skills are just structured prompts
- **+** Users can customize deeply without code
- **+** skills.sh provides community discoverability without the extension owning infrastructure
- **-** skills.sh availability is a runtime dependency at import time (mitigated: once imported, skill is fully local)
- **-** The extension inherits skills.sh's curation quality; no independent review of imported skills beyond structural validation
- **-** Tool whitelist requires a maintained allow-list of permitted tool names alongside the skill runner
- **-** Paste-URL import is a power-user UX; casual users may not know how to find or use skills.sh URLs

---

## ADR-005: Inline Preview + Export for Artifact Rendering

**Status:** Accepted  
**Date:** 2026-08-15

### Context
Generated artifacts (slides, infographics, tables) need to be both immediately viewable and downloadable in production-quality formats. Inline-only loses export utility; export-only loses immediate feedback.

### Decision
Render artifact **previews inline** in the side panel (Markdown, charts, slide thumbnails) with an **export button** for full-quality downloads (PPTX, PDF, PNG, CSV, XLSX).

### Consequences
- **+** Immediate visual feedback without leaving the browser
- **+** Production-quality exports for real use
- **-** Two rendering paths to maintain (inline preview + export generation)
- **-** Inline rendering may not match export quality exactly (mitigate with clear "preview" label)

---

## ADR-006: Persistent Named Threads with Append-Only Branching

**Status:** Accepted  
**Date:** 2026-08-15

### Context
Conversation memory is essential for multi-turn AI interactions. Full omnidirectional memory raises privacy concerns and storage costs. Message editing is a standard chat UX expectation but conflicts with a pure append-only log.

### Decision
Use **persistent named threads** stored in chrome.storage.local. Messages are immutable (append-only). Editing a prior message is modeled as **branch replacement**: subsequent messages in the active branch are soft-deleted (archived to storage, not destroyed) and a new branch is appended. The Conversation exposes exactly one active branch at any time. Soft-deleted messages are retained in storage but not surfaced in the MVP UI; a "view edit history" affordance is explicitly deferred to post-MVP.

### Consequences
- **+** User control — explicit about what the AI "knows"
- **+** Privacy — no hidden accumulation of user data
- **+** Append-only audit trail is preserved even across edits via soft-delete
- **+** No data loss — soft-deleted branch messages are recoverable post-MVP
- **-** No cross-thread recall — AI can't reference Thread A while in Thread B
- **-** Thread management UI needed (list, search, archive, delete)
- **-** Branch history is invisible to the user in MVP — a user who edits a message has no way to recover the previous AI response until post-MVP

---

## ADR-007: Chrome Side Panel as Primary Output Surface

**Status:** Accepted  
**Date:** 2026-08-15

### Context
The extension needs a primary UI for chat, rich output, and agentic approvals. Options: popup (too small), overlay (conflicts with page), new tab (too disruptive), side panel (persistent, spacious, native).

### Decision
Use Chrome's **Side Panel API** as the primary output surface. The side panel provides a persistent, resizable chat area alongside the page content.

### Consequences
- **+** Native Chrome integration — consistent with browser UX
- **+** Persistent — stays open across navigation
- **+** Spacious — supports rich rendering
- **-** Requires Chrome 114+ (Side Panel API availability)
- **-** Only one side panel can be open at a time (conflicts with other extensions using side panel)

---

## ADR-008: Programmatic Content Script Injection with activeTab Permission

**Status:** Accepted (amended from declarative injection; token ceiling per ADR-016)  
**Date:** 2026-08-15

### Context
The extension needs to read page content and execute agentic actions via a content script. The original design assumed declarative injection via manifest `content_scripts`, which runs the script on every page the user visits regardless of whether the extension is actively used. This creates an unnecessary passive footprint and triggers Chrome Web Store scrutiny over broad host permissions.

### Decision
Use **programmatic injection** — the background service worker injects the content script into the active tab on demand, the first time the extension is invoked for that tab. Injection state is cached per tab (in the service worker's storage-backed state) and cleared on tab navigation or close. The manifest declares the `activeTab` permission rather than broad host permissions. The content script enforces the PageContent token ceiling per the token budget model (ADR-016) — 40% of the active Model's context window under the `full` ContextStrategy — before transmitting content. For large payloads, communication uses `chrome.runtime.connect()` (long-lived port) rather than `sendMessage`.

### Consequences
- **+** Minimal permission footprint — `activeTab` rather than broad host permissions
- **+** Content script only executes when the user actively invokes the extension on a tab
- **+** Token ceiling enforced at source — background never receives an oversized payload
- **+** Cleaner Chrome Web Store review profile
- **-** First-invocation latency per tab — injection adds overhead on the first action in a new tab
- **-** Content scripts run in isolated world — cannot access the page's JS variables or state
- **-** Must handle restricted pages (chrome://, webstore) gracefully — injection must fail silently with a descriptive side panel error, not an uncaught exception

---

## ADR-009: Stateless MV3 Service Worker with Storage-Backed State

**Status:** Accepted  
**Date:** 2026-08-15

### Context
Manifest V3 background service workers are ephemeral. Chrome terminates them after approximately 30 seconds of inactivity and may kill them at any point. The background is the Orchestrator and owns all durable state. If it holds state in memory, that state is lost on termination — including mid-flight agentic approval flows.

### Decision
The background service worker is treated as **stateless between activations**. All durable state (active conversation, pending ActionProposal, provider config, settings, per-tab content script injection state) is written to `chrome.storage.local` synchronously before the service worker yields control. On each activation, the service worker reconstructs required state from storage. The side panel UI holds only ephemeral display state; `chrome.storage.local` is the single source of truth.

### Consequences
- **+** Resilient to unexpected service worker termination — no data loss on kill
- **+** Consistent with MV3 constraints; does not fight the platform
- **+** Pending ActionProposals survive a service worker restart — agentic flows are not lost during user think time
- **-** Every state mutation requires a synchronous storage write before yielding — no lazy or batched flush
- **-** Service worker cold-start latency (reconstruction from storage) adds overhead to the first operation after idle

---

## ADR-010: skills.sh as Trusted External Skill Source (One-Time Import via Paste URL)

**Status:** Accepted  
**Date:** 2026-08-15

### Context
Skills may be imported from skills.sh in addition to user-authored YAML. skills.sh is a public platform; any author may publish there. The key questions are: how does the user initiate an import, and does the extension treat skills.sh as a live subscription or a one-time import source?

### Decision
skills.sh skills are **fetched once at import time** via a **user-pasted direct YAML URL**. The import flow: (1) user pastes the raw YAML URL into extension settings, (2) the extension fetches and validates the YAML, (3) a preview card shows the skill's name, trigger, and declared tools, (4) the user confirms — only then is the skill written to local storage as a UserDefinedSkill. Version is pinned at import. The extension does not poll for updates; the user re-imports manually to pick up a new version. If skills.sh is unreachable at import time, the import fails cleanly with no partial state written. Imported skills are subject to identical validation as user-authored skills.

### Consequences
- **+** No runtime dependency on skills.sh after import — extension functions offline
- **+** Skill behavior is stable and predictable — no silent upstream changes
- **+** Single validation path — imported and user-authored skills go through identical checks
- **+** Preview step before confirm prevents accidental import of malformed or unexpected skills
- **-** Users do not receive automatic updates to imported skills; they must manually re-import
- **-** Paste-URL import is a power-user interaction; not discoverable by casual users
- **-** No version awareness UI — the extension does not display which skills.sh version was imported

---

## ADR-011: Hard-Block First-Run Setup Wizard

**Status:** Accepted (amended 2026-08-17: provider-specific validation; four-step wizard with vault passphrase per ADR-017)  
**Date:** 2026-08-15

### Context
The extension is BYOK-only (ADR-002). Without a configured and validated API key, every user-initiated action will fail. Three approaches were considered: (A) hard block — no chat UI until setup completes; (B) soft prompt — chat UI visible but gated; (C) wizard-on-install — Chrome's `onInstalled` event opens the options page.

### Decision
On first run, the side panel renders a **blocking four-step wizard** in place of the chat UI: (1) create the vault passphrase (ADR-017), (2) select provider, (3) paste API key, (4) validate via a live test call. The chat UI is not rendered until step 4 succeeds. Validation is provider-specific behind a uniform `validateKey()` interface: OpenAI and Anthropic issue a minimal completion call; Google Gemini issues a free metadata call (`models.list`) that does not consume token quota — this cleanly distinguishes "valid key" from "valid key but no quota," which a completion call cannot. The wizard UI stays identical across providers; only the BYOKProvider's validation method differs. Incomplete wizard state is persisted in chrome.storage.local so that reopening the side panel mid-wizard returns the user to the wizard, not a broken chat UI. The vault passphrase is never persisted and is not recoverable.

### Consequences
- **+** Eliminates the "broken first impression" — the user is never dropped into a non-functional chat UI
- **+** Validation at setup time catches invalid keys before the user attempts to use the extension
- **+** Setup is contained in the side panel — no redirect to an options page
- **+** Gemini validation is free and instant — setup never consumes the user's token quota
- **-** More aggressive than soft-prompt alternatives — curious users who open the extension hit setup immediately
- **-** The four-step flow (vault + provider + key + validation) adds onboarding friction on top of an already-frictional BYOK model
- **-** Wizard must handle all provider-specific key formats and validation failure modes with clear error messaging
- **-** Incomplete wizard state must be persisted — a user who closes mid-setup and reopens must land back in the wizard
- **-** The `validateKey()` interface must accommodate provider-specific semantics without leaking them into the wizard UI
- **-** A forgotten vault passphrase means re-entering all API keys — no recovery path (ADR-017)

---

## ADR-012: ThreadAttachment Navigation Behavior (Non-Blocking Banner)

**Status:** Accepted  
**Date:** 2026-08-15

### Context
A ThreadAttachment binds a Conversation to a specific Page. When the user navigates away from that Page, the attachment becomes stale. Three behaviors were considered: (A) auto-detach silently; (B) auto-update the attachment to the new URL; (C) prompt the user with a non-blocking banner.

Option B is the most dangerous — the AI silently switches context mid-conversation, which a user engaged in a multi-turn discussion about the original page would find confusing or untrustworthy. Option A is safe but loses context in a way the user may not notice until the AI gives a confused response. Option C preserves user control without interrupting their browsing.

### Decision
On navigation away from a ThreadAttachment's Page, the side panel displays a **non-blocking banner** (not a modal) with two actions: **"Use new page"** (updates the ThreadAttachment to the new URL and fetches new PageContent) or **"Keep current"** (transitions the ThreadAttachment to detached state — the old PageContent snapshot already embedded in conversation history continues to serve as context). Dismissing the banner without choosing defaults to "Keep current." The banner appears once per navigation event and does not re-appear for that navigation.

### Consequences
- **+** User retains control — the AI never silently switches context
- **+** Detached state is safe by default — dismissal does not break the ongoing conversation
- **+** Non-blocking — user can continue browsing without being forced to interact with a modal
- **-** One more UI element to build and test in the side panel
- **-** A user who navigates rapidly through multiple pages will see the banner repeatedly (mitigate: banner only appears once per navigation and is easily dismissed)
- **-** "Keep current" as the default for dismissal may surprise users who expected the AI to follow them to the new page

---

## ADR-013: "Allow All Similar" Approval Scope Definition

**Status:** Accepted  
**Date:** 2026-08-15

### Context
ADR-003 introduces an "Allow all similar" toggle on ActionProposals to mitigate approval fatigue in multi-step agentic workflows. "Similar" was left undefined, creating a safety gap: a definition that is too broad effectively disables the approval step for entire categories of actions; too narrow and the toggle is useless.

### Decision
"Allow all similar" approves all subsequent Actions with the **same action type AND the same RiskLevel on the same domain** (eTLD+1). Specifically: a "fill text field" (medium risk) approval on `github.com` does not cover "fill text field" (medium risk) on `gitlab.com`, nor does it cover "click link" (medium risk) on `github.com`. The approval is **session-scoped**: it resets when the Conversation ends or the active domain changes. High-risk actions are explicitly excluded — the "Allow all similar" toggle does not appear on high-risk ActionProposals; those always require per-action explicit confirmation.

### Consequences
- **+** Scoped broadly enough to reduce fatigue on multi-step same-site workflows (e.g., filling multiple fields on a form)
- **+** Domain-scoping prevents cross-site approval bleed
- **+** High-risk actions remain individually gated — the safety model is not degradable via the toggle
- **-** Session scope means approvals reset on every new Conversation — users who open a new thread for every session re-approve on each visit
- **-** eTLD+1 scoping may be too broad for multi-tenant apps (e.g., `app.example.com` vs `admin.example.com` are treated as the same domain)

---

## ADR-014: Ephemeral Artifact Storage in MVP

**Status:** Accepted (amended 2026-08-17: ArtifactSummary persistence per ADR-019)  
**Date:** 2026-08-15

### Context
Artifacts (slides, infographics, tables, charts) are generated rich outputs associated with Messages. They need to be available for export immediately after generation. The question is whether they are persisted across sessions or held only in memory. `chrome.storage.local` has a 10MB default quota — binary artifacts consume it rapidly. `unlimitedStorage` is an unusual manifest permission that attracts Chrome Web Store scrutiny. IndexedDB supports binary data without an effective quota limit but adds API complexity.

### Decision
Artifact **binary content** is **ephemeral in MVP** — generated and held in memory for the duration of the active generation/export session; it is never written to `chrome.storage.local` or IndexedDB. Export triggers a browser download via `URL.createObjectURL` + `<a download>`. A lightweight **ArtifactSummary** (metadata only: type, title, export formats, generated-at) is persisted alongside the parent Message so a restarted extension can render a "Regenerate this artifact" placeholder instead of a zombie reference (ADR-019).

### Consequences
- **+** No storage quota concerns — `unlimitedStorage` permission not required
- **+** Simplest possible implementation — no binary write path, no migration concerns
- **+** No stale artifact problem — re-generation always produces a fresh output
- **+** No zombie Message references — persisted ArtifactSummary enables a regeneration placeholder
- **-** Binary artifacts are lost on side panel close or service worker termination — users must export before losing the preview, or regenerate
- **-** Re-generation has latency and API cost — users who lose a binary artifact and reopen pay twice
- **-** No full artifact history — only ArtifactSummaries persist, not the renderable binary content

---

## ADR-015: Thread Management Drawer in Side Panel

**Status:** Accepted  
**Date:** 2026-08-15

### Context
ADR-006 identifies a thread management UI as a required consequence of persistent named threads (list, rename, archive, delete). Two candidate locations were considered: (A) a drawer or tab inside the side panel, accessible from the chat UI without leaving the extension; (B) the Chrome extension options page, a separate full-page settings UI.

Option B is simpler to build (unconstrained layout, standard options page pattern) but breaks the user's flow — they must right-click the extension icon and navigate away from their tab to manage threads. Option A is more complex but keeps all extension interaction within the side panel, consistent with ADR-007.

### Decision
Thread management is handled via a **thread list drawer** in the side panel, toggled by a persistent icon in the side panel header. The drawer slides in over the chat area and provides: a list of all Conversations (name, last-modified date, active/archived status), rename in-place, archive, delete with confirmation, and the ability to switch to a selected thread. Closing the drawer returns to the active chat. The options page remains available for settings (providers, skills, blocked sites) but thread management is not located there.

### Consequences
- **+** All extension interaction stays within the side panel — consistent with ADR-007
- **+** Thread switching is one gesture from the active chat
- **+** No context switch — user does not leave their current tab to manage threads
- **-** Side panel header must accommodate a thread management icon without cluttering the layout
- **-** Drawer requires its own UI state and navigation stack within the side panel
- **-** Side panel width limits the amount of thread metadata visible in the list

---

## ADR-016: Token Budget Model (PageContent, History, Response Reservation)

**Status:** Accepted  
**Date:** 2026-08-17

### Context
The original design stated two 80% ceilings that collide: PageContent must not exceed 80% of the context window (ADR-008), and the rolling summary triggers when conversation history exceeds 80% of the context window. If both applied, page content alone would leave only 20% for system prompt, history, and the model's response — making the rolling-summary threshold nearly irrelevant and overflowing most page-attached requests. The two thresholds live on different axes: PageContent is an input cap, rolling summary is a history trigger.

### Decision
Adopt an explicit per-request token budget, expressed as fractions of the active Model's context window `W`:
- **Response reservation:** 20% of `W`
- **Input budget:** 80% of `W`, split between PageContent and conversation history
- **PageContent ceiling:** 40% of `W` (`full`), 20% of `W` (`smart-extraction`), 0% (`rolling-summary` — page content is fully summarized away)
- **Conversation history budget:** 40% of `W`
- **Rolling summary trigger:** history tokens exceed 80% of the history budget (32% of `W`); history is summarized down to ~50% of the budget (20% of `W`)

### Consequences
- **+** The two thresholds no longer collide; each has a distinct axis
- **+** `ContextStrategy` becomes a real three-way choice (full → smart-extraction → rolling-summary) instead of a boolean truncate-at-80%
- **+** The 80% number remains meaningful — it now applies to history within its own budget
- **-** More complex budgeting logic — the content script and orchestrator must both compute against the budget, not a single ceiling
- **-** Fixed fractions are tuned for typical models; very small context windows (e.g., legacy models) may need overrides post-MVP

---

## ADR-017: User-Supplied Vault Passphrase for API Key Encryption

**Status:** Accepted  
**Date:** 2026-08-17

### Context
The original Identity invariant claimed that BYOKProvider API keys are "encrypted at rest in chrome.storage.local." But chrome.storage.local is plaintext storage; an MV3 extension has no OS-keychain access, and any encryption key must be stored somewhere the extension itself can read. Without a user-supplied secret or a native messaging host (out of scope), that claim is unfulfillable.

### Decision
Adopt a **user-supplied local vault passphrase**. On first run, the wizard collects a vault passphrase before any key entry (ADR-011). The extension derives an AES-GCM key from the passphrase via PBKDF2 and encrypts all BYOKProvider API keys before writing them to `chrome.storage.local`. The vault is unlocked once per browser session; the derived key material is held only in session-scoped storage and is never persisted to disk. The passphrase itself is never stored and has no recovery path — a forgotten passphrase requires the user to re-enter all API keys.

Because AES-GCM cannot distinguish a wrong key from corrupted ciphertext, the vault also stores a **vault-check marker**: a random, non-secret, per-vault value encrypted alongside the API keys. On unlock, the marker is decrypted first. A match confirms the passphrase is correct; a mismatch surfaces a precise "Incorrect passphrase" error, distinct from a corruption/tampering error. The marker is never reused across vaults.

### Consequences
- **+** Honest at-rest encryption — stored API keys are not recoverable without the passphrase
- **+** The documented invariant now matches the actual security boundary
- **+** Unlock-once-per-browser-session keeps day-to-day friction low
- **+** Wrong-passphrase and corruption failures are distinguishable to the user
- **-** An additional onboarding step on top of an already-frictional BYOK wizard (ADR-011)
- **-** No passphrase recovery — a forgotten passphrase means re-configuring every provider
- **-** WebCrypto/PBKDF2 implementation and passphrase-strength validation add complexity
- **-** A weak passphrase yields weak protection; the UI should enforce a minimum strength policy

---

## ADR-018: RiskLevel Friction Model and Forbidden Action Blocklist

**Status:** Accepted  
**Date:** 2026-08-17

### Context
The original Agentic model placed "purchase" and "delete" in the high RiskLevel (propose → approve → execute) while simultaneously blocking "purchase" and "irreversible delete" at the proposal level — the same actions were both approvable and forbidden. The model needed a clean split between "how much friction applies to an allowed action" (RiskLevel) and "never allowed in MVP" (Forbidden).

### Decision
RiskLevel governs approval friction for **allowed** actions only, decoupled from the forbidden concept:
- **low** (read/scroll): auto-approved — executed immediately with no proposal card; recorded in the audit trail
- **medium** (input/navigate): proposal card with optional "Allow all similar" toggle (ADR-013)
- **high** (submit/reversible-delete): proposal card with no "Allow all similar" toggle; always requires explicit per-action confirmation
- **Forbidden** is a separate per-action-type blocklist flag, not a RiskLevel. MVP forbidden list: `purchase`, `irreversible-delete`. These are blocked at the proposal level and never reach the approval UI.
- "Delete" splits: **reversible delete** (e.g., removing a list item with undo) is `high` and approvable; **irreversible delete** (e.g., "delete account") is `forbidden`.
- "Purchase" is always forbidden in MVP — no exception, no dollar cap.

### Consequences
- **+** No contradictory safety rules — every Action is either auto-approved, proposal-gated, or forbidden
- **+** Low-risk auto-approval reduces approval fatigue for harmless read/scroll operations
- **+** The safety model is simpler to reason about and test
- **-** Low-risk auto-approval removes a visibility checkpoint for those actions (mitigated: every auto-approved action is recorded in the audit trail)
- **-** The forbidden blocklist must be maintained alongside new Action types; a new type introduced without classification risks defaulting to an unsafe path
- **-** No purchase capability at all in MVP — users cannot use the agent to buy anything even with explicit consent

---

## ADR-019: ArtifactSummary Persistence with Ephemeral Binary

**Status:** Accepted  
**Date:** 2026-08-17

### Context
ADR-014 treats artifacts as ephemeral, but Messages that reference artifacts are persisted in `chrome.storage.local`. After an extension restart or service worker termination, a persisted Message can point to an Artifact whose binary no longer exists — a "zombie reference." Also, "held in memory for the session" is ambiguous in an MV3 service worker that can be killed after ~30s of inactivity.

### Decision
Split the artifact into two layers: the **binary Artifact** is held only in memory and is never persisted; a lightweight **ArtifactSummary** (type, title, export formats, generated-at — no binary content) is persisted alongside the parent Message in `chrome.storage.local`. When the binary is unavailable, the chat renders the summary as a **"Regenerate this artifact"** placeholder — never a broken preview and never a silently missing deck.

### Consequences
- **+** No zombie Message references — a persisted Message always carries enough metadata to explain what was generated
- **+** Storage quota stays safe — only tiny metadata is persisted, not binary content
- **+** "Ephemeral" is precise: summary persists, binary does not
- **-** A new glossary term and a new placeholder UI state to design and build
- **-** Users still incur regeneration cost when the binary has been evicted — the summary does not restore the preview or the export
- **-** ArtifactSummary fields are part of the persisted Message schema; changing them later is a migration, not just a code change

---

## ADR-020: Build Framework and UI Stack

**Status:** Accepted  
**Date:** 2026-08-23

### Context
The extension needs a modern build setup for MV3 with three surfaces (Side Panel, service worker, programmatic content script). The choice of build framework and UI stack is a long-lived commitment that affects the entire codebase and the Chrome Web Store bundle profile.

### Decision
Adopt **WXT** as the build framework, with **React + TypeScript + Tailwind CSS v4** for the UI and **Zustand** for side-panel state. WXT provides Vite-based HMR, first-class MV3 multi-entry-point output, and is the 2026 market leader with healthy maintenance. Plasmo is rejected — it is effectively in maintenance mode and its pinned Parcel version blocks Tailwind CSS v4. Plain Vite + CRXJS is the documented fallback if WXT's abstraction is ever found to obstruct, since the project is Chrome-only and does not need cross-browser output. Zustand is chosen over Redux (overkill), Jotai (atomic model not needed), and plain Context (render-cascading on the live chat stream).

### Consequences
- **+** One build tool covers Side Panel + service worker + content script with HMR
- **+** Tailwind v4 compatibility is guaranteed on WXT's Vite foundation
- **+** Zustand adds minimal bundle weight for the live chat and approval-flow UI state
- **-** WXT is an additional abstraction; a bug in its MV3 output is a dependency risk (mitigated by the Vite + CRXJS fallback path)
- **-** Tailwind v4 requires the modern build chain — this locks out Plasmo permanently

---

## ADR-021: AI Provider Adapter Strategy — Vercel AI SDK with SSE Parser Fallback

**Status:** Accepted (conditional: implementation-time bundle gate)  
**Date:** 2026-08-23

### Context
Three BYOKProviders (OpenAI, Anthropic, Google Gemini) need streaming from the MV3 service worker. Raw fetch + hand-rolled SSE is tedious; official provider SDKs are individually problematic (Anthropic's SDK bundles `node:fs` and crashes browser bundlers; OpenAI's is a generated client with no browser-bundle advantage; Google's browser cost is unverified). The Vercel AI SDK offers a unified provider-agnostic streaming API and is proven in a Chrome extension case study, but its bundle cost in the service worker could not be pinned down.

### Decision
Use the **Vercel AI SDK** (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) as the primary adapter path behind the BYOKProvider interface, gated by an implementation-time bundle check: if the AI layer exceeds roughly **100–150 KB gzipped** in the service worker bundle, fall back to **`@geee-be/sse-stream-parser` (or `sindresorhus/parse-sse`) plus thin per-provider formatters**. The Gemini OpenAI-compatibility layer remains off-limits (broken CORS); use the native Gemini provider. `host_permissions` for the three provider hosts are required regardless of path.

### Consequences
- **+** Removes both SSE byte-parsing and per-provider request/response shaping in one maintained API
- **+** The Anthropic browser crash is avoided by construction — `@ai-sdk/anthropic` does not wrap the broken official SDK
- **+** The BYOKProvider interface is unchanged either way — the fallback is a mechanical rewrite behind it
- **-** Bundle weight is an open risk; v5 has community-reported size regressions without quantified numbers
- **-** One external dependency owns the provider abstraction — provider-specific edge cases are filtered through it
- **-** The conditional gate adds an explicit build-check step before finalizing the adapter layer

---

## ADR-022: Artifact Export Libraries (Lazy-Loaded)

**Status:** Accepted  
**Date:** 2026-08-23

### Context
ADR-005 requires artifact export to PPTX, PDF, CSV, and XLSX. These libraries are heavy and are only needed at export time, not during normal chat. Bundle-size discipline is a cross-cutting requirement established across provider adapters and state management.

### Decision
Use **PptxGenJS** (PPTX), **SheetJS** (XLSX/CSV), and **jsPDF** or **pdfmake** (PDF), all **lazy-loaded via dynamic `import()` on export trigger only**. None are bundled into the core side-panel or service-worker output. PaperJSX is rejected as unproven vendor self-promotion.

### Consequences
- **+** Core bundle stays small; heavy libraries load only when an export actually happens
- **+** PptxGenJS is the definitive PPTX library (4.6M weekly downloads, widest chart support, browser-compatible)
- **+** Export libraries can be swapped independently without touching the core
- **-** Dynamic import adds an async loading step and a loading state to the export UX
- **-** Each additional export format adds maintenance surface to the Generation context
</BDS:create_file>

<BDS:create_file fileName="CONTEXT.md">

```markdown
# CONTEXT.md — Domain Vocabulary & Model

**Project:** Chrome AI Assistant Extension  
**Last Updated:** 2026-08-23

---

## Core Domain Concepts

### Entity Glossary

| Term | Definition | B|
|-|-|-|ntext |
|------|-----------|-----------------|
| **User** | The person who installs and uses the Chrome extension. Holds settings and API keys. Must have at least one validated BYOKProvider before the extension is functional. | Identity |
| **Vault** | The passphrase-protected local container for BYOKProvider API keys. Unlocked once per browser session. Keys inside are encrypted at rest with a key derived from the user's vault passphrase. | Identity |
| **Conversation** | A named, persistent thread of messages between the user and the AI. Has a lifecycle (active → archived → deleted). Maintains exactly one active branch at any time. | Conversation |
| **Message** | A single utterance within a Conversation. Has a role (user, assistant, system), content, and timestamp. Immutable once created. System-role Messages include rolling summary notices. | Conversation |
| **Page** | The current webpage the user is viewing. Provides context to the AI. Has a URL, title, and extractable content. | PageContext |
| **PageSection** | A selectable region within a Page (identified by DOM selector). Used for targeted AI operations. | PageContext |
| **PageContent** | The extracted, sanitized text content from a Page or PageSection. Token-counted by the content script before transmission; capped by ContextStrategy (40% of the context window for full, 20% for smart-extraction, 0% for rolling-summary). | PageContext |
| **EntryPoint** | The UI channel through which the user invokes the AI: omnibar, side-panel, or context-menu. | Interaction |
| **Skill** | A named, invocable capability of the AI. Has a trigger, prompt template, declared tool bindings, and output format. | SkillEngine |
| **BuiltInSkill** | A Skill shipped with the extension (summarize, explain, translate, rewrite, search, qna). | SkillEngine |
| **UserDefinedSkill** | A Skill created by the user as a YAML prompt template + tool definitions, or imported from skills.sh. Tool invocations are restricted to the declared tools whitelist; undeclared calls are rejected at runtime. Version is pinned at import time. | SkillEngine |
| **AIProvider** | A backend that serves AI model responses. The extension is BYOK-only; all AIProviders are BYOKProviders. | AIBackend |
| **BYOKProvider** | A user-configured API key connection to a third-party AI service. MVP supports OpenAI, Anthropic, and Google Gemini; OpenRouter is post-MVP. Google Gemini uses the Gemini API (AI Studio) key, not Vertex AI's OAuth/service-account auth. API keys are held in the Vault. | AIBackend |
| **Model** | A specific AI model offered by a BYOKProvider (e.g., "gpt-4o", "claude-sonnet-4-20250514", "gemini-2.5-pro"). Has a context window size used to compute the token budget (ADR-016) and rolling summary trigger threshold. | AIBackend |
| **Action** | An agentic operation the AI proposes to perform on the page. Has a type, target selector, params, and risk level. | Agentic |
| **ActionProposal** | An Action presented to the user for approval. Includes the action, reason, approve/reject UI, and an optional "Allow all similar" toggle. Low-risk Actions do not produce an ActionProposal — they auto-approve and execute immediately. | Agentic |
| **ActionResult** | The outcome of an executed Action (success, failure, with optional screenshot proof). | Agentic |
| **RiskLevel** | The approval-friction class of an allowed Action: low (read/scroll — auto-approved, no proposal), medium (input/navigate — proposal with optional "Allow all similar"), high (submit/reversible-delete — proposal with mandatory per-action confirm). RiskLevel applies only to allowed actions; purchase and irreversible-delete are Forbidden, not high. | Agentic |
| **Forbidden** | A per-Action-type blocklist flag for operations the extension never executes in MVP: purchase and irreversible-delete. Blocked at the proposal level before the user ever sees an ActionProposal. Not a RiskLevel. | Agentic |
| **Artifact** | A generated rich output (slides, infographic, table, chart, code). The binary content is ephemeral — held in memory only, never persisted to storage; an ArtifactSummary is persisted with the parent Message. | Generation |
| **ArtifactSummary** | Lightweight metadata persisted with the parent Message: ArtifactType, title, available ExportFormats, generated-at timestamp. Contains no binary content. Rendered as a "Regenerate this artifact" placeholder when the binary Artifact is unavailable. | Generation |
| **ArtifactType** | The kind of Artifact: slide-deck, infographic, table, chart, code-snippet, mermaid-diagram. | Generation |
| **ExportFormat** | The file format for artifact download: PPTX, PDF, PNG, SVG, CSV, XLSX, or raw file. | Generation |
| **Settings** | User preferences: default model, BYOKProvider priority order, blocked sites, agentic toggle, theme, language. | Identity |
| **ContextStrategy** | The method for fitting page content into the model's context window: full (40% of window), smart-extraction (20%), rolling-summary (page content fully summarized away). | PageContext |
| **ThreadAttachment** | The binding between a Conversation and a Page. Has two states: active (AI uses live page context) or detached (AI uses a frozen PageContent snapshot captured at detachment time). Transitions to detached when the user chooses "Keep current" on navigation. | Conversation |

---

## Bounded Contexts

### 1. Identity Context
**Responsibility:** User identity, settings, API key management, onboarding, vault security.  
**Key Entities:** User, Settings, BYOKProvider, Vault  
**Invariants:**
- A User has exactly one Settings
- A User has exactly one Vault
- A User may have one or more BYOKProviders; at least one must be successfully validated before the extension is functional
- BYOKProvider API keys are encrypted at rest in `chrome.storage.local` with a key derived from the user's vault passphrase; the Vault is unlocked once per browser session; the passphrase itself is never stored and is not recoverable — a forgotten passphrase requires re-entering all API keys
- On first run, the extension displays a blocking four-step wizard in the side panel (create vault passphrase → select provider → paste key → validate via live test call); the chat UI is inaccessible until validation succeeds; an incomplete wizard state is persisted in chrome.storage.local so reopening the side panel returns to the wizard, not the chat UI
- On subsequent browser sessions, the side panel displays a Vault unlock screen before the chat UI
- BYOKProviders are ordered by user-configured priority (an ordered list in Settings); the provider fallback chain follows this order

### 2. Conversation Context
**Responsibility:** Chat threads, message history, context binding, memory management.  
**Key Entities:** Conversation, Message, ThreadAttachment  
**Invariants:**
- A Conversation contains one or more Messages in chronological order
- A Conversation may be attached to zero or one Pages via ThreadAttachment
- Messages are immutable once created (append-only)
- Rolling summary is triggered lazily when conversation history tokens exceed 80% of the 40% history budget (i.e., 32% of the context window); history is summarized down to ~50% of the history budget (20% of the context window); it inserts a visible, collapsible system Message labeled "Context summarized to stay within model limits" — the full summary text is readable on expand
- When a user edits a prior Message, all subsequent Messages in the active branch are soft-deleted (archived to chrome.storage.local, not destroyed) and a new branch is appended; the Conversation maintains exactly one active branch at any time
- Soft-deleted branch Messages are not surfaced in the UI in MVP; a "view edit history" affordance is deferred to post-MVP
- When the user navigates away from a ThreadAttachment's Page, a non-blocking banner appears in the side panel offering "Use new page" (updates the ThreadAttachment to the new URL) or "Keep current" (transitions ThreadAttachment to detached, freezing the PageContent snapshot already embedded in conversation history); dismissing the banner without choosing defaults to "Keep current"; the banner appears once per navigation event
- Conversations are managed via a thread list drawer accessible from a persistent icon in the side panel header; the drawer supports rename, archive, and delete operations without leaving the side panel

### 3. PageContext Context
**Responsibility:** Reading, extracting, and structuring webpage content for AI consumption.  
**Key Entities:** Page, PageSection, PageContent, ContextStrategy  
**Invariants:**
- A Page has exactly one URL
- PageContent is always sanitized (scripts, trackers removed)
- PageContent token count is enforced in the content script before transmission; the ceiling follows ContextStrategy: 40% of the context window (full), 20% (smart-extraction), 0% (rolling-summary — page content is fully summarized away)
- ContextStrategy is selected based on PageContent length vs. context window

### 4. Interaction Context
**Responsibility:** Entry points, UI routing, command parsing, result dispatch.  
**Key Entities:** EntryPoint  
**Invariants:**
- Each user action originates from exactly one EntryPoint
- Omnibar queries are routed to the Side Panel for display
- Context Menu actions always operate on selected text

### 5. AIBackend Context
**Responsibility:** Model routing, API calls, response streaming, fallback chains.  
**Key Entities:** AIProvider, BYOKProvider, Model, Vault  
**Invariants:**
- The extension is BYOK-only; no free tier or hosted proxy is provided
- At least one BYOKProvider must be configured and validated; the extension is non-functional without one
- MVP supports OpenAI, Anthropic, and Google Gemini as BYOKProviders; OpenRouter is post-MVP
- Google Gemini is supported via the Gemini API (AI Studio) key; Vertex AI OAuth/service-account auth is out of scope
- Model selection is per-conversation, defaulting to the user's preferred model
- Provider fallback follows the user-configured priority order in Settings; transient failures (network timeout, 5xx) fail over silently to the next provider in the list; auth failures (401, invalid key) surface an error immediately and do not attempt fallback
- The Vault is unlocked before any request begins — the orchestrator never attempts a request with a locked Vault
- Within a single request, fallback moves only between providers whose validated keys are already decrypted in session memory; a fallback target with a missing or revoked key is skipped silently and the next provider is tried
- When the fallback chain is exhausted, the user receives a single aggregate error surface ("all configured providers failed") — never N raw provider errors
- The Vault never auto-locks mid-request

### 6. SkillEngine Context
**Responsibility:** Skill registration, invocation, prompt templating, tool binding.
```

Identity ──────► AIBackend      (user selects provider/model)
Identity ──────► SkillEngine    (user defines custom skills)
Interaction ───► Conversation   (entry point creates/resumes thread)
Interaction ───► SkillEngine    (commands trigger skills)
Conversation ──► PageContext    (thread attaches to page)
Conversation ──► AIBackend     (conversation uses model)
Conversation ──► Generation    (messages produce artifacts)
AIBackend ─────► Agentic       (AI proposes actions)
Agentic ───────► PageContext    (actions target page elements)
SkillEngine ───► Conversation  (skill output becomes message)
SkillEngine ───► AIBackend     (skills use AI to process)
Generation ────► Interaction    (artifacts rendered in side panel)

```

---

## Ubiquitous Language

When
