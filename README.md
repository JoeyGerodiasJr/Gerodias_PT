# Gerodias PT

| Tracker Role | Team Role Title | Name | Sprint PR Target | Total PR Target (4 Sprints) | Primary Responsibilities |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Scrum Master (`SM`)** | Scrum Master | Gerodias, Joey | 5 | 20 | Agile sprint orchestration, velocity tracking, impediment management, project board automation |
| **UI/UX Designer (`UIX`)** | UI/UX Developer | Young, Matthew | 5 | 20 | Frontend component architecture, design system standards, wireframes, mockups, layout accessibility (WCAG AA) |
| **Developer (`DEV`)** | Backend / Full-Stack Developer | Aborde, Steven | 8 | 32 | Application scaffold, authentication, session security, module CRUD implementation, server-side permission enforcement |
| **DB Admin (`DBA`)** | DevSecOps / Database Engineer | Traqueña, Kenji | 6 | 24 | Database migrations (`HopeDB_audit.sql`), relational integrity constraints, audit triggers, query tuning, CI/CD & environment configuration |
| **Tester (`TST`)** | Test Engineer | Espiso, Hazel | 6 | 24 | Test plans, automated integration and regression test suites, permission matrix testing, defect verification, QA sign-off |
 
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
