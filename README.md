# V-Planer 2.2.1

V-Planer ist eine responsive Vereinsverwaltung als statische PWA für Smartphone, Tablet und Desktop.

## Schwerpunkte in 2.2.1

- Fehlerbehebung: Die Einstellungsreiter `Allgemein`, `Verein`, `Darstellung`, `Daten & Sicherung` und `Erweitert` reagieren wieder korrekt.
- Fehlerbehebung: Der Strafen-/Finanzbereich verwendet wieder einen gültigen Euro-Formatter und kann den Gesamtrender nicht mehr abbrechen.
- Aufräumen: Nicht mehr verwendete JavaScript-Logik der alten mobilen Kalender-Agenda sowie CSS-Reste der früheren Aufgaben-Dateianhänge wurden entfernt.
- Smoke-Test über alle Hauptbereiche, Einstellungsreiter, Aufgabenarchiv, Mitgliederarchiv, Projekt-Sortierung, Kalender-Sync-Schalter und Erstellungsdialoge ohne Laufzeitfehler.
- Technischer Aufräumschritt: nicht mehr verwendete Bereiche für Sitzungen/Beschlüsse, interne Dokumente, Vereinswissen, Haushalte und generische Verknüpfungen wurden aus dem aktiven Datenmodell entfernt.
- Google Drive synchronisiert den V-Planer-Datenbestand über den versteckten `appDataFolder`. Ein sichtbarer Drive-Ordner `Vereinsplanung` wird nicht mehr verwendet.
- Google Kalender ist optional und **standardmäßig ausgeschaltet**. Er wird erst aktiviert, nachdem der Schalter unter `Einstellungen > Erweitert` eingeschaltet und `Einstellungen speichern` ausgeführt wurde.
- Ist Kalender-Sync aus, zeigt die Synchronisationskachel auf der Übersicht ausschließlich Google Drive und synchronisiert keine Kalenderdaten. Bereits vorhandene Google-Kalendereinträge werden dadurch nicht gelöscht.
- Aufgaben mit Status `Erledigt` zeigen unmittelbar die Aktion `Archivieren`. Archivierte Aufgaben erscheinen im zentralen Archiv.
- Das Archiv bündelt archivierte Projekte, archivierte Aufgaben und ausgetretene Mitglieder. Kalenderhistorie bleibt im Kalender, Finanzstände bleiben unter Finanzen und Funktionshistorien in den jeweiligen Vereinsdaten.
- Die Mitglieder-Kennzahl auf der Übersicht zeigt groß alle **nicht ausgetretenen** Mitglieder und darunter, wie viele davon aktiv sind.
- Ausgetretene Mitglieder werden aus der normalen Mitgliederübersicht ausgeblendet und im Archiv geführt.

## Datenmodell

Der aktive Datenbestand umfasst insbesondere:

- Aufgaben
- Projekte
- Termine
- Mitglieder
- Gruppen
- Funktionen
- Strafen
- Finanz-Snapshots aus KassenKumpel
- Einstellungen und Jahresnotizen
- Schichtpläne innerhalb der Projekte

Nicht mehr genutzte Altbereiche werden beim Normalisieren des Datenbestands verworfen, damit sie nicht dauerhaft im aktiven JSON weitergeschleppt werden.

## Synchronisation

### Google Drive

Drive ist die zentrale Datensynchronisation. Nach erfolgreicher Verbindung wird der Datenbestand als App-Daten in Google Drive gespeichert. Die App benötigt dafür keinen sichtbaren Vereinsordner.

### Google Kalender

Der Kalender-Sync ist bewusst opt-in:

1. `Einstellungen > Erweitert` öffnen.
2. `Google Kalender synchronisieren` einschalten.
3. `Einstellungen speichern` drücken.
4. Beim nächsten Sync gegebenenfalls die Google-Kalenderberechtigung bestätigen.

Nur nach Schritt 3 ist der Kalender-Sync aktiv. Das bloße Anzeigen oder Umschalten des Reglers speichert noch nichts. Wird der Regler später ausgeschaltet und gespeichert, stoppt der Kalender-Sync; vorhandene Einträge im Google Kalender werden nicht automatisch gelöscht.

## Finanzen

V-Planer zeigt die aus KassenKumpel importierten Finanzstände ausschließlich lesend an. Details zum Import stehen in `KASSENKUMPEL_IMPORT.md`.

## Migration

Vor einem Versionswechsel empfiehlt sich ein Export/Backup des vorhandenen V-Planer-Datenstands. Hinweise zur Bereinigung aus älteren Versionen stehen in `MIGRATION_2.0.md`.
