# PollApp

Eine Umfrage-App nach dem Figma-Design „Poll-App Design", umgesetzt mit
**Angular 21** + **Supabase**.

## Setup

### 1. Supabase-Projekt vorbereiten

1. In [supabase.com](https://supabase.com) ein neues Projekt anlegen.
2. Im Dashboard: **SQL Editor** → **New query** → Inhalt von
   [supabase/schema.sql](supabase/schema.sql) einfügen → **Run**.
   Das legt alle Tabellen, Indizes, die `question_results`-View, RLS-Policies,
   Realtime-Publikationen und ein paar Seed-Kategorien an.
3. Optional aber empfohlen: **Database → Replication** prüfen, dass
   `votes` und `submissions` in der `supabase_realtime`-Publikation aktiv sind
   (das `schema.sql` versucht das schon, manchmal ist hier eine UI-Bestätigung nötig).

### 2. Credentials eintragen

In [src/environments/environment.ts](src/environments/environment.ts):

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabaseAnonKey: '<anon-public-key>'
};
```

Beides findest du in Supabase unter **Project Settings → API**.

### 3. Starten

```bash
npm install
npm start
```

→ http://localhost:4200

## Routen

| Pfad | Beschreibung |
|---|---|
| `/` | Home — Hero, Ending-soon-Highlights, Active/Past-Tabs, Liste, Kategorie-Sortierung |
| `/survey/new` | Neue Umfrage anlegen — dynamische Fragen + Antworten, Validierung |
| `/survey/:id` | Detailansicht — Abstimmung links, Live-Ergebnisse (Realtime) rechts |

## Architektur-Überblick

```
src/app/
├── core/
│   ├── models/survey.model.ts       # Domain Types
│   └── services/
│       ├── supabase.service.ts      # SDK-Client
│       ├── survey.service.ts        # CRUD + Vote + Realtime
│       └── voter-token.service.ts   # anonymes Voter-UUID in localStorage
├── shared/
│   ├── components/                  # Header, Logo, Cards, Tabs, Results-Bars
│   └── pipes/ends-in.pipe.ts
└── pages/                           # Home, CreateSurvey, SurveyDetail
```

Design-Tokens in [src/styles/_tokens.scss](src/styles/_tokens.scss),
Schriften (Nerko One + Mulish) in [src/styles/_typography.scss](src/styles/_typography.scss).
