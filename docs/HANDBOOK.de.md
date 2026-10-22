# Youth of Peace — Handbuch zum Control Center

**English version:** [HANDBOOK.md](HANDBOOK.md)

**Stand:** 2026-10-22, Funktionsumfang CC-0 bis CC-5 ([CONTROL-CENTER.md](CONTROL-CENTER.md)
§14–§19). Für alle, die mit dem Control Center arbeiten: Vorstand, Redaktion,
Mitgliederverwaltung, Prüfung und Technik. Technische Abläufe auf dem Server stehen im
Betriebshandbuch ([OPERATIONS.de.md](OPERATIONS.de.md)).

**So lesen Sie dieses Handbuch**

- Text in „Anführungszeichen“ ist die Beschriftung in der Oberfläche (Oberflächensprache
  Deutsch).
- **Offen (Entscheidung N)** heißt: Die Funktion hängt von einer Entscheidung des Vereins ab, die
  noch aussteht (CONTROL-CENTER.md §12).
- `[PLACEHOLDER: …]` markiert eine Angabe, die noch fehlt.
- Sie sehen nur Menüpunkte und Schaltflächen, die Ihre Rolle erlaubt. Fehlt etwas, liegt es meist
  an der Rolle (Abschnitt 2).

**Inhalt**

1. Erste Schritte
2. Rollen und was sie dürfen
3. Bestätigen mit Code
4. Inhalte der Website
5. Mitglieder, Anträge und Nachrichten
6. Benutzerkonten
7. Audit-Log
8. Betrieb, E-Mail und Statistik
9. Datenschutz im Alltag
10. Hilfe und Kontakt

---

## 1. Erste Schritte

### 1.1 Adresse, Menü und Sprache

- Das Control Center hat eine eigene Adresse: `https://verwaltung.yop-ye.org/admin` (vom Verein
  gewählt, CONTROL-CENTER.md §14). Auf der Adresse der Website gibt es `/admin` nicht.
- Das Menü links ist in Gruppen geteilt: „Übersicht“, „Inhalte“, „Seitentexte“, „Verein“,
  „Betrieb“, „Einblicke“, „Sicherheit“.
- Oben gibt es zwei Sprachmenüs:
  - „Oberfläche“: die Sprache des Control Centers (Deutsch, English, العربية).
  - „Inhaltssprache“: die Sprache des Textes, den Sie gerade bearbeiten. Sie erscheint nur bei
    Inhalten, die es in mehreren Sprachen gibt.

### 1.2 Anmelden

1. Geben Sie „E-Mail-Adresse“ und „Passwort“ ein und wählen Sie „Weiter“.
2. Unter „Bestätigungscode“ geben Sie den sechsstelligen Code aus Ihrer Authenticator-App ein.
3. Wählen Sie „Bestätigen“.

Ohne Telefon wählen Sie „Wiederherstellungscode verwenden“ (Abschnitt 1.6).

Schutz bei Fehlversuchen (docs/privacy-notes.md):

| Was passiert | Folge |
|---|---|
| 5 falsche Passwörter | Das Konto ist 15 Minuten gesperrt |
| 5 falsche Codes in einer Anmeldung | Die Anmeldung endet; neu mit Passwort anmelden |
| 10 falsche Codes in 15 Minuten | Die Zwei-Faktor-Anmeldung ist 15 Minuten gesperrt |
| Code nicht innerhalb von 10 Minuten eingegeben | Die Anmeldung verfällt |
| Viele Versuche vom selben Anschluss | Höchstens 20 in 10 Minuten und 100 pro Tag |

„Passwort vergessen?“ schickt einen Link per E-Mail. Danach ist der Code aus der App trotzdem
nötig. Das funktioniert nur, wenn ein Mailserver eingerichtet ist (Abschnitt 8.3).

### 1.3 Erste Anmeldung: Authenticator-App einrichten

Jedes Konto braucht einen zweiten Faktor. Bei der ersten Anmeldung erscheint „Zwei-Faktor-Anmeldung
einrichten“. Vorher geht nichts anderes.

1. Installieren Sie eine Authenticator-App, z. B. Microsoft Authenticator oder Google
   Authenticator.
2. Scannen Sie den QR-Code mit der App. Ohne Kamera tippen Sie den „Schlüssel zum Eintippen“ ein.
3. Geben Sie den Code ein, den die App jetzt anzeigt.
4. Es erscheinen „Ihre Wiederherstellungscodes“: 10 Codes, jeder gilt genau einmal. Sie werden
   **nur jetzt** angezeigt. Nutzen Sie „Kopieren“ oder „Als Datei speichern“ und bewahren Sie die
   Codes getrennt vom Telefon auf.
   `[PLACEHOLDER: wo der Verein Wiederherstellungscodes aufbewahrt]`
5. Kreuzen Sie „Ich habe die Codes sicher aufbewahrt.“ an und wählen Sie „Zum Control Center“.
6. Ändern Sie das Anfangspasswort: „Benutzerkonto“ → „Passwort ändern“. Passwörter haben
   mindestens 12 Zeichen. Die Änderung braucht einen Code (Abschnitt 3).

Ihr Konto erhält eine E-Mail, sobald der zweite Faktor eingerichtet ist (wenn ein Mailserver
eingerichtet ist).

### 1.4 Wie lange eine Anmeldung gilt

- Eine Sitzung gilt 2 Stunden und verlängert sich, solange Sie aktiv sind.
- Nach spätestens 12 Stunden melden Sie sich neu an, auch wenn Sie aktiv waren.
- Die Anmeldung gilt nur auf der Adresse des Control Centers, nicht auf der Website.

### 1.5 „Meine Sicherheit“

Menü „Übersicht“ → „Meine Sicherheit“. Dort verwalten Sie Ihr eigenes Konto.

