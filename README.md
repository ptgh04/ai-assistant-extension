# Chrome AI Assistant Extension

A browser-native AI assistant built for Google Chrome (Manifest V3), featuring Bring Your Own Key (BYOK) privacy, multi-entry-point interactions, and human-in-the-loop agentic safety.

---

## Tech Stack

* **Runtime & Package Manager**: [Bun](https://bun.sh/)
* **Extension Framework**: [WXT](https://wxt.dev) (Vite-powered MV3 framework with HMR)
* **UI**: React 19 + Tailwind CSS v4
* **State Management**: Zustand
* **Language**: TypeScript (strict mode, `@/*` path aliases)

---

## Architecture & Bounded Contexts

The codebase is organized around 8 bounded contexts documented in [`CONTEXT.md`](CONTEXT.md):

* `src/identity/`: Vault passphrase, AES-GCM encryption, BYOK key storage (ADR-017)
* `src/conversation/`: Message history, named threads, token-budgeted rolling summary (ADR-006, ADR-016)
* `src/page-context/`: Programmatic content script extraction & DOM sanitization (ADR-008)
* `src/interaction/`: Omnibar routing, context menus, side panel dispatch (ADR-001, ADR-007)
* `src/ai-backend/`: Streaming adapters for OpenAI, Anthropic, and Google Gemini (ADR-002, ADR-021)
* `src/skill-engine/`: Built-in skills & YAML skill execution with tool whitelisting (ADR-004, ADR-010)
* `src/agentic/`: Action proposals, RiskLevel friction model, forbidden action blocklist (ADR-003, ADR-018)
* `src/generation/`: Ephemeral rich artifact generation & exports (PPTX, PDF, SVG) (ADR-005, ADR-014, ADR-019)

All major technical decisions are recorded in [`docs/adr/ADR.md`](docs/adr/ADR.md).

---

## Getting Started

### Prerequisites
* [Bun](https://bun.sh/) `>= 1.2`
* Google Chrome `>= 114` (for Side Panel API support)

### Installation
```pwsh
bun install
```

### Development
Start the local development server with Hot Module Replacement (HMR):
```pwsh
bun run dev
```
WXT will automatically launch a dedicated Chrome instance with the extension loaded.

### Building for Production
```pwsh
bun run build
```
The compiled extension will be output to `.output/chrome-mv3`.

### Loading in Chrome Manually
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the `.output/chrome-mv3` directory.

---

## Contributing & Git Workflow

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming conventions, Conventional Commit standards, and pull request requirements.
