# Youth of Peace e.V. — Website und Control Center

[Deutsch](#deutsch) · [English](#english)

---

## Deutsch

Die Website des Vereins Youth of Peace e.V. in drei Sprachen (Deutsch, Englisch, Arabisch von
rechts nach links) und das **Control Center**, in dem der Verein Inhalte, Mitgliedsanträge,
Mitglieder, Konten, E-Mail, Statistik und den Server ohne Programmierkenntnisse verwaltet.

**Stand:** in Entwicklung, noch nicht veröffentlicht. Es gibt noch keinen Server; offene
Entscheidungen des Vereins stehen in [docs/CONTROL-CENTER.md](docs/CONTROL-CENTER.md) §12 und in
der Checkliste vor dem Start ([docs/OPERATIONS.de.md](docs/OPERATIONS.de.md) §11). Fehlende Texte
sind als `[PLACEHOLDER: …]` markiert; `npm run check:placeholders` listet sie auf.

### Was es gibt

| Bereich | Inhalt |
|---|---|
| Website | Startseite, Über uns, Projekte, Aktuelles, Veranstaltungen, Mitglied werden, Unterstützen, Kontakt, Impressum, Datenschutz; Seitenbaukasten mit den Bausteinen des Designs; ohne Cookies und ohne Anfragen an Dritte; WCAG 2.1 AA |
| Control Center | Anmeldung mit zweitem Faktor, sechs Rollen, Audit-Log; Inhalte mit Entwürfen, Vorschau und geplanter Veröffentlichung; Anträge, Mitgliederregister, Export personenbezogener Daten nur mit Zweck und Rechtsgrundlage; Benachrichtigungen; Betrieb (Dienste, Ressourcen, Protokolle, Sicherungen, Zertifikate); E-Mail; Besucherstatistik ohne Cookies |
| Betrieb | Docker Compose mit Caddy (zwei Hosts, Zugangsschranke), PostgreSQL, einem Betriebs-Agenten mit nächtlichen Sicherungen (restic) und wöchentlicher Wiederherstellungsprobe |

Technik: Next.js 16.3.8, Payload 3.90.2, PostgreSQL 18.6, Node.js 24.21.0. Alle Abhängigkeiten
haben exakte Versionen und sind mindestens 14 Tage alt (`npm run check:deps`).

### Dokumentation

| Für wen | Dokument |
|---|---|
| Mitarbeitende des Vereins | [Handbuch](docs/HANDBOOK.de.md) ([English](docs/HANDBOOK.md)) |
| Server und Technik | [Betriebshandbuch](docs/OPERATIONS.de.md) ([English](docs/OPERATIONS.md)): Einrichtung, Einstellungen, Sicherungen, Wiederherstellung, Updates, Fehlersuche, Checkliste vor dem Start |
| Entwicklung | [docs/development.md](docs/development.md) (englisch): lokaler Start, Prüfungen, Tests, Migrationen, Abhängigkeiten |
| Planung und Entscheidungen | [docs/PLAN.md](docs/PLAN.md) ([العربية](docs/PLAN.ar.md)), [docs/CONTROL-CENTER.md](docs/CONTROL-CENTER.md) ([العربية](docs/CONTROL-CENTER.ar.md)) |
| Datenschutz (Fakten für die Datenschutzerklärung) | [docs/privacy-notes.md](docs/privacy-notes.md) |
| Mitarbeit am Code | [CONTRIBUTING.md](CONTRIBUTING.md) |

### Schnellstart (Entwicklung)

```bash
cp .env.example .env        # Werte eintragen, siehe docs/development.md
docker compose up -d        # PostgreSQL + lokaler S3-Speicher
npm ci
npm run migrate
npm run seed
npm run create-admin -- du@example.org "Dein Name"
npm run dev                 # http://localhost:3000 · Control Center unter /admin
```

Prüfungen vor einem Commit: `npm run verify` (Lint, Typen, Unit-Tests, Build, Alter der
Abhängigkeiten, Sicherheitshinweise), dazu `npm run test:integration` und `npm run test:e2e`.
Die CI führt alles bei jedem Commit aus, auch den Bau und Start des Produktions-Images.

---

## English

The website of Youth of Peace e.V. in three languages (German, English, Arabic right to left) and
the **Control Center**, where the association manages content, membership applications, members,
accounts, e-mail, statistics and the server without writing code.

**Status:** in development, not published yet. There is no server yet; the association's open
decisions are listed in [docs/CONTROL-CENTER.md](docs/CONTROL-CENTER.md) §12 and in the pre-launch
checklist ([docs/OPERATIONS.md](docs/OPERATIONS.md) §11). Missing texts are marked
`[PLACEHOLDER: …]`; `npm run check:placeholders` lists them.

### What there is

| Area | Contents |
|---|---|
| Website | Home, About us, Projects, News, Events, Membership, Support us, Contact, Legal notice, Privacy; a page builder with the design's building blocks; no cookies and no requests to third parties; WCAG 2.1 AA |
| Control Center | Sign-in with a second factor, six roles, audit log; content with drafts, preview and scheduled publishing; applications, members register, export of personal data only with a purpose and a legal basis; notifications; operations (services, resources, logs, backups, certificates); e-mail; visitor statistics without cookies |
| Operations | Docker Compose with Caddy (two hosts, access gate), PostgreSQL, an operations agent with nightly backups (restic) and a weekly restore drill |

Stack: Next.js 16.3.8, Payload 3.90.2, PostgreSQL 18.6, Node.js 24.21.0. Every dependency has an
exact version and is at least 14 days old (`npm run check:deps`).

### Documentation

| For | Document |
|---|---|
| The association's staff | [Handbook](docs/HANDBOOK.md) ([Deutsch](docs/HANDBOOK.de.md)) |
| Server and technicians | [Operations guide](docs/OPERATIONS.md) ([Deutsch](docs/OPERATIONS.de.md)): setup, settings, backups, restore, updates, troubleshooting, pre-launch checklist |
| Development | [docs/development.md](docs/development.md): local start, checks, tests, migrations, dependencies |
| Plan and decisions | [docs/PLAN.md](docs/PLAN.md) ([العربية](docs/PLAN.ar.md)), [docs/CONTROL-CENTER.md](docs/CONTROL-CENTER.md) ([العربية](docs/CONTROL-CENTER.ar.md)) |
| Data protection (facts for the privacy policy) | [docs/privacy-notes.md](docs/privacy-notes.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

### Quick start (development)

```bash
cp .env.example .env        # fill in the values, see docs/development.md
docker compose up -d        # PostgreSQL + local S3 storage
npm ci
npm run migrate
npm run seed
npm run create-admin -- you@example.org "Your Name"
npm run dev                 # http://localhost:3000 · Control Center at /admin
```

Checks before a commit: `npm run verify` (lint, types, unit tests, build, dependency age, security
advisories), plus `npm run test:integration` and `npm run test:e2e`. CI runs all of them on every
commit, including building and starting the production image.