| Bereich | Was Sie tun können |
|---|---|
| „Zwei-Faktor-Anmeldung“ | Status sehen; „Neue Wiederherstellungscodes erzeugen“ (braucht einen Code; alle bisherigen Codes werden ungültig) |
| „Angemeldete Sitzungen“ | Sitzungen mit Gerät, Beginn und letzter Aktivität sehen; einzeln „Abmelden“ oder „Alle anderen Sitzungen abmelden“ |
| „Bekannte Geräte“ | Geräte „Entfernen“. Eine Anmeldung von einem anderen Gerät wird Ihnen per E-Mail gemeldet |
| „Ihre letzten Sicherheitsereignisse“ | Ihre Anmeldungen und Sicherheitsänderungen |

Das „Dashboard“ zeigt, wie viele Wiederherstellungscodes noch übrig sind, und warnt, wenn es nur
noch wenige sind.

### 1.6 Telefon verloren

1. Melden Sie sich mit einem Wiederherstellungscode an („Wiederherstellungscode verwenden“).
   Jeder Code gilt einmal. Ihr Konto erhält dazu eine E-Mail.
2. Ohne Codes: Eine andere Super-Administration setzt Ihren zweiten Faktor zurück
   (Abschnitt 6.4). Bei der nächsten Anmeldung richten Sie die App neu ein.
3. Im Notfall setzt jemand mit Zugang zum Server den zweiten Faktor zurück (Betriebshandbuch,
   §3.9).

Deshalb braucht der Verein mindestens zwei Super-Administrationen.
`[PLACEHOLDER: zweite Super-Administration — Entscheidung 13]`

---

## 2. Rollen und was sie dürfen

Jede Person hat genau eine Rolle. Die Rolle steht unter „Benutzer & Rollen“ im Feld „Rolle“.

### 2.1 Die sechs Rollen

| Rolle | Kurz |
|---|---|
| „Super-Administration“ | Alles, auch Konten und Einstellungen |
| „Vorstand (Administration)“ | Verein: Anträge, Mitglieder, Nachrichten, Exporte; Inhalte nur lesen; Betrieb nur lesen; Redaktion und Mitgliederverwaltung verwalten |
| „Redaktion“ | Inhalte der Website bearbeiten und veröffentlichen |
| „Mitgliederverwaltung“ | Anträge, Mitglieder, Nachrichten, Exporte |
| „Technik“ | Betrieb, E-Mail-Einstellungen, Statistik; keine Personendaten des Vereins |
| „Prüfung (nur lesen)“ | Lesen ohne Personendaten: Inhalte, Betrieb, Statistik, Konten, Audit-Log, Exportprotokoll |

### 2.2 Rechte im Einzelnen

Aus `src/cms/access/permissions.ts`; entspricht CONTROL-CENTER.md §4. ✓ = erlaubt.

| Recht | Super-Administration | Vorstand | Redaktion | Mitgliederverwaltung | Technik | Prüfung |
|---|---|---|---|---|---|---|
| „Inhalte ansehen (auch Entwürfe)“ | ✓ | ✓ | ✓ | — | — | ✓ |
| „Inhalte bearbeiten und veröffentlichen“ | ✓ | — | ✓ | — | — | — |
| „Anträge und Nachrichten ansehen“ / „bearbeiten“ | ✓ | ✓ | — | ✓ | — | — |
| „Anträge löschen“ | ✓ | — | — | — | — | — |
| „Nachrichten löschen“ | ✓ | ✓ | — | ✓ | — | — |
| „Mitglieder ansehen“ / „Mitglieder bearbeiten“ | ✓ | ✓ | — | ✓ | — | — |
| „Mitglieder löschen“ | ✓ | — | — | — | — | — |
| „Personenbezogene Daten exportieren“ | ✓ | ✓ | — | ✓ | — | — |
| „Exportprotokoll prüfen“ (alle Exporte) | ✓ | ✓ | — | — | — | ✓ |
| „Einstellungen des Control Centers“ (auch Verarbeitungszwecke freigeben) | ✓ | — | — | — | — | — |
| „Betrieb ansehen“ | ✓ | ✓ | — | — | ✓ | ✓ |
| „Betriebsaktionen ausführen“ | ✓ | — | — | — | ✓ | — |
| „E-Mail-Einstellungen“ | ✓ | — | — | — | ✓ | — |
| „Statistik ansehen“ | ✓ | ✓ | — | — | ✓ | ✓ |
| „Aufgaben manuell starten“ | ✓ | — | — | — | ✓ | — |
| „Konten ansehen“ | ✓ | ✓ | — | — | — | ✓ |
| „Konten verwalten“ (alle) | ✓ | — | — | — | — | — |
| „Redaktion und Mitgliederverwaltung verwalten“ | — | ✓ | — | — | — | — |
| „Audit-Log ansehen“ | alle Bereiche | Benutzer, Inhalte, Verein | — | — | Betrieb | alle Bereiche |

Wichtige Regeln:

- Die Technik sieht keine Anträge, Mitglieder oder Nachrichten. Protokolle, die sie sieht, sind
  maskiert.
- Die Redaktion erreicht weder den Betrieb noch Personendaten.
- Eine Wiederherstellung der Live-Datenbank gibt es im Control Center nicht. **Offen
  (Entscheidung 10).**
- Wer Anträge und Nachrichten sieht, entscheidet nur die Rolle. Eine Zuweisung gibt keinen
  Zugang.

### 2.3 „Einschränkungen“ pro Person

- Im Konto einer Person können einzelne Rechte unter „Einschränkungen“ weggenommen werden.
- Mehr Rechte als die Rolle gibt es nie.
- Beispiel: ein Vorstandskonto ohne „Personenbezogene Daten exportieren“.

### 2.4 Was niemand selbst ändern kann

- die eigene Rolle,
- die eigenen Einschränkungen,
- die eigene Deaktivierung,
- das eigene Konto löschen.

Ihr eigenes Konto verwalten Sie unter „Meine Sicherheit“.

---

## 3. Bestätigen mit Code

Manche Aktionen sind sensibel. Dafür fragt das Control Center noch einmal nach einem Code aus Ihrer
App („Mit Code bestätigen“). Die Bestätigung gilt 5 Minuten. Im Audit-Log steht danach
„Mit Code bestätigt“.

