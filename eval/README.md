# Manuelle Modell-Evaluation

`cases.json` enthält je einen vollständigen und einen bewusst knappen Datensatz
auf Deutsch, Französisch und Italienisch. Die Daten sind synthetisch. Bei den
vollständigen Fällen prüfen insbesondere negative Aussagen mit «Keine», «Pas de»
und «Nessuna», ob echte Einschränkungen als Fundstellen erkannt werden.
`expectedEvidence` enthält Referenzstellen; andere wörtliche, inhaltlich passende
Zitate sind ebenfalls zulässig. `null` bedeutet: zu diesem Kriterium fehlt eine Angabe.
Die Referenzen sind keine erwarteten Modellnoten.

App per HTTP(S) auf einem geeigneten WebGPU-System öffnen. Das Modell für diesen
Lauf nicht über den App-Knopf laden; der Runner lädt es selbst. Dann in der Browser-Konsole:

```js
const {runEvaluation} = await import('./eval/run.js');
const controller = new AbortController();
const report = await runEvaluation({
  repeats: 3,
  // Für einen kurzen Probelauf: ids: ['de-sparse'], repeats: 1
  signal: controller.signal
});
// Zum Abbrechen während des Laufs: controller.abort()
// Ergebnis lokal exportieren, z. B. über die copy()-Funktion der Chrome-Konsole:
copy(JSON.stringify(report, null, 2));
```

Die App während der Evaluation nicht gleichzeitig zur Inferenz verwenden: die
Evaluation besitzt einen eigenen Worker und benötigt zusätzlichen GPU-Speicher.
Ein kompletter Lauf führt 36 Generierungen durch und kann lange dauern. Jeder
Fall wird ohne automatische Wiederholung bei ungültigem Format ausgewertet,
damit die Erstversuchs-Zuverlässigkeit messbar bleibt. Modell, Bibliotheksversion,
Zeitpunkt, Laufzeit, Rohtext, Kürzung und Validierung werden protokolliert.

Für eine Änderung an Modell, Prompt oder Laufzeit jeweils vorher/nachher vergleichen:

- Vollständigkeit aller sieben Kriterien und vier Felder je Kriterium.
- Nicht belegte Fundstellen, `falseMissing` und `unsupportedPresence`.
- Schwankung der unveränderten Modellnoten pro Kriterium über die Wiederholungen.
- Sprache, sachliche Richtigkeit und Nützlichkeit der Tipps durch Menschen prüfen.
- Generierte Beschreibungen Satz für Satz gegen die Eingabefelder prüfen:
  keine erfundenen Orte, Erhebungsmethoden, Zeitangaben oder Aussagen zur Vollständigkeit.
- Format, Kürzungen und Laufzeiten der beiden Modi vergleichen.

Automatische Kennzahlen prüfen Struktur und Textbelege. Sie beweisen weder
inhaltliche Relevanz eines Zitats noch die Wahrheit einer Aussage. Auch der kleine
synthetische Datensatz ersetzt keine Prüfung mit realen Metadaten.

`npm test` prüft die Referenzen und Kontextbudgets ohne Modell-Download. Es führt
keine Modell-Evaluation aus. Ergebnisse eines GPU-Laufs werden nicht vorgetäuscht.
