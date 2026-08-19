# V-Planer 2.1.2


## Änderungen in 2.1.2

- Terminerstellung und Terminbearbeitung verwenden nur noch 10 feste Farbkacheln.
- Die Palette besteht aus 5 kräftigen Farben und 5 passenden Pastelltönen.
- Freie Farbauswahl, Farbnamen und Farbcodes sind in der Terminmaske nicht mehr sichtbar.
- Alle Farbkacheln sind gleich groß und die gewählte Farbe wird nur über die Auswahlmarkierung hervorgehoben.

## Änderungen in 2.1.1

- Schichtplan standardmäßig chronologisch **nach Zeit** sortiert; gleiche Startzeiten stehen direkt untereinander.
- Alternative Ansicht **Nach Bereich** bleibt verfügbar.
- Schichten werden über ein einziges Feld **Bereich / Aufgabe** erfasst; separate Bereichsverwaltung entfällt in der Oberfläche.
- Zeitangaben unterstützen **Von – Bis**, **ab** und **jederzeit**. Über-Mitternacht-Schichten wie 23:00–02:00 sind möglich.
- PDF-Export ist auf die kompakte Verteilansicht reduziert: Zeit, Bereich / Aufgabe und eingeteilte Personen; bei Gesamtterminen zusätzlich Projekt.
- PDF-Ausgaben enthalten einen Datenstand.

## Änderungen in 2.1.0

- Schichtplan als eigener Tab innerhalb jedes Projekts
- frei definierbare Bereiche wie Theke, Einlass, Aufbau oder Grill
- Schichten mit Datum, Uhrzeit, Aufgabe, Soll-Besetzung, Mitgliedern und Notiz
- Ansichten „Nach Bereich“ und „Nach Person“
- Warnung bei zeitlichen Doppelbelegungen eines Mitglieds – auch projektübergreifend
- zusammengefasste Schichtübersicht im übergeordneten Termin
- echter PDF-Download für den Schichtplan eines Projekts oder des gesamten Termins
- geschlossene/archivierte Projekte bleiben im Schichtplan schreibgeschützt, PDF-Export bleibt möglich

## Änderungen in 2.0.8

- Im Bereich **Gruppen & Funktionen** verwendet **+ Funktion** jetzt denselben farbigen Primärbutton-Stil wie **+ Gruppe**.

- Finanzkopf optisch entzerrt: großzügigere Abstände, klare Datenquelle, eigene Statuszeile und separat ausgerichtete Importaktion.
- Redundanter Untertitel im Seitenkopf Finanzen entfernt.
- Finanzkennzahlen mit konsistenteren Kartenabständen.

- Einstellungsbereich optisch an die restliche V-Planer-Oberfläche angeglichen.
- Einheitliche Feldhöhen und Eingabestile auch für Datum und E-Mail.
- Vereinsdaten in ein ruhiges, responsives Zwei-Spalten-Raster überführt.
- Abstände, Kartenbreite, Navigation und Speicherbutton vereinheitlicht.

## Ziel der Version 2.0

Die Anwendung wurde auf die tatsaechlich benoetigten Bereiche reduziert. Fachliche Daten werden nur an einer Stelle gepflegt und in anderen Bereichen nur angezeigt oder gefiltert.

### Navigation

- Uebersicht
- Aufgaben (Liste | Kanban)
- Projekte
- Kalender
- Vereinsjahr
- Archiv
- Mitglieder
- Gruppen & Funktionen
- Finanzen
- Strafen
- Papierkorb
- Einstellungen

Die bisherigen Bereiche Sitzungen & Beschluesse, Dokumente und Vereinswissen sind aus der normalen Oberflaeche entfernt. Vorhandene Altdaten werden bei einer Migration nicht automatisch geloescht.

## Wichtige Aenderungen

### Uebersicht

- Ein zentraler Google-Sync-Bereich steuert Google Drive und Google Kalender.
- Der globale Sync-Button in der Kopfzeile ist entfernt/ausgeblendet.
- Runde Geburtstage und Jubilaeen koennen nur im oberen Hinweisbereich ausgeblendet werden.
- Die normalen Geburtstags- und Jubilaeumslisten bleiben davon unberuehrt.

### Aufgaben

- Status: Offen, In Bearbeitung, Erledigt.
- Umschaltung Liste | Kanban im selben Bereich.
- Drag & Drop im Kanban aktualisiert denselben Aufgabenstatus.
- Gruppe ohne spezielle Zuordnung heisst Gesamtverein.
- Keine Dateien, Bueroklammern oder allgemeinen Verknuepfungen.

### Projekte