| Bereich | Aktion |
|---|---|
| Eigenes Konto | Passwort ändern; „Neue Wiederherstellungscodes erzeugen“ |
| Konten anderer | Neues Konto anlegen; Rolle, „Einschränkungen“, „Deaktiviert“ oder E-Mail-Adresse ändern; Konto löschen; „Zwei-Faktor zurücksetzen“; „Alle Sitzungen beenden“ |
| Mitglieder | Mitgliedereintrag oder Antrag löschen; bei der Prüfung nach dem Ende Kontaktdaten entfernen |
| Export | Jeden Export personenbezogener Daten |
| Verarbeitungszwecke | „Freigeben“, „Zurückziehen“, „Wieder als Entwurf öffnen“ |
| E-Mail | Die E-Mail-Einstellungen speichern |
| Betrieb | Neustart eines Dienstes (zusätzlich den Namen des Dienstes eintippen); „Jetzt sichern“; „Wiederherstellung testen“; geplante Aufgaben, die etwas löschen, von Hand starten |

---

## 4. Inhalte der Website

Für „Redaktion“ und „Super-Administration“. „Vorstand“ und „Prüfung“ können Inhalte lesen.

### 4.1 Grundregeln für alle Inhalte

- **Drei Sprachen.** Wählen Sie oben die „Inhaltssprache“ und füllen Sie jede Sprache aus. Fehlt
  eine Sprache, zeigt die Website den deutschen Text.
- **Entwurf und Veröffentlichen.** Seiten, Projekte, Beiträge und Veranstaltungen haben Entwürfe.
  Änderungen werden alle 2 Sekunden automatisch gespeichert („Automatische Speicherung“). Auf der
  Website erscheinen sie erst nach „Veröffentlichen“ bzw. „Änderungen veröffentlichen“.
- **„Live-Vorschau“.** Zeigt den aktuellen Entwurf neben dem Formular, wie die Website ihn zeigen
  würde, in Telefon-, Tablet- und Desktopgröße. Sie folgt jeder gespeicherten Änderung. Links in
  der Vorschau sind nicht zum Anklicken gedacht.
- **„Veröffentlichungsplanung“.** Legt fest, wann ein Entwurf erscheint (Zeitzone Europe/Berlin).
  Die Veröffentlichung wird nur ausgeführt, wenn die planende Person zu diesem Zeitpunkt noch
  existiert, aktiv ist und Inhalte bearbeiten darf. Sonst unterbleibt sie, und das Audit-Log hält
  die Ablehnung fest.
- **„Versionen“.** Bis zu 50 frühere Fassungen pro Seite, Projekt, Beitrag und Veranstaltung. Mit
  „Diese Version wiederherstellen“ holen Sie eine zurück.
- **Keine freie Gestaltung.** Kein freies HTML, keine eigenen Farben, Größen oder Einbettungen.
  Links nur zu Seiten der Website, eigenen Seiten oder geprüften Adressen (https, mailto, tel).
  Jedes Feld hat eine Höchstlänge.

### 4.2 „Seiten“ aus Blöcken

Menü „Seitentexte“ → „Seiten“. Eine Seite besteht aus „Blöcken“; jeder Block ist ein Abschnitt im
Design der Website.

1. „Neu erstellen“ wählen, „Titel“ eingeben.
2. „URL-Kürzel“ (Seitenleiste): die Adresse, für alle Sprachen gleich (`/<kürzel>`,
   `/en/<kürzel>`, `/ar/<kürzel>`). Nur Kleinbuchstaben, Ziffern und Bindestriche. Bleibt es leer,
   wird es aus dem Titel erzeugt. Adressen, die die Website schon nutzt, sind gesperrt.
3. Unter „Inhalt der Seite“ Blöcke hinzufügen. Das Blockmenü zeigt zu jedem Block ein Vorschaubild.
   Die Reihenfolge ändern Sie durch Ziehen.
4. Mit der „Live-Vorschau“ prüfen, dann „Veröffentlichen“.

Die Blöcke im Blockmenü:

| Gruppe | Blöcke |
|---|---|
| „Seitenanfang“ | „Seitenkopf“, „Startbühne“, „Seitenkopf mit Bild“ |
| „Text und Bild“ | „Text“, „Karten“, „Bild und Text“, „Zitat“, „Fragen und Antworten“, „Bildergalerie“, „Leitgedanke“, „Zeitleiste“, „Werte“, „Weg (Scroll-Szene)“ |
| „Aufrufe“ | „Nachtband“, „Aufruf zum Mitmachen“, „Spenden“ |
| „Inhalte aus dem CMS“ | „Projekte“, „Aktuelles“, „Nächste Veranstaltungen“, „Schwerpunkte“, „Kennzahlen“, „Vorstand“, „Partner“ |
| „Formulare“ | „Mitgliedsantrag“, „Kontakt und Formular“ |

Regeln beim Veröffentlichen (`src/cms/blocks/layout-rules.ts`):

- Der erste Block ist ein Seitenanfang („Seitenkopf“, „Seitenkopf mit Bild“ oder „Startbühne“),
  und es gibt nur einen.
- Die „Startbühne“ gibt es nur auf der Startseite.
- Die beiden Formulare stehen nur auf ihren eigenen Seiten („Mitglied werden“, „Kontakt“), dort
  genau einmal.
- Höchstens 30 Blöcke pro Seite.
- Entwürfe werden ohne diese Regeln gespeichert; geprüft wird beim Veröffentlichen.

**Feste Seiten.** „Startseite“, „Über uns“, „Mitglied werden“, „Unterstützen“ und „Kontakt“
gehören zum festen Aufbau der Website (Feld „Feste Seite“). Ihre Adresse bleibt, ihr Formular
bleibt, löschen ist nicht möglich.

### 4.3 „Suchmaschinen & Teilen“

Bei Seiten, Projekten, Beiträgen und Veranstaltungen. Optional; leer werden Titel und Kurztext
verwendet.

| Feld | Hinweis |
|---|---|
| „Seitentitel“ | höchstens 70 Zeichen |
| „Beschreibung“ | höchstens 160 Zeichen |
| „Bild beim Teilen“ | erscheint beim Teilen in Messengern und sozialen Netzwerken; leer: das Titelbild |
| „Nicht in Suchmaschinen anzeigen“ | Die Seite bleibt erreichbar, steht aber nicht in Suchergebnissen und der Sitemap |

