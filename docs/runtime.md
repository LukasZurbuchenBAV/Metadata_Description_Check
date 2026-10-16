# Laufzeit und Grenzen

## Daten und Downloads

Die App lädt keine eingegebenen Metadaten hoch und speichert die Formulareingaben
nicht dauerhaft. Inferenz erfolgt lokal im Browser-Worker.
Beim Modell-Laden werden JavaScript von `esm.run`/jsDelivr, Modellartefakte von
Hugging Face und die im WebLLM-Katalog hinterlegte WASM-Bibliothek geladen.
Download-Dienste erhalten übliche Verbindungsdaten; ihr Code gehört zur Vertrauensbasis.
Die App ist daher nicht vollständig offline. Cache-Dateien können vom Browser gelöscht
werden; auch mit Cache muss das Modell nach Seiten-Neuladen wieder in den GPU-Speicher.

Eine eigene HTTPS-Quelle für `WEBLLM_URL` ersetzt nur die JavaScript-Bibliothek.
Für vollständig eigene Downloads müssten zusätzlich Modellkatalog, Gewichte und WASM
konfiguriert und deren Lizenzen beachtet werden.

## Ergebnisse

- Zitate müssen zusammenhängend im Titel bzw. in der Beschreibung vorkommen.
  Nur Unicode-Normalisierung und Leerraum werden vereinheitlicht. Das prüft weder
  die Relevanz des Zitats noch die Wahrheit der Aussage.
- Modellnoten bleiben unverändert. Fehlende Felder erhalten keine Ersatznoten;
  ungültige oder abgeschnittene Antworten werden markiert.
- Wiederholungen gelten nur für ungültige Antworten, nicht für Kürzungen oder
  Laufzeitfehler. Die angezeigte Dauer schliesst Wiederholungen ein.
- Das Eingabebudget nutzt UTF-8-Bytes als konservative Token-Obergrenze mit Antwortreserve.
  Es kann passende Texte zurückweisen, kürzt aber nichts stillschweigend. Diese Annahme
  gilt für die Byte-Tokenisierung des aktuellen Qwen-Modells, nicht für beliebige Modelle.

## Kompatibilität

Die Einzeldatei nutzt einen klassischen Blob-Worker: lokale Modul-Worker werden
bei `file://` blockiert. XGrammar-Decodierung bleibt wegen des
[WebLLM-0.2.80-Absturzes](https://github.com/mlc-ai/web-llm/issues/807) deaktiviert;
XML wird über Prompts angefordert und anschliessend validiert.
Nach einem nativen Laufzeitfehler wird der Worker verworfen; erneutes Modell-Laden
startet einen frischen Worker. Die Formulareingaben bleiben erhalten.