- Status: Geplant, Aktiv, Abgeschlossen; Archivierung wird separat ueber `archivedAt` gefuehrt.
- Projektansicht: Uebersicht, Aufgaben, Termine, Notizen.
- Keine Projektdateien.
- Ein Projekt kann bewusst trotz offener Aufgaben abgeschlossen oder archiviert werden (mit Warnung).
- Archivierte Projekte sind schreibgeschuetzt.
- Beim Loeschen eines Projekts gehen die Projektaufgaben gemeinsam in den Papierkorb.
- Historische Termine bleiben erhalten.

### Kalender

- Zeigt nur echte Termine, Geburtstage und Jubilaeen.
- Aufgaben und Faelligkeiten werden nicht im Kalender dargestellt.
- Ansichten: Monat, Woche, Tag, Liste.
- Optionale Projekt- und Gruppenzuordnung.
- Wiederkehrende Termine und Drag & Drop werden unterstuetzt.
- V-Planer ist fuer den aktuellen Sync das fuehrende Kalendersystem: V-Planer -> Google Kalender.

### Vereinsjahr

- Automatische Jahresuebersicht aus Terminen, Projekten und Mitgliedsdaten.
- Keine parallele Termin-/Projekt-/Aufgabenverwaltung.
- Eine einfache Jahresnotiz pro Jahr.

### Archiv

- Projektbezogene historische Ablage.
- Archivieren ist nicht Loeschen.
- Wiederherstellung als Geplant, Aktiv oder Abgeschlossen.
- Historische Termine bleiben im Kalender und archivierte Projekte im Vereinsjahr sichtbar.

### Mitglieder

- Zentrale Datenquelle fuer Geburtstage und Vereinsjubilaeen.
- Status: Aktiv, Passiv, Ausgetreten, Verstorben.
- Ehrenmitglied ist eine Zusatzkennzeichnung.
- Keine Haushalte, Mitgliederbeziehungen oder digitale Mitgliedskarte in der normalen Oberflaeche.
- Import/Export bleibt erhalten; Haushaltsfelder werden in Version 2.0 nicht mehr angeboten.

### Gruppen & Funktionen

- Gruppen bilden organisatorische Zugehoerigkeit ab.
- Funktionen bilden Rollen innerhalb einer Gruppe ab.
- Funktionen koennen zeitlich dokumentiert werden.
- Gesamtverein ist keine Pflichtgruppe fuer Mitglieder.

### Finanzen

- V-Planer fuehrt keine eigene Buchhaltung mehr.
- Der lokale KassenKumpel des Kassenwarts bleibt das fuehrende Finanzsystem.
- V-Planer importiert KassenKumpel-Finanz-Snapshots als JSON und zeigt sie nur lesend an.
- Keine einzelnen Buchungen oder Belege werden importiert.

Siehe `KASSENKUMPEL_IMPORT.md`.

### Papierkorb

- Normales Loeschen fuehrt in den Papierkorb.
- Wiederherstellen oder endgueltig loeschen.
- Keine automatische zeitgesteuerte Loeschung.

### Einstellungen

Die sichtbaren Einstellungen sind auf folgende Bereiche reduziert:

- Allgemein
- Verein
- Darstellung
- Daten & Sicherung
- Erweitert

Google Drive und Google Kalender werden nicht mehr in den Einstellungen verbunden, sondern ausschliesslich auf der Uebersicht.

## Google-Verbindung

In `config.js` muss fuer Google-Funktionen eine passende Google OAuth Client-ID gesetzt werden:

```js
window.VP_CONFIG = {
  GOOGLE_CLIENT_ID: "DEINE_CLIENT_ID",
  APP_NAME: "V-Planer",
  ROOT_FOLDER_NAME: "Vereinsplanung",
  DEFAULT_STORAGE_LIMIT_GB: 5,
  AUTO_SYNC_SECONDS: 30
};
```

Ohne Client-ID funktioniert V-Planer weiterhin lokal; Google Drive und Google Kalender bleiben dann nicht verbunden.

## Datenmigration von 1.8.0

V-Planer 2.1.1 verwendet weiterhin den vorhandenen lokalen Datenbestand (`v-planer-cloud-v1.0`) und migriert relevante Statuswerte beim Laden:

- Aufgabe `wait` -> `open`
- Projekt `paused` -> `active`
- Mitglied `inactive` -> `exited`

Entfernte Altbereiche werden nicht automatisch physisch aus alten Datenbanken geloescht. Sie werden in Version 2.0 nur nicht mehr als aktive Fachbereiche angeboten.

Vor dem produktiven Wechsel wird trotzdem eine vollstaendige Sicherung der bisherigen V-Planer-Daten empfohlen.

