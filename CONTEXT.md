# CONTEXT.md — Domain Vocabulary & Model

**Project:** Chrome AI Assistant Extension  
**Last Updated:** 2026-08-17

---

## Core Domain Concepts

### Entity Glossary

| Term | Definition | Bounded Context |
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
**Key Entities:** Skill, BuiltInSkill, UserDefinedSkill  
**Invariants:**
- A Skill has exactly one trigger (command string or context menu item)
- BuiltInSkills cannot be deleted or modified
- UserDefinedSkills are validated on creation (required fields: name, trigger, prompt)
- UserDefinedSkill tool invocations are restricted to the tools declared in the skill's `tools` field; undeclared tool calls are rejected at runtime before execution
- Skills may originate from user-typed YAML or imported from skills.sh; both sources are subject to identical validation and tool whitelist enforcement
- skills.sh import: the user pastes a direct YAML URL; the extension fetches, validates, and displays a preview (name, trigger, declared tools) before the user confirms; no in-extension registry browser is provided
- skills.sh skills are fetched once at import time and stored locally as UserDefinedSkills; version is pinned at import; if skills.sh is unreachable at import time, the import fails cleanly with no partial state written
- Skill triggers are globally unique across all BuiltInSkills and UserDefinedSkills; BuiltInSkill triggers are reserved and cannot be claimed by UserDefinedSkills; attempting to save a UserDefinedSkill with a conflicting trigger is rejected at save time with an error naming the conflicting skill
- Skill invocation produces a Message in the current Conversation

### 7. Agentic Context
**Responsibility:** Page interaction proposals, approval flow, action execution, safety enforcement.  
**Key Entities:** Action, ActionProposal, ActionResult, RiskLevel, Forbidden  
**Invariants:**
- Every **allowed** Action follows the RiskLevel friction model: low-risk actions auto-approve and execute immediately with an audit-trail record (no ActionProposal); medium-risk actions show an ActionProposal with an optional "Allow all similar" toggle; high-risk actions show an ActionProposal with no "Allow all similar" toggle and ALWAYS require explicit per-action confirmation
- **Forbidden** actions (purchase, irreversible-delete) are blocked at the proposal level — they never reach the approval UI and are never executed in MVP
- "Delete" is classified by reversibility: reversible delete (e.g., removing a list item with undo) is high-risk and approvable; irreversible delete (e.g., "delete account") is Forbidden
- Auto-approved low-risk actions produce a visible, non-blocking status entry in the active Conversation at the moment of execution, in addition to the ActionResult audit trail; low-risk actions do not produce toasts or modals
- ActionResult is recorded for every executed Action — including auto-approved low-risk actions — as an audit trail
- The "Allow all similar" approval toggle approves all subsequent Actions with the same action type AND same RiskLevel on the same domain; this approval is session-scoped and resets when the Conversation ends or the active domain changes
- The agentic blocked sites list is managed contextually: a "Block agentic on this site" option in the side panel header menu adds the current domain (eTLD+1) to the blocked sites list in Settings and disables agentic ActionProposals immediately for the active tab; the full blocked sites list is editable in the
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
