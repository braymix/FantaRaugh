# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.
- Cloud save (Supabase) is optional and off by default: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset in every deployed env, so guest play stays local-only. See `src/state/supabaseClient.ts`, `src/state/auth.ts`, `src/state/cloudSync.ts`, and the migration in `supabase/migrations/`. Local save stays synchronous (`StorageAdapter`, `src/state/storage.ts`); cloud sync is a separate async layer on top, never a replacement for it — see that file's doc comment for the intended extension pattern.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
