
---

## Database Setup (Supabase, no Docker)

The database is managed with SQL migration files in `supabase/migrations/`.
The **DB Admin (Traqueña, Kenji)** is the only person who applies migrations to the shared Supabase project.

### Prerequisites
- Git and VS Code
- Supabase CLI (https://supabase.com/docs/guides/local-development/cli/getting-started)
- The database password, which you get from the DB Admin privately. **Never commit it or paste it in GitHub.**

### One-time setup
1. Clone the repo and open it in VS Code.
2. Log in to Supabase (a browser window opens; paste the verification code into the terminal):
   ```
   supabase login
   ```
3. Link the CLI to the team project:
   ```
   supabase link --project-ref ntwvaxvaxsxhecssltgh
   ```
   Paste the database password when asked. The cursor will not move while you type; this is normal.
4. Verify the connection:
   ```
   supabase migration list --linked
   ```
   You should see a table of migrations and no errors.

### Day-to-day commands
| Task | Command | Who |
| :--- | :--- | :---: |
| See applied migrations | `supabase migration list --linked` | Everyone |
| Create a migration file | `supabase migration new <name>` | DB Admin |
| Preview changes | `supabase db push --linked --dry-run` | DB Admin |
| Apply migrations | `supabase db push --linked` | **DB Admin only** |

### Rules
- Only the DB Admin runs `supabase db push` against the shared project.
- Never edit a migration that has already been applied. Create a new one instead.
- Never commit passwords, `.env` files, or API keys.
- Need a schema change? Open a GitHub issue for the DB Admin.

### Do not use (these need Docker)
`supabase start`, `supabase db reset`, `supabase db diff`, `supabase db pull`

### Folder layout
```
supabase/
  config.toml        CLI configuration
  migrations/        Timestamped SQL files, applied in order
```

### Troubleshooting
- **Password authentication failed:** the database password is wrong. Ask the DB Admin.
- **Connection timeout or IPv6 error:** try a different network, then re-run `supabase link`.
- **"Cannot connect to the Docker daemon":** you ran a Docker-only command (see the list above).
- **Yellow `--linked` warning:** harmless. Always add `--linked` so commands target the shared project.
