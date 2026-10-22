# Youth of Peace — Betriebshandbuch

**English version:** [OPERATIONS.md](OPERATIONS.md)

**Stand:** Entwurf vom 2026-10-22, geschrieben auf Grundlage des Codes von CC-0 bis CC-5
([CONTROL-CENTER.md](CONTROL-CENTER.md) §14–§19). **Nichts in diesem Handbuch wurde bisher auf
einem echten Server ausgeführt.** Es gibt noch keinen Server (Entscheidung 2), und CC-3 wurde nur
lokal und in der CI gebaut und getestet (CONTROL-CENTER.md §17). Probieren Sie jeden Ablauf zuerst
auf einem Testserver aus, bevor Sie sich darauf verlassen.

**Konventionen**

- `[PLACEHOLDER: …]` markiert eine Entscheidung oder einen Wert, der noch fehlt.
- Befehle laufen auf dem Server, im Ordner des Repositorys, als Benutzer mit Docker-Rechten.
- `<spitze Klammern>` sind Werte, die Sie selbst einsetzen. Geheimnisse stehen nie in diesem
  Handbuch.
- **Freigabe nötig** markiert Handlungen, die Produktionsdaten ändern oder löschen. Sie brauchen
  vorher die ausdrückliche Freigabe des Vereins (CONTROL-CENTER.md §17, erster Absatz: keine
  wirksame Wiederherstellung oder Löschung ohne seine ausdrückliche Freigabe).

**Inhalt**

1. Überblick
2. Anforderungen an den Server
3. Erste Inbetriebnahme
4. E-Mail
5. Sicherungen und Test-Wiederherstellungen
6. Wiederherstellung
7. Updates
8. Überwachung und Warnungen
9. Datenschutz-Fakten für den Betrieb
10. Fehlersuche
11. Checkliste vor dem Start

---

## 1. Überblick

### 1.1 Dienste

Die Produktion ist ein Docker-Compose-Projekt namens `yop` (`docker-compose.prod.yml`) mit fünf
Diensten. Dazu kommt `tools` für Server-Befehle (Profil `tools`, wird nur für einen einzelnen
Befehl gestartet, §3.6). Nur Caddy veröffentlicht Ports.

| Dienst | Image | Aufgabe | Veröffentlichte Ports |
|---|---|---|---|
| `caddy` | `caddy:2.11.7-alpine`, per Digest fixiert | TLS-Zertifikate, HTTP → HTTPS, der Host der Website und der Host des Control Centers, Weiterleitung von `www`, Admin-Sperre, Zugriffsprotokolle | `80/tcp`, `443/tcp`, `443/udp` |
| `app` | `yop-website:<APP_VERSION>`, gebaut aus `docker/Dockerfile` | Website und Control Center (Next.js 16.3.8, Payload 3.90.2), Port 3000 innerhalb von Docker | keine |
| `postgres` | `postgres:18.6-alpine3.24`, per Digest fixiert | Datenbank | keine |
| `ops-agent` | `yop-ops-agent:<APP_VERSION>`, gebaut aus `ops-agent/Dockerfile` | Sicherungen, Test-Wiederherstellungen, Status, maskierte Protokolle, Neustarts von `app` und `caddy`, Zertifikatsprüfungen, Besucherzählung; Port 4100 innerhalb von Docker; nimmt nur signierte Anfragen der App an | keine |
| `socket-proxy` | `tecnativa/docker-socket-proxy:v0.5.0`, per Digest fixiert | Docker-API nur für den Agenten, beschränkt auf genau dessen Aufrufe (`docker/socket-proxy/haproxy.cfg.template`) | keine |

Absicherung in der Compose-Datei: schreibgeschütztes Wurzel-Dateisystem für `caddy`, `app`,
`ops-agent` und `socket-proxy` (`/tmp` im Arbeitsspeicher); alle Linux-Capabilities entzogen für
`caddy` (außer dem Binden von Ports unter 1024), `app` und `ops-agent`; `no-new-privileges` für
alle fünf. Die App läuft als Benutzer `nextjs` (UID 1001), der Agent als `agent` (UID 1000).

Das Image des Agenten enthält auch die Werkzeuge, die er ausführt: restic 0.19.1, rclone 1.75.1
und die Client-Werkzeuge von PostgreSQL 18.6 (`pg_dump`, `pg_restore`, `psql`)
(`ops-agent/Dockerfile`).

### 1.2 Netze und Volumes

| Netz | Intern | Mitglieder | Zweck |
|---|---|---|---|
| `web` | nein | caddy, app, ops-agent | Caddy → App; der Agent prüft die Zertifikate über `caddy:443` |
| `egress` | nein | app, ops-agent | Verbindungen nach außen: Medien-Bucket und Mailserver (App); Sicherungsspeicher und Medien-Bucket (Agent) |
| `db` | ja | postgres, app, ops-agent | Datenbank |
| `ops` | ja | app, ops-agent | App → Agent (`http://ops-agent:4100`) |
| `docker` | ja | ops-agent, socket-proxy | Agent → Docker-API (`http://socket-proxy:2375`) |

| Volume | Inhalt |
|---|---|
| `pgdata` | Daten von PostgreSQL (`/var/lib/postgresql`) |
| `nextcache` | `/app/.next/cache` der App |
| `caddy_data` | Zertifikate und Schlüssel von Caddy |
| `caddy_config` | Konfigurationsstand von Caddy |
| `caddy_logs` | Zugriffsprotokolle; schreibgeschützt im Agenten eingebunden |
| `agent_data` | Zustand des Agenten (`state.json`: Verlauf der Sicherungen, Test-Wiederherstellungen und Neustarts sowie der Inhalt jeder Sicherung), der Cache von restic und eine vollständige lokale Kopie des Medien-Buckets (`media-mirror`) |

### 1.3 Die beiden Hosts und die Admin-Sperre

- `SITE_HOST` ist die Website, `ADMIN_HOST` das Control Center. Compose macht daraus die Werte
  `SERVER_URL=https://<SITE_HOST>` und `ADMIN_URL=https://<ADMIN_HOST>` der App.
- Der Verein hat `verwaltung.yop-ye.org` als Adresse des Control Centers gewählt
  (CONTROL-CENTER.md §14). `SITE_HOST`: `[PLACEHOLDER: Hostname der Website]`.

So behandeln Caddy (`docker/caddy/Caddyfile`) und die App (`src/lib/admin-host.ts`) eine Anfrage:

1. **`www.<SITE_HOST>`:** dauerhafte Weiterleitung auf `https://<SITE_HOST>` mit demselben Pfad.
2. **`<SITE_HOST>`:** Caddy entfernt einen vom Besucher gesendeten `X-Admin-Gate`-Header
   (`header_up -X-Admin-Gate`, Caddyfile Zeile 55) und reicht die Anfrage an die App weiter. Die
   App antwortet mit 404 auf `/admin`, die Live-Vorschau und `/api`. Einzige Ausnahme sind
   `GET`/`HEAD` auf `/api/media/file/…` (Bilder und Dateien der Website).
3. **`<ADMIN_HOST>`:**
   1. Caddy prüft die Adresse des Besuchers gegen `ADMIN_ALLOW_IPS`
      (`@outside not remote_ip …`, Zeile 68). Liegt sie außerhalb der Liste, antwortet Caddy
      mit 404 (Zeile 69).
   2. Sonst setzt Caddy `X-Admin-Gate: <ADMIN_GATE_SECRET>` (Zeile 72). Ein vom Besucher
      gesendeter Wert wird dabei ersetzt.
   3. Die App vergleicht den Header mit ihrem eigenen `ADMIN_GATE_SECRET`. Fehlt er oder ist er
      falsch: 404. Stimmt er: `/admin`, `/api` und `/_next/` sind das Control Center, die
      Live-Vorschau wird ausgeliefert, `/` leitet auf `/admin` weiter, jeder andere Pfad auf den
      Host der Website.

Weitere Fakten:

- `ADMIN_ALLOW_IPS` ist eine durch Leerzeichen getrennte Liste von Netzen (Beispiel aus
  `.env.example`: `203.0.113.0/24`). Leer oder nicht gesetzt bedeutet `0.0.0.0/0 ::/0`, also
  alle. Die Anmeldung mit zwei Faktoren gilt in jedem Fall.
- Der Filter der Zugriffsprotokolle löscht den Sperr-Header aus den Protokollen.
- Caddy läuft ohne seine Admin-API (`admin off`, Caddyfile Zeile 7). Eine Änderung am Caddyfile
  oder an der Umgebung von Caddy erfordert einen Neustart des Containers `caddy`.
- Verbindungen über IPv6 können die Positivliste aushebeln. Siehe §2.1.

---

## 2. Anforderungen an den Server