„So erscheint die Seite in Suchmaschinen“ zeigt beim Tippen eine Vorschau des Suchergebnisses.
Bis zum Start der Website nimmt keine Suchmaschine etwas auf.

### 4.4 Weitere Inhalte (Menü „Inhalte“)

| Menüpunkt | Wichtig zu wissen |
|---|---|
| „Projekte“ | „Stand“ (Geplant, Laufend, Abgeschlossen), „Beginn“, „Ende“, „Ort“, „Schwerpunkte“, „Titelbild“, „Beschreibung“, „Bildergalerie“, „Partner“. „Kurztext“ erscheint in der Projektliste und in Suchmaschinen |
| „Aktuelles“ (Beiträge) | „Titel“, „Kurztext“, „Titelbild“, „Text“, „Zugehörige Projekte“, „Veröffentlicht am“ |
| „Veranstaltungen“ | „Beginn“ und „Ende“ in Berliner Zeit; das Ende darf nicht vor dem Beginn liegen. „Ort“, optional „Link zur Anmeldung“ (geprüfte Adresse). Die Website erzeugt pro Veranstaltung eine Kalenderdatei (`.ics`). Das Standardmenü enthält „Veranstaltungen“ nicht; bei Bedarf in „Navigation“ ergänzen |
| „Schwerpunkte“ | „Titel“, „Kurzbeschreibung“, „Symbol“, „Reihenfolge“ |
| „Vorstand & Team“ | „Name“, „Funktion“, „Gruppe“ (Vorstand, Team), „Foto“, „Kurzvorstellung“. **Öffentlich nur mit „Einwilligung zur Veröffentlichung liegt vor“**, dazu „Datum der Einwilligung“ |
| „Kennzahlen“ | „Bezeichnung“, „Wert“, „Stand vom“, „Auf der Startseite zeigen“. „Quelle (intern)“ wird nicht veröffentlicht |
| „Partner“ | „Name“, „Logo“, „Website“ (nur https), „Kurzbeschreibung“. **Öffentlich nur mit „Der Partner hat der Nennung zugestimmt“** |
| „Medien“ | Abschnitt 4.5 |

### 4.5 „Medien“: Bilder

- Erlaubt sind JPEG, PNG, WebP und AVIF, höchstens 10 MB. SVG ist nicht erlaubt.
- Beim Hochladen wird das Bild auf höchstens 2560 Pixel verkleinert; Metadaten wie Ort (GPS) und
  Kameradaten werden entfernt.
- **„Alternativtext“ ist Pflicht.** Er beschreibt, was auf dem Bild zu sehen ist, für Menschen,
  die es nicht sehen können. Ausnahme: „Rein dekorativ“ ankreuzen, wenn das Bild keine Information
  trägt; dann überspringen Screenreader es.
- **Fokuspunkt:** Setzen Sie im Bild den wichtigsten Punkt. Wo die Website ein Bild in einen
  Rahmen beschneidet, bleibt dieser Punkt sichtbar. Ohne Angabe gilt die Bildmitte.
- „Bildunterschrift“ und „Bildnachweis“ sind optional.

### 4.6 Menü „Seitentexte“

| Menüpunkt | Wichtig zu wissen |
|---|---|
| „Navigation“ | „Menüeinträge“ und „Hervorgehobene Schaltfläche“, pro Sprache. Höchstens 6 Einträge, je höchstens 20 Zeichen, zusammen höchstens 60 Zeichen, damit das Menü in eine Zeile passt. Impressum und Datenschutz stehen immer im Fußbereich |
| „Formulartexte“ | Wortlaut der Erklärungen und Einwilligungen im Mitgliedsantrag und im Kontaktformular. Er wird mit jedem Antrag und jeder Nachricht gespeichert. **Änderungen bitte rechtlich prüfen lassen.** Frühere Fassungen bleiben unter „Versionen“ |
| „Impressum“ | Den Text liefert der Verein (rechtlich prüfen lassen). Jede Fassung bleibt als Version |
| „Datenschutzerklärung“ | Den Text liefert der Verein. Das Feld „Version“ wird bei jeder Einwilligung in den Formularen mitgespeichert |
| „Website-Einstellungen“ | „Beschreibung für Suchmaschinen“, „Leitsatz“ (unter dem Namen, auf der Startseite und im Fußbereich), „Kontaktdaten“, „Social-Media-Links“ |
| „Weiterleitungen“ | Abschnitt 4.7 |

Rechtstexte schreibt der Verein selbst. Dieses Handbuch enthält keine.
`[PLACEHOLDER: wer Impressum, Datenschutzerklärung und Formulartexte freigibt]`

### 4.7 „Weiterleitungen“

Leitet alte Adressen weiter, z. B. nach dem Umbenennen einer Seite.

1. „Alte Adresse“: nur der Pfad, mit Sprache, wenn nötig (`/alte-seite`, `/en/old-page`).
2. „Neues Ziel“: eine Seite der Website, eine eigene Seite oder eine Adresse (URL).
3. „Dauerhaft (für Suchmaschinen)“: Suchmaschinen übernehmen die neue Adresse. Ohne Haken ist die
   Weiterleitung vorübergehend.

Regeln: Eine Weiterleitung greift nur, wo es sonst keine Seite gibt. Adressen bestehender Seiten
und des Control Centers werden abgelehnt, ebenso Schleifen. Adressen mit Dateiendung (z. B.
`/alt.html`) werden nicht weitergeleitet.

**Aus der Statistik:** Unter „Einblicke“ → „Statistik“ stehen „Nicht gefundene Adressen“. Die
Schaltfläche „Weiterleitung anlegen“ öffnet das Formular mit der Adresse schon ausgefüllt. Sie
erscheint nur für Personen, die Statistik sehen **und** Inhalte bearbeiten dürfen; mit den
heutigen Rollen ist das die Super-Administration.

---

## 5. Mitglieder, Anträge und Nachrichten

