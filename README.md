# V-Planer 1.0 — Final

V-Planer 1.0 ist als responsive PWA für Desktop, Tablet und Smartphone ausgelegt.

## Schwerpunkte
- Aufgaben, Projekte, Kanban, Kalender und Vereinsjahr
- Mitgliederverwaltung mit Geburtstagen, Status, Historie, Zusatzfeldern und Erinnerungen
- Gruppen mit Untergruppen, Funktionen, Trainern/Betreuern, Funktionszeiträumen, Statistiken und automatischen Regeln
- Sitzungen und Beschlüsse
- Vereinswissen
- optionale Dokument-/Bildablage in Google Drive
- ein-/ausblendbare Bereiche Verein und Dokumente
- Warnstufen Hinweis / Warnung / Alarm
- Google-Drive-Synchronisation und lokaler Offline-Zwischenspeicher
- eigenes Speicherlimit und Bildkomprimierung

## Geräte
### Desktop
Feste Seitenleiste, mehrspaltiges Dashboard, Tabellen und Detailansichten.

### Tablet
Reduzierte Seitenleiste, zweispaltige Karten, einspaltige Detailbereiche und Touch-Ziele.

### Smartphone
Untere Schnellnavigation, „Mehr“-Menü für alle Bereiche, mobile Karten statt breiter Tabellen, Vollbild-Dialoge, touchfreundliche Eingaben sowie horizontal bedienbarer Monatskalender.

## GitHub Pages
1. `config.js` öffnen und `GOOGLE_CLIENT_ID` eintragen.
2. Alle Dateien dieses Ordners in das GitHub-Pages-Repository hochladen.
3. Pages auf `main / (root)` belassen.
4. Nach Deployment einmal hart neu laden, damit der neue Service Worker verwendet wird.

## Google OAuth Scopes
- `https://www.googleapis.com/auth/drive.appdata`
- `https://www.googleapis.com/auth/drive.file`

## Datenschutz
Programmcode liegt auf GitHub Pages. Vereinsdaten werden lokal zwischengespeichert und optional über Google Drive synchronisiert. Dokumente/Bilder werden in einem sichtbaren Drive-Ordner abgelegt.

## Google Drive nach einem Seiten-Neuladen

V-Planer speichert aus Sicherheitsgründen **keinen Google Access-Token dauerhaft** im Browser.

Nach einem Neuladen zeigt V-Planer deshalb **„Drive bereit“** statt „Drive verbunden“.
Du musst Google Drive nicht mehr separat verbinden:

1. Auf **„Synchronisieren“** klicken.
2. V-Planer fordert einen neuen kurzlebigen Google-Token an.
3. Bereits erteilte Zustimmung wird wiederverwendet.
4. Der eigentliche Datenabgleich läuft anschließend automatisch weiter.

Je nach Google-/Browser-Sitzung kann kurz eine Google-Kontoauswahl erscheinen. Ein Client-Secret oder dauerhaft gespeicherter Access-Token wird weiterhin nicht verwendet.

## Dokumente löschen

In **Dokumente & Bilder** besitzt jede Datei jetzt eine Aktion **„Löschen“**.

- Vor dem Löschen erscheint eine Sicherheitsabfrage.
- Nach Bestätigung wird die Datei aus V-Planer entfernt.
- Die Datei wird in den **Papierkorb von Google Drive** verschoben und nicht sofort unwiderruflich gelöscht.
- Dadurch kann sie bei einem versehentlichen Löschen noch über Google Drive wiederhergestellt werden.

## Gruppenarten frei konfigurieren

Unter **Einstellungen → Gruppenarten** können die Auswahlwerte für Gruppen individuell verwaltet werden.

- Gruppenarten umbenennen
- beliebig weitere Gruppenarten hinzufügen
- nicht benötigte Gruppenarten entfernen
- Reihenfolge mit ↑ / ↓ ändern
- Reihenfolge wird direkt im Gruppenformular übernommen
- Einstellungen werden zusammen mit den übrigen V-Planer-Einstellungen über Google Drive synchronisiert
- Bereits vorhandene Gruppen werden beim Entfernen einer Gruppenart nicht gelöscht; ihre gespeicherte Bezeichnung bleibt erhalten