| Anforderung | Einzelheiten |
|---|---|
| Server | `[PLACEHOLDER: Hosting-Anbieter, Standort in der EU und Servergröße — Entscheidung 2]` |
| Docker | Docker Engine mit Docker Compose v2 (`docker compose`). Die Compose-Datei folgt der Compose Specification (`name:` auf oberster Ebene). `docker/Dockerfile` nutzt Funktionen von BuildKit (`# syntax=docker/dockerfile:1`, `RUN --mount=type=secret`). `[PLACEHOLDER: Mindestversionen von Docker Engine und Compose — das Repository nennt keine]` |
| Docker-Socket | `/var/run/docker.sock` auf dem Host; nur in `socket-proxy` eingebunden |
| DNS | Einträge für `<SITE_HOST>`, `www.<SITE_HOST>` und `<ADMIN_HOST>`, die auf den Server zeigen. Caddy beantragt für diese Adressen Zertifikate. `[PLACEHOLDER: DNS-Anbieter — Entscheidung 4]` |
| Eingehende Ports | `80/tcp` und `443/tcp` aus dem Internet erreichbar. Compose veröffentlicht außerdem `443/udp` |
| Ausgehende Verbindungen | Caddy: die Zertifizierungsstelle. App: Medien-Bucket, Mailserver. Agent: Sicherungsspeicher, Medien-Bucket. Bau der Images: npm-Registry und Image-Registries (`npm ci` und die Basis-Images in den Dockerfiles) |
| Speicherplatz | Datenbank (`pgdata`); eine vollständige Kopie des Medien-Buckets in `agent_data` (der Agent spiegelt den Bucket, bevor er ihn sichert); der Cache von restic; bei jeder Test-Wiederherstellung vorübergehend eine zweite Kopie der Datenbank (auf demselben PostgreSQL-Server); Zugriffsprotokolle von bis zu 7 Tagen. Das Control Center warnt ab 90 % Belegung. `[PLACEHOLDER: Größe des Speichers]` |
| Verwaltung des Hosts | `[PLACEHOLDER: Zugang zum Server (wer, wie), Firewall, automatische Sicherheitsupdates]`. Laut CONTROL-CENTER.md §0 installiert der Host Systemupdates selbst (unattended upgrades); die Einrichtung des Hosts ist nicht Teil dieses Repositorys |
| Externe Erreichbarkeitsprüfung | `[PLACEHOLDER: Dienst oder keiner — Entscheidung 8]`. Ohne sie bemerken nur Menschen, wenn der ganze Server ausfällt (CONTROL-CENTER.md §17) |

### 2.1 IPv6

1. **Socket-Proxy.** Compose setzt `DISABLE_IPV6: '1'` für `socket-proxy`
   (`docker-compose.prod.yml` Zeile 172). Der Grund laut Kommentar in der Compose-Datei: Das
   interne Netz hat kein IPv6, und das Lauschen auf `[::]` hat den Start des Proxys verhindert
   (gefunden durch den Integrationstest, CONTROL-CENTER.md §17). Lassen Sie diese Einstellung so.
   Falls im Netz `docker` irgendwann IPv6 eingeschaltet wird, prüfen Sie sie erneut.
2. **Besucher über IPv6.** Die Docker-Netze dieser Compose-Datei haben kein IPv6. Ist der Server
   über IPv6 erreichbar (AAAA-Einträge), erreichen solche Clients Caddy über den Userland-Proxy
   von Docker und erscheinen mit dessen Adresse. Die Positivliste (`ADMIN_ALLOW_IPS`) und die
   Ratenbegrenzung der App sehen dann für alle diese Clients eine einzige Adresse
   (CONTROL-CENTER.md §17, bekannte Einschränkungen). Dort genannte Abhilfen: IPv6 für das
   Docker-Netz einschalten oder den Userland-Proxy von Docker abschalten.
   `[PLACEHOLDER: gewählte Abhilfe und genaue Schritte für die Docker-Version des Servers — in diesem Projekt nicht getestet]`

---

## 3. Erste Inbetriebnahme

### 3.1 Code auf den Server bringen

`[PLACEHOLDER: wie ein Release auf den Server kommt, z. B. Checkout eines Git-Tags — nicht entschieden]`

### 3.2 `.env` anlegen

```bash
cp .env.example .env
chmod 600 .env
```

Füllen Sie die Variablen unten aus. Committen Sie `.env` nie. Erzeugen Sie jedes Geheimnis
einzeln.

Compose gibt jedem Container nur, was er braucht: Die App bekommt weder das Passwort der
Sicherungen noch die Schlüssel des Sicherungsspeichers (`docker-compose.prod.yml`, Kommentar beim
Dienst `app`).

**Pflicht:** Ohne den Wert startet Compose nicht (`${…:?set in .env}`).
**Praktisch Pflicht:** Compose startet, aber eine Funktion arbeitet ohne den Wert nicht.

| Variable | Zweck | Pflicht | Wert |
|---|---|---|---|
| `SITE_HOST` | Hostname der Website, ohne `https://` | Pflicht | `[PLACEHOLDER: Hostname der Website]` |
| `ADMIN_HOST` | Hostname des Control Centers, ohne `https://` | Pflicht | `verwaltung.yop-ye.org` (CONTROL-CENTER.md §14) |
| `ACME_EMAIL` | Kontaktadresse für die Zertifizierungsstelle (Warnungen vor Ablauf) | Pflicht | `[PLACEHOLDER: Kontaktadresse]` |
| `ADMIN_GATE_SECRET` | Beweist der App, dass eine Anfrage über den Admin-Block von Caddy kam (§1.3) | Pflicht (Compose); `.env.example` nennt den Wert optional, das gilt nur ohne Caddy | `<generate: openssl rand -hex 32>` |
| `ADMIN_ALLOW_IPS` | Netze, die das Control Center öffnen dürfen, durch Leerzeichen getrennt | Optional; leer = alle | `[PLACEHOLDER: Positivliste oder keine]` |
| `ALLOW_INDEXING` | Erlaubt Suchmaschinen, die Website zu indexieren | Optional; Standard `false` | `false` bis zum Start; `true` erst beim Start |
| `PAYLOAD_SECRET` | Geheimnis von Payload | Pflicht | Mindestens 32 zufällige Bytes: `<generate: openssl rand -hex 32>` |
| `MFA_ENCRYPTION_KEY` | Verschlüsselt die Authenticator-Geheimnisse der Zwei-Faktor-Anmeldung | Optional; vor dem Start setzen (CONTROL-CENTER.md §14) | `<generate: openssl rand -hex 32>`. Ist der Wert leer, wird ein Schlüssel aus `PAYLOAD_SECRET` abgeleitet. Wird er später geändert (oder `PAYLOAD_SECRET`, solange er leer ist), muss jedes Konto seine Authenticator-App neu einrichten |
| `POSTGRES_USER` | Datenbankbenutzer | Pflicht | `yop` (wie in `.env.example`) |
| `POSTGRES_DB` | Name der Datenbank | Pflicht | `yop` (wie in `.env.example`) |
| `POSTGRES_PASSWORD` | Passwort der Datenbank | Pflicht | `<generate: openssl rand -hex 32>`. Nur Hex-Zeichen verwenden: Compose setzt das Passwort ohne Maskierung in Verbindungs-URLs ein (Zeilen 56 und 137); Zeichen wie `@`, `/`, `:` oder `%` würden sie zerstören |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | Medienspeicher (S3-kompatibel, EU-Region). Auch vom Agenten gelesen, um die Medien zu sichern | Praktisch Pflicht: Ohne `S3_BUCKET` landen Uploads in einem lokalen `MEDIA_DIR`, das diese Einrichtung nicht vorsieht, und die Mediensicherung des Agenten scheitert mit „S3_BUCKET is not set“ | `[PLACEHOLDER: Anbieter des Medienspeichers, EU-Region, Endpunkt, Bucket, Pfad-Stil]`; Zugangsschlüssel vom Anbieter |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Mailserver (siehe §4) | Optional; ohne Mailserver wird nichts versendet | `[PLACEHOLDER: Mail-Anbieter und Absender — Entscheidung 5]`; Standardport `587` |
| `NOTIFY_EMAIL` | Empfängt Benachrichtigungen „neuer Antrag / neue Nachricht“ (ohne personenbezogene Daten) | Optional | `.env.example`: `info@yop-ye.org` (Entscheidung 17 offen) |
| `MAIL_ALLOW_INTERNAL_HOSTS` | `true` erlaubt ein Mail-Relay im Netz des Servers, wenn es im Control Center eingetragen wird (§4) | Optional | Leer |
| `AUDIT_RETENTION_MONTHS` | Monate, die das Audit-Log und das Exportregister aufbewahrt werden (1–120) | Optional; leer = 12 (entschieden am 2026-10-20) | Leer |
| `MEMBERSHIP_CONSOLIDATION` | `on` verschiebt personenbezogene Daten angenommener Anträge ins Mitgliederregister | Optional | `off`, bis der Verein entscheidet (Entscheidung 12) |
| `APP_VERSION`, `APP_COMMIT` | Im Control Center angezeigtes Release; Build-Argumente; `APP_VERSION` kennzeichnet auch beide Images | Optional; leer = `latest` / `unknown` | Wird beim Deployment gesetzt, z. B. Git-Tag und Commit |
| `OPS_AGENT_SECRET` | Signiert jede Anfrage zwischen App und Agent | Pflicht. Mindestens 32 Zeichen: Ist der Wert kürzer, startet der Agent nicht und das Control Center zeigt „nicht eingerichtet“ (`ops-agent/src/config.ts`, `src/cms/operations/agent.ts`) | `<generate: openssl rand -hex 32>` (64 Zeichen) |
| `RESTIC_REPOSITORY` | restic-Repository im Sicherungsspeicher | Praktisch Pflicht; leer = Sicherungen nicht eingerichtet | `[PLACEHOLDER: Sicherungsspeicher mit Object Lock, EU — Entscheidung 9]`; Form wie in `.env.example`: `s3:https://<endpoint>/<bucket>` |
| `RESTIC_PASSWORD` | Verschlüsselt die Sicherungen | Praktisch Pflicht | `<generate: openssl rand -hex 32>`. Eine Kopie offline beim Vorstand aufbewahren: Ohne sie lässt sich keine Sicherung lesen. `[PLACEHOLDER: wer die Offline-Kopie verwahrt — Entscheidung 9]` |
| `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | Zugangsdaten für den Sicherungsspeicher; der Agent erhält sie als `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Praktisch Pflicht | Vom Anbieter: ein Schlüssel, der schreiben, aber nicht löschen darf, sofern der Anbieter das unterstützt |
| `BACKUP_TIME`, `DRILL_DAY`, `DRILL_TIME` | Nächtliche Sicherung und wöchentliche Test-Wiederherstellung, Ortszeit Europe/Berlin | Optional | `02:30`, `sun`, `04:00`. Format `HH:MM` (24 h) und `sun`…`sat`; ungültige Werte fallen auf diese Standardwerte zurück |
| `BACKUP_KEEP_DAILY`, `BACKUP_KEEP_WEEKLY`, `BACKUP_KEEP_MONTHLY` | Nach jeder Sicherung aufbewahrte Snapshots (§5.3) | Optional | `7`, `4`, `6` (Vorschlag bis Entscheidung 9); leer = diese Werte |
| `LOG_LEVEL` | Protokollstufe der App (`trace` … `fatal`) | Optional | `info` |

