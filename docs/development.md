# Entwicklung und Konfiguration

## Einzeldatei erzeugen

Quellen in `src/`, HTML in `src/index.template.html`, Gestaltung in `styles.css` ändern.
Die erzeugte `index.html` mit einchecken:

```sh
python3 scripts/build.py
python3 scripts/build.py --check
```

Der Generator nutzt nur die Python-Standardbibliothek. Er bettet Anwendung, CSS und
klassischen Blob-Worker ein. Endanwender öffnen die fertige Datei ohne Build oder Server.

## Einstellungen

[src/config.js](../src/config.js) enthält die Standardwerte:

- Modell-ID/-Name, Download-Anzeige und WebLLM-Version/-URL.
- `TEMPERATURE`, `MAX_RETRIES`: Sampling und zusätzliche Versuche bei ungültiger Antwort.
  `MAX_RETRIES = 0` deaktiviert Wiederholungen; erwartet wird eine ganze Zahl ab null.
- `WORKER_TIMEOUT_MS`, `CANCEL_TIMEOUT_MS`: Inaktivitätsgrenze und Abbruchfrist in Millisekunden.
  Fortschritt setzt die Inaktivitätsgrenze zurück, aber nicht die Abbruchfrist.
- `MODEL_GPU_MEMORY_GB`: Speicher-Schätzung für die Anzeige, keine harte Zulassungsgrenze.
- `REQUIRED_GPU_FEATURES`: vor dem Laden geprüfte GPU-Funktionen; `[]` ist möglich.
- Kontextfenster, Reserve für die Chat-Vorlage und Ausgabelimits für beide Modi.

Nach Änderungen neu erzeugen: Die fertige HTML-Datei liest die Konfiguration nicht nach.
Beim Modellwechsel GPU-Anforderungen, Tokenisierung, Kontext-/Ausgabelimits, Prompts
und modellabhängige Inferenzoptionen gemeinsam prüfen. Eine andere Modell-ID allein genügt nicht.
Prompts und Übersetzungen stehen in `src/prompts.js` bzw. `src/i18n.js`.

## Prüfen

Node.js ab Version 22; kein `npm install` erforderlich:

```sh
node --test tests/*.test.js
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node --test tests/browser/*.test.js
```

Browserchecks nutzen ein temporäres Profil und simulierte Antworten. Sie prüfen HTTP
und eine isolierte `file://`-Kopie samt echtem Blob-Worker; ohne `CHROME_PATH` werden sie
übersprungen. Die CI führt beide Tests unter Linux aus.

Bei Änderungen an Modell, Prompt oder Laufzeit zusätzlich die
[mehrsprachige Modell-Evaluation](../eval/README.md) durchführen. Automatische Struktur-
und Belegprüfungen ersetzen keine menschliche Qualitätsbewertung.
Der geplante Einstellungsbereich für Endanwender steht in [PLAN.md](../PLAN.md).
