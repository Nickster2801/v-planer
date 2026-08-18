# V-Planer 2.0.0

V-Planer 2.0.0 ist die konsolidierte Version der Vereinsplanung. Die Anwendung bleibt eine statische PWA und kann weiterhin z. B. ueber GitHub Pages bereitgestellt werden.

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

V-Planer 2.0.0 verwendet weiterhin den vorhandenen lokalen Datenbestand (`v-planer-cloud-v1.0`) und migriert relevante Statuswerte beim Laden:

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