**In der Produktion nicht verwendet.** `SERVER_URL`, `ADMIN_URL`, `DATABASE_URL`, `OPS_AGENT_URL`
und `NEXT_TELEMETRY_DISABLED` in `.env` dienen der Entwicklung. Compose setzt diese Werte für die
Container selbst (`docker-compose.prod.yml` Zeilen 56–58, 63, 81).

### 3.3 Konfiguration prüfen

```bash
docker compose -f docker-compose.prod.yml --env-file .env config --quiet
```

Keine Ausgabe heißt: Die Datei ist gültig. Fehlt eine Pflichtvariable, bricht die Prüfung mit
„set in .env“ ab. Die CI führt dieselbe Prüfung mit Beispielwerten aus
(`.github/workflows/ci.yml`, Schritt „Production configuration“).

Ohne `--quiet` gibt der Befehl die gesamte Konfiguration aus, mit allen Geheimnissen. Fügen Sie
diese Ausgabe nirgends ein.

### 3.4 Bauen und starten

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env ps
```

- Das baut `yop-website:<APP_VERSION>` und `yop-ops-agent:<APP_VERSION>`, lädt die drei
  fixierten Images und startet alle Dienste. Der Bau braucht keine Geheimnisse.
- `app` und `ops-agent` starten, sobald PostgreSQL als gesund gemeldet ist.
- `postgres`, `app` und `ops-agent` haben Health-Checks und sollten `healthy` zeigen. `caddy` und
  `socket-proxy` haben keine und sollten `running` zeigen.

### 3.5 Datenbank-Migrationen

Migrationen laufen von selbst. `src/payload.config.ts` (Zeile 263) übergibt die committeten
Migrationen als `prodMigrations`, und Payload wendet ausstehende Migrationen an, sobald es sich mit
`NODE_ENV=production` (im Image gesetzt) mit der Datenbank verbindet. docs/development.md: „The
production container applies pending migrations by itself on first start.“ In keiner Umgebung wird
das Schema per `push` geändert.

Den Start im Protokoll der App verfolgen:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f app
```

