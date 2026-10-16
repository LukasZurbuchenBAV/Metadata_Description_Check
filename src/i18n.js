import {MODEL_NAME, MODEL_SIZE_LABEL} from './config.js';
export const LI = {de:0, fr:1, it:2};
export const LANG_NAME = {de:'Deutsch', fr:'Französisch', it:'Italienisch'};
const S = MODEL_SIZE_LABEL;
const MSG = {
  loadBtn: [`Modell laden (${MODEL_NAME}, ${S})`, `Charger le modèle (${MODEL_NAME}, ${S})`, `Carica il modello (${MODEL_NAME}, ${S})`],
  hint: [`Das Modell muss beim ersten Mal heruntergeladen werden (${S}). Benötigt WebGPU mit shader-f16 und ca. 3.4 GB GPU-Speicher; bei Speichermangel kann das Laden trotzdem scheitern.`,
         `Le modèle doit être téléchargé la première fois (${S}). Nécessite WebGPU avec shader-f16 et environ 3.4 Go de mémoire GPU ; le chargement peut échouer si la mémoire manque.`,
         `Al primo utilizzo il modello deve essere scaricato (${S}). Richiede WebGPU con shader-f16 e circa 3.4 GB di memoria GPU; il caricamento può fallire se la memoria è insufficiente.`],
  loading: [`Lade Modell ${MODEL_NAME} (${S}, nur beim ersten Mal)…`, `Chargement du modèle ${MODEL_NAME} (${S}, seulement la première fois)…`, `Caricamento del modello ${MODEL_NAME} (${S}, solo la prima volta)…`],
  ready: ['Modell geladen. Bereit.', 'Modèle chargé. Prêt.', 'Modello caricato. Pronto.'],
  loadErr: ['Fehler beim Laden: ', 'Erreur de chargement : ', 'Errore di caricamento: '],
  noGpu: ['Dieser Browser unterstützt WebGPU nicht. Bitte aktuelles Chrome oder Edge (Desktop) verwenden.', 'Ce navigateur ne prend pas en charge WebGPU. Veuillez utiliser Chrome ou Edge (ordinateur) récent.', 'Questo browser non supporta WebGPU. Usa Chrome o Edge (desktop) aggiornato.'],
  noAdapter: ['Es wurde kein WebGPU-fähiger Grafikadapter gefunden. Bitte aktuelles Chrome oder Edge (Desktop) verwenden.', 'Aucune carte graphique compatible WebGPU trouvée. Veuillez utiliser Chrome ou Edge (ordinateur) récent.', 'Nessuna scheda grafica compatibile con WebGPU trovata. Usa Chrome o Edge (desktop) aggiornato.'],
  noF16: ['Deine Grafikkarte bzw. dein Browser unterstützt die benötigte WebGPU-Erweiterung «shader-f16» nicht. Bitte aktuelles Chrome oder Edge (Desktop) mit aktuellem Grafiktreiber verwenden.', 'Votre carte graphique ou navigateur ne prend pas en charge l’extension WebGPU «shader-f16». Utilisez Chrome ou Edge récent avec un pilote graphique à jour.', 'La tua scheda grafica o il browser non supporta l’estensione WebGPU «shader-f16». Usa Chrome o Edge aggiornato con driver grafici aggiornati.'],
  noCheck: ['WebGPU konnte nicht geprüft werden.', 'WebGPU n’a pas pu être vérifié.', 'Impossibile verificare WebGPU.'],
  first: ['Bitte zuerst ein Modell laden.', 'Veuillez d’abord charger un modèle.', 'Carica prima un modello.'],
  working: ['Erzeuge Antwort…', 'Génération de la réponse…', 'Generazione della risposta…'],
  retry: ['Antwort unvollständig – zweiter Versuch…', 'Réponse incomplète – deuxième essai…', 'Risposta incompleta – secondo tentativo…'],
  err: ['Fehler: ', 'Erreur : ', 'Errore: '],
  partial: ['Hinweis: Das Modell hat die Vorgaben nur teilweise eingehalten. Ergebnis mit Vorsicht lesen.', 'Remarque : le modèle n’a respecté les consignes qu’en partie. À lire avec prudence.', 'Nota: il modello ha rispettato le istruzioni solo in parte. Leggere con cautela.'],
  raw: ['Rohantwort des Modells anzeigen', 'Afficher la réponse brute du modèle', 'Mostra la risposta grezza del modello'],
  tip: ['Verbesserung:', 'Amélioration :', 'Miglioramento:'],
  tipDef: ['Verbesserung (Standardhinweis):', 'Amélioration (indication standard) :', 'Miglioramento (indicazione standard):'],
  found: ['Im Text enthalten.', 'Présent dans le texte.', 'Presente nel testo.'],
  none: ['Keine Angabe.', 'Aucune indication.', 'Nessuna indicazione.'],
  src: ['Fundstelle:', 'Passage :', 'Passaggio:'],
  tokens: ['Tokens', 'tokens', 'token'],
  copy: ['In Zwischenablage kopieren', 'Copier dans le presse-papiers', 'Copia negli appunti'],
  copied: ['Kopiert!', 'Copié !', 'Copiato!'],
  trunc: ['Die Antwort des Modells wurde wegen des Längenlimits abgeschnitten, einzelne Kriterien können unvollständig sein. Bitte noch einmal analysieren oder den Text kürzen.', 'La réponse du modèle a été coupée à cause de la limite de longueur ; certains critères peuvent être incomplets. Veuillez relancer l’analyse ou raccourcir le texte.', 'La risposta del modello è stata troncata per il limite di lunghezza; alcuni criteri possono essere incompleti. Rilancia l’analisi o accorcia il testo.'],
  disc: ['Hinweis: Dieses Ergebnis stammt von einer kleinen KI, die lokal in deinem Browser läuft. Sie kann sich irren, Angaben übersehen oder zu streng bzw. zu milde bewerten und liefert nicht bei jedem Durchlauf dasselbe. Bitte als Anregung verstehen und selbst prüfen.',
         'Remarque : ce résultat provient d’une petite IA qui tourne localement dans votre navigateur. Elle peut se tromper, manquer des informations ou évaluer trop sévèrement ou trop généreusement, et ne donne pas toujours le même résultat. À considérer comme une suggestion, à vérifier soi-même.',
         'Nota: questo risultato proviene da una piccola IA che gira localmente nel browser. Può sbagliare, trascurare informazioni o valutare in modo troppo severo o troppo indulgente e non dà sempre lo stesso risultato. Da intendere come suggerimento, da verificare personalmente.'],
  unavailable: ['Kriterium unvollständig – keine Bewertung verfügbar.', 'Critère incomplet – évaluation indisponible.', 'Criterio incompleto – valutazione non disponibile.'],
  unverified: ['Fundstelle nicht verifiziert; Bewertung des Modells ungeprüft.', 'Passage non vérifié ; évaluation du modèle non vérifiée.', 'Passaggio non verificato; valutazione del modello non verificata.'],
  finished: ['Bearbeitung beendet. Ergebnis unten prüfen.', 'Traitement terminé. Vérifiez le résultat ci-dessous.', 'Elaborazione terminata. Controlla il risultato qui sotto.'],
  empty: ['Bitte eine Beschreibung bzw. mindestens ein inhaltliches Feld ausfüllen.', 'Veuillez saisir une description ou au moins un champ de contenu.', 'Inserisci una descrizione o almeno un campo di contenuto.'],
  budget: ['Eingabe zu lang für das 4096-Token-Kontextfenster (konservative UTF-8-Obergrenze inklusive Antwortreserve). Bitte Text kürzen.', 'Texte trop long pour le contexte de 4096 tokens (borne UTF-8 prudente, réponse réservée). Veuillez raccourcir le texte.', 'Testo troppo lungo per il contesto di 4096 token (limite UTF-8 prudente con spazio per la risposta). Accorcia il testo.'],
  cancelled: ['Abgebrochen.', 'Annulé.', 'Annullato.'],
  cancel: ['Abbrechen', 'Annuler', 'Annulla'],
  copyErr: ['Kopieren fehlgeschlagen. Bitte Text manuell kopieren.', 'Échec de la copie. Copiez le texte manuellement.', 'Copia non riuscita. Copia il testo manualmente.'],
  dur: ['Dauer', 'Durée', 'Durata']
};
export const message = (key, lang) => MSG[key][LI[lang]];

