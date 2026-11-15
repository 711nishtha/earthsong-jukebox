# Quiz results backend (optional, free tier)

The "Close your eyes" quiz works fully offline. To collect anonymous results from everyone who takes it, and to show a live "% of listeners answered correctly by ear" on the Science page, connect a free Supabase project. It takes about 5 minutes and is done once, by the project owner. It needs your own account, so it is not automated.

## What is stored
One row per answered question: a random per-visit id, question id, correct (true or false), sound mode, and milliseconds taken. **No names, emails, IP addresses or device information.** Visitors can only *insert* rows. Nobody can read individual rows through the public key; only the per-question aggregate view is readable.

## Setup
1. Create a free project at supabase.com.
2. In **SQL editor**, run:

```sql
create table public.quiz_answers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session uuid not null,
  question text not null check (char_length(question) <= 40),
  correct boolean not null,
  mode text not null check (mode in ('musical', 'data')),
  ms integer not null check (ms between 0 and 900000)
);
alter table public.quiz_answers enable row level security;

-- Visitors (anon key) may only add rows.
create policy "anon can insert answers" on public.quiz_answers
  for insert to anon with check (true);

-- Aggregate view: the only thing the public key can read.
create view public.quiz_stats as
  select question, count(*)::int as answers, count(*) filter (where correct)::int as correct
  from public.quiz_answers group by question;
revoke all on public.quiz_answers from anon;
grant insert on public.quiz_answers to anon;
grant select on public.quiz_stats to anon;
```

3. In **Project settings → API**, copy the **Project URL** and the **anon public** key. The anon key is designed to be public, and row-level security is what protects the data. It still stays out of the repo history.
4. In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `VITE_QUIZ_ENDPOINT` = the Project URL
   - `VITE_QUIZ_ANON_KEY` = the anon key
5. Re-run the "Deploy to GitHub Pages" workflow. The build reads these variables, so answers start flowing and the Science page shows live stats.

Until then, the quiz results screen and the Science page use this browser's own answers, and say so.
