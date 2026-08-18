# Migration auf V-Planer 2.0.0

## Vorher sichern

Vor dem Ersetzen einer produktiv verwendeten 1.8.0-Version zuerst unter Einstellungen eine vollstaendige V-Planer-Sicherung herunterladen.

## Bestehende Browserdaten

V-Planer 2.0.0 liest weiterhin den bisherigen lokalen Speicher. Die Migration geschieht beim Start der Anwendung. Die alten Bereiche Dokumente, Vereinswissen sowie Sitzungen & Beschluesse werden nicht in der Navigation angezeigt, vorhandene Datensaetze werden aber nicht automatisch geloescht.

## Statusmigration

- Aufgaben: `wait` wird zu `open`.
- Projekte: `paused` wird zu `active`.
- Mitglieder: `inactive` wird zu `exited`.

## Projekte und Papierkorb

Wird ein Projekt in 2.0.0 geloescht, werden seine Projektaufgaben als zusammengehoerige Loeschung mitgefuehrt. Eine Wiederherstellung stellt diese Datensaetze gemeinsam wieder her. Bei archivierten Projekten bleibt der Archivzustand waehrend des Papierkorb-Zyklus erhalten.

Historische Kalendertermine werden bei der Projektarchivierung nicht geloescht.

## Google

Die OAuth Client-ID bleibt in `config.js`. Beim ersten produktiven Test nach dem Update Drive und Kalender ueber den zentralen Sync-Bereich auf der Uebersicht pruefen.