## Ordnerstrukturen für Sitzungen, Dokumente und Vereinswissen

Die Bereiche **Sitzungen & Beschlüsse**, **Dokumente & Bilder** und **Vereinswissen** besitzen jetzt eigene Ordnerbäume.

- beliebig viele Ordner und Unterordner
- neue Ordner werden unter dem aktuell geöffneten Ordner angelegt
- Ordner können umbenannt und – wenn leer – mit Sicherheitsabfrage gelöscht werden
- Sitzungen/Beschlüsse und Wissenseinträge können einem Ordner zugeordnet und später über „Bearbeiten“ verschoben werden
- Word-, PDF-, Excel-, PowerPoint-, Bild- und andere Dateien können in allen drei Bereichen hochgeladen werden
- Dateien können später in andere V-Planer-Ordner verschoben werden
- Dateien können mit Sicherheitsabfrage gelöscht werden; in Google Drive werden sie zunächst in den Papierkorb verschoben
- die logische Ordnerstruktur wird in den V-Planer-Daten synchronisiert
- beim Hochladen werden die entsprechenden echten Unterordner auch in Google Drive unter dem V-Planer-Hauptordner angelegt

Bereits vorhandene Dokumente ohne Ordnerzuordnung erscheinen automatisch im Hauptordner **Dokumente & Bilder**.

## Projekte und Projektaufgaben

Der Fortschritt eines Projekts wird jetzt **automatisch aus den zugeordneten Aufgaben berechnet**.

- In jeder Projektkarte gibt es **„+ Aufgabe“**.
- Diese neue Aufgabe wird sofort dem jeweiligen Projekt zugeordnet.
- Die Projektkarte zeigt die Projektaufgaben direkt an.
- Projektaufgaben können dort abgehakt und bearbeitet werden.
- **Gesamtfortschritt = erledigte Projektaufgaben / alle Projektaufgaben**.
- Beispiel: 3 von 4 Aufgaben erledigt = 75 % Fortschritt.
- Jede Aufgabe zählt aktuell gleich stark.
- Aufgaben können weiterhin separat über **Aufgaben → Neue Aufgabe** angelegt werden.
- Bei einer separaten Aufgabe kann optional ein Projekt ausgewählt werden; ohne Projekt bleibt sie eine eigenständige Aufgabe.
- Wird ein Projekt gelöscht, bleiben seine Aufgaben erhalten und werden zu eigenständigen Aufgaben ohne Projekt.

## Termine über mehrere Tage

Kalendertermine unterstützen jetzt einen vollständigen Zeitraum:

- **Von-Datum**
- **Bis-Datum**
- **Von-Uhrzeit**
- **Bis-Uhrzeit**
- eintägige Termine durch identisches Von-/Bis-Datum
- mehrtägige Termine werden an jedem betroffenen Kalendertag angezeigt
- die Terminübersicht zeigt bei mehrtägigen Terminen den gesamten Datumsbereich
- bestehende ältere Termine mit nur `date` und `time` bleiben kompatibel
- bei eintägigen Terminen prüft V-Planer, dass die Bis-Uhrzeit nicht vor der Von-Uhrzeit liegt
- das Bis-Datum darf nicht vor dem Von-Datum liegen

## Interaktive und farbige Termine

Termine können jetzt in **Kalender**, **Übersicht** und **Vereinsjahr** angeklickt werden.

Die Detailansicht zeigt alle gespeicherten Termininformationen:

- Titel
- Gruppe
- Von-Datum und Bis-Datum
- Von-Uhrzeit und Bis-Uhrzeit
- Ort
- gesamten Zeitraum
- Terminfarbe

Von dort kann der Termin **bearbeitet** oder mit Sicherheitsabfrage **gelöscht** werden.

Für die Terminfarbe gibt es zusätzlich zur freien Farbauswahl 10 Vorschläge:
**Blau, Grün, Orange, Rot, Violett, Türkis, Pink, Gelb, Dunkelblau und Grau.**

Im Vereinsjahr werden mehrtägige Termine auch dann in einem Monat angezeigt, wenn sie bereits im vorherigen Monat begonnen haben und in den betreffenden Monat hineinreichen.

