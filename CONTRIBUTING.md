# Contributing — Git & GitHub Best Practices

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Production only — protected. Merges require CI and explicit agent approval (see below). **Never push directly.** |
| `dev` | Integration branch. All feature branches merge here first. |
| `feature/your-feature-name` | Your working branch. Always branch off `dev`. |

## Starting Any New Task

```bash
git checkout dev
git pull origin dev
git checkout -b feature/descriptive-name
```

## While Working

Commit frequently with small, focused commits — don't batch unrelated changes together.

**Commit message format:**

```
feat: add epic filter to board
fix: correct email template spacing
chore: update docker-compose config
docs: add env variable instructions
devcontainer: add postgres extension to container
```

## Before Opening a PR

Sync with `dev` to catch any changes your partner may have merged:

```bash
git fetch origin
git rebase origin/dev
```

## Opening a Pull Request

- Always open PRs into `dev`, never directly into `main`
- Keep PRs small and focused on one thing
- Write a short description of what changed and why
- **Never self-merge without the other developer reviewing**, unless explicitly agreed

## High-Collision Files

These files are shared and conflict-prone. Give your partner a heads up before editing:

- `package.json` / `package-lock.json`
- `next.config.js`
- `tailwind.config.js`
- `.devcontainer/devcontainer.json`
- `.devcontainer/Dockerfile`
- `docker-compose.yml`
- `.env.example`
- Any shared layout or global component files

## Dev Container Rules

- The `.devcontainer/` folder is the source of truth for the local dev environment — treat changes to it with the same care as production config
- If you need a new VS Code extension, new tool, or environment tweak, add it to `devcontainer.json` and commit it — never just install something locally and assume your partner has it
- After pulling changes that include `.devcontainer/` updates, rebuild the container before continuing work:
  - In VS Code: `Ctrl+Shift+P` → **Dev Containers: Rebuild Container**
- If the container build breaks after a pull, check the git log for recent `.devcontainer/` changes and flag it to your partner before trying to fix it yourself
- Never put real secrets in `devcontainer.json` — use a local `.env` file (gitignored) and document all required variables in `.env.example`
- If your container needs a specific port, volume mount, or service (like a local database), define it in `docker-compose.yml` so both developers get the same setup automatically

## Environment Variables

| File | Committed? | Purpose |
|------|-----------|---------|
| `.env` | No — gitignored | Your local secrets. Never share via git. |
| `.env.example` | Yes | All variable names with placeholder values. |

When you add a new env variable:
1. Update `.env.example` immediately with a placeholder value
2. Call it out in your PR description so your partner knows to add it to their local `.env`

## Promoting Dev to Production — Controlled Flow

When `dev` is stable and tested in the dev container:

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

Merging `dev` into `main` creates a release candidate. Production deployments are not automatic. To perform a production deploy you must request the agent-driven deploy and receive explicit approval (see "Agent-driven workflows" below).

## Agent-driven workflows

We support controlled agent-driven deployments and automation. Follow these rules:

- Triggers and phrases (Actions runner):
  - Label `hermes:deploy-staging` or comment `@hermes deploy staging` — requests a staging deploy (CI must be green).
  - Comment `@hermes deploy production` — requests a production deploy. Production requires additional approval (see Approvals).
  - Manual workflow_dispatch (Actions UI) — allowed for operators to run a controlled deploy.

- Approvals:
  - Production deploys require at least one approval from a project maintainer listed in MAINTAINERS.md. The deploy will not proceed until an approver adds the `hermes:approved` label or an approving review is present.

- Dry-run policy:
  - All agent-driven actions execute with `--dry-run` by default. A non-dry production deploy requires explicit approval and an additional confirmation (workflow_dispatch or `hermes:approved` label).

- Who can trigger:
  - Any contributor can request a staging deploy. Only maintainers listed in MAINTAINERS.md (or a GitHub Actions run initiated by them) can approve production deploys.

- Safety checks performed before agent-run deploy:
  - Required CI jobs are green on the commit/PR.
  - The branch is up to date with `dev` (or `main` when appropriate).
  - No uncommitted local changes (when run locally).

## Secrets & Tokens

- Tokens and secrets MUST never be committed to the repository. Store them in one of:
  - GitHub Actions Secrets (recommended for CI/Actions-run deployments)
  - A secrets vault (HashiCorp Vault, Bitwarden, etc.) with a short-lived fetch mechanism

- Default secret names (Actions secrets):
  - `RAILWAY_TOKEN` — token limited to deploy permissions for the appropriate Railway project/environment.
  - `AGENT_SERVICE_TOKEN` — optional service token used if the agent needs elevated API access (use least privilege).
  - `AUDIT_REPO_TOKEN` — optional token used to push audit records to a dedicated audit repo (if configured).

- Do not share tokens in comments or PRs.

## Audit & Rollback

- Every automated action must produce an audit record containing: who requested the action, the acting agent/profile, commit SHA, workflow run id, deploy id (if any), and result (success/failure). Audit records will be stored as an Actions artifact or in the dedicated audit repo.

- Rollback policy:
  - Agents will perform a dry-run first. If a deploy is executed and the health-check fails within the configured window (default: 2 minutes), the agent will perform an automatic rollback if configured, otherwise it will open an incident and notify maintainers.
  - See `ops/ROLLBACK.md` for exact rollback commands and contacts.

## General Rules

- Never commit `.env` files — only `.env.example` with placeholder values
- Never force push to `main` or `dev`
- If you hit a merge conflict, resolve it carefully and have the other developer verify before merging
- When in doubt about a change that touches shared files, ask before pushing
