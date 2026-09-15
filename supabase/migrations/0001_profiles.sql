-- Tabella per il salvataggio cloud del profilo meta di Fantaraugh.
-- Una riga per utente autenticato (auth.users), con l'intero MetaProfile
-- come JSON. Nessuna classifica/funzione social: solo sync del salvataggio
-- personale tra dispositivi.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Ogni utente può leggere e scrivere solo la propria riga.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