## Mitgliedsnummern und Sortierung

Die Mitgliederverwaltung verwendet Mitgliedsnummern jetzt wiederverwendbar:

- Wird ein Mitglied gelöscht, wird seine Mitgliedsnummer wieder frei.
- Bei einem neuen Mitglied schlägt V-Planer automatisch die **kleinste freie numerische Mitgliedsnummer** vor.
- Beispiel: `0001`, `0002`, `0003` sind vergeben und `0002` wird durch Löschen frei → das nächste neue Mitglied erhält als Vorschlag wieder `0002`.
- Eine freie Nummer kann weiterhin manuell eingegeben werden.
- Doppelt vergebene Mitgliedsnummern werden beim Speichern verhindert.
- Gelöschte Mitglieder bleiben technisch als Sync-Tombstone erhalten, ihre Nummer gilt aber für die aktive Mitgliederverwaltung als frei.

Die Mitgliederliste ist außerdem sortierbar. Ein Klick auf eine Spaltenüberschrift schaltet zwischen auf- und absteigender Sortierung um:

- Nummer: klein → groß / groß → klein
- Name: A–Z / Z–A
- Status
- Alter
- Gruppen
- Nächster Termin

Auf Smartphone und Tablet gibt es zusätzlich eine kompakte Sortierauswahl mit separatem Schalter für auf-/absteigend.

## Darstellung skalieren

Unter **Einstellungen → Darstellung & Skalierung** kann die gesamte Oberfläche zwischen **80 % und 125 %** eingestellt werden.

- 80 %, 85 %, 90 %, 95 %, 100 %, 105 %, 110 %, 115 %, 120 % oder 125 %
- Änderung wird während des Schiebens direkt als Vorschau sichtbar
- **Auf 100 % zurücksetzen** stellt die Standardgröße wieder her
- Einstellung wird zusammen mit den übrigen V-Planer-Einstellungen gespeichert und über die Cloud synchronisiert
- responsive Smartphone-/Tablet-Regeln bleiben aktiv

## Backup & Wiederherstellung

Unter **Einstellungen → Backup & Wiederherstellung** gibt es:

- **Backup exportieren**: erzeugt eine JSON-Datei mit dem vollständigen strukturierten V-Planer-Datenbestand
- **Backup importieren**: liest eine zuvor exportierte JSON-Datei ein
- vor einem Import erscheint eine Sicherheitsabfrage mit einer kurzen Inhaltsübersicht
- direkt vor dem Überschreiben wird automatisch noch ein Backup des aktuellen Datenstands heruntergeladen
- ungültige oder unvollständige Backup-Dateien werden abgewiesen
- nach einem Import wird die Oberfläche vollständig neu aufgebaut
- wenn Google Drive verbunden ist, wird der importierte Datenstand anschließend synchronisiert

Im Backup enthalten sind unter anderem Mitglieder, Gruppen, Funktionen, Aufgaben, Projekte, Termine, Sitzungen/Beschlüsse, Vereinswissen, Ordnerstrukturen, Einstellungen, Mitgliedsfotos und Dokument-Metadaten.

Die eigentlichen in Google Drive gespeicherten Word-, PDF-, Excel-, PowerPoint- und Bilddateien werden **nicht doppelt in die JSON-Datei eingebettet**. Sie verbleiben in Google Drive; das Backup enthält deren V-Planer-Verweise und Metadaten.

## Übersicht: Scrollbare Aufgaben und Projekte

Die Bereiche **Anstehende Aufgaben** und **Projekte** auf der Übersicht zeigen ungefähr fünf Einträge gleichzeitig.
Sind mehr Einträge vorhanden, bleibt die Karte gleich hoch und kann vertikal gescrollt werden.

Dadurch wächst die Startseite bei vielen offenen Aufgaben oder Projekten nicht mehr endlos nach unten.

## Aufgaben: Beschreibung und Dateiablage

Aufgaben besitzen jetzt ein zusätzliches Feld **Beschreibung / Notizen**.

Dort können zum Beispiel hinterlegt werden:

- Ablauf und Hintergrundinformationen
- Ansprechpartner
- Links
- Telefonnummern
- Rückmeldungen
- zusätzliche Hinweise zur Durchführung

