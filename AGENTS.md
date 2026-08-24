## Agent skills

### Issue tracker

Issues and specs for this repo live as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage labels map to canonical roles: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context documentation layout (CONTEXT.md + docs/adr/). See `docs/agents/domain.md`.

### Temporary directory

When needed to use a temporary folder, use the `temp` folder in the project root. If it does not exist, ask the user for permission to create it first.
