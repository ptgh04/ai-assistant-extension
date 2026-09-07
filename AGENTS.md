## Agent skills

### Issue tracker

Issues and specs for this repo live as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage labels map to canonical roles: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context documentation layout (CONTEXT.md + docs/adr/). See `docs/agents/domain.md`.

### Temporary directory

When needed to use a temporary folder, use the `temp` folder in the project root. If it does not exist, ask the user for permission to create it first. NEVER use the system temp directory, user app-data directories, or the agent brain/scratch directory for project-related temp files.

### Package manager & runtime

Use **Bun** (`bun`) exclusively for all package management, script running, and testing. NEVER use `npm`, `yarn`, or `pnpm`.
- Install dependencies: `bun install`
- Run dev server: `bun run dev`
- Run production build: `bun run build`
- Type checking: `bun run compile`