Die neueste angewandte Migration prüfen (dieselbe Abfrage, die die Sicherung nutzt,
`ops-agent/src/backup.ts`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select name from payload_migrations order by id desc limit 1;"'
```

Der Name sollte der neuesten Datei in `src/migrations/` entsprechen.

Hinweis: Die Migration von CC-0 beendet jede vorher bestehende Sitzung (CONTROL-CENTER.md §14).
Das betrifft nur eine Datenbank, in der es schon Konten gab.

### 3.6 Ersten Super-Administrator anlegen

Das CMS hat keine offene Registrierung, auch nicht für das erste Konto. Der erste
Super-Administrator wird auf dem Server mit `scripts/create-admin.ts` angelegt, ausgeführt vom
Dienst `tools` der Compose-Datei. Das laufende Image der Website kann das nicht: Es enthält nur den
kompilierten Server, nicht den Quellcode und nicht das Kommandozeilenwerkzeug von Payload. `tools`
ist ein eigenes Image aus demselben Dockerfile (Target `tools`) mit dem Quellcode und allen
Abhängigkeiten. Es hat das Profil `tools`, daher startet `up` es nie; es läuft nur für einen Befehl
und wird danach entfernt (`--rm`).

```bash
docker compose -f docker-compose.prod.yml --env-file .env --profile tools run --rm tools \
  npm run create-admin -- <email> "<name>"
```

- Beim ersten Aufruf wird das Image `yop-website-tools` gebaut (einige Minuten).
- Auf einer leeren Datenbank wendet der Befehl die Migrationen selbst an, bevor er das Konto
  anlegt. Er funktioniert also auch, bevor die App einmal gestartet ist.
- Das Passwort kommt aus `ADMIN_PASSWORD`, falls gesetzt (mindestens 12 Zeichen; übergeben Sie es
  mit `-e ADMIN_PASSWORD=…` nach `run`). Sonst wird einmalig ein zufälliges Passwort ausgegeben.
  Behandeln Sie diese Ausgabe als Geheimnis.
- Eine Adresse, für die schon ein Konto besteht, wird abgelehnt.
- Wessen Konto: Das eigene Konto des Vereins wird der Haupt-Super-Administrator. Echte Konten
  werden erst angelegt, wenn der Verein die Personen benennt, und in der Produktion gibt es keine
  Testkonten mit Admin-Rechten (CONTROL-CENTER.md §14).
  `[PLACEHOLDER: E-Mail-Adresse und Name für das Konto des ersten Super-Administrators — vom Verein benannt]`

Getestet auf einer leeren Datenbank mit der Produktions-Compose-Datei (lokal und in der CI bei
jedem Commit: Job „production“ in `.github/workflows/ci.yml`): Das Konto wird mit der Rolle
Super-Administrator angelegt, ein zweites Konto mit derselben Adresse wird abgelehnt, und
`reset-mfa` (§3.9) funktioniert auf dieselbe Weise. Auf dem echten Server noch nicht ausgeführt.

### 3.7 Zwei-Faktor-Anmeldung sofort einrichten

1. Öffnen Sie `https://<ADMIN_HOST>/admin` (der Befehl gibt diese Adresse aus).
2. Melden Sie sich mit E-Mail-Adresse und Passwort an.
3. Richten Sie die Authenticator-App (Google Authenticator, Microsoft Authenticator oder ähnlich)
   mit dem QR-Code ein. Vor diesem Schritt kann das Konto nichts anderes tun.
4. Bewahren Sie die 10 Wiederherstellungscodes offline auf. Sie werden nur einmal angezeigt.
   `[PLACEHOLDER: wo der Verein die Wiederherstellungscodes aufbewahrt]`
5. Ändern Sie das Anfangspasswort (Kopf von create-admin: „Change the password afterwards“).

„Meine Sicherheit“ (`/admin/security`) zeigt Sitzungen, bekannte Geräte und die
Wiederherstellungscodes.

### 3.8 Zweiter Super-Administrator

- Es braucht mindestens zwei Super-Administratoren, damit einer den zweiten Faktor des anderen
  zurücksetzen kann (CONTROL-CENTER.md §4, §3.3).
- Der Verein benennt diese Person später (§15). Legen Sie das Konto genauso an wie das erste
  (§14, „Before going live with CC-0“, Punkt 4), danach §3.7 für diese Person.
  `[PLACEHOLDER: zweiter Super-Administrator — Entscheidung 13]`
- Alle anderen Konten legen Administratoren im Control Center an (docs/development.md).

### 3.9 Weitere Server-Befehle

Alle drei laufen wie `create-admin` über den Dienst `tools` (§3.6):
`docker compose -f docker-compose.prod.yml --env-file .env --profile tools run --rm tools npm run <command>`.

| Befehl | Wirkung | Wann |
|---|---|---|
| `npm run reset-mfa -- <email>` | Setzt den zweiten Faktor eines Kontos zurück und beendet alle seine Sitzungen. Steht im Audit-Log; das Konto erhält eine E-Mail | Nur im Notfall: Die Person hat Telefon und Wiederherstellungscodes verloren, und kein anderer Super-Administrator kann den Faktor im Control Center zurücksetzen (`scripts/reset-mfa.ts`) |
| `npm run membership:consolidate` | Nur Bericht: welche angenommenen Anträge verschoben würden. Ändert nichts | Vor Entscheidung 12 |
| `npm run membership:consolidate -- --apply` | Verschiebt die personenbezogenen Daten angenommener Anträge ins Mitgliederregister | **Freigabe nötig.** Erst nachdem der Verein den Vorschlag freigegeben hat, nach einer Sicherung und mit `MEMBERSHIP_CONSOLIDATION=on`. Migrationsplan: CONTROL-CENTER.md §16 |

### 3.10 Prüfungen nach dem ersten Start

Aus CONTROL-CENTER.md §17, „Not tested on a real server“:

1. `https://<SITE_HOST>` zeigt die Website. `https://<SITE_HOST>/admin` antwortet mit 404.
2. `https://<ADMIN_HOST>/admin` zeigt die Anmeldung. Ist `ADMIN_ALLOW_IPS` gesetzt, erhält eine
   Adresse außerhalb der Liste 404.
3. Betrieb → Domains & SSL: Beide Zertifikate sind vertrauenswürdig.
4. Betrieb → Dienste & Status: fünf Dienste laufen. Vergleichen Sie CPU, Arbeitsspeicher und
   Speicherplatz einmal mit `free` und `df` auf dem Server.
5. Betrieb → Sicherungen: „Jetzt sichern“, danach „Wiederherstellung testen“ (sobald §5
   eingerichtet ist).
6. Betrieb → E-Mail: „Test-E-Mail an mich“ (sobald §4 eingerichtet ist).

---

## 4. E-Mail

Die Einstellungen kommen aus zwei Quellen:

| Wo | Was | Wer |
|---|---|---|
| `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `NOTIFY_EMAIL` | Server-Einstellungen | Personen mit Zugang zum Server |
| Control Center: Betrieb → E-Mail → „Einstellungen bearbeiten“ | Mailserver, Port, Benutzername, Absenderadresse und -name, Adresse für neue Anträge und Nachrichten, **technische Adresse für Warnungen**, Domain und DKIM-Selektor für die Prüfungen | Berechtigung `email.manage` (Super-Administrator, technischer Administrator); Speichern braucht einen Code aus den letzten fünf Minuten und steht im Audit-Log |

Regeln (`src/cms/mail/settings.ts`, `src/cms/email.ts`):

- Leere Felder im Control Center übernehmen die Server-Einstellungen. Eine Installation, die nur
  in `.env` eingerichtet ist, funktioniert weiter.
- Das **Passwort des Mailservers wird ausschließlich aus `SMTP_PASSWORD`** auf dem Server gelesen
  (Entscheidung 16 wie empfohlen). Der Bildschirm zeigt „auf dem Server gesetzt“ oder „nicht
  gesetzt“. Führen Sie nach einer Änderung an `.env`
  `docker compose -f docker-compose.prod.yml --env-file .env up -d` aus, damit die App den neuen
  Wert erhält.
- E-Mails werden nur versendet, wenn Mailserver und Absenderadresse gesetzt sind. Sonst wird nichts
  versendet, die App protokolliert „E-mail not sent: no mail server configured“, und das
  Versandprotokoll vermerkt „nicht gesendet“.
- Port 465 nutzt TLS von Anfang an. Jeder andere Port muss per STARTTLS verschlüsseln.
- Die technische Adresse gibt es nur in den Einstellungen des Control Centers, nicht in `.env`.
  Ohne sie erscheinen Warnungen nur in der Glocke (§8.2).
- **`MAIL_ALLOW_INTERNAL_HOSTS`** (`src/cms/mail/host-policy.ts`): Ein **im Control Center**
  eingetragener Mailserver wird nur auf den Ports 25, 465, 587 oder 2525 verwendet und nur, wenn
  jede Adresse, zu der sein Name aufgelöst wird, im Internet liegt (nicht dieser Rechner, kein
  privates, Link-Local-, Shared- oder reserviertes Netz). Sonst scheitert der Versand mit
  `PORT_NOT_ALLOWED`, `HOST_NOT_ALLOWED` oder `HOST_NOT_FOUND`. `MAIL_ALLOW_INTERNAL_HOSTS=true`
  erlaubt dort zusätzlich ein Relay im Netz des Servers. `SMTP_HOST` aus `.env` wird immer
  unverändert und ohne diese Prüfung verwendet.

Der E-Mail-Bildschirm (`/admin/email`) zeigt den verwendeten Server und seine Herkunft, die
Zustellungen der letzten 30 Tage, das Versandprotokoll (gekürzter Empfänger, kein Betreff oder
Inhalt, 90 Tage aufbewahrt), die MX-, SPF-, DKIM- und DMARC-Einträge der Domain (vom Server aus
abgefragt) und die Vorlagen. „Test-E-Mail an mich“ sendet über den echten Versandweg, nur an die
eigene Adresse der angemeldeten Person, höchstens fünfmal pro Stunde. Eine gescheiterte Zustellung
warnt alle mit `email.manage` in der Glocke, einmal pro Tag; per E-Mail wird sie nicht gemeldet.

`[PLACEHOLDER: Mail-Anbieter, Absenderadresse, DKIM-Selektor — Entscheidung 5]`

---

## 5. Sicherungen und Test-Wiederherstellungen

Der Betriebs-Agent führt Sicherungen und Test-Wiederherstellungen nach eigenem Zeitplan aus,
unabhängig von der Website: Sie laufen auch, wenn die App nicht läuft
(`ops-agent/src/scheduler.ts`).

### 5.1 Was gesichert wird

| Teil | Wie (`ops-agent/src/backup.ts`) | restic-Tags |
|---|---|---|
| Datenbank | `pg_dump` im Custom-Format, als `/database.dump` direkt in restic geschrieben. Die Zeilenzahl jeder Tabelle, die Datenbank-Trigger und die neueste Migration werden im selben Datenbank-Snapshot erfasst und im Zustand des Agenten gespeichert, damit die Test-Wiederherstellung vergleichen kann | `yop`, `db` |
| Medien | `rclone sync` des Medien-Buckets nach `/var/lib/agent/media-mirror`, danach `restic backup` dieses Ordners | `yop`, `media` |

Alles landet in einem verschlüsselten restic-Repository, Hostname `yop`.

**Nicht gesichert:** `.env` (die Geheimnisse), `caddy_data` (Zertifikate), `agent_data` (Verlauf
des Agenten und Aufzeichnungen zu den Sicherungen; ohne sie vergleicht die Test-Wiederherstellung
nur die Struktur), die Zugriffsprotokolle.
`[PLACEHOLDER: wo eine Kopie der .env des Servers liegt und wer sie verwahrt]`

### 5.2 Zeitplan

| Aufgabe | Standard | Variable |
|---|---|---|
| Sicherung | Täglich 02:30 | `BACKUP_TIME` |
| Test-Wiederherstellung | Sonntags 04:00 | `DRILL_DAY`, `DRILL_TIME` |

- Die Zeiten sind Ortszeit Europe/Berlin (Standard `TIME_ZONE` des Agenten; Compose setzt den Wert
  nicht).
- Der Zeitplaner prüft zweimal pro Minute. Eine Aufgabe läuft einmal an ihrem Tag und in ihrer
  Minute. In der Minute, in der der Agent gestartet ist, läuft sie nicht.
- Es läuft immer nur eine Sicherung oder Test-Wiederherstellung. Findet eine geplante Aufgabe
  eine laufende vor, wird sie übersprungen.
- Stoppt der Agent während einer Sicherung, wird sie nicht fortgesetzt; der Lauf der nächsten Nacht
  übernimmt (`ops-agent/src/main.ts`).

### 5.3 Aufbewahrung

- Nach jeder Sicherung führt der Agent `restic forget --prune` aus, mit **7 täglichen,
  4 wöchentlichen, 6 monatlichen** Ständen (Standardwerte in `ops-agent/src/config.ts`; ein
  Vorschlag, Entscheidung 9 ist offen).
- Mit Object Lock lassen sich gesperrte Daten noch nicht entfernen. Der Verlauf zeigt dann
  „retention: not applied: …“. Die Sicherung selbst zählt trotzdem.
- Die Zahlen werden in `.env` mit `BACKUP_KEEP_DAILY`, `BACKUP_KEEP_WEEKLY` und
  `BACKUP_KEEP_MONTHLY` gesetzt (ganze Zahlen bis 1000). Ein leerer oder ungültiger Wert bedeutet
  den Vorschlag oben, nie „nichts aufbewahren“. Eine Änderung ist Entscheidung 9; führen Sie danach
  `up -d` aus, damit der Agent die neuen Werte erhält.
- Gelöschte personenbezogene Daten bleiben in Sicherungen, bis diese ablaufen (mit diesem Schema
  bis zu etwa sechs Monate; docs/privacy-notes.md).

### 5.4 Das restic-Repository

- Einstellungen: `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `BACKUP_S3_ACCESS_KEY_ID`,
  `BACKUP_S3_SECRET_ACCESS_KEY` (§3.2). Sicherungen gelten als eingerichtet, wenn Repository und
  Passwort gesetzt sind.
- **Ein manuelles `restic init` ist nicht nötig.** Die erste Sicherung prüft das Repository und
  legt es an, falls es noch nicht existiert (`ensureRepository` in `backup.ts`). Jeder andere
  Fehler wird gemeldet.
- Der Speicher selbst wird beim Anbieter eingerichtet:
  `[PLACEHOLDER: Bucket mit Object Lock, Sperrfrist und Zugangsschlüssel beim Sicherungsanbieter — Entscheidung 9]`
- Das Passwort muss offline beim Vorstand vorliegen (Entscheidung 9). Ohne es lässt sich keine
  Sicherung lesen.

### 5.5 Sicherung oder Test-Wiederherstellung von Hand

**Im Control Center (normaler Weg).** Betrieb → Sicherungen → „Jetzt sichern“ oder
„Wiederherstellung testen“.

- Braucht `operations.act` (Super-Administrator, technischer Administrator) und einen Code aus
  den letzten fünf Minuten.
- Höchstens 4 manuelle Sicherungen oder Test-Wiederherstellungen pro Stunde, immer nur eine
  gleichzeitig. Das Ergebnis erscheint nach einigen Minuten im Verlauf.
- Die Test-Wiederherstellung über die Schaltfläche liest 5 % der Daten des Repositorys zurück
  (`restic check --read-data-subset=5%`).

**Auf dem Server (Kommandozeile).** Derselbe Code wie im Dienst (`ops-agent/src/cli.ts`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts backup
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts drill
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts verify   # backup, then drill
```

- Gibt pro Ergebnis eine JSON-Zeile aus (Zahlen, nie Daten). Exit-Code 1, wenn ein Ergebnis nicht
  in Ordnung ist.
- Die Test-Wiederherstellung über die Kommandozeile liest **das ganze Repository** zurück
  (`--read-data-subset=100%`, `cli.ts` Zeile 30). Das kann lange dauern.
- Vorsicht, laut Code: Der Befehl läuft in einem eigenen Prozess. Der laufende Dienst bemerkt ihn
  nicht. Die Regel „immer nur eine“ des Dienstes gilt für ihn nicht, und sein Ergebnis erscheint
  nicht im Control Center. Der Dienst hält seinen Zustand im Arbeitsspeicher und schreibt
  `state.json` beim nächsten Ereignis neu; dabei geht verloren, was der Befehl dort eingetragen hat
  (`ops-agent/src/state.ts`). Der Snapshot im Repository bleibt erhalten. Nutzen Sie das Control
  Center, wenn es verfügbar ist, und starten Sie den Befehl nicht, während eine Sicherung oder
  Test-Wiederherstellung läuft.

Die gespeicherten Snapshots auflisten (Control Center: Sicherungen → „Gespeicherte Stände“):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent \
  restic snapshots --host yop --tag yop
```

### 5.6 Was die Test-Wiederherstellung prüft

`ops-agent/src/drill.ts`, wöchentlich und auf Anforderung:

1. Nimmt den neuesten Datenbank-Snapshot.
2. Löscht die getrennte Datenbank `restore_drill` auf demselben PostgreSQL-Server und legt sie neu
   an.
3. Stellt wieder her:
   `restic dump <snapshot> /database.dump | pg_restore --no-owner --no-acl --exit-on-error`.
4. Vergleicht die genaue Zeilenzahl jeder Tabelle, die neueste Migration und die Datenbank-Trigger
   mit dem, was die Sicherung aufgezeichnet hat. Fehlt die Aufzeichnung (z. B. nach dem Verlust von
   `agent_data`), prüft sie nur die Struktur: Die Tabellen existieren, und die fünf Schutz-Trigger
   `audit_log_no_truncate`, `audit_log_no_update_or_delete`, `exports_no_truncate`,
   `exports_no_update_or_delete`, `users_keep_super_admin` sind vorhanden.
5. Listet den neuesten Medien-Snapshot auf und zählt seine Dateien.
6. Liest einen Teil des Repositorys zurück (`restic check`).
7. Löscht `restore_drill`, damit keine zweite Kopie personenbezogener Daten auf dem Server bleibt.

Die Test-Wiederherstellung stellt keine Mediendateien wieder her und berührt die Live-Datenbank
nicht.

---

## 6. Wiederherstellung

> **Freigabe nötig.** Eine Wiederherstellung der Live-Datenbank ersetzt die Daten des Vereins
> durch einen älteren Stand. Sie braucht die ausdrückliche Freigabe des Vereins. Das Control
> Center hat bewusst keine Schaltfläche dafür: Entscheidung 10 ist offen (CONTROL-CENTER.md §8,
> §14, §17).
>
> **Entwurf. Nicht geprobt.** Dieser Ablauf wurde weder auf einem Testserver noch in der
> Produktion ausgeführt. Er **muss auf einem Testserver geprobt werden, bevor man sich auf ihn
> verlässt**. Er ist keine Routineaufgabe.

### 6.1 Was der Code bereits prüft

Jede Test-Wiederherstellung stellt die neueste Datenbanksicherung mit
`restic dump … | pg_restore --no-owner --no-acl --exit-on-error` in eine getrennte Datenbank
wieder her und prüft sie (§5.6). Dieser Teil läuft jede Woche und in der CI
(`tests/integration/backup-drill.test.ts`, mit einem lokalen Repository und Medien aus einem
Ordner).

**Vom Code nicht abgedeckt:** Wiederherstellung eines älteren Snapshots, Umschalten der App auf
die wiederhergestellten Daten, Wiederherstellung von Mediendateien, eine Wartungsseite während der
Wiederherstellung, Sicherungen auf echtem S3-Speicher (CONTROL-CENTER.md §17).

### 6.2 Nötige Entscheidungen, bevor dieser Ablauf genutzt werden kann

- `[PLACEHOLDER: wer eine Wiederherstellung der Produktion freigeben darf und wie die Freigabe festgehalten wird — Entscheidung 10]`
- `[PLACEHOLDER: Verfahren zum Umschalten von der Live-Datenbank auf die wiederhergestellte, entschieden und geprobt]`
- `[PLACEHOLDER: Wartungsseite während der Wiederherstellung — vorgeschlagen in CONTROL-CENTER.md §8, nicht umgesetzt]`
- `[PLACEHOLDER: wie lange die ersetzte Datenbank aufbewahrt wird und wer sie löscht]`
- `[PLACEHOLDER: wie Löschungen nach dem Snapshot, z. B. auf Antrag einer Person, nach einer Wiederherstellung wiederholt werden]`
- `[PLACEHOLDER: Ablauf zur Wiederherstellung der Medien — der Code sichert und zählt Mediendateien, stellt sie aber nie wieder her]`

### 6.3 Entwurf des Ablaufs (Datenbank)

1. Holen Sie die Freigabe ein (§6.2). Notieren Sie den Grund und den Snapshot, der
   wiederhergestellt werden soll.
2. Prüfen Sie, dass die letzte Test-Wiederherstellung erfolgreich war (Betrieb → Sicherungen).
3. Stoppen Sie die App, damit nichts mehr geschrieben wird. Website und Control Center sind dann
   nicht erreichbar.

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env stop app
   ```

4. Erstellen Sie über die Kommandozeile eine Sicherheitssicherung des aktuellen Stands (das
   Control Center ist nicht erreichbar; beachten Sie den Hinweis in §5.5):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts backup
   ```

5. Öffnen Sie eine Shell im Container des Agenten. Dort sind restic, `psql`, `pg_restore` und die
   Einstellungen des Repositorys in der Umgebung vorhanden:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent sh
   ```

6. Suchen Sie in dieser Shell den Snapshot und stellen Sie ihn in eine **neue** Datenbank wieder
   her. Verwenden Sie für ihren Namen Kleinbuchstaben, Ziffern und `_`. Verwenden Sie nie
   `restore_drill` (die nächste Test-Wiederherstellung löscht sie) und nie den Namen der
   Live-Datenbank.

   ```sh
   export RESTIC_CACHE_DIR=/var/lib/agent/restic-cache
   restic snapshots --host yop --tag yop,db
   BASE="${BACKUP_DATABASE_URL%/*}"     # connection without the database name
   psql "$BASE/postgres" -v ON_ERROR_STOP=1 -c 'create database "<new_database>";'
   restic dump <snapshot-id> /database.dump \
     | pg_restore --no-owner --no-acl --exit-on-error --dbname "$BASE/<new_database>"
   ```

   Beide Befehle müssen ohne Fehlermeldung enden.

7. Prüfen Sie die wiederhergestellte Datenbank:

   ```sh
   psql "$BASE/<new_database>" -At -c "select tgname from pg_trigger where not tgisinternal;"
   psql "$BASE/<new_database>" -At -c "select name from payload_migrations order by id desc limit 1;"
   psql "$BASE/<new_database>" -At -c "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
   ```

   - Die fünf Schutz-Trigger aus §5.6 müssen in der Liste stehen.
   - Die Zahl der Tabellen sollte zum Eintrag der Sicherung im Verlauf des Control Centers passen
     („Datenbank … (N Tabellen)“).

8. Schalten Sie die App auf die wiederhergestellte Datenbank um.
   `[PLACEHOLDER: Verfahren zum Umschalten, entschieden und geprobt]`
   Ein Fakt aus der Compose-Datei, den eine Entscheidung nutzen kann: Die App (Zeile 56) und der
   Agent (Zeile 137) bilden ihre Verbindung beide aus `POSTGRES_DB`. Wird `POSTGRES_DB` auf die
   wiederhergestellte Datenbank gesetzt und werden die Container neu erstellt, schalten beide um,
   und die alte Datenbank bleibt bestehen. Das wurde nicht ausprobiert; auch der Container
   `postgres` würde neu erstellt.
9. Starten Sie alles. Ausstehende Migrationen, die neuer als die Sicherung sind, laufen beim
   Start (§3.5).

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up -d
   ```

10. Prüfen Sie die Website, die Anmeldung und Betrieb → Dienste & Status. Danach „Jetzt sichern“,
    damit es vom wiederhergestellten Stand eine Sicherung gibt, mit der die
    Test-Wiederherstellung vergleichen kann.
11. Medien: `[PLACEHOLDER: Ablauf zur Wiederherstellung der Medien]`.
12. Die ersetzte Datenbank bleibt bestehen, bis sie per Entscheidung gelöscht wird (§6.2).
    **Freigabe nötig** für das Löschen: Sie enthält personenbezogene Daten.

Was eine Wiederherstellung außerdem bewirkt, laut Datenmodell: Das Audit-Log liegt in der
Datenbank, Einträge nach dem Snapshot sind also verloren. Daten, die nach dem Snapshot gelöscht
wurden (von den Aufbewahrungsjobs oder von Menschen), sind wieder da; die nächtlichen
Aufbewahrungsjobs löschen Überfälliges erneut.

---

## 7. Updates

### 7.1 Eine neue Version ausrollen

1. Lesen Sie die Umsetzungsnotizen des Releases (CONTROL-CENTER.md) auf neue Einstellungen und
   Punkte unter „before going live“.
2. Betrieb → Sicherungen → „Jetzt sichern“. Warten Sie auf ein erfolgreiches Ergebnis.
3. Bringen Sie den neuen Code auf den Server (§3.1).
4. Setzen Sie `APP_VERSION` und `APP_COMMIT` in `.env` (z. B. Git-Tag und Commit). Beides sind
   Build-Argumente: Das Release erscheint im Control Center (Betrieb → Dienste & Status), und
   `APP_VERSION` kennzeichnet beide Images.
5. Prüfen und ausrollen:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env config --quiet
   docker compose -f docker-compose.prod.yml --env-file .env up -d --build
   ```

6. Die Migrationen laufen beim Start (§3.5). Verfolgen Sie `logs -f app`.
7. Prüfen Sie die Website, das Control Center und das unter Betrieb angezeigte Release.

Rollen Sie nicht während einer Sicherung oder Test-Wiederherstellung aus (Standard täglich 02:30,
sonntags 04:00): Der Neubau erstellt `ops-agent` neu, und eine unterbrochene Sicherung wird nicht
fortgesetzt (§5.2).

### 7.2 Migrationen

- Ausstehende Migrationen werden beim Start der App angewandt. In der Produktion wird nichts von
  Hand ausgeführt.
- Schemaänderungen kommen immer als committete Migrationen (`src/migrations/`,
  docs/development.md).

### 7.3 Zurückrollen

- **Datenbank: nur vorwärts.** Die Dateien in `src/migrations/` haben `down`-Schritte, aber die
  Produktion führt nur `up` aus. Mehrere `down`-Schritte löschen Tabellen oder können Daten nicht
  zurückbringen (zum Beispiel `src/migrations/20261021_125807_cc2_member_review.ts`,
  Zeilen 50–51). Führen Sie sie in der Produktion nicht aus, auch nicht über den Dienst `tools`;
  zurück geht es nur über eine Wiederherstellung (§6, Freigabe nötig).
- **App-Image.** Die Images tragen `APP_VERSION` als Tag, daher bleiben die vorherigen auf dem
  Server, solange sie nicht entfernt werden. Zurück zum vorherigen Image ist nur sicher, wenn das
  neue Release **keine** Migration hinzugefügt hat (vergleichen Sie `src/migrations/` zwischen
  beiden Versionen).
  `[PLACEHOLDER: Schritte zum Zurückrollen des App-Images, geprobt — z. B. vorherige APP_VERSION und up -d ohne --build; nicht getestet]`
- **Hat das neue Release die Datenbank migriert**, heißt Zurückrollen: die vor dem Update
  erstellte Sicherung wiederherstellen. Das ist eine Wiederherstellung der Produktion: §6,
  **Freigabe nötig**.

---

## 8. Überwachung und Warnungen

### 8.1 Bildschirme im Control Center

| Bildschirm | Adresse | Zeigt | Berechtigung |
|---|---|---|---|
| Betrieb → Dienste & Status | `/admin/operations` | Dienste mit Zustand, Gesundheit, Startzeit, Neustarts, Image; Neustart von `app` oder `caddy`; CPU, Arbeitsspeicher und Speicherplatz des Hosts (aktuell und 24 Stunden); Release und Werkzeugversionen des Agenten; Größe, Verbindungen und größte Tabellen der Datenbank; geplante Aufgaben mit letztem Lauf, „Jetzt ausführen“; externe Erreichbarkeit „nicht eingerichtet“ | `operations.read`; Neustart: `operations.act`, ein Code und der eingetippte Name des Dienstes |
| Betrieb → Sicherungen | `/admin/operations/backups` | Letzte Sicherung und Test-Wiederherstellung, Zeitplan, Aufbewahrung, Verlauf mit Einzelheiten und Abweichungen, gespeicherte Stände, „Jetzt sichern“, „Wiederherstellung testen“ | `operations.read`; Schaltflächen: `operations.act` und ein Code |
| Betrieb → Protokolle | `/admin/operations/logs` | Die letzten 100–500 Zeilen eines Dienstes, vom Agenten maskiert, durchsuchbar; jeder Abruf steht im Audit-Log | `operations.read` |
| Betrieb → Domains & SSL | `/admin/operations/domains` | Die Zertifikate, die Caddy ausliefert, stündlich und auf Anforderung geprüft | `operations.read` |
| Betrieb → E-Mail | `/admin/email` | §4 | `email.manage` |
| Einblicke → Statistik | `/admin/analytics` | Seitenaufrufe und Besuche, Seiten, Sprachen, Quellen, 404- und Serverfehler | `analytics.read` |
| Dashboard | `/admin` | Laufende Dienste, letzte Sicherung, Zertifikate; Seitenaufrufe; gescheiterte E-Mails | je Kachel |

`operations.read`: Super-Administrator, Vorstands-Administrator (lesend), technischer
Administrator, Prüfer (lesend). `operations.act`: Super-Administrator, technischer Administrator
(CONTROL-CENTER.md §4, §17).

Der Job `ops-collect` holt alle fünf Minuten den Status des Agenten ab, die Zertifikate einmal pro
Stunde. Neustarts sind auf 3 pro Dienst in 15 Minuten begrenzt.

### 8.2 Warnungen

Aus `src/cms/operations/alerts.ts`:

| Warnung | Wann | Verweist auf |
|---|---|---|
| Agent antwortet nicht | Der Agent hat seit 15 Minuten nicht geantwortet | Dienste & Status |
| Dienst ausgefallen | Ein überwachter Dienst (`caddy`, `app`, `postgres`, `ops-agent`, `socket-proxy`) läuft nicht, ist nicht gesund oder fehlt, während Docker erreichbar ist | Dienste & Status |
| Sicherung fehlgeschlagen | Eine Sicherung endete mit einem Fehler | Sicherungen |
| Sicherung überfällig | Sicherungen sind eingerichtet, und seit 26 Stunden gab es keine erfolgreiche (nicht während ein Job läuft) | Sicherungen |
| Test-Wiederherstellung fehlgeschlagen | Eine Test-Wiederherstellung endete mit einem Fehler oder Abweichungen | Sicherungen |
| Neustart fehlgeschlagen | Ein Neustart endete mit einem Fehler | Dienste & Status |
| Zertifikat | Ein Zertifikat ist nicht vertrauenswürdig oder läuft innerhalb von 14 Tagen ab | Domains & SSL |
| Speicher voll | Speicherplatz zu 90 % oder mehr belegt | Dienste & Status |

Wohin sie gehen (`src/cms/operations/collect.ts`, `alert-email.ts`):

- In die Glocke aller Personen mit `operations.act`.
- Per E-Mail an die technische Adresse, wenn sie in den E-Mail-Einstellungen gesetzt und ein
  Mailserver eingerichtet ist.
- Dieselbe Warnung höchstens einmal pro Tag, solange die Ursache besteht.
- **Keine Warnungen, solange der Agent „nicht eingerichtet“ ist** (kein gültiges
  `OPS_AGENT_SECRET` in der App): Der Sammel-Job bricht dann früh ab (`collect.ts` Zeile 167).

Gescheiterte E-Mail-Zustellungen sind ein eigener Hinweis in der Glocke aller Personen mit
`email.manage` (§4).

### 8.3 Protokolle

- **Im Control Center:** vom Agenten maskiert, bevor sie ihn verlassen (E-Mail- und IP-Adressen
  gekürzt; Tokens, Passwörter, Cookies und Schlüssel ersetzt; `ops-agent/src/mask.ts`). Die
  Maskierung erkennt gängige Muster; ein Geheimnis in ungewöhnlichem Format könnte durchrutschen
  (CONTROL-CENTER.md §17).
- **Auf dem Server:** `docker compose -f docker-compose.prod.yml --env-file .env logs <service>`
  zeigt die Protokolle **unmaskiert**. Nur Personen mit Zugang zum Server sehen sie.
- Die Protokolle der Dienste bleiben in Docker auf dem Server: höchstens drei Dateien zu 10 MB pro
  Dienst, die älteste wird überschrieben (`x-logging` in `docker-compose.prod.yml`; Docker selbst
  bewahrt sie ohne Grenze auf). Ältere Zeilen sind weg; sehen Sie sich ein Problem also bald nach
  seinem Auftreten an.
- Zugriffsprotokolle: `access.log` (Website) und `admin-access.log` (Control Center) im Volume
  `caddy_logs`, siehe §9.

### 8.4 Zertifikate

- Caddy beschafft und erneuert die Zertifikate automatisch für jede Site-Adresse im Caddyfile
  (Let's Encrypt, laut Kommentar im Caddyfile). Sie liegen in `caddy_data`.
- `ACME_EMAIL` ist die Kontaktadresse für die Zertifizierungsstelle (Warnungen vor Ablauf).
- Der Agent prüft das Zertifikat, das Caddy für `<SITE_HOST>` und `<ADMIN_HOST>` tatsächlich
  ausliefert (`CERT_HOSTS`, Compose Zeile 128), über `caddy:443` mit dem Hostnamen als SNI. Das
  funktioniert schon, bevor der DNS-Eintrag auf den Server zeigt. Ein Zertifikat gilt als in
  Ordnung, wenn es vertrauenswürdig ist und noch mindestens 14 Tage gilt. `www.<SITE_HOST>` wird
  nicht geprüft.

---

## 9. Datenschutz-Fakten für den Betrieb

Zitiert aus docs/privacy-notes.md und CONTROL-CENTER.md. Dieses Handbuch legt keine
Aufbewahrungsfrist fest und ändert keine. „Vorschlag“ heißt: vom Verein noch nicht entschieden.

| Daten | Fakt | Aufbewahrung |
|---|---|---|
| Zugriffsprotokolle (Caddy) | Eine JSON-Zeile pro Anfrage an Website und Control Center: Zeit, Methode, Host, Pfad ohne Query-String, Status, Größe, Dauer, verweisende Seite, Browserkennung, IP-Adresse gekürzt auf /24 (IPv4) oder /48 (IPv6). Nicht geschrieben: vollständige IP-Adressen, Ports, Cookies, `Authorization`, weitergeleitete Adressen, Antwort-Header. Sie bleiben auf dem Server; der Agent zählt sie nur | Rotation bei 50 MB, gelöscht nach 7 Tagen (Vorschlag, Entscheidung 7) |
| Messwerte des Hosts | CPU, Arbeitsspeicher, Last, Speicherplatz, Größe der Datenbank; keine personenbezogenen Daten | 30 Tage |
| Sicherungen | Ganze Datenbank (Anträge, Mitglieder, Nachrichten, Konten) und Mediendateien, mit restic verschlüsselt; Passwort in der Umgebung des Agenten und offline beim Vorstand | Vorschlag 7 täglich, 4 wöchentlich, 6 monatlich (Entscheidung 9). In der Live-Datenbank gelöschte Daten bleiben in Sicherungen, bis diese ablaufen (bis zu etwa sechs Monate) |
| Test-Wiederherstellungen | Wiederherstellung in eine getrennte Testdatenbank, Vergleich der Zahlen, sofortiges Löschen | — |
| Verlauf von Sicherungen, Test-Wiederherstellungen und Neustarts | Zeit, Art, Ergebnis, Zahlen, Größen, Dauer, Snapshot-Kennungen, maskierter Fehlertext; keine personenbezogenen Daten | 12 Monate |
| Protokolle der Dienste im Control Center | Nur für `operations.read`, auf Anforderung geladen, maskiert; jeder Abruf im Audit-Log | Rohprotokolle bleiben in Docker auf dem Server |
| Versandprotokoll der E-Mails | Zeit, Vorlage, gekürzter Empfänger, Ergebnis, Fehlercode, Dauer; kein Betreff, kein Inhalt | 90 Tage (Vorschlag) |
| Technische Warnungen | Was (Dienst, Host, Zeit) und ein Link; keine personenbezogenen Daten | — |
| Besucherstatistik | Stündliche Zahlen pro Seite, Sprache, verweisender Domain, 404- und Fehleradresse (maskiert); keine IP-Adresse, keine Browserkennung, kein Cookie | 13 Monate (Vorschlag) |
| Audit-Log | Keine IP-Adressen, keine Inhalte von Formularen oder Nachrichten | 12 Monate (`AUDIT_RETENTION_MONTHS`; am 2026-10-20 als Anfangswert entschieden, rechtliche Angemessenheit vor der Produktion zu prüfen) |
| Anmeldeaufzeichnungen | Keine IP-Adresse | Beendete Aufzeichnungen nach 30 Tagen gelöscht |
| Benachrichtigungen | Keine personenbezogenen Daten | Gelesene nach 30 Tagen, ungelesene nach 90 Tagen |
| Kontaktnachrichten | — | Sechs Monate nach Eingang (nächtlicher Job, 03:00 Serverzeit) |
| Abgelehnte Anträge | — | Sechs Monate nach der Entscheidung (derselbe Job) |

Für den Betrieb heißt das außerdem:

- Der technische Administrator sieht keine Anträge, Mitglieder oder Nachrichten; die Protokolle,
  die ihm angezeigt werden, sind maskiert (CONTROL-CENTER.md §4).
- Wer Zugang zum Server hat, kann die unmaskierten Protokolle, die Datenbank und `.env` lesen.
  Halten Sie diesen Kreis klein. `[PLACEHOLDER: wer Zugang zum Server hat]`
- Die Datenschutzerklärung ist der Text des Vereins (CONTROL-CENTER.md §7). Dieses Handbuch nennt
  nur Fakten.

---

## 10. Fehlersuche

Nur Probleme, die im Code oder in der Dokumentation beschrieben sind.

| Symptom | Ursache | Was tun |
|---|---|---|
| Die Betriebs-Bildschirme zeigen „Betriebs-Agent nicht eingerichtet“ | Die App hat kein gültiges `OPS_AGENT_SECRET` (fehlt oder kürzer als 32 Zeichen). `OPS_AGENT_URL` setzt Compose | `OPS_AGENT_SECRET` setzen (§3.2), dann `up -d`. In diesem Zustand entstehen keine Warnungen (§8.2) |
| `ops-agent` startet immer wieder neu; sein Protokoll meldet „OPS_AGENT_SECRET must be at least 32 characters“ | Dieselbe | Dasselbe |
| „Betriebs-Agent nicht erreichbar“, „hat noch nie geantwortet“ oder die Warnung „Agent antwortet nicht“ | Agent gestoppt, nicht gesund oder lehnt Anfragen ab | `ps` und `logs ops-agent`. Der Agent lehnt Anfragen ab, die älter als eine Minute oder schon einmal gesehen sind (401). App und Agent lesen das Geheimnis aus derselben Variablen in `.env` |
| Status: Docker nicht erreichbar; keine Liste der Dienste | `socket-proxy` läuft nicht | `logs socket-proxy`. `DISABLE_IPV6: '1'` beibehalten (§2.1) |
| Ein Neustart aus dem Control Center wird abgelehnt | Der Proxy erlaubt Neustarts nur für Container namens `yop-app-N` und `yop-caddy-N` (`haproxy.cfg.template` Zeile 47); Grenze 3 pro Dienst in 15 Minuten | Projektnamen `yop` und die Standardnamen der Container von Compose beibehalten. Ist die Grenze erreicht: warten |
| „Sicherungen nicht eingerichtet“; die Schaltflächen antworten „not configured“ | `RESTIC_REPOSITORY` oder `RESTIC_PASSWORD` fehlt | §3.2, §5.4 |
| Sicherung fehlgeschlagen mit „S3_BUCKET is not set“ | Die Mediensicherung liest den Medien-Bucket (`BACKUP_MEDIA: s3`, Compose Zeile 138) | Die Werte `S3_*` setzen (§3.2) |
| Sicherung fehlgeschlagen mit einem anderen Fehler | Fehler eines Werkzeugs (restic, `pg_dump`, rclone), maskiert im Verlauf | Einzelheiten im Verlauf und `logs ops-agent` lesen |
| Verlauf: „retention: not applied“ | Object Lock hält Daten fest, die `forget --prune` entfernen würde | Erwartet; die Sicherung zählt (§5.3) |
| Warnung „Sicherung überfällig“ (26 Stunden) | Keine erfolgreiche Sicherung: fehlgeschlagen, durch einen Neustart unterbrochen (nicht fortgesetzt) oder übersprungen, weil der Agent genau in dieser Minute gestartet ist | „Jetzt sichern“. `BACKUP_TIME` prüfen (`HH:MM`; ungültige Werte fallen auf 02:30 zurück) |
| „Es läuft bereits eine Sicherung oder Test-Wiederherstellung.“ | Immer nur ein Job; höchstens 4 manuelle Jobs pro Stunde | Auf das Ergebnis warten |
| Test-Wiederherstellung mit Abweichungen fehlgeschlagen | Im Verlauf aufgeführt: fehlende Tabelle, Zeilenzahlen, fehlender Trigger, neueste Migration, Zahl der Mediendateien, Prüfung des Repositorys | Untersuchen, bevor die nächsten Sicherungen ablaufen. `[PLACEHOLDER: wer informiert wird, wenn eine Test-Wiederherstellung scheitert]` |
| Einzelheit der Test-Wiederherstellung: „drill database could not be removed“ | `restore_drill` ist mit einer Kopie der Daten auf dem PostgreSQL-Server geblieben | Die nächste Test-Wiederherstellung löscht sie beim Start; „Wiederherstellung testen“ erledigt das sofort |
| Test-Wiederherstellung hat nur „structure only“ verglichen | Der Agent hat keine Aufzeichnung zu dieser Sicherung (z. B. nach dem Verlust von `agent_data`) | Die nächste Sicherung und Test-Wiederherstellung vergleichen vollständig |
| Versandprotokoll „nicht gesendet“; Protokoll der App „E-mail not sent: no mail server configured“ | Kein Mailserver oder keine Absenderadresse | §4 |
| Versand scheitert mit `PORT_NOT_ALLOWED`, `HOST_NOT_ALLOWED` oder `HOST_NOT_FOUND` | Der im Control Center eingetragene Mailserver hat die Host-Prüfung nicht bestanden | Port 25, 465, 587 oder 2525 und einen öffentlichen Host verwenden; `MAIL_ALLOW_INTERNAL_HOSTS=true` nur für ein Relay im Netz des Servers (§4) |
| Versand scheitert auf einem anderen Port als 465 | Der Server bietet kein STARTTLS an, das dort vorgeschrieben ist | Den STARTTLS-Port des Anbieters oder 465 verwenden |
| Der Host des Control Centers antwortet mit 404 | Adresse nicht in `ADMIN_ALLOW_IPS`; IPv6-Clients erscheinen mit der Adresse des Userland-Proxys (§2.1) | Positivliste und §2.1 prüfen |
| `<SITE_HOST>/admin` antwortet mit 404 | So gewollt (§1.3) | `<ADMIN_HOST>` verwenden |
| Zertifikatswarnung oder Fehler unter Domains & SSL | DNS zeigt nicht auf den Server, Ports 80/443 nicht erreichbar oder Erneuerung gescheitert | DNS und Ports prüfen; `logs caddy` (nur Warnungen) |
| Nach dem Neustart der App bleibt die Seite leer | Die Seite lädt sich nach etwa zwölf Sekunden selbst neu | Braucht die App länger, von Hand neu laden |
| Warnung „Speicher voll“ | 90 % des Datenträgers mit dem Daten-Volume des Agenten (der Docker-Datenträger des Hosts) sind belegt | Die Volumes prüfen (§1.2); die Medienkopie in `agent_data` ist so groß wie der Medien-Bucket. `[PLACEHOLDER: Vorgehen bei vollem Speicher]` |
| CPU und Arbeitsspeicher wirken für die App zu hoch | Es sind die Werte des Hosts, nicht pro Container (CONTROL-CENTER.md §17) | — |

---

## 11. Checkliste vor dem Start

Zusammengetragen aus CONTROL-CENTER.md §12 und §14–§18 sowie aus diesem Handbuch.

### 11.1 Offene Entscheidungen (CONTROL-CENTER.md §12)

- [ ] **Entscheidung 2:** Hosting-Anbieter und Servergröße (§17: „No server yet“).
- [ ] **Entscheidung 4:** DNS-Anbieter; nur lesende Prüfungen oder Bearbeitung über seine API.
- [ ] **Entscheidung 5:** Mail-Anbieter, Absenderadresse, DKIM-Selektor.
- [ ] **Entscheidung 7:** wie lange rohe Zugriffsprotokolle aufbewahrt werden (Vorschlag 7 Tage);
      die Anpassung der Datenschutzerklärung ist Text des Vereins.
- [ ] **Entscheidung 8:** externe Erreichbarkeitsprüfung oder keine.
- [ ] **Entscheidung 9:** Sicherungsspeicher mit Object Lock (EU), Aufbewahrungsschema (Vorschlag
      7/4/6), wer die Offline-Kopie von `RESTIC_PASSWORD` verwahrt.
- [ ] **Entscheidung 10:** Wiederherstellung der Produktion über die Weboberfläche. Offen; bis zur
      Entscheidung erfolgt eine Wiederherstellung nur nach §6 und mit Freigabe.
- [ ] **Entscheidung 11:** Die Aufbewahrung des Audit-Logs ist auf 12 Monate gesetzt; ihre
      rechtliche Angemessenheit ist vor der Produktion zu prüfen (§15).
- [ ] **Entscheidung 12:** was mit angenommenen Anträgen geschieht; die Konsolidierung bleibt aus
      (`MEMBERSHIP_CONSOLIDATION=off`, §16).
- [ ] **Entscheidung 13:** wer welche Rolle erhält; der zweite Super-Administrator (§15).
- [ ] **Entscheidung 16:** wie empfohlen umgesetzt (Passwort nur auf dem Server, §18); bestätigen.
- [ ] **Entscheidung 17:** welche Adressen Benachrichtigungen zu neuen Anträgen, Nachrichten und
      technische Warnungen erhalten.

### 11.2 Vor dem Start von CC-0 (§14)

- [ ] `ADMIN_HOST=verwaltung.yop-ye.org` (Compose setzt `ADMIN_URL`) und `MFA_ENCRYPTION_KEY`;
      DNS-Eintrag für den Admin-Host; Caddy für beide Hosts.
- [ ] Migration gelaufen (automatisch beim Start; sie beendet alle bestehenden Sitzungen).
- [ ] Erster Super-Administrator angelegt, sofort angemeldet, Authenticator-App eingerichtet,
      Wiederherstellungscodes offline aufbewahrt. Mit dem Dienst `tools` (§3.6).
- [ ] Zweiter Super-Administrator, sobald benannt, auf dieselbe Weise angelegt.
- [ ] Offener Punkt nach CC-0: die Sicherheits-E-Mails (Einrichtung, neues Gerät,
      Wiederherstellungscode benutzt, zweiter Faktor zurückgesetzt, Passwort geändert) einmal mit
      dem Mail-Anbieter des Vereins geprüft.
- [x] Offener Punkt nach CC-0: Bildoptimierung ohne Cache. Erledigt: Das Image legt
      `/app/.next/cache` für den App-Benutzer an, daher ist das Volume `nextcache` auf dem
      schreibgeschützten Dateisystem beschreibbar (geprüft vom CI-Job „production“). Nur ein Volume,
      das vor dieser Änderung angelegt wurde, behält den alten Eigentümer; entfernen Sie es einmal
      (`docker volume rm yop_nextcache`, **bei gestoppter App**), damit es neu angelegt wird.

### 11.3 Noch nicht durchgeführte Tests (CC-1 §15, CC-2 §16)

- [ ] Sicherheits-E-Mails und E-Mails zu neuen Einsendungen über den echten Anbieter: Absender,
      Inhalt, keine personenbezogenen Daten.
- [ ] Exportierte CSV-Datei in Microsoft Excel (Windows und Mac) mit den Beispieldateien.
- [ ] Wortlaut der sechs Rechtsgrundlagen vor der Produktion mit dem amtlichen Text auf EUR-Lex
      verglichen.
- [ ] Verarbeitungszwecke vom Verein freigegeben; bis dahin sind Exporte unmöglich und bleiben in
      der Produktion abgeschaltet (§16).
- [ ] Geplante Veröffentlichung über die Datumsauswahl des Control Centers (eine Seite).
- [ ] Verhalten unter echter Last, mit den ersten echten Daten.

### 11.4 Nicht auf einem echten Server getestet (CC-3 §17)

- [ ] Die Produktionsumgebung als Ganzes: ausrollen, beide Hosts öffnen, Zertifikate prüfen, die
      Admin-Sperre (Host der Website antwortet mit 404 auf `/admin`) und die Positivliste, falls
      verwendet.
- [ ] Sicherungen auf den echten Speicher mit Object Lock: `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`,
      `BACKUP_S3_*` setzen; „Jetzt sichern“ und „Wiederherstellung testen“ gelingen mit dem
      eingeschränkten Zugangsschlüssel; Passwort offline beim Vorstand.
- [ ] Mediensicherung aus dem echten S3-Bucket (rclone): durch die erste manuelle Sicherung
      abgedeckt; die Test-Wiederherstellung zählt die Mediendateien.
- [ ] Werte des Hosts: den Status-Bildschirm einmal mit `free` und `df` auf dem Server vergleichen.
- [ ] Echte Let's-Encrypt-Zertifikate unter Domains & SSL nach dem ersten Start.
- [ ] Technische Warn-E-Mails: technische Adresse setzen und eine Test-E-Mail senden.
- [ ] Bekannte Einschränkung: IPv6-Clients und der Userland-Proxy von Docker (§2.1).
- [ ] Bekannte Einschränkung: externe Erreichbarkeitsprüfung nicht eingerichtet (Entscheidung 8).

### 11.5 Nicht mit echten Diensten getestet (CC-4 §18)

- [ ] Versand über den Mail-Anbieter des Vereins: Server, Benutzer und Absender eingetragen,
      `SMTP_PASSWORD` auf dem Server gesetzt, „Test-E-Mail an mich“.
- [ ] DNS-Prüfungen der echten Domain auf dem E-Mail-Bildschirm, nachdem Domain und DKIM-Selektor
      eingetragen sind.
- [ ] Statistik aus echten Besuchen: Der Bildschirm füllt sich ab der ersten vollen Stunde nach dem
      Start.

### 11.6 Aus diesem Handbuch

- [ ] `create-admin` einmal auf dem echten Server mit dem Dienst `tools` ausgeführt (§3.6; lokal
      und in der CI auf einer leeren Datenbank getestet).
- [ ] Die Wiederherstellung (§6) auf einem Testserver geprobt; die Entscheidungen aus §6.2
      getroffen; ein Ablauf zur Wiederherstellung der Medien geschrieben.
- [ ] Eine Kopie von `.env` außerhalb des Servers aufbewahrt (§5.1).
- [ ] Wie Releases auf den Server kommen (§3.1) und wie das App-Image zurückgerollt wird (§7.3).
- [ ] Aufbewahrungswerte in `.env` gemäß Entscheidung 9 gesetzt (§5.3).
- [ ] `ALLOW_INDEXING=true` erst beim Start.
- [ ] `npm run check:placeholders -- --strict` läuft durch (docs/development.md, Startfreigabe).
