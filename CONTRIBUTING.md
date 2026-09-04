# Contributing Guidelines

## 1. Branching Strategy
- **Base branch**: `main`
- **Branch naming**:
  - `feature/<issue-#>-<username>-<short-description>`
  - `fix/<issue-#>-<username>-<short-description>`
  - `refactor/<scope>-<short-description>`
  - `spike/<issue-#>-<short-description>`
- Always claim an issue before branching:
  ```pwsh
  gh issue edit <issue-number> --add-assignee @me
  ```
- Keep branches short-lived (< 48 hours). Rebase frequently against `main`:
  ```pwsh
  git pull --rebase origin main
  ```

## 2. Commit Conventions (Conventional Commits)
Use the format: `<type>(<scope>): <summary>`

### Types
`feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `perf`

### Scopes (from CONTEXT.md)
- `identity`: Vault, BYOKProvider, master passphrase, settings
- `conversation`: Threads, messages, thread attachments, rolling summary
- `page-context`: Content scripts, DOM extraction, sanitization
- `interaction`: Omnibar, side panel router, context menu
- `ai-backend`: Provider adapters (Gemini, OpenAI, Anthropic), fallback chain
- `skill-engine`: YAML parsing, tool binding, built-in and user skills
- `agentic`: Action proposals, RiskLevel approvals, safety blocks
- `generation`: Artifact rendering, exports (PPTX, PDF, SVG)

## 3. Pull Request Guidelines
- Link the associated issue in the PR description (e.g., `Closes #12`).
- Ensure typecheck (`tsc --noEmit`), linter, and tests pass.
- Request at least one peer review.
- Merges are performed via **Squash and Merge**.

## 4. Architectural Decisions (ADR)
Any changes to core domain entities or cross-cutting security invariants must be discussed and recorded in `docs/adr/ADR.md` via an ADR PR prior to implementation.
