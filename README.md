# MetaFairy (WebLLM-Edition)

MetaFairy analysiert und entwirft Beschreibungen von Open-Government-Datensätzen.
Die Analyse prüft **sieben Kriterien**: Titel, Zweck, Inhalt, Erhebung/Quelle,
Vollständigkeit und Aktualität, Interpretation sowie räumlicher Bezug.
Das inhaltliche Konzept orientiert sich an
[machinelearningZH/ogd_ai-metafairy](https://github.com/machinelearningZH/ogd_ai-metafairy).

Die Inferenz läuft mit WebLLM im Browser, ohne eigenen Inferenzserver oder API-Key.
Die mitgelieferte **`index.html` ist eine eigenständige Einzeldatei**: per Doppelklick
im Browser öffnen, dann **Modell laden**. Kein npm, Node.js, Python, lokaler Server
oder Installationsschritt ist für die Nutzung erforderlich. Anwendung, Gestaltung
und Worker-Code sind eingebettet; die KI-Bibliothek und das Modell werden weiterhin
auf Knopfdruck aus dem Internet geladen.

## Voraussetzungen und Downloads

- `index.html` direkt als lokale Datei (`file://`) öffnen oder per HTTPS bereitstellen.
  Für lokale Dateien enthält sie einen klassischen Blob-Worker statt eines
  vom Dateisystem nachgeladenen Modul-Workers.
- Ein Browser mit WebGPU und `shader-f16`, beispielsweise Chrome oder Edge auf
  einem geeigneten Desktop-System. Die App prüft diese Fähigkeiten vor dem Laden.
- Festes Modell: **Qwen3-4B-q4f16_1-MLC**, WebLLM **0.2.80**.
- Geschätzter Modell-Download: **2.5 GB**. Die Modellkonfiguration nennt ungefähr
  **3.4 GB GPU-Speicher**; zusätzlicher Browser- und Systemspeicher wird benötigt.
  Die Fähigkeitsprüfung garantiert deshalb nicht, dass genügend Speicher vorhanden ist.
- Modell und Inferenzbibliothek werden erst nach Klick auf **Modell laden** geladen.
  Modellartefakte können im Browser-Cache wiederverwendet werden. Browser können
  diesen Cache löschen oder verdrängen; ein erneuter Download bleibt möglich.

Auf integrierter Grafik kann eine Antwort mehrere Minuten dauern. Die folgenden
Zeitangaben entsprechen den Standardwerten in `src/config.js`. Modell-Laden
und Generierung lassen sich abbrechen. Generierung wird zunächst im Worker
unterbrochen; reagiert dieser nach zehn Sekunden nicht, wird er beendet und das
Modell muss erneut geladen werden. Ohne Fortschritt wird ein Vorgang nach fünf
Minuten beendet. Nach Seiten-Neuladen muss das Modell erneut in den GPU-Speicher
geladen werden, auch wenn seine Dateien bereits im Cache liegen.

## Datenschutz und externe Abhängigkeiten

Die App enthält keinen Upload der eingegebenen Metadaten, keine Analyse-Telemetrie
und keine Speicherung der Formulareingaben. Die Eingaben werden zur lokalen
Inferenz an einen Worker im selben Browser übergeben. Kopieren nutzt die lokale
Zwischenablage erst nach einem Klick.

**Die Standardbereitstellung ist trotzdem nicht vollständig offline:** Der
Seitenhost erhält die üblichen Seitenabrufe. Beim Modell-Laden werden JavaScript
von `esm.run`/jsDelivr, Modellartefakte von Hugging Face und die kompilierte
Modellbibliothek aus den im WebLLM-Modellkatalog angegebenen Quellen geladen.
Diese Dienste erhalten Download-Anfragen und übliche Verbindungsdaten. Extern
geladener Code ist Teil der Vertrauensbasis; die lokale Inferenz ist keine
Garantie für beliebige zukünftige Versionen dieser Abhängigkeiten.

Für eine geprüfte, selbst gehostete JavaScript-Bibliothek kann `WEBLLM_URL` in
[src/config.js](src/config.js) auf eine absolute URL eines kompatiblen ES-Modul-Bundles
zeigen. Für die Einzeldatei eine HTTPS-URL verwenden und sie nach Änderungen neu
erzeugen. Lizenz- und Drittherstellerhinweise müssen mitgeführt werden. Das verlagert zunächst nur die
JavaScript-Bibliothek: für vollständig eigene Modell-Downloads muss zusätzlich
der WebLLM-Modellkatalog samt Modellartefakten und WASM-Bibliothek im Worker
konfiguriert werden. Ein vollständig offline nutzbares Deployment wird hier
nicht mitgeliefert.

## Nutzung und Aussagekraft

1. **Modell laden** und auf die Bereitschaftsmeldung warten. Fehler erscheinen in
   der Statuszeile; danach kann erneut geladen werden.
2. Deutsch, Französisch oder Italienisch auswählen. Die Auswahl bestimmt die
   Oberfläche und die Antwortsprache. Sie wird nicht durch automatische
   Spracherkennung überschrieben. Sprache und Modell-Laden sind während eines
   laufenden Vorgangs gesperrt.
3. **Beschreibung analysieren:** Titel und Beschreibung eingeben. Eine Beschreibung
   ist erforderlich; ein fehlender Titel darf als fehlend beurteilt werden.
4. **Beschreibung generieren:** mindestens ein inhaltliches Feld ausfüllen. Ein
   Titel allein reicht nicht aus. Fehlende Angaben sollen ausgelassen werden.
5. Ergebnis selbst prüfen. Nur vollständige, formal gültige und nicht abgeschnittene
   generierte Texte erhalten einen Kopierknopf. Scheitert der Zugriff auf die
   Zwischenablage, zeigt der Knopf dies an; der Text bleibt manuell kopierbar.

Die Analyse verwendet normale Text-Decodierung mit expliziten XML-Tagnamen im
Prompt und strikter anschliessender Validierung. Platzhalter wie `<NAME>` sind
kein gültiges Ausgabeformat. Die XGrammar-Decodierung ist bewusst deaktiviert:
WebLLM 0.2.80 kann dabei mit einem nativen `Aborted()` abstürzen (siehe
[Upstream-Fehlerbericht](https://github.com/mlc-ai/web-llm/issues/807)). Bei einem
nativen Laufzeitfehler wird der betroffene Worker beendet; erst ein erneutes
Laden erzeugt einen frischen Worker. Die Formulareingaben bleiben erhalten.

Analyseergebnisse werden auf alle sieben Kriterien sowie Einschätzung, Fundstelle,
Tipp und eine ganzzahlige Note von 1 bis 5 geprüft. Fehlende oder doppelte Felder
führen zu einem sichtbaren Hinweis; es werden keine Ersatznoten erfunden. Die
**Modellnoten werden unverändert angezeigt**, auch wenn eine Fundstelle vorhanden
ist. Eine Fundstelle belegt das Vorhandensein einer Aussage, nicht deren Qualität.

Fundstellen müssen zusammenhängend im jeweiligen Eingabefeld vorkommen: für die
Titelbewertung im Titel, sonst in der Beschreibung. Nur Unicode-Normalisierung
und Leerraum werden vereinheitlicht; Gross-/Kleinschreibung, Wortreihenfolge und
Satzzeichen bleiben erhalten. Nicht verifizierbare Stellen werden markiert.
Diese Prüfung beweist weder die inhaltliche Relevanz des Zitats noch die Wahrheit
der zugrunde liegenden Aussage. Auch eine vollständig formatierte Antwort kann
Angaben übersehen oder erfinden.

Mit den Standardwerten erfolgt bei ungültiger Analyse höchstens ein zweiter Versuch mit korrigierenden
Anweisungen. Kann die Antwort keinem Kriterium zugeordnet werden, erscheinen eine
klare Fehlermeldung und die aufgeklappte Rohantwort statt sieben leerer Karten.
Bei ungültiger generierter Beschreibung erfolgt ebenfalls höchstens ein zweiter Versuch. Kürzungen
werden angezeigt und lösen keine erneute identische Generierung aus. Die Dauer
schliesst einen möglichen zweiten Versuch ein. Streaming-Abschnitte werden nicht
als Tokenzahlen ausgegeben.

Das Modell hat ein **Kontextfenster von 4096 Tokens**, gemeinsam für Anweisungen,
Eingabe und Antwort. Vorab wird eine bewusst konservative UTF-8-Byte-Obergrenze
mit Reserve für Chat-Vorlage und Ausgabe geprüft. Sie kann Texte zurückweisen,
die mit exakter Tokenisierung noch passen würden. Es wird nichts stillschweigend
gekürzt; bei einer Meldung muss die Eingabe verkürzt werden. Die Ausgabe reserviert
1700 Tokens für die Analyse bzw. 700 Tokens für die Generierung. Ausführliche
Few-Shot-Beispiele wurden zugunsten dieser Reserve aus den Laufzeit-Prompts entfernt;
die Modellqualität sollte bei Promptänderungen mit der Evaluation geprüft werden.

## Öffnen und veröffentlichen

`index.html` herunterladen bzw. aus dem Repository kopieren und per Doppelklick
öffnen. Die Datei kann allein in einem beliebigen Ordner liegen; `src/`,
`styles.css` und `package.json` werden zur Nutzung nicht benötigt. Internetzugang
für den ersten Bibliotheks- und Modell-Download sowie ein geeigneter Browser
bleiben erforderlich. Die Einzeldatei enthält nicht die 2.5 GB Modellgewichte.

Für GitHub Pages genügt dieselbe `index.html` im gewählten Branch/Ordner. Auch
andere statische HTTPS-Hosts und die VS-Code-Vorschau können sie unverändert
anzeigen. Es müssen keine JavaScript-Module oder Stylesheets separat veröffentlicht
werden. Die App benötigt keinen Inferenzserver.

## Entwicklung und Prüfungen

Nur für die Entwicklung: Die lesbaren Quellen bleiben in `src/`, die Gestaltung
in `styles.css`. `src/index.template.html` ist die HTML-Vorlage. Die eingecheckte
`index.html` wird daraus mit Python-Standardbibliothek erzeugt:

```sh
python3 scripts/build.py
python3 scripts/build.py --check
```

Nach Änderungen an Laufzeitquellen, Vorlage oder Gestaltung die Einzeldatei neu
erzeugen und mit einchecken. Der Generator bettet die Quellen sowie einen
klassischen Blob-Worker ein; er lädt keine Abhängigkeiten herunter. Endanwender
führen diesen Schritt nicht aus. Tests und CI prüfen, dass die Datei aktuell ist.

Node.js ab Version 22 genügt für die JavaScript-Tests; `npm install` ist nicht nötig.
Auch npm selbst ist optional: `node --test tests/*.test.js` führt dieselben Tests aus.

```sh
npm test
```

Die Regressionstests prüfen Belege, unveränderte Noten, fehlende Felder,
Generierungsvalidierung, Kontextbudget, gemeinsam gesperrte Aktionen und den
Worker-Lebenszyklus einschliesslich Fehlern, Abbruch, Zeitüberschreitungen und
verspäteten Nachrichten. Modell-Downloads sind dafür nicht erforderlich.

Für echte Browser-Integrationstests einen Chrome-Pfad angeben, beispielsweise auf macOS:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:browser
```

Ohne `CHROME_PATH` wird dieser optionale Test übersprungen. Er verwendet ein
vorübergehendes Profil und simulierte Modellantworten. Er prüft die echte DOM-,
Tastatur- und Blob-Worker-Integration sowohl per HTTP-Unterpfad als auch mit einer
isolierten Kopie der Einzeldatei über `file://` – ohne lokale Moduldateien oder
App-Server. Die CI führt beide Tests unter Linux aus;
dort läuft der isolierte Headless-Chrome-Prozess ohne seine Sandbox.

Die [mehrsprachige Evaluation](eval/README.md) enthält sechs synthetische Fälle
und einen optionalen Browser-Runner für reale GPU-Läufe. Automatische Tests sind
kein Nachweis der Modellqualität; diese muss mit realen Läufen und menschlicher
Prüfung bewertet werden.

## Entwicklereinstellungen

Die Laufzeit-Standardwerte stehen zentral in [src/config.js](src/config.js).
Neben Modell-ID/-Name, Download-Anzeige, WebLLM-Quelle und Tokenlimits lassen sich
folgende Werte anpassen:

| Einstellung | Standard | Bedeutung |
| --- | --- | --- |
| `TEMPERATURE` | `0.2` | Sampling-Temperatur für Analyse und Generierung |
| `MAX_RETRIES` | `1` | Zusätzliche Versuche bei ungültigen Antworten; ganze Zahl ab `0`, mit `0` deaktiviert |
| `WORKER_TIMEOUT_MS` | `300_000` | Inaktivitätsgrenze in Millisekunden; Fortschrittsmeldungen setzen sie zurück |
| `CANCEL_TIMEOUT_MS` | `10_000` | Wartezeit nach Generierungsabbruch, bevor ein nicht reagierender Worker beendet wird |
| `MODEL_GPU_MEMORY_GB` | `3.4` | Geschätzter GPU-Speicherbedarf für die Anzeige; keine Speicherreservierung oder harte Zulassungsgrenze |
| `REQUIRED_GPU_FEATURES` | `['shader-f16']` | Vor dem Laden geprüfte GPU-Funktionen; bei Modellen ohne optionale Funktionen ist `[]` möglich |

Wiederholungen betreffen die Antwortvalidierung, nicht Modell-Laden, Abbruch oder
native Laufzeitfehler. Abgeschnittene Antworten werden nicht automatisch wiederholt.
Die optionale Modell-Evaluation bleibt absichtlich bei einem Versuch pro Messung,
damit ihre Kennzahlen nicht durch Wiederholungen beschönigt werden.

Nach Änderungen **`python3 scripts/build.py` ausführen und `index.html` mit einchecken**.
Eine bereits erzeugte Einzeldatei liest `src/config.js` nicht zur Laufzeit nach;
Endanwender brauchen weiterhin keine Installation und keinen Build-Schritt.

Bei einem Modellwechsel die Einstellungen als zusammengehörige Kombination prüfen:
GPU-Funktionen und Speicherbedarf, Kontext-/Ausgabelimits, Tokenisierung sowie
modellabhängige Prompts und Inferenzoptionen müssen zum Modell passen. Eine andere
Modell-ID allein garantiert keine Kompatibilität. Der geplante Einstellungsbereich
mit geprüften Presets für Endanwender ist als Aufgabe in [PLAN.md](PLAN.md) erfasst.

## Struktur und Anpassungen

| Datei | Aufgabe |
| --- | --- |
| `index.html` | Fertige Einzeldatei für Endanwender und statische Hosts |
| `src/index.template.html`, `styles.css` | Gepflegte HTML-Vorlage und Gestaltung |
| `scripts/build.py` | Abhängigkeitsfreier Generator der Einzeldatei |
| `src/app.js` | Formulare, Sprache, gemeinsam gesperrte Aktionen und Ergebnisablauf |
| `src/config.js` | Modell, GPU-Anforderungen, Sampling, Wiederholungen, Zeit- und Tokenlimits |
| `src/gpu.js` | Prüfung der konfigurierten GPU-Anforderungen |
| `src/i18n.js` | Deutsche, französische und italienische Oberflächentexte |
| `src/prompts.js` | Gemeinsame Prompts für App und Evaluation |
| `src/validation.js` | Belege, Antwortstruktur, Fliesstext und Eingabebudget |
| `src/render.js` | Sichere Ausgabe und bestätigtes Kopieren |
| `src/inference.js` | Worker-Protokoll, Abbruch und Fehlerbehandlung |
| `src/worker-loader.js` | Worker-Erzeugung und Lebenszyklus der Blob-URL |
| `src/inference-worker.js` | Laden und Streaming-Inferenz ausserhalb des UI-Threads |

Bei einem Modellwechsel Fähigkeiten, GPU-Bedarf, Kontextfenster, Tokenbudget und
Prompts gemeinsam prüfen. Die Byte-Obergrenze setzt die Byte-Tokenisierung des
aktuellen Qwen-Modells voraus und ist kein allgemeiner Tokenzähler.

## Lizenz

Der Anwendungscode steht unter MIT, siehe [LICENSE](LICENSE). Vom Originalprojekt
wurde das inhaltliche Konzept übernommen, kein Code. WebLLM und Modellartefakte
haben eigene Lizenzen; die MIT-Lizenz der App ersetzt diese nicht.