Für „Super-Administration“, „Vorstand (Administration)“ und „Mitgliederverwaltung“. Menü „Verein“.

### 5.1 „Mitgliedsanträge“

Die Liste zeigt Reiter nach Stand mit Anzahl: „Alle offenen“, „Eingegangen“, „In Prüfung“,
„Zustimmung ausstehend“, „Aufgenommen“, „Abgelehnt“, „Alle“. Dazu „Suche“ (Name oder E-Mail),
Filter („Art der Mitgliedschaft“, „Zuständig“, „Wiedervorlage“) und „Sortierung“. Auf dem Telefon
erscheinen Karten statt einer Tabelle.

**Ablauf** (Bereich „Bearbeitung“ im Antrag):

| Stand | Schaltflächen |
|---|---|
| „Eingegangen“ | „In Prüfung nehmen“ |
| „In Prüfung“ | „Aufnehmen“, „Ablehnen“ |
| „Zustimmung ausstehend“ | nur „Ablehnen“ |
| „Abgelehnt“ | „Wieder öffnen“ (zurück zu „In Prüfung“) |
| „Aufgenommen“ | keine; der Antrag ist gesperrt |

1. **Prüfen:** „In Prüfung nehmen“.
2. **Unter 18:** „Zustimmung ausstehend“ ist kein eigener Status. Es bedeutet: Die Person ist
   unter 18, und das Datum der Zustimmung fehlt. Der Verein holt die Zustimmung bei der
   erziehungsberechtigten Person selbst ein; welche Form genügt, entscheidet der Vorstand. Tragen
   Sie das Datum unter „Zustimmung liegt vor seit“ ein und speichern Sie. Erst dann ist „Aufnehmen“
   möglich.
3. **Aufnehmen:** Nach der Rückfrage wird die Person automatisch ins Mitgliederverzeichnis
   eingetragen. Danach ist die Entscheidung gesperrt; Änderungen der Mitgliedschaft machen Sie im
   Mitgliederverzeichnis.
4. **Ablehnen:** Abgelehnte Anträge werden sechs Monate nach der Entscheidung automatisch gelöscht.
5. **Rückmeldung:** Antragstellende erhalten keine automatische E-Mail. Der Verein antwortet
   persönlich per E-Mail.

**Weitere Felder in der Seitenleiste:**

- „Zuständig“: eine Person für die Bearbeitung. Angeboten werden nur Personen, deren Rolle Anträge
  bearbeiten darf. Die Person erhält eine Benachrichtigung. **Eine Zuweisung gibt keinen Zugang.**
- „Wiedervorlage am“: An diesem Tag erinnert das Control Center die zuständige Person.
- „Interne Notizen“: nur das Nötige notieren.
- „Entschieden am“ und „Entschieden von“ setzt das System selbst.

**„Verlauf“:** Jeder Antrag zeigt, wer wann was geändert hat (Stand von → nach, Zustimmung,
Zuständigkeit, Wiedervorlage, Eintrag ins Mitgliederverzeichnis). Nur der Server schreibt ihn.

Anträge löschen kann nur die Super-Administration, und nur mit einem Code aus den letzten fünf
Minuten (Abschnitt 3).

**Doppelte Daten nach der Aufnahme:** Ein angenommener Antrag behält heute seine Daten neben dem
Eintrag im Mitgliederverzeichnis. Ein Vorschlag, die Daten nur im Verzeichnis zu halten, ist
**ausgeschaltet. Offen (Entscheidung 12).**

### 5.2 „Kontaktnachrichten“

- „Status“: „Neu“, „Beantwortet“, „Erledigt“.
- „Zuständig“: wie bei Anträgen; die Person wird benachrichtigt.
- Antworten Sie per E-Mail. Die Website sendet keine automatischen Antworten.
- Nachrichten werden sechs Monate nach Eingang automatisch gelöscht.
- Löschen von Hand: Super-Administration, Vorstand und Mitgliederverwaltung.

Das Menü zeigt die Zahl offener Anträge und neuer Nachrichten.

### 5.3 „Mitglieder“ (Mitgliederverzeichnis)

Getrennt von den Anträgen. Einträge entstehen bei der Aufnahme eines Antrags oder per
„Mitglied erfassen“ (für frühere Mitglieder).

- Reiter: „Aktiv“, „Beendet“, „Prüfung fällig“, „Alle“.
- Felder: nur die Angaben aus dem Antrag (Name, E-Mail, Anschrift, Art der Mitgliedschaft, bei
  Aufnahme unter 18 die erziehungsberechtigte Person), dazu „Status“, „Mitglied seit“,
  „Beendet am“, „Erfasst durch“ („Online-Antrag“ oder „Von Hand“).
- „Mitgliedschaft beenden“ beendet zum heutigen Tag; „Wieder aktivieren“ macht das rückgängig.
- **Keine automatische Löschung.** Die Regel legt der Verein fest. **Offen (Entscheidung 12).**

**„Prüfung nach dem Ende“:**

1. Nach dem Ende ist der Eintrag zur Prüfung fällig: sofort oder nach der Zahl von Tagen in den
   Einstellungen (Abschnitt 6.6). Solange er fällig ist, erinnert das Control Center täglich.
2. Wählen Sie unter „Was bleibt?“: „Alle Angaben“ oder „Nur Mindestangaben (Name, Art, Daten,
   Antrag); E-Mail und Anschrift werden gelöscht“.
3. „Aufbewahren bis“: ein Datum, höchstens 30 Jahre in der Zukunft.
4. „Grund“: „Gesetzliche Pflicht“, „Buchhaltung“, „Nachweis von Beschlüssen des Vereins“ oder
   „Anderer Grund“ (dann „Erläuterung“ nötig, bitte ohne weitere Personendaten).
5. „Prüfung speichern“. Werden Daten entfernt, braucht das einen Code; die Super-Administrationen
   werden informiert. Ein so reduzierter Eintrag kann nicht wieder aktiviert werden.
6. Am gewählten Datum ist der Eintrag wieder fällig.

Wird nichts mehr gebraucht, kann eine Super-Administration den Eintrag löschen (mit Code; die
anderen Super-Administrationen werden informiert).