Nach dem ersten Speichern einer Aufgabe können beim Bearbeiten außerdem Dateien direkt an der Aufgabe abgelegt werden.

Unterstützt werden beispielsweise:

- PDF
- Word
- Excel
- PowerPoint
- Bilder
- sonstige normale Dateien

Die Dateien werden in Google Drive unter **Vereinsplanung → Aufgaben → [Aufgabenname]** abgelegt und in V-Planer direkt an der Aufgabe angezeigt.

Dateien können von dort geöffnet oder mit Sicherheitsabfrage gelöscht werden. Beim Löschen werden sie in den Google-Drive-Papierkorb verschoben.

Die Dateianhänge zählen weiterhin zum konfigurierten V-Planer-Speicherlimit.

## Archiv für Aufgaben und Projekte

Unter **Planung → Archiv** gibt es jetzt einen eigenen Bereich für abgeschlossene Arbeit.

### Aufgaben
- Nur Aufgaben mit Status **Erledigt** können archiviert werden.
- In der Aufgabenliste erscheint bei erledigten Aufgaben die Aktion **Archivieren**.
- Archivierte Aufgaben verschwinden aus Übersicht, Aufgabenliste und Kanban.
- Beschreibungen und Dateianhänge bleiben vollständig erhalten.
- Im Archiv kann eine Aufgabe jederzeit **wiederhergestellt** werden.

### Projekte
- Nur Projekte mit Status **Abgeschlossen** können archiviert werden.
- Ein Projekt kann nur archiviert werden, wenn alle zugehörigen Aufgaben erledigt sind.
- Beim Archivieren werden noch aktive erledigte Projektaufgaben automatisch mit ins Archiv verschoben.
- Aufgaben, die schon vorher separat archiviert wurden, bleiben als separat archiviert gekennzeichnet.
- Beim Wiederherstellen eines Projekts werden nur die Aufgaben automatisch zurückgeholt, die zusammen mit diesem Projekt archiviert wurden.
- Archivierte Projekte verschwinden aus Übersicht und Projektliste.

Archivieren ist kein Löschen: Die Daten bleiben in der V-Planer-Datenbank, im Backup und in der Google-Drive-Synchronisierung erhalten.

## Aufgaben sortieren

Die aktive Aufgabenliste kann jetzt über die Tabellenüberschriften sortiert werden.

Sortierbar sind:

- **Aufgabe** → A–Z / Z–A
- **Projekt** → A–Z / Z–A
- **Gruppe** → A–Z / Z–A
- **Fällig** → früheste zuerst / späteste zuerst
- **Priorität** → niedrig bis hoch / hoch bis niedrig
- **Status** → Offen, In Arbeit, Warten, Erledigt bzw. umgekehrt

Ein erneuter Klick auf dieselbe Spaltenüberschrift kehrt die Sortierrichtung um.

Die Standardsortierung ist **Fälligkeit aufsteigend**, damit die nächsten Aufgaben zuerst erscheinen.

Auf Smartphone und Tablet steht zusätzlich eine kompakte Sortierauswahl mit separatem Auf-/Absteigend-Schalter zur Verfügung.

## Mitglieder sortieren wie Aufgaben

Die Mitgliederliste verwendet jetzt exakt dasselbe Sortierverhalten wie die Aufgabenliste.

Ein Klick auf eine Spaltenüberschrift sortiert die gesamte Liste; ein zweiter Klick auf dieselbe Überschrift dreht die Reihenfolge um.

Sortierbare Mitgliederspalten:

- **Nr.** → klein nach groß / groß nach klein
- **Name** → A–Z / Z–A
- **Status** → Aktiv, Passiv, Deaktiviert, Verstorben / umgekehrt
- **Alter** → jung nach alt / alt nach jung
- **Gruppen** → A–Z / Z–A
- **Nächster Termin** → nächster zuerst / entferntester zuerst

Die aktuell verwendete Spalte zeigt wie bei den Aufgaben direkt einen **↑- oder ↓-Pfeil**.

Auf Smartphone und Tablet bleibt die kompakte Sortierauswahl mit Auf-/Absteigend-Schalter erhalten.
