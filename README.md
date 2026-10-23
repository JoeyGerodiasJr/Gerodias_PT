# scrum_3BSCS-2
 
Welcome to the repository for our Scrum project. This document outlines our team structure, roles, and the branching rules we follow to keep our workflow clean and collaborative.
 
---
 
## Team 
 
| Role | Name | GitHub Branch |
|---|---|---|
| Scrum Master | Gerodias, Joey | `feature/JoeyGerodiasJr` |
| UI/UX Developer | Young, Matthew | `feature/Matthewyoung23` |
| Backend Developer | Traqueña, Kenji | `feature/KenjiRay` |
| DevSecOps Engineer | Aborde, Steven | `feature/StevenKeil` |
| Test Engineer | Espiso, Hazel | `feature/HazelEspiso` |
 
---
 
## Branching Rules
 
To keep `main` stable and deployable at all times, every team member must follow these rules **without exception**:
 
### 1. No Direct Pushes to `main`
- Nobody pushes code directly to `main`, including the Scrum Master.
- `main` should only ever be updated through an approved and merged Pull Request.
- If you accidentally have `main` checked out, switch to your feature branch before making any changes.
### 2. All Work Happens in Feature Branches
- Every task, fix, or feature must be developed in your assigned branch listed in the roster above.
- If you need a new branch for a specific sub-task (e.g. a bug fix), name it clearly, for example:
  - `feature/KenjiRay-login-api`
  - `fix/HazelEspiso-test-suite`
- Keep your branch up to date with `main` by pulling/rebasing regularly to avoid large merge conflicts.
### 3. Pull Requests Are Required
- When your work is ready, open a Pull Request (PR) from your feature branch into `main`.
- Every PR must include:
  - A clear title describing the change.
  - A short description of what was done and why.
  - Reference to the related task/user story (if using a board like Trello/Jira/GitHub Projects).
- At least **one other team member** must review and approve the PR before it is merged.
- The Scrum Master (Joey) has final say on merge conflicts or unclear PRs, but reviews are a shared team responsibility.
### 4. Keep Commits Clean
- Write clear, descriptive commit messages (e.g. `fix: correct null pointer in user auth`, not `update stuff`).
- Commit often, but keep each commit focused on one logical change.
### 5. Resolve Conflicts Locally
- If your PR has a merge conflict, resolve it in your own branch first, then push again — do not resolve conflicts directly on `main`.
---
 
## Quick Workflow Summary
 
1. Checkout your feature branch (or create a sub-branch off it).
2. Make your changes and commit regularly.
3. Push your branch to GitHub.
4. Open a Pull Request into `main`.
5. Get at least one review/approval.
6. Merge only after approval — never merge your own PR without a review.
---
 
## Why These Rules Matter
 
Following this workflow keeps `main` always working, makes it easy to track who did what, and prevents the "messy main branch" problem from happening again. It also mirrors real-world software team practices, which is great experience for all of us as we build this project together.
