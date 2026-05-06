-- =============================================================
-- PollApp — Supabase Schema
-- Im Supabase-Dashboard öffnen: SQL Editor → New query → einfügen → Run
-- =============================================================

-- ---- Tabellen --------------------------------------------------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  end_date timestamptz,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  position int not null,
  text text not null,
  allow_multiple boolean not null default false
);

create table if not exists answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  position int not null,
  text text not null
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  voter_token text not null,
  created_at timestamptz not null default now(),
  unique (survey_id, voter_token)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer_option_id uuid not null references answer_options(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---- Indizes ---------------------------------------------------

create index if not exists idx_surveys_status_end_date on surveys(status, end_date);
create index if not exists idx_questions_survey on questions(survey_id, position);
create index if not exists idx_options_question on answer_options(question_id, position);
create index if not exists idx_votes_question on votes(question_id);
create index if not exists idx_votes_option on votes(answer_option_id);

-- ---- View für aggregierte Ergebnisse --------------------------

create or replace view question_results as
select
  q.id            as question_id,
  q.survey_id     as survey_id,
  ao.id           as answer_option_id,
  ao.position     as option_position,
  ao.text         as option_text,
  count(v.id)     as vote_count
from questions q
join answer_options ao on ao.question_id = q.id
left join votes v on v.answer_option_id = ao.id
group by q.id, ao.id;

-- ---- Realtime aktivieren --------------------------------------
-- Damit das LIVE-Label die Ergebnisse pusht, muss votes in der
-- Realtime-Publikation sein. Im Dashboard: Database → Replication
-- → 'supabase_realtime' → 'votes' aktivieren. Oder per SQL:
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table submissions;

-- ---- Row Level Security ---------------------------------------
-- Da die App ohne Auth läuft, erlauben wir anonymes Lesen UND
-- anonymes Erstellen via anon-Key. Das ist für ein Lernprojekt OK.
-- Für Produktion sollte man hier strikter werden.

alter table categories       enable row level security;
alter table surveys          enable row level security;
alter table questions        enable row level security;
alter table answer_options   enable row level security;
alter table submissions      enable row level security;
alter table votes            enable row level security;

-- Lesen: alle dürfen lesen
create policy "public read categories"     on categories     for select using (true);
create policy "public read surveys"        on surveys        for select using (true);
create policy "public read questions"      on questions      for select using (true);
create policy "public read options"        on answer_options for select using (true);
create policy "public read submissions"    on submissions    for select using (true);
create policy "public read votes"          on votes          for select using (true);

-- Schreiben: alle dürfen Surveys/Questions/Options anlegen (kein Auth)
create policy "public insert surveys"      on surveys        for insert with check (true);
create policy "public insert questions"    on questions      for insert with check (true);
create policy "public insert options"      on answer_options for insert with check (true);
create policy "public insert submissions"  on submissions    for insert with check (true);
create policy "public insert votes"        on votes          for insert with check (true);

-- ---- Seed: Kategorien aus den Mockups -------------------------

insert into categories (name) values
  ('Team activities'),
  ('Health & Wellness'),
  ('Gaming & Entertainment'),
  ('Healthy Lifestyle'),
  ('Workplace Culture')
on conflict (name) do nothing;
