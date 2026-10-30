-- Numen Logs' shared server (js/logs/remote.js): run this once in a new Supabase project's SQL editor, then put the
-- project's URL and anon public key in LOGS_SERVER. Anyone can read reports and add new ones; nobody can change or
-- delete them through the public key (do that from the Supabase dashboard).
create table if not exists reports (
  id text primary key,
  created_at timestamptz not null default now(),
  encounter text not null,
  player_name text not null,
  cls text,
  spec text,
  dps real,
  tps real,
  duration real,
  kill boolean not null default false,
  real boolean not null default false,
  parse integer,
  summary jsonb not null,
  body text not null -- gzip + base64 of { fight, log, meta, raid, gear }
);
create index if not exists reports_rank on reports (encounter, real, kill, dps desc);
create index if not exists reports_recent on reports (created_at desc);

alter table reports enable row level security;
create policy "reports are public" on reports for select using (true);
create policy "anyone can upload a real encounter" on reports for insert
  with check (real and char_length(body) < 3000000 and char_length(player_name) between 1 and 24);