### 5.4 Export personenbezogener Daten

**Offen.** Exporte bleiben in der Produktion abgeschaltet, bis der Verein seine
Verarbeitungszwecke und deren Rechtsgrundlagen beschlossen hat (CONTROL-CENTER.md §16). Ohne
freigegebenen Zweck ist kein Export möglich; der Bildschirm sagt das.

**Vorbereitung durch die Super-Administration:**

1. „Rechtsgrundlagen“: die sechs Rechtsgrundlagen nach Art. 6 Abs. 1 DSGVO mit Erläuterung. Sie
   lassen sich nicht löschen, nur mit „Für Verarbeitungszwecke wählbar“ ausschalten. Ihr Wortlaut
   ist vor der Produktion mit dem amtlichen Text zu vergleichen (CONTROL-CENTER.md §16).
2. „Verarbeitungszwecke“: pro Zweck „Bezeichnung“, „Beschreibung“, „Daten“ (Mitgliedsanträge oder
   Mitglieder), „Rechtsgrundlage“, „Warum passt diese Rechtsgrundlage?“ (mindestens 20 Zeichen) und
   „Erlaubte Spalten“.
3. Nach dem Beschluss des Vereins: „Freigeben“ mit „Beschluss des Vereins“ (z. B. Datum und Punkt
   des Vorstandsbeschlusses) und Code.
4. Wer Daten, Rechtsgrundlage, Begründung oder Spalten ändert, setzt einen freigegebenen Zweck auf
   Entwurf zurück. „Zurückziehen“ beendet Exporte für einen Zweck; frühere Exporte bleiben im
   Protokoll.

**Export (Menü „Verein“ → „Export“):**

1. „Daten“ wählen.
2. „Verarbeitungszweck“ wählen. Es erscheinen Rechtsgrundlage, „Begründung des Vereins“ und
   „Beschluss“.
3. „Spalten“: nur die, die der Zweck erlaubt. Wählen Sie ab, was Sie nicht brauchen.
4. „Auswahl“: welche Einträge.
5. „Konkreter Anlass“: wofür genau jetzt, 10 bis 300 Zeichen, **ohne Namen**.
6. „Trennzeichen“: „Semikolon – Excel auf Deutsch, LibreOffice“ oder „Komma – Excel auf
   Englisch“.
7. Die Bestätigung ankreuzen und „CSV herunterladen“. Das Control Center fragt nach einem Code.

Was dann passiert:

- Die Datei wird nicht auf dem Server gespeichert.
- Der Export steht im „Exportprotokoll“: Person, Zeit, Daten, Zweck, Rechtsgrundlage, Spalten,
  Zahl der Zeilen, Anlass. Keine Personendaten von Mitgliedern oder Antragstellenden. Das
  Protokoll lässt sich nicht ändern oder löschen.
- Super-Administration, Vorstand und Prüfung sehen alle Exporte und werden bei jedem
  benachrichtigt. Alle anderen sehen ihre eigenen.
- Noch nicht getestet: das Öffnen der CSV-Datei in Microsoft Excel (CONTROL-CENTER.md §16).

### 5.5 „Benachrichtigungen“ und Erinnerungen

