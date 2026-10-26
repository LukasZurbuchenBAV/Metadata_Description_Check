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
  XML-Zeichenreferenzen wie `&amp;`, `&lt;` und numerische Referenzen werden vor
  dem Vergleich einmal decodiert; bei der Anzeige wird sämtlicher Text sicher maskiert.
  Unicode-Normalisierung und Leerraum werden vereinheitlicht. Bei Zitaten ab vier
  Wörtern darf zusätzlich das erste oder letzte Wort abweichen (z. B. «Die» statt
  «Diese»), weil das Modell Satzanfänge gelegentlich leicht abändert. Das prüft weder
  die Relevanz des Zitats noch die Wahrheit der Aussage.
- Ein Feld darf mit einem falschen, aber bekannten Schluss-Tag enden
  (beobachtet: `<inhalt-beleg>…</zweck-beleg>`). Unbekannte Tags, fehlende oder
  doppelte Felder bleiben ungültig.
- Modellnoten bleiben unverändert. Fehlende Felder erhalten keine Ersatznoten;
  ungültige oder abgeschnittene Antworten werden markiert.
- Wiederholungen gelten nur für Antworten mit ungültigem Format (fehlende, doppelte
  oder unlesbare Felder), nicht für nicht verifizierte Zitate, Kürzungen oder
  Laufzeitfehler. Nicht verifizierte Zitate werden in der Oberfläche markiert; ein
  zweiter Durchlauf kostet auf integrierter Grafik mehrere Minuten und ändert daran
  selten etwas. Die angezeigte Dauer schliesst Wiederholungen ein.
- Bewertet wird die Beschreibung, nicht die Daten: Eine klar benannte Lücke oder
  fehlende Nachführung kann bei Vollständigkeit gut abschneiden. Die Einschätzung darf
  Stärken nennen; der Verbesserungsvorschlag enthält nur konkrete Ergänzungen und
  bei voller Punktzahl «–», das nicht angezeigt wird.
- Das Eingabebudget nutzt UTF-8-Bytes als konservative Token-Obergrenze mit Antwortreserve.
  Das Modell wird ausdrücklich mit 8192 Kontext-Tokens geladen. Titel und Textfelder
  dürfen zusammen 4500 UTF-8-Bytes enthalten; die Oberfläche zählt den getrimmten Text
  über alle Felder. Das entspricht bei üblichen Texten etwa 3500–4500 Zeichen.
  Anweisungen, Feldbezeichnungen, 256 Tokens für die Chat-Vorlage und die gesamte
  Antwortreserve (1700/700 Tokens) passen zusätzlich in den Kontext.
  Es kann passende Texte zurückweisen, kürzt aber nichts stillschweigend. Diese Annahme
  gilt für die Byte-Tokenisierung des aktuellen Qwen-Modells, nicht für beliebige Modelle.
- Beim Abbrechen wird die Generierung unterbrochen und der Stream bis zum Ende gelesen,
  ohne weiteren Text anzuzeigen. Nur so gibt WebLLM 0.2.80 seine Generierungssperre frei.
  Wird die Abbruchfrist überschritten, verwirft der Client den Worker.

## Kompatibilität

Die Einzeldatei nutzt einen klassischen Blob-Worker: lokale Modul-Worker werden
bei `file://` blockiert. XGrammar-Decodierung bleibt wegen des
[WebLLM-0.2.80-Absturzes](https://github.com/mlc-ai/web-llm/issues/807) deaktiviert;
XML wird über Prompts angefordert und anschliessend validiert.
Nach einem nativen Laufzeitfehler wird der Worker verworfen; erneutes Modell-Laden
startet einen frischen Worker. Die Formulareingaben bleiben erhalten.
