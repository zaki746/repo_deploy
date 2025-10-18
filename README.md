# GitHub Issue Dashboard

Automatically syncs issues from private repos and shows them on a public dashboard.

## Setup
1. Create a public repo (e.g. `repo_deploy`)
2. Add a GitHub PAT as secret → `GH_TOKEN`
3. Edit `.github/workflows/sync-issues.yml`
   - Set `OWNER` and `REPOS`
4. Commit & push — the Action will fetch data automatically.
5. Open `dashboard/index.html` → view all issues, states, and images.
