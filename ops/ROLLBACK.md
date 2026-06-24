# Rollback playbook

This document explains how to rollback a failed deployment.

1. Verify the failing deploy ID and the commit SHA from the audit record or Actions logs.
2. If the automatic rollback did not run, trigger manual rollback:
   - If using Railway: `railway rollback <DEPLOY_ID>` (or use the Railway dashboard)
   - If using a build artifact: re-deploy the previous artifact via the agent or dashboard.
3. Open an incident in your incident tracking system and notify the on-call maintainer.
4. After rollback, run smoke tests and validate the system is healthy.

Contacts:
- On-call: @your-team