export const UI = {
  'Beschreibungen für Open-Government-Datensätze prüfen und entwerfen – die Eingaben werden lokal im Browser verarbeitet. Für Software und Modell-Downloads werden externe Dienste kontaktiert.': ['Vérifier et rédiger des descriptions OGD – les saisies sont traitées localement dans le navigateur. Des services externes sont contactés pour télécharger le logiciel et le modèle.', 'Verificare e redigere descrizioni OGD – i dati inseriti sono elaborati localmente nel browser. Servizi esterni vengono contattati per scaricare software e modello.'],
  'Beschreibung analysieren': ['Analyser la description', 'Analizza la descrizione'],
  'Beschreibung generieren': ['Générer la description', 'Genera la descrizione'],
  'Titel des Datensatzes': ['Titre du jeu de données', 'Titolo del set di dati'],
  'Bestehende Beschreibung': ['Description existante', 'Descrizione esistente'],
  'Zweck': ['But', 'Scopo'], 'Inhalt': ['Contenu', 'Contenuto'],
  'Erhebung / Quelle': ['Collecte / Source', 'Rilevazione / Fonte'],
  'Vollständigkeit und Aktualität': ['Complétude et actualité', 'Completezza e attualità'],
  'Interpretation': ['Interprétation', 'Interpretazione'],
  'Räumlicher Bezug': ['Référence spatiale', 'Riferimento spaziale'],
  'Läuft vollständig client-seitig über': ['Fonctionne entièrement côté client via', 'Funziona interamente lato client tramite'],
  '. Keine API-Keys, keine Server-Kosten. Nach dem Vorbild von': ['. Pas de clés API, pas de frais de serveur. Inspiré de', '. Nessuna chiave API, nessun costo di server. Ispirato a'],
  '(MIT-Lizenz).': ['(licence MIT).', '(licenza MIT).']
};
export const PH = {
  analyzeTitle: [`p. ex. Trafic combiné transalpin : volumes et comptes de résultats`, `ad es. Traffico combinato attraverso le Alpi: quantità e conti economici`],
  title: [`p. ex. Trafic combiné transalpin : volumes et comptes de résultats`, `ad es. Traffico combinato attraverso le Alpi: quantità e conti economici`],
  existing: [`p. ex. Les données servent à calculer les indemnités d’exploitation du trafic combiné non accompagné à travers les Alpes. La base légale est la loi sur le transfert du transport de marchandises…`, `ad es. I dati servono a calcolare le indennità d’esercizio del traffico combinato non accompagnato attraverso le Alpi. La base legale è la legge sul trasferimento del traffico merci…`],
  purpose: [`p. ex. Calcul des indemnités d’exploitation du trafic combiné non accompagné à travers les Alpes`, `ad es. Calcolo delle indennità d’esercizio del traffico combinato non accompagnato attraverso le Alpi`],
  content: [`p. ex. Quantités prévues et effectives (nombre de trains, d’envois) et comptes de résultats par relation`, `ad es. Quantità previste ed effettive (numero di treni, di spedizioni) e conti economici per relazione`],
  source: [`p. ex. Saisies par les opérateurs du trafic combiné ; base légale : loi sur le transfert du transport de marchandises`, `ad es. Inseriti dagli operatori del traffico combinato; base legale: legge sul trasferimento del traffico merci`],
  completeness: [`p. ex. Mise à jour annuelle ; modifications de la collecte consignées par année de rapport`, `ad es. Aggiornamento annuale; modifiche della rilevazione annotate per anno di riferimento`],
  interpretation: [`p. ex. Uniquement les trafics donnant droit à une indemnité ; aucune conclusion sur l’ensemble du trafic marchandises ferroviaire`, `ad es. Solo i traffici con diritto a indennità; nessuna conclusione sull’intero traffico merci ferroviario`],
  spatial: [`p. ex. Trafic transalpin via les axes du Gothard et du Lötschberg-Simplon, par relation`, `ad es. Traffico attraverso le Alpi sugli assi del Gottardo e del Lötschberg-Sempione, per relazione`]
};
export const TITLES = ['MetaFairy – Datensatzbeschreibungen lokal mit KI','MetaFairy – descriptions de jeux de données, en local avec l’IA','MetaFairy – descrizioni di set di dati, in locale con l’IA'];

export const AXL = {
  de: ['Titel','Zweck','Inhalt','Erhebung / Quelle','Vollständigkeit','Interpretation','Räumlicher Bezug'],
  fr: ['Titre','But','Contenu','Collecte / Source','Complétude','Interprétation','Référence spatiale'],
  it: ['Titolo','Scopo','Contenuto','Rilevazione / Fonte','Completezza','Interpretazione','Riferimento spaziale']
};
export const OPEN = {de:'Der Datensatz enthält', fr:'Le jeu de données contient', it:'Il set di dati contiene'};