## Strafen

Der Bereich Strafen wurde in diesem Konsolidierungsschritt bewusst aus Version 1.8.0 uebernommen. Er wurde noch nicht inhaltlich neu konzipiert.

## Technischer Aufbau

- statische HTML/CSS/JavaScript-PWA
- lokale Datenhaltung im Browser
- optionaler Google-Drive-Sync
- optionaler Google-Kalender-Sync
- Service Worker fuer PWA-Cache
- kein eigener Server fuer die Kernanwendung erforderlich

## Änderungen in 2.0.8
- Bereich „Gruppen & Funktionen“ optisch vereinheitlicht.
- Erklär- und Hilfeblöcke bei Funktionen entfernt.
- Gruppenliste zeigt Name und Mitgliederzahl in ruhigen Listenzeilen.
- Gruppendetails zeigen Funktionen und Mitglieder klar getrennt.
- Funktionen verwenden eine einheitliche Listenansicht mit Suche, Zeitraumfilter und Status.
- Allgemeine Büroklammer-/Verknüpfungsanzeige in der Funktionsansicht entfernt.


## V-Planer 2.1.3

- Veralteten Hinweisblock „Noch kein Termin verknüpft“ aus allen Projektkarten entfernt.
- Die Terminzuordnung bleibt in der Projektbearbeitung und den Termindetails erhalten.
- Statusfilter Geplant/Aktiv/Abgeschlossen/Alle beeinflussen nur noch die Projektauswahl und erzeugen keine zusätzlichen Termin-Hinweise mehr.


## V-Planer 2.1.4

- Projekte werden in der Projektübersicht automatisch nach Fälligkeit sortiert.
- Bei gleicher Fälligkeit entscheidet die im Projekt unter „Termin“ hinterlegte Von-Uhrzeit über die Reihenfolge.
- Projekte mit konkreter Startzeit stehen am selben Tag vor Projekten ohne Uhrzeit.
- Dieselbe Sortierung gilt auf der Übersicht bei „Aktive Projekte“, ohne die bestehende Anzeige zu verändern.

## V-Planer 2.1.5

- Google Drive und Google Kalender verwenden nach der Verbindung einen gemeinsamen Google-OAuth-Ablauf.
- Der automatische Hintergrundabgleich synchronisiert waehrend einer aktiven Google-Sitzung jetzt sowohl Drive als auch Kalender im eingestellten Intervall.
- Lokale Aenderungen an Terminen stossen weiterhin kurzfristig einen Kalenderabgleich an.
- Die ID des von V-Planer angelegten Google-Kalenders wird nun zusaetzlich im Drive-synchronisierten V-Planer-Datenbestand gespeichert.
- Weitere Browser/Tabs/Geraete koennen dadurch denselben vorhandenen V-Planer-Kalender wiederverwenden, statt bei fehlender lokaler ID einen weiteren Kalender anzulegen.
- Vor einer Neuanlage wird jede bekannte Kalender-ID validiert. Erst wenn kein bekannter Kalender mehr existiert, wird ein neuer V-Planer-Kalender angelegt.
- Wenn der V-Planer-Kalender in Google manuell geloescht wurde, wird beim naechsten erfolgreichen Sync genau ein neuer Kalender erzeugt und dessen ID wieder zentral gespeichert.
- Drive-Synchronisationen speichern nun ebenfalls einen sichtbaren Zeitstempel fuer den letzten erfolgreichen Abgleich.

Hinweis: Die statische Browser-App verwendet das Google Identity Services Token-Modell. Nach einem vollstaendigen Neuladen/Neustart oder nach Ablauf des Google-Zugriffstokens kann Google aus Sicherheitsgruenden erneut eine Nutzergeste verlangen. Danach laufen Drive und Kalender wieder automatisch gemeinsam weiter.


## V-Planer 2.1.6

- Alle Hinweisbanner im oberen Bereich der Übersicht können jetzt einzeln über „×“ ausgeblendet werden.
- Dies gilt neben Geburtstagen und Jubiläen auch für Hinweise zu überfälligen Aufgaben und Projekten kurz vor dem Projektende.
- Das Ausblenden betrifft ausschließlich den Hinweisbanner; die zugehörigen Aufgaben, Projekte und sonstigen Inhalte bleiben unverändert sichtbar.
- Projektende-Hinweise bleiben für die aktuell betroffenen Projekte ausgeblendet, bis sich die betroffene Projektmenge ändert oder der relevante Zeitraum endet.
- Ein ausgeblendeter Überfällig-Hinweis erscheint wieder, sobald sich die Menge der überfälligen Aufgaben ändert.
