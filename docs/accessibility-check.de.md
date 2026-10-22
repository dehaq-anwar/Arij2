# Manuelle Prüfung der Barrierefreiheit (Tastatur und Screenreader)

[English](accessibility-check.md)

Vor dem Start (OPERATIONS.de.md §11) und nach größeren Änderungen am Design. Die automatischen
Tests können nicht beurteilen, was ein Mensch hört und ob die Reihenfolge Sinn ergibt. Diese
Prüfung schon. Sie dauert etwa zwei Stunden. Tragen Sie jeden Befund in die Tabelle am Ende ein,
mit Seite, Sprache, Werkzeug und dem, was passiert ist.

## Was die automatischen Tests schon abdecken

Sie laufen in der CI bei jedem Commit (`npm run test:e2e`):

- axe (Regeln von WCAG 2.1 A und AA) auf jeder Seite in allen drei Sprachen, im hellen und im
  dunklen Design, und auf dem geöffneten Menü für kleine Bildschirme.
- Eine `h1` je Seite und keine übersprungene Überschriftenebene.
- Kein seitliches Scrollen bei 320 CSS-Pixeln Breite (WCAG 1.4.10, Umbruch).
- Der Link „Zum Inhalt springen“ ist der erste Halt der Tab-Taste und setzt den Fokus auf den
  Hauptinhalt.
- Das Menü für kleine Bildschirme ist ein modaler Dialog: Escape schließt es, der Fokus kehrt zum
  Menü-Knopf zurück.
- Formulare: Fehlerübersicht mit Links zu den Feldern, Fokus auf der Übersicht nach einem
  fehlgeschlagenen Versuch, auch ohne JavaScript; keine Bewegung bei „Bewegung reduzieren“;
  Farbkontrast aller Farbpaare des Designs (`npm run lint`).

## Ausstattung

| Werkzeug | Wo |
|---|---|
| NVDA (aktuelle Version) mit Firefox oder Chrome | Windows |
| VoiceOver mit Safari | macOS (Cmd+F5) und iPhone (Einstellungen → Bedienungshilfen) |
| TalkBack mit Chrome (optional) | Android |
| Nur Tastatur, ohne Maus oder Touchpad | jeder Browser |

Prüfen Sie den Testserver mit den echten Inhalten, nicht mit den Platzhaltern
(`npm run check:content`).

## 1. Nur Tastatur (Website)

Startseite, ein Projekt, das Mitgliedsformular und das Kontaktformular, auf Deutsch und Arabisch:

- [ ] Tab erreicht jeden Link, jeden Knopf und jedes Feld, in der Reihenfolge auf dem Bildschirm
      (auf Arabisch von rechts nach links).
- [ ] Der Fokusrahmen ist an jedem Element sichtbar, im hellen und im dunklen Modus.
- [ ] Der erste Tab zeigt „Zum Inhalt springen“; Enter springt hinter den Kopfbereich.
- [ ] Schmales Fenster (oder 400 % Zoom): Der Menü-Knopf öffnet das Menü; Tab bleibt darin;
      Escape schließt es, und der Fokus steht wieder auf dem Menü-Knopf.
- [ ] Sprachleiste: Jede Sprache ist erreichbar und mit Enter wählbar; die Seite öffnet sich in
      dieser Sprache.
- [ ] Formulare: Jedes Feld, jedes Kontrollkästchen und jedes Optionsfeld funktioniert mit Tab,
      Leertaste und Pfeiltasten. Leeres Formular absenden: Der Fokus springt zur Fehlerübersicht;
      jeder Link darin setzt den Fokus auf sein Feld.
- [ ] Nichts bewegt sich von selbst länger als fünf Sekunden, ohne dass man es anhalten kann.

## 2. Screenreader (Website)

Dieselben Seiten mit NVDA und mit VoiceOver:

- [ ] Beim Öffnen wird der Seitentitel vorgelesen und nennt die Seite.
- [ ] Die Liste der Überschriften (NVDA: Einfügen+F7; VoiceOver: Rotor) zeigt eine sinnvolle
      Gliederung.
- [ ] Landmarken: Kopfbereich, Navigation (Hauptmenü und Sprachen, mit verschiedenen Namen),
      Hauptinhalt, Fußbereich.
- [ ] Bilder: Jedes Bild mit Inhalt hat eine Beschreibung, die sagt, was es zeigt; dekorative
      Bilder werden übersprungen.
- [ ] Links sind auch ohne Zusammenhang verständlich (Linkliste des Screenreaders), z. B. keine
      Reihe von „mehr“.
- [ ] Formulare: Bezeichnung, Pflichtfeld, Hinweis und nach einem Fehlversuch der Fehler jedes
      Feldes werden vorgelesen. Die Fehlerübersicht wird vorgelesen, wenn sie erscheint. Nach dem
      Absenden wird die Bestätigung vorgelesen.
- [ ] Arabische Seiten: Der Screenreader wechselt zu einer arabischen Stimme; deutsche oder
      englische Namen im arabischen Text werden in ihrer Sprache gelesen (sie tragen ein
      `lang`-Attribut).
- [ ] Seiten, die es nur auf Deutsch gibt, zeigen einen Hinweis; der deutsche Text wird mit einer
      deutschen Stimme gelesen.

## 3. Control Center

Mit einem Testkonto je Rolle, nie mit Produktivdaten (CONTROL-CENTER.md):

- [ ] Anmeldung, Code aus der Authenticator-App und Wiederherstellungscode funktionieren mit der
      Tastatur; Fehler werden vorgelesen.
- [ ] Der Dialog der Sicherheitsbestätigung (Code vor heiklen Aktionen) erhält den Fokus, lässt
      sich mit Escape schließen, und der Fokus kehrt zum auslösenden Knopf zurück.
- [ ] Navigation, Listen (Sortierung, Filter, Seiten), die Bearbeitungsmasken einer Seite und
      eines Antrags sowie die Benachrichtigungen funktionieren mit der Tastatur und werden mit
      sinnvollen Namen vorgelesen.
- [ ] Arabische Oberfläche: Die Reihenfolge von Tab und Screenreader folgt dem Text von rechts
      nach links.

## 4. Anzeige-Einstellungen

- [ ] Browser-Zoom 200 % und 400 %: Nichts wird abgeschnitten oder überlappt; kein seitliches
      Scrollen außer bei breiten Tabellen im Control Center.
- [ ] Textabstände (WCAG 1.4.12), z. B. mit einem Bookmarklet für Zeilenhöhe 1,5,
      Absatzabstand 2, Zeichenabstand 0,12 und Wortabstand 0,16: Kein Text wird abgeschnitten.
- [ ] Windows-Kontrastmodus (erzwungene Farben): Knöpfe, Felder, Fokus und Menü bleiben sichtbar.
- [ ] „Bewegung reduzieren“ im Betriebssystem: keine Intros, kein weiches Scrollen.

## Befunde

| Datum | Seite | Sprache | Werkzeug | Was passiert ist | Schwere | Behoben in |
|---|---|---|---|---|---|---|
| | | | | | | |

Schwere: **blockierend** (eine Aufgabe ist nicht erledigbar), **schwer** (nur mit Mühe möglich),
**gering**.
