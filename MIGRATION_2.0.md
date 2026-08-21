# Migration auf V-Planer 2.2.0

## Vor dem Update

Vor dem Wechsel auf 2.2.0 wird ein aktuelles Backup des bisherigen V-Planer-Datenbestands empfohlen.

## Was übernommen wird

Die für das heutige Programm relevanten Kerndaten bleiben erhalten:

- Aufgaben und deren Archivstatus
- Projekte und deren Archivstatus
- Termine
- Mitglieder
- Gruppen und Funktionen
- Strafen
- Finanz-Snapshots
- Einstellungen, Jahresnotizen und weitere aktuelle Programmdaten
- Schichtpläne und Termin-Projekt-Zuordnungen

## Was bereinigt wird

Nicht mehr verwendete interne Systeme aus älteren Versionen werden aus dem aktiven Datenmodell entfernt. Dazu gehören insbesondere alte Daten für:

- Sitzungen und Beschlüsse
- interne Dokumentverwaltung
- Vereinswissen
- Datei-/Ordnerstrukturen und generische Verknüpfungen
- Haushalte und alte Beziehungsmodelle

Der frühere sichtbare Google-Drive-Ordner `Vereinsplanung` ist für 2.2.0 nicht erforderlich. Der aktuelle Drive-Sync verwendet den versteckten `appDataFolder`.

## Google Kalender nach dem Update

Der neue Schalter `Google Kalender synchronisieren` startet bei bisherigen Datenbeständen standardmäßig **Aus**, sofern die Einstellung nicht bereits explizit durch eine 2.2.x-Version gespeichert wurde.

Der Kalender wird erst synchronisiert, wenn der Schalter unter `Einstellungen > Erweitert` eingeschaltet und anschließend `Einstellungen speichern` gedrückt wurde. Bei ausgeschaltetem Kalender-Sync läuft nur Google Drive. Bereits vorhandene Google-Kalendereinträge werden nicht gelöscht.

## Archiv

- archivierte Projekte → Archiv > Projekte
- archivierte erledigte Aufgaben → Archiv > Aufgaben
- Mitglieder mit Status `Ausgetreten` → Archiv > Mitglieder

Ausgetretene Mitglieder werden nicht gelöscht. Sie können im Archiv bearbeitet oder wieder aufgenommen werden.