Die Glocke oben zeigt ungelesene Hinweise; „Alle Benachrichtigungen“ öffnet die Liste. Hinweise
enthalten **keine Personendaten**, nur die Art, eine Nummer (z. B. „Antrag #12“) und einen Link.

| Hinweis | Wer erhält ihn |
|---|---|
| „Neuer Mitgliedsantrag“, „Neue Kontaktnachricht“ | Alle, die Anträge und Nachrichten sehen |
| „Ihnen wurde ein Antrag zugewiesen“, „Ihnen wurde eine Nachricht zugewiesen“ | Die zugewiesene Person |
| „Wiedervorlage fällig“, „Antrag wartet auf Bearbeitung“, „Zustimmung steht noch aus“ | Die zuständige Person, sonst alle, die Anträge bearbeiten |
| „Ein beendetes Mitglied ist zur Prüfung fällig“ | Alle, die Mitglieder bearbeiten |
| „Neuer Export im Protokoll“ | Alle, die das Exportprotokoll prüfen (nicht die exportierende Person) |
| „Ein Mitgliedereintrag wurde gelöscht“, „Kontaktdaten eines ehemaligen Mitglieds entfernt“ | Die anderen Super-Administrationen |
| „Anmeldung von einem neuen Gerät“ | Das Konto selbst |
| Warnungen zum Betrieb und „E-Mail-Versand fehlgeschlagen“ | Abschnitt 8 |

**Tägliche Erinnerungen:** Ein Job bildet sie einmal am Tag (06:00). Eine Erinnerung wird nicht
wiederholt, solange die vorige ungelesen ist. Die Fristen stellt die Super-Administration unter
„Sicherheit“ → „Einstellungen“ ein (Abschnitt 6.6).

Gelesene Hinweise werden nach 30 Tagen gelöscht, ungelesene nach 90 Tagen.

Zusätzlich geht bei neuen Anträgen und Nachrichten eine E-Mail ohne Personendaten an die
Benachrichtigungsadresse (Abschnitt 8.3). **Offen (Entscheidung 17):** welche Adressen
Benachrichtigungen erhalten.

---

## 6. Benutzerkonten

Menü „Sicherheit“ → „Benutzer & Rollen“.

### 6.1 Wer wen verwalten darf

| Rolle | Darf |
|---|---|
| „Super-Administration“ | Jedes andere Konto anlegen, ändern, deaktivieren und löschen |
| „Vorstand (Administration)“ | Nur Konten der „Redaktion“ und der „Mitgliederverwaltung“ anlegen, ändern und deaktivieren |
| „Prüfung (nur lesen)“ | Konten ansehen |
| Alle anderen | Nur das eigene Konto („Meine Sicherheit“) |

Es gibt keine Selbstregistrierung, auch nicht für das erste Konto. Das erste Konto legt die Technik
auf dem Server an (Betriebshandbuch, §3.6).

Echte Konten werden erst angelegt, wenn der Verein die Personen benannt hat. In der Produktion
gibt es keine Testkonten mit Admin-Rechten (CONTROL-CENTER.md §14).

### 6.2 Ein Konto anlegen

1. „Benutzer & Rollen“ → „Neu erstellen“.
2. „Name“, E-Mail-Adresse, „Rolle“, bei Bedarf „Einschränkungen“, ein Anfangspasswort (mindestens
   12 Zeichen).
3. „Speichern“; das Control Center fragt nach einem Code.
4. Geben Sie der Person das Anfangspasswort auf sicherem Weg weiter.
   `[PLACEHOLDER: wie Anfangspasswörter übergeben werden]`
5. Die Person meldet sich an, richtet die App ein (Abschnitt 1.3) und ändert das Passwort.

Die Liste zeigt in „Zwei-Faktor“, ob die Einrichtung noch offen ist. Das Dashboard zählt Konten
„ohne Zwei-Faktor (Einrichtung offen)“.

Passwörter anderer Konten setzt nach dem Anlegen niemand mehr. Wer sein Passwort vergessen hat,
nutzt „Passwort vergessen?“.

### 6.3 Ändern, deaktivieren, löschen

- Rolle, „Einschränkungen“, „Deaktiviert“ und E-Mail-Adresse ändern braucht einen Code.
- „Deaktiviert“: Die Person kann sich nicht mehr anmelden; alle Sitzungen enden sofort.
- Löschen: nur die Super-Administration, mit Code.

### 6.4 Zweiten Faktor zurücksetzen

Im Konto der Person, Bereich „Sicherheit dieses Kontos“:

1. „Zwei-Faktor zurücksetzen“ wählen und bestätigen. Das Control Center fragt nach einem Code.
2. Alle Sitzungen der Person enden. Sie erhält eine E-Mail und richtet die App bei der nächsten
   Anmeldung neu ein. Ihre Rechte bleiben gleich.

Wer darf: die Super-Administration bei jedem anderen Konto, der Vorstand nur bei „Redaktion“ und
„Mitgliederverwaltung“. Niemand bei sich selbst.

„Alle Sitzungen beenden“ (gleicher Bereich, mit Code) meldet die Person überall ab.

### 6.5 Schutz der letzten Super-Administration

Die letzte aktive Super-Administration kann weder herabgestuft noch deaktiviert noch gelöscht
werden. Das prüft auch die Datenbank. Der Verein braucht mindestens zwei Super-Administrationen.

### 6.6 „Einstellungen“ (Super-Administration)

Menü „Sicherheit“ → „Einstellungen“, Gruppe „Erinnerungen“:

| Feld | Standard | Bereich |
|---|---|---|
| „Antrag ohne Bearbeitung nach (Tagen)“ | 7 | 1–90 |
| „Zustimmung ausstehend nach (Tagen)“ | 14 | 1–180 |
| „Prüfung nach Ende der Mitgliedschaft (Tage)“ | 0 (sofort) | 0–365 |

Änderungen stehen im Audit-Log.

---

## 7. Audit-Log

Menü „Sicherheit“ → „Audit-Log“. Einträge können weder bearbeitet noch gelöscht werden.

**Was festgehalten wird:** Zeit, Person (Konto-ID, Name, Rolle), „Bereich“, „Aktion“, „Objekt“
(Art, ID und bei Inhalten und Konten der Titel oder Name), „Ergebnis“ („Erfolgreich“,
„Abgelehnt“, „Fehlgeschlagen“), „Mit Code bestätigt“ und kleine „Details“ (z. B. Namen geänderter
Felder, alter und neuer Status).

**Was nicht festgehalten wird:** IP-Adressen und Inhalte von Formularen oder Nachrichten.

**Wer welche Bereiche sieht:**

| Rolle | Bereiche |
|---|---|
| „Super-Administration“, „Prüfung (nur lesen)“ | alle: „Anmeldung & Sicherheit“, „Benutzer & Rollen“, „Inhalte“, „Verein“, „Betrieb“ |
| „Vorstand (Administration)“ | „Benutzer & Rollen“, „Inhalte“, „Verein“ |
| „Technik“ | „Betrieb“ |
| „Redaktion“, „Mitgliederverwaltung“ | kein Audit-Log; die eigenen Sicherheitsereignisse unter „Meine Sicherheit“ |

Das Dashboard zeigt unter „Letzte Aktivität“ Einträge aus Ihren Bereichen.

Aufbewahrung: 12 Monate (am 2026-10-20 als Anfangswert entschieden; die rechtliche Angemessenheit
ist vor der Produktion zu prüfen). Ein nächtlicher Job löscht ältere Einträge.

---

## 8. Betrieb, E-Mail und Statistik

Diese Bildschirme sind vor allem für die Technik. Für alle anderen gilt: hinsehen, bei Warnungen
Bescheid geben. Technische Abläufe: [OPERATIONS.de.md](OPERATIONS.de.md).

`[PLACEHOLDER: technische Ansprechperson und wie sie erreichbar ist]`

### 8.1 Menü „Betrieb“

| Bildschirm | Was Sie sehen | Wer |
|---|---|---|
| „Dienste & Status“ | Ob alle Dienste laufen, Auslastung des Servers, Release, geplante Aufgaben. „Erreichbarkeit von außen“ ist nicht eingerichtet (**Offen, Entscheidung 8**) | Lesen: Super-Administration, Vorstand, Technik, Prüfung. Neustart: Super-Administration, Technik |
| „Sicherungen“ | Letzte Sicherung und letzte Test-Wiederherstellung, Zeitplan, Verlauf. „Jetzt sichern“ und „Wiederherstellung testen“ (mit Code). Die Live-Datenbank lässt sich hier bewusst nicht zurücksetzen (**Offen, Entscheidung 10**) | wie oben |
| „Protokolle“ | Die letzten Zeilen eines Dienstes, maskiert. Jeder Abruf steht im Audit-Log | wie oben, lesen |
| „Domains & SSL“ | Die Zertifikate der Website und des Control Centers | wie oben, lesen |
| „E-Mail“ | Abschnitt 8.3 | Super-Administration, Technik |

**Worauf achten:** Das Dashboard zeigt laufende Dienste, die letzte Sicherung und die Zertifikate.
Warnungen kommen in die Glocke derer, die Betriebsaktionen ausführen dürfen: „Betriebs-Agent
antwortet nicht“, „Dienst läuft nicht“, „Sicherung fehlgeschlagen“, „Keine Sicherung seit über 26
Stunden“, „Test-Wiederherstellung fehlgeschlagen“, „Neustart fehlgeschlagen“, „TLS-Zertifikat
läuft ab oder ist ungültig“, „Speicher fast voll“. Dieselbe Warnung kommt höchstens einmal am Tag.
Melden Sie solche Warnungen der technischen Ansprechperson.

### 8.2 „Einblicke“ → „Statistik“

Für Super-Administration, Vorstand, Technik und Prüfung.

- Gezählt aus den Server-Protokollen: keine Cookies, kein Tracking-Skript, keine IP-Adressen
  gespeichert.
- „Seitenaufrufe“ und „Besuche“ für 7, 30 oder 90 Tage. Ein Besuch ist ein Einstieg von außen
  (Suchmaschine, Link, direkt). Wer zweimal kommt, zählt zweimal.
- „Meistbesuchte Seiten“, „Sprachen“ (die aufgerufene Sprachversion), „Herkunft“ (nur die
  Domain).
- „Nicht gefundene Adressen“ mit „Weiterleitung anlegen“ (Abschnitt 4.7) und „Serverfehler“ mit
  „Protokolle ansehen“.
- „Verfügbarkeit“: nicht eingerichtet (**Offen, Entscheidung 8**).
- Die Zahlen erscheinen ab der ersten vollen Stunde, nachdem die Website auf dem Server läuft.

### 8.3 „E-Mail“

Für Super-Administration und Technik („E-Mail-Einstellungen“).

- „Einstellungen bearbeiten“: Mailserver, Port, Benutzername, Absender, die Adresse für
  „Benachrichtigungen“ und die Adresse für „Technische Warnungen“. Speichern braucht einen Code.
  Leere Felder übernehmen die Werte vom Server. Das Passwort des Mailservers steht nur auf dem
  Server.
- „Test-E-Mail an mich“: geht nur an Ihre eigene Adresse, höchstens fünfmal pro Stunde.
- „Versandprotokoll“: ohne Betreff und Inhalt, Empfänger gekürzt, 90 Tage.
- Eine fehlgeschlagene Zustellung meldet die Glocke („E-Mail-Versand fehlgeschlagen“), einmal am
  Tag.
- Ohne Mailserver wird nichts versendet; Hinweise erscheinen dann nur in der Glocke.

**Offen (Entscheidung 5):** Mail-Anbieter, Absenderadresse.
`[PLACEHOLDER: Mail-Anbieter und Absenderadresse]`

---

## 9. Datenschutz im Alltag

Fakten aus docs/privacy-notes.md und CONTROL-CENTER.md. Dieses Handbuch legt keine Fristen fest
und ändert keine.

### 9.1 Regeln für die tägliche Arbeit

- **Nur das Nötige notieren.** Das gilt für „Interne Notizen“, den „Konkreten Anlass“ beim Export
  (ohne Namen) und die „Erläuterung“ bei der Prüfung (ohne weitere Personendaten).
- **Benachrichtigungen enthalten keine Personendaten.** Die Einzelheiten stehen im verlinkten
  Eintrag, den nur Berechtigte öffnen können.
- **Export nur mit freigegebenem Zweck**, konkretem Anlass und Code. Jeder Export steht im
  Exportprotokoll. Die Datei liegt danach bei Ihnen: Bewahren Sie sie sicher auf.
  `[PLACEHOLDER: Regel des Vereins zum Umgang mit exportierten Dateien]`
- **Team und Partner** erscheinen auf der Website nur mit Einwilligung bzw. Zustimmung
  (Abschnitt 4.4).
- **Formulartexte und Rechtstexte** liefert der Verein; Änderungen rechtlich prüfen lassen.
- **Zuweisung gibt keinen Zugang.** Wer Personendaten sieht, entscheidet nur die Rolle.

### 9.2 Aufbewahrung, wie dokumentiert

„Vorschlag“ heißt: vom Verein noch nicht entschieden.

| Daten | Aufbewahrung |
|---|---|
| Kontaktnachrichten | Sechs Monate nach Eingang, dann automatisch gelöscht |
| Abgelehnte Anträge | Sechs Monate nach der Entscheidung, dann automatisch gelöscht |
| Angenommene und offene Anträge | Nicht automatisch gelöscht; Umgang mit angenommenen Anträgen **offen (Entscheidung 12)** |
| Mitgliederverzeichnis | Keine automatische Löschung; Prüfung nach dem Ende durch eine Person |
| Audit-Log und Exportprotokoll | 12 Monate (Anfangswert, rechtliche Prüfung vor der Produktion) |
| Beendete Anmeldeaufzeichnungen | 30 Tage |
| Benachrichtigungen | Gelesene 30 Tage, ungelesene 90 Tage |
| Versandprotokoll der E-Mails | 90 Tage (Vorschlag) |
| Besucherstatistik | 13 Monate (Vorschlag), nur Zahlen |
| Zugriffsprotokolle des Webservers | 7 Tage (Vorschlag, Entscheidung 7) |
| Sicherungen | Vorschlag: 7 tägliche, 4 wöchentliche, 6 monatliche (Entscheidung 9). In der Live-Datenbank gelöschte Daten bleiben in Sicherungen, bis diese ablaufen (bis zu etwa sechs Monate) |

---

## 10. Hilfe und Kontakt

`[PLACEHOLDER: wer bei Fragen zum Control Center hilft und wie die Person erreichbar ist]`

- Fragen zu Inhalten: `[PLACEHOLDER: Ansprechperson Redaktion]`
- Fragen zu Mitgliedschaft und Datenschutz: `[PLACEHOLDER: Ansprechperson Vorstand]`
- Technische Störungen und Warnungen: `[PLACEHOLDER: technische Ansprechperson]`
- Telefon verloren: Abschnitt 1.6.
