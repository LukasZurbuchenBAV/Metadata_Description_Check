[README (4).md](https://github.com/user-attachments/files/33426180/README.4.md)
# MetaFairy (WebLLM-Edition)

Client-seitiger Nachbau von [machinelearningZH/ogd_ai-metafairy](https://github.com/machinelearningZH/ogd_ai-metafairy):
hilft, Datensatzbeschreibungen zu analysieren oder zu entwerfen – entlang der sechs Achsen
Zweck, Inhalt, Erhebung/Quelle, Vollständigkeit, Interpretation, Räumlicher Bezug.

**Unterschied zum Original:** keine eigene Server-Komponente, kein API-Key, keine laufenden Kosten.
Die KI ([WebLLM](https://github.com/mlc-ai/web-llm)) läuft komplett im Browser der Nutzenden über WebGPU;
es werden keine Daten an einen Dritt-Anbieter geschickt.

## Deployment auf GitHub Pages

1. Diesen Ordner in ein eigenes GitHub-Repo pushen (`index.html` muss im Root oder in `/docs` liegen).
2. Repo → **Settings → Pages** → Source auf den entsprechenden Branch/Ordner stellen.
3. Nach ein paar Minuten ist die App unter `https://<username>.github.io/<repo>/` erreichbar.

Kein Build-Schritt nötig – es ist eine einzige statische `index.html`.

## Nutzung

1. Seite öffnen (aktuelles **Chrome** oder **Edge** auf Desktop). Der Browser bzw. die Grafikkarte muss
   WebGPU samt Erweiterung `shader-f16` unterstützen – sonst zeigt die Seite eine Fehlermeldung.
2. Auf **„Modell laden"** klicken. Verwendet wird fest **Llama-3.2-3B-Instruct** (`Llama-3.2-3B-Instruct-q4f16_1-MLC`).
   Der erste Download (ca. 2,2 GB) dauert etwas und startet erst auf Knopfdruck – danach bleibt das Modell
   im Browser-Cache.
3. Tab **„Beschreibung analysieren"**: Titel und bestehenden Text einfügen. Ergebnis: pro Achse eine
   kurze Einschätzung plus Bewertung (1–5).
   Tab **„Beschreibung generieren"**: Stichworte zu den sechs Achsen eintragen und generieren lassen – das
   Ergebnis ist ein einziger, zusammenhängender Fliesstext (kein Feld pro Achse), passend zum
   Beschreibungsfeld in i14y/DCAT-AP-CH.

## Anpassen

- Modell: Es gibt keine Auswahl im UI. Das Modell steht als Konstante `MODEL_ID` (plus Grössenangabe
  `MODEL_SIZE_LABEL`) am Anfang des Script-Blocks in `index.html` und kann dort geändert werden. Die
  Button-Beschriftung und der Hinweistext im HTML nennen Modellname und Grösse ebenfalls und müssen bei
  einem Wechsel mit angepasst werden.
- Prompt/Struktur: `ANALYZE_SYSTEM` (Analyse, strukturiert je Achse) und `GENERATE_SYSTEM` (Generierung, ein
  Fliesstext) in `index.html` anpassen, z. B. auf eure i14y-/BAV-spezifischen Metadatenfelder statt der
  sechs Achsen Zweck, Inhalt, Erhebung/Quelle, Vollständigkeit, Interpretation, Räumlicher Bezug.

## Lizenz

MIT – siehe Original-Repo. Kein Bezug zu, keine Übernahme von Code aus dem Original; nur das
inhaltliche Konzept (Analyse entlang mehrerer Achsen) wurde nachgebildet.
