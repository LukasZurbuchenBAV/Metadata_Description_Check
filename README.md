[README (3).md](https://github.com/user-attachments/files/32607787/README.3.md)
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

1. Seite öffnen (aktuelles **Chrome** oder **Edge** auf Desktop, WebGPU muss unterstützt sein).
2. Modell in der Dropdown-Liste wählen und auf **„Modell laden"** klicken. Der erste Download dauert
   je nach Modellgrösse (0,5–4 GB) etwas – danach bleibt es im Browser-Cache.
3. Tab **„Beschreibung analysieren"**: Titel und bestehenden Text einfügen. Ergebnis: pro Achse eine
   kurze Einschätzung plus Bewertung (1–5).
   Tab **„Beschreibung generieren"**: Stichworte zu den sechs Achsen eintragen und generieren lassen – das
   Ergebnis ist ein einziger, zusammenhängender Fliesstext (kein Feld pro Achse), passend zum
   Beschreibungsfeld in i14y/DCAT-AP-CH.

## Anpassen

- Modellauswahl: wird dynamisch aus `webllm.prebuiltAppConfig.model_list` befüllt – kleinere Modelle
  laufen auf mehr Geräten, grössere liefern bessere Texte.
- Prompt/Struktur: `ANALYZE_SYSTEM` (Analyse, strukturiert je Achse) und `GENERATE_SYSTEM` (Generierung, ein
  Fliesstext) in `index.html` anpassen, z. B. auf eure i14y-/BAV-spezifischen Metadatenfelder statt der
  sechs Achsen Zweck, Inhalt, Erhebung/Quelle, Vollständigkeit, Interpretation, Räumlicher Bezug.

## Lizenz

MIT – siehe Original-Repo. Kein Bezug zu, keine Übernahme von Code aus dem Original; nur das
inhaltliche Konzept (Analyse entlang mehrerer Achsen) wurde nachgebildet.
