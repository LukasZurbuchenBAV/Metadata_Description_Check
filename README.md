# MetaFairy (WebLLM-Edition)

MetaFairy prüft und entwirft Beschreibungen von Open-Government-Datensätzen – nach
Titel, Zweck, Inhalt, Erhebung/Quelle, Vollständigkeit, Interpretation und räumlichem Bezug.
Das Konzept orientiert sich an [ogd_ai-metafairy](https://github.com/machinelearningZH/ogd_ai-metafairy).

Die KI läuft lokal im Browser über [WebLLM](https://github.com/mlc-ai/web-llm).
Kein API-Key, kein eigener Server, keine Installation.

## Nutzung

1. **`index.html` per Doppelklick öffnen.** Diese Datei genügt; npm und ein lokaler
   Server sind nicht nötig.
2. **Sprache wählen:** Deutsch, Französisch oder Italienisch für Oberfläche und Antwort.
3. **Modell laden:** Qwen3-4B, ca. **2.5 GB Download** beim ersten Laden. Dateien können
   danach aus dem Browser-Cache geladen werden; ein erneuter Download ist möglich.
4. **Beschreibung analysieren:** Titel und bestehenden Text einfügen. Pro Kriterium
   erscheinen Einschätzung, Fundstelle, Verbesserungsvorschlag und Bewertung von 1 bis 5.
5. **Beschreibung generieren:** mindestens ein inhaltliches Feld ausfüllen. Das Ergebnis
   ist ein zusammenhängender Fliesstext, der kopiert werden kann.

Benötigt einen Browser mit **WebGPU und `shader-f16`**, z. B. Chrome oder Edge auf
Desktop, sowie ungefähr **4.1 GB GPU-Speicher**. Auf integrierter Grafik kann eine
Antwort mehrere Minuten dauern. Vorgänge lassen sich abbrechen; nach einem
Laufzeitfehler das Modell erneut laden. Eingaben bleiben dabei erhalten.

Pro Anfrage sind **4500 UTF-8-Bytes** für Titel und Textfelder zusammen möglich
(bei üblichen deutschen, französischen und italienischen Texten etwa 3500–4500 Zeichen).
Ein Zähler zeigt den aktuellen Umfang; zu lange Eingaben werden ohne Kürzung abgewiesen.

**Ergebnisse selbst prüfen:** Die KI kann Angaben übersehen oder erfinden.
Ein geprüftes Zitat bestätigt weder die Qualität der Bewertung noch die Wahrheit der Aussage.

Eingegebene Metadaten werden lokal verarbeitet. Für Bibliothek und Modell werden
externe Dienste kontaktiert; Internetzugang bleibt dafür erforderlich.

## GitHub Pages

1. `index.html` ins Repository legen.
2. Unter **Settings → Pages** den Branch und Ordner mit dieser Datei auswählen.
3. Die veröffentlichte URL öffnen. Weitere Laufzeitdateien oder ein Build auf dem Host sind nicht nötig.

## Anpassen und beitragen

Entwicklerwerte wie Modell, Temperatur und Limits stehen in [src/config.js](src/config.js).
Nach Änderungen muss die Einzeldatei neu erzeugt werden:
[Entwicklung und Konfiguration](docs/development.md).
Weitere Hinweise: [Laufzeit und Grenzen](docs/runtime.md), [geplante Aufgaben](PLAN.md).

## Lizenz

MIT – siehe [LICENSE](LICENSE). Vom Originalprojekt wurde das Konzept übernommen,
kein Code. Bibliothek und Modellartefakte haben eigene Lizenzen.
