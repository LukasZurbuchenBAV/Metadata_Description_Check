# Geplante Weiterentwicklung

## Einstellungsbereich für Endanwender

- [ ] Einen kleinen Einstellungsbereich mit getesteten Modell-Presets ergänzen.

Die Einstellungen sollen vor dem Modell-Laden direkt in der App gewählt werden.
`src/config.js` bleibt die Quelle der Entwickler-Standardwerte; eine separate
Konfigurationsdatei muss von Endanwendern weder geladen noch bearbeitet werden.

Akzeptanzkriterien:

- Nur geprüfte Presets anbieten. Jedes Preset bündelt Modell-ID, Anzeigename,
  Download-Grösse, geschätzten GPU-Speicherbedarf, erforderliche GPU-Funktionen,
  Kontext- und Ausgabelimits sowie modellabhängige Inferenz-/Prompt-Einstellungen.
- Download-Grösse und Speicherbedarf vor dem Laden anzeigen. Ungültige Kombinationen
  durch eine freie Eingabe beliebiger Modell-IDs oder technischer Parameter vermeiden.
- Während des Ladens und der Generierung keine Einstellungen ändern. Bei einem
  Modellwechsel den vorherigen Worker beenden und das neue Modell ausdrücklich laden;
  vorhandene Formulareingaben erhalten.
- Die eigenständige `index.html` weiterhin per Doppelklick nutzbar halten, ohne npm,
  Installation, lokale JSON-Zugriffe oder App-Server. Externe Modell-Downloads klar benennen.
- Neue Presets mit der mehrsprachigen Evaluation sowie Datei-/HTTP-Browserchecks
  prüfen; Antwortstruktur, Belegprüfung, Speicherbedarf und Abbruchverhalten abdecken.

Dieser Einstellungsbereich ist noch nicht implementiert. Die aktuellen
Entwicklereinstellungen sind im README beschrieben.
