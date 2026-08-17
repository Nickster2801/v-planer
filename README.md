# V-Planer 1.8.0 — Übersicht, Funktionen, Einstellungen & Bedienbarkeit

V-Planer 1.8.0 ist als responsive PWA für Desktop, Tablet und Smartphone ausgelegt.

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

## Korrektur: Terminbearbeitung

Die Terminbearbeitung wurde gegen einen Synchronisations-Randfall abgesichert.

Zuvor konnte eine im Detailfenster gehaltene Termin-Referenz veralten, wenn Google Drive währenddessen den internen Datenbestand neu zusammengeführt hat. In diesem Fall konnte der Bearbeitungsdialog zwar gespeichert werden, aber der aktuelle Termin-Datensatz erhielt die Änderungen nicht zuverlässig.

Jetzt gilt:

- beim Öffnen von **Bearbeiten** wird der Termin erneut über seine eindeutige ID aus dem aktuellen Datenbestand geladen
- direkt beim Speichern wird der Termin nochmals über seine ID aufgelöst
- Datum, Uhrzeiten, Titel, Ort, Gruppe und Farbe werden auf dem aktuellen Datensatz gespeichert
- danach werden Kalender, Vereinsjahr, Übersicht und Terminlisten aus genau diesem Datenstand neu gerendert
- bei exakt identischen Sync-Zeitstempeln behält der lokale Datensatz Vorrang, damit eine gerade vorgenommene Änderung nicht durch eine gleich alte Cloud-Kopie zurückgesetzt wird
- nach dem Speichern findet zusätzlich eine kleine Konsistenzprüfung statt


## Finanzen

V-Planer besitzt jetzt einen neuen Hauptbereich **Finanzen**. Er kann unter **Einstellungen → Module** ein- oder ausgeschaltet werden, ohne Daten zu löschen.

### KassenKumpel
Der bereitgestellte **KassenKumpel 1.1.1** wurde als Finanzmodul integriert und für die V-Planer-Oberfläche angepasst.

- Kassenbuch / Buchungen
- Vereinskonto und Barkasse
- Belege
- Kassenabschlüsse
- Auswertungen und Jahresvergleich
- Einstellungen und bestehende KassenKumpel-Funktionen bleiben erhalten
- im eingebetteten Betrieb verwendet KassenKumpel die blaue/grüne V-Planer-Designsprache
- die strukturierten Kassendaten werden an den V-Planer-Datenbestand gespiegelt und dadurch in dessen Google-Drive-Datensynchronisierung einbezogen
- die eigentlichen Belegdateien bleiben weiterhin im lokalen Belegspeicher des KassenKumpels; seine eigenen Beleg-/Backupfunktionen bleiben dafür bestehen

### Strafen
Strafen sind direkt mit V-Planer-Mitgliedern verknüpft.

Gespeichert werden Mitglied, Datum, Fälligkeit, Grund, Betrag, Status, Bezahldatum und Notizen. Status: **Offen**, **Bezahlt** oder **Erlassen**. Die Tabelle ist sortier- und filterbar.

## Aufgaben und Projekte im Kalender

Der Kalender zeigt zusätzlich zu Terminen und Geburtstagen jetzt:

- **Aufgaben** an ihrem Fälligkeitsdatum, violett mit ✓
- **Projekte** an ihrem Zieldatum, türkis mit ◆
- archivierte Aufgaben und Projekte werden nicht angezeigt
- erledigte, aber noch nicht archivierte Aufgaben bleiben sichtbar und werden optisch abgeschwächt
- abgeschlossene, aber noch nicht archivierte Projekte bleiben sichtbar und werden optisch abgeschwächt
- ein Klick auf eine Aufgabe öffnet direkt die Aufgabenbearbeitung
- ein Klick auf ein Projekt öffnet direkt die Projektbearbeitung
- in der rechten Kalenderliste werden kommende Termine, Aufgaben und Projektziele gemeinsam chronologisch angezeigt

## Überarbeitete Kalenderoptik

Die Monatsansicht wurde kompakter und klassischer aufgebaut:

- vorheriger und nächster Monat werden in den Randfeldern dezent mit Tagesnummern eingeblendet
- dadurch entstehen keine großen scheinbar leeren Flächen am Monatsanfang
- alle sechs Kalenderwochen haben eine einheitliche kompakte Höhe
- Wochenenden sind leicht abgesetzt
- der aktuelle Tag wird klar hervorgehoben
- **Heute** springt jederzeit in den aktuellen Monat zurück
- Aufgaben, Projekte, Termine und Geburtstage haben eine kleine Legende
- pro Tag werden maximal drei Arbeits-/Termineinträge direkt angezeigt; weitere werden als „+ n weitere“ zusammengefasst
- die rechte Spalte heißt jetzt **Nächste Einträge** und enthält weiterhin Termine, Aufgaben, Projekte und Geburtstage

## Korrektur: KassenKumpel-Einstellungen

Im eingebetteten KassenKumpel waren die Einstellungen zunächst nicht sichtbar, weil die originale KassenKumpel-Kopfzeile im V-Planer-Modus komplett ausgeblendet wurde. In dieser Kopfzeile befand sich auch das Einstellungs-Zahnrad.

Das wurde korrigiert:

- im V-Planer-Modus erscheint jetzt eine kompakte KassenKumpel-Kopfzeile
- die **Jahresauswahl** ist wieder sichtbar
- der Status eines abgeschlossenen Jahres bleibt sichtbar
- das **Einstellungs-Zahnrad** ist wieder erreichbar
- zusätzlich gibt es in der KassenKumpel-Navigation einen eigenen Reiter **⚙ Einstellungen**
- alle bestehenden KassenKumpel-Einstellungen wie Konten, Kategorien, Veranstaltungen, Ansicht/Skalierung, Belegspeicher, Jahresverwaltung, Backups und weitere Verwaltungsfunktionen bleiben erreichbar

## Google-Kalender-Synchronisierung

Unter **Einstellungen → Google Kalender** kann V-Planer vollständig in beide Richtungen mit dem eigens angelegten Google-Kalender synchronisiert werden.

### Funktionsweise
- V-Planer legt beim ersten Sync einen eigenen sekundären Google-Kalender **„V-Planer“** an.
- Termine werden mit Start-/Enddatum und Von-/Bis-Uhrzeit übertragen.
- Termine ohne Uhrzeit werden als ganztägige Google-Kalender-Einträge angelegt.
- Aufgaben werden am Fälligkeitsdatum als ganztägiger Eintrag angelegt.
- Projekte werden am Zieldatum als ganztägiger Eintrag angelegt.
- Änderungen in V-Planer aktualisieren den bestehenden Google-Kalender-Eintrag.
- Gelöschte Termine sowie gelöschte oder archivierte Aufgaben/Projekte werden beim nächsten Sync aus dem V-Planer-Google-Kalender entfernt.
- Änderungen direkt im von V-Planer angelegten Google-Kalender werden beim nächsten Sync zurück in V-Planer übernommen. Neue Google-Termine werden als V-Planer-Termine angelegt.
- Die Verbindung ist pro Browser/Nutzer lokal. Es wird bewusst kein Google-Access-Token dauerhaft gespeichert.

### Google Cloud
Für die bestehende OAuth-Web-Client-ID muss im gleichen Google-Cloud-Projekt zusätzlich die **Google Calendar API** aktiviert werden.

V-Planer verwendet den eingeschränkten Scope:

`https://www.googleapis.com/auth/calendar.app.created`

Dieser Scope erlaubt der Anwendung, eigene sekundäre Kalender zu erstellen und die Termine in diesen von der Anwendung erstellten Kalendern zu verwalten.

### Nach einem Browser-Neustart
Aus Sicherheitsgründen wird der Google-Access-Token nicht im Browser gespeichert. Bereits synchronisierte Termine bleiben natürlich im Google Kalender. Um neue Änderungen nach einem Neustart zu übertragen, genügt ein Klick auf **„Erneut verbinden & synchronisieren“**.


## Neu in 1.0.1: Zwei-Wege-Kalender und kompletter Ordner-Upload

### Google Kalender – Zwei-Wege-Synchronisierung
- Änderungen an V-Planer-Terminen werden zu Google Kalender übertragen.
- Änderungen an bereits synchronisierten Google-Terminen werden zurück nach V-Planer übernommen.
- Neue Termine, die direkt im eigens von V-Planer angelegten Google-Kalender erstellt werden, werden als V-Planer-Termine importiert.
- Löschungen werden in beide Richtungen abgeglichen; bei gleichzeitigen Änderungen gewinnt der zeitlich neuere Stand.
- Aufgaben und Projekte werden ebenfalls in beide Richtungen für Titel und Fälligkeitsdatum abgeglichen.
- Wiederkehrende Google-Serientermine werden aktuell nicht automatisch in Einzeltermine umgewandelt und beim Sync als übersprungen gemeldet.
- Die vorhandenen Drive- und lokalen Daten bleiben kompatibel; Speicher- und AppData-Schlüssel wurden bewusst nicht umbenannt.

### Ganze Ordner hochladen
In **Sitzungen & Beschlüsse**, **Dokumente & Bilder** und **Vereinswissen** gibt es zusätzlich **„Ordner hochladen“**.

- Unterordner werden anhand des vom Browser gelieferten relativen Pfads automatisch angelegt.
- Dieselbe Struktur wird unter dem jeweiligen V-Planer-Bereich in Google Drive erstellt.
- Der Upload startet im aktuell geöffneten V-Planer-Ordner.
- Bereits vorhandene gleichnamige Dateien werden erkannt; vor einer weiteren gleichnamigen Kopie fragt V-Planer nach.
- Während des Uploads wird der Fortschritt angezeigt.
- Browser ohne Unterstützung für `webkitdirectory` können weiterhin einzelne oder mehrere Dateien hochladen.


## Neu in 1.0.2: Ehrenmitglieder

- Mitglieder können in der Mitgliederübersicht nach Ehrenmitgliedern gefiltert werden.
- Ehrenmitglieder werden in der Mitgliederliste deutlich gekennzeichnet.
- In den Einstellungen kann optional festgelegt werden, dass Ehrenmitglieder automatisch als beitragsfrei gelten.
- Der Beitragsstatus wird in den Mitgliedsdetails angezeigt.
- Die Einstellung ist rein organisatorisch; sie erzeugt keine automatischen Bank- oder Kassenbuchungen.
- Bestehende Daten bleiben kompatibel; die neue Einstellung ist standardmäßig deaktiviert.


## Neu in 1.0.3: vollständiges Vereinsjahr

Der Reiter **Vereinsjahr** zeigt jetzt ohne Begrenzung alle datumsbezogenen Einträge des ausgewählten Jahres:

- normale Termine, auch mehrtägige Termine
- Geburtstage aller lebenden Mitglieder
- 5-jährige Vereinsjubiläen (5, 10, 15, … Jahre)
- fällige Aufgaben
- Projekt-Zieldaten

Über die Pfeile kann direkt zwischen den Jahren gewechselt werden. Ein Klick auf einen Eintrag öffnet den zugehörigen Termin, die Aufgabe, das Projekt oder Mitglied.


## Neu in 1.0.4: Strafkatalog und offene Zahlungen

- Unter **Strafen** gibt es den Button **Strafen bearbeiten**. Dort werden wiederkehrende Strafen mit Bezeichnung und Betrag als Vorlagen gepflegt.
- Beim Anlegen einer neuen Strafe kann eine Vorlage ausgewählt werden; Grund und Betrag werden automatisch übernommen und können bei Bedarf angepasst werden.
- Über das Lupensymbol neben der Mitgliedsauswahl lässt sich nach Name, Mitgliedsnummer oder E-Mail suchen.
- Offene Strafen sind in der Übersicht deutlicher als **Offen / zu bezahlen** gekennzeichnet; überfällige Einträge werden entsprechend markiert.
- Oberhalb der Tabelle erscheint bei offenen Strafen eine Zusammenfassung aus Anzahl und noch offenem Gesamtbetrag.
- Bestehende Daten bleiben kompatibel. Der Strafkatalog wird ergänzend in den Einstellungen gespeichert.

## Strafkatalog

Unter **Finanzen → Strafen** befindet sich jetzt der Button **📋 Strafkatalog**.

Im Strafkatalog werden alle angelegten Strafarten mit Bezeichnung, Standardbetrag und Anzahl der bisherigen Verwendungen angezeigt. Jede Strafart kann einzeln **bearbeitet** oder **gelöscht** werden. Neue Strafarten werden direkt über **+ Neue Strafe** angelegt.

Bereits an Mitglieder vergebene Strafen bleiben beim Bearbeiten oder Löschen eines Katalogeintrags unverändert. Der Katalog dient damit als Vorlage für neue Strafen, ohne historische Einträge rückwirkend zu verändern.

Beim Erstellen einer neuen Strafe kann weiterhin direkt eine Strafart aus dem Katalog gewählt werden; Bezeichnung und Betrag werden automatisch übernommen.

## Mehrtägige Projekte

Projekte besitzen jetzt einen **Projektzeitraum mit Von- und Bis-Datum**.

- Ein eintägiges Projekt verwendet für Von und Bis dasselbe Datum.
- Ein mehrtägiges Projekt wird im Monatskalender an jedem betroffenen Tag angezeigt.
- Im Vereinsjahr erscheint das Projekt in jedem Monat, den der Projektzeitraum berührt.
- Projektkarten, Dashboard und Archiv zeigen den vollständigen Zeitraum.
- Der Google-Kalender-Sync überträgt Projekte als ganztägige Einträge über den gesamten Projektzeitraum.
- Wird ein synchronisiertes Projekt im Google Kalender zeitlich verschoben, kann der dortige Start-/Endzeitraum wieder in V-Planer übernommen werden, soweit die bestehende Kalender-Synchronisierung dies zulässt.
- Bestehende Projekte mit nur einem alten `due`-/Zieldatum bleiben kompatibel und werden automatisch als eintägige Projekte behandelt.

Intern bleibt `due` aus Kompatibilitätsgründen erhalten und entspricht bei neuen/aktualisierten Projekten dem Bis-/Enddatum.

## Geburtstage & Jubiläen auf der Übersicht

Die Dashboard-Karte **Geburtstage & Jubiläen** zeigt jetzt eine gemeinsame chronologische Liste.

- Geburtstage und wichtige Vereinsjubiläen werden miteinander nach dem tatsächlichen nächsten Datum sortiert.
- Es werden die **nächsten 8 Ereignisse insgesamt** angezeigt – unabhängig davon, ob es ein Geburtstag oder ein Jubiläum ist.
- Jeder Eintrag zeigt Datum, Anlass und Abstand in Tagen.
- Bei Geburtstagen wird zusätzlich das kommende Alter angezeigt.
- Bei Jubiläen wird die Jubiläumsdauer angezeigt.
- Ein Klick auf den Eintrag öffnet direkt das betreffende Mitglied.

Die Kennzahl **Geburtstage** oben auf der Übersicht zählt weiterhin gezielt die Geburtstage der nächsten 7 Tage.

### Konfigurierbare Jubiläumsjahre

Unter **Einstellungen → Erinnerungen** gibt es das Feld **Wichtige Jubiläumsjahre**. Standardmäßig sind eingestellt:

`10, 20, 25, 30, 40, 50`

Die Werte können frei geändert werden, zum Beispiel auf `10, 25, 40, 50, 60`. Nur diese Eintrittsjubiläen werden als wichtige Jubiläen auf der Übersicht und im Vereinsjahr berücksichtigt. Bereits vorhandene Mitgliedsdaten müssen dafür nicht geändert werden.

## Nächster Geburtstag auf dem Dashboard

Die bisherige Kennzahl **„Geburtstage in den nächsten 7 Tagen“** wurde ersetzt.

Die obere Dashboard-Karte zeigt jetzt immer den **nächsten anstehenden Geburtstag**, unabhängig davon, wie weit dieser entfernt ist:

- `Heute`
- `Morgen`
- `in 18 Tagen`
- darunter Name, genaues Datum und kommendes Alter

Die Karte kann angeklickt bzw. angetippt werden und öffnet direkt das betreffende Mitglied.

Die separate Erinnerungslogik für Geburtstage innerhalb der nächsten 7 Tage bleibt bestehen. Sie dient weiterhin nur für Warn-/Hinweismeldungen und beeinflusst nicht die Anzeige des nächsten Geburtstags.

## Kanban: automatische Sortierung nach Fälligkeit

Innerhalb jeder Kanban-Spalte werden Aufgaben jetzt automatisch nach zeitlicher Dringlichkeit sortiert:

1. überfällige Aufgaben
2. heute fällige Aufgaben
3. morgen fällige Aufgaben
4. Aufgaben innerhalb der nächsten 7 Tage
5. später fällige Aufgaben
6. Aufgaben ohne Fälligkeitsdatum

Innerhalb derselben Fälligkeit entscheidet anschließend die Priorität **Hoch → Mittel → Niedrig**. Erst danach wird alphabetisch nach Aufgabentitel sortiert.

Die Fälligkeit wird direkt auf der Kanban-Karte hervorgehoben, zum Beispiel als **Heute**, **Morgen**, **in 4 Tagen** oder **3 Tage überfällig**. Das genaue Datum bleibt zusätzlich sichtbar.

Das Verschieben zwischen Kanban-Spalten per Drag & Drop bleibt unverändert erhalten. Nach einem Statuswechsel wird die Karte automatisch an der passenden zeitlichen Position der neuen Spalte einsortiert.

## Projekte und Termine klar getrennt und verknüpft

V-Planer unterscheidet jetzt bewusst zwischen **Projekt** und **Termin**:

- **Projekt:** Organisations- und Arbeitsphase mit Projektbeginn, Projektende, Aufgaben, Status und Fortschritt.
- **Termin:** das tatsächliche Ereignis mit Datum, Uhrzeit, Ort und optionalen Hinweisen.

Auf jeder Projektkarte gibt es einen Bereich **Zugehöriger Termin**. Über **+ Termin zum Projekt** kann direkt ein Termin angelegt werden. Dabei werden Projektname, Gruppe und Beschreibung übernommen; als Termindatum wird zunächst das Projektende vorgeschlagen.

Bestehende freie Termine können beim Bearbeiten eines Projekts verknüpft werden. Umgekehrt besitzt der Termin das Feld **Zugehöriges Projekt**. In den Termindetails steht bei einer Verbindung **Gehört zu Projekt**.

Projekt und Termin bleiben getrennte Datensätze. Die Verbindung kann jederzeit gelöst werden, ohne einen der Datensätze zu löschen. Wird ein Projekt gelöscht, bleibt der verknüpfte Termin erhalten. Wird ein Termin gelöscht, bleibt das Projekt erhalten.

Die Google-Kalender-Beschreibung zeigt bei verknüpften Einträgen zusätzlich den Projekt-/Terminbezug.

## Strafkatalog – überarbeiteter Bedienablauf

Der Strafkatalog wurde für einen einfacheren Arbeitsablauf überarbeitet.

- **+ Neue Strafe** öffnet kein zweites Dialogfenster mehr, sondern eine kompakte Eingabe direkt im Strafkatalog.
- Nach **Strafe hinzufügen** wird die Eingabe sofort geschlossen und der neue Eintrag direkt in der Liste angezeigt und kurz hervorgehoben.
- Beim Bearbeiten verhält es sich genauso: speichern → Eingabe schließt → aktualisierte Zeile bleibt sichtbar.
- **Abbrechen** schließt nur die Eingabe; der Strafkatalog bleibt geöffnet.
- Eine Suche filtert den Katalog direkt nach Bezeichnung oder Betrag.
- Neue Katalogeinträge stehen beim nächsten Öffnen von **Neue Strafe** sofort in der Katalogauswahl zur Verfügung.
- Löschen aktualisiert die Liste unmittelbar. Bereits vergebene Strafen bleiben weiterhin historisch unverändert.
- Auf Smartphone und Tablet sind Eingaben und Aktionsbuttons touchfreundlich ausgelegt.

Damit gibt es beim Anlegen/Bearbeiten keinen unnötigen Wechsel mehr zwischen zwei Dialogfenstern.

## Google-Kalender-Sync: Fehlerbehebung

Ein Fehler beim Starten des Kalender-Syncs wurde behoben:

`can't access property "checked", $(...) is null`

Ursache war, dass der JavaScript-Code die Checkbox `calendarSyncBirthdays` verwendet hat, diese im Einstellungs-HTML aber nicht vorhanden war.

Behoben wurde:
- sichtbare Einstellung **Geburtstage synchronisieren**
- fehlertolerantes Lesen der Kalender-Checkboxen
- fehlertolerantes Befüllen der Kalender-Einstellungen
- der Sync bricht nicht mehr ab, nur weil ein optionales Einstellungsfeld fehlt
- Geburtstage können separat für Google Kalender aktiviert/deaktiviert werden

Der OAuth-Scope bleibt:
`https://www.googleapis.com/auth/calendar.app.created`

Hinweis: Die Korrektur behebt den lokalen JavaScript-Absturz. Ob die Google Calendar API im Google-Cloud-Projekt korrekt aktiviert ist und die OAuth-Freigabe funktioniert, muss weiterhin im echten Browser/Google-Konto getestet werden.

## Export in Sitzungen, Dokumenten und Vereinswissen

In **Sitzungen & Beschlüsse**, **Dokumente & Bilder** und **Vereinswissen** können Dateien und Ordner jetzt exportiert werden.

- Bei jeder Datei gibt es **Exportieren**. Die Datei wird direkt aus Google Drive geladen.
- Im aktuellen Ordner gibt es **Ordner exportieren**.
- Im Hauptordner heißt die Aktion **Bereich exportieren** und exportiert den gesamten Bereich.
- Ordnerexporte werden als ZIP erstellt und behalten die Unterordnerstruktur bei.
- V-Planer-eigene Sitzungs-/Beschlusseinträge und Vereinswissenseinträge werden im ZIP zusätzlich als lesbare TXT-Dateien abgelegt.
- Der Export löscht oder verändert keine Daten in V-Planer oder Google Drive.
- Ist der Drive-Token abgelaufen, wird beim manuellen Export die bestehende Drive-Anmeldung erneut verwendet.

Der ZIP-Export wird lokal im Browser erstellt. Bei Exporten über ca. 250 MB erscheint deshalb vorher ein Hinweis zum Arbeitsspeicher.

### Dokumente & Bilder

Die Kategorie **Quittungen** wurde aus diesem Bereich entfernt. Bei neuen Uploads stehen nur noch **Protokolle**, **Dokumente** und **Bilder** zur Auswahl. Bereits vorhandene ältere Dateien mit der Kategorie „Quittungen“ werden nicht gelöscht oder automatisch umkategorisiert.

## Runde Geburtstage

Unter **Einstellungen → Warnungen & Erinnerungen** gibt es jetzt:
- **Runde Geburtstage hervorheben**
- frei konfigurierbare **Runde Geburtstagsalter**

Standardmäßig: `20, 30, 40, 50, 60, 70, 80, 90, 100`.

Runde Geburtstage werden auf der Übersicht mit 🎉 und dem Hinweis **Runder Geburtstag** hervorgehoben. In den nächsten 30 Tagen anstehende runde Geburtstage erscheinen außerdem im Hinweisstreifen. Das Vereinsjahr markiert sie ebenfalls besonders.

## Explorer-Ordnerstruktur

Die Ordnerbäume in **Sitzungen & Beschlüsse**, **Dokumente & Bilder** und **Vereinswissen** verhalten sich jetzt ähnlich wie der Windows-Explorer.

- Ordner mit Unterordnern besitzen links einen Pfeil.
- Der Pfeil klappt ausschließlich die Unterordner ein oder aus.
- Ein Klick auf den Ordnernamen öffnet weiterhin den Ordner.
- Der aktuell geöffnete Pfad wird automatisch aufgeklappt.
- Auf Smartphone und Tablet sind die Auf-/Zuklappflächen vergrößert.

### Rekursives Löschen

Wird ein Ordner gelöscht, wird jetzt der **gesamte darunterliegende Ordnerbaum** gelöscht.

Die Sicherheitsabfrage zeigt vorher an:
- Anzahl der Unterordner
- Anzahl der Dateien
- Anzahl der betroffenen Sitzungs-/Beschluss- bzw. Vereinswissenseinträge

Dateien und Drive-Ordner werden in den Google-Drive-Papierkorb verschoben. Die zugehörigen V-Planer-Datensätze werden als gelöscht markiert. Dadurch bleiben keine verwaisten Unterordner oder Dateiverweise zurück.

## Dokumente & Bilder als neutrales Dateiarchiv

Der Bereich **Dokumente & Bilder** verwendet keine zusätzlichen Kategorien mehr. Die bisherige Trennung in Protokolle, Dokumente und Bilder wurde aus der Oberfläche entfernt.

Die Organisation erfolgt jetzt ausschließlich über:
- Ordner und Unterordner
- Explorer-artiges Ein-/Ausklappen
- Suche im aktuell geöffneten Ordner
- Datei öffnen, exportieren, verschieben und löschen
- Ordner-/Bereichsexport

Bereits vorhandene Dateien behalten ihre bisherigen Metadaten, damit keine Daten verloren gehen. Die alte Kategorie wird in der Oberfläche aber nicht mehr zur Organisation verwendet.

## Vereinswissen mit Dokumenten verknüpfen

Wissenseinträge können jetzt mehrere Dateien aus **Dokumente & Bilder** referenzieren.

Beim Erstellen oder Bearbeiten eines Wissenseintrags gibt es den Bereich **Zugehörige Dokumente** mit Suchfeld und Mehrfachauswahl. Die Dateien werden nicht kopiert oder dupliziert.

Auf einer Wissenskarte werden verknüpfte Dokumente direkt angezeigt und können geöffnet oder exportiert werden.

Wird nur die Verknüpfung entfernt, bleibt die Datei im Dokumentenarchiv erhalten. Wird eine Datei selbst gelöscht, entfernt V-Planer automatisch alle Verweise auf diese Datei aus dem Vereinswissen.

In **Dokumente & Bilder** wird bei einer Datei außerdem angezeigt, wie oft sie im Vereinswissen verknüpft ist.

## V-Planer 1.4.0 – Vereinsstammdaten

Der Einstellungsbereich **Vereinsdaten** wurde zu einer zentralen Stammdatenverwaltung erweitert.

Enthalten sind:
- offizieller Vereinsname und Kurzname
- komprimiertes Vereinslogo
- Gründungsdatum und Rechtsform
- Vereinsanschrift
- E-Mail, Telefon und Website
- Vereinsregister-Nummer und Registergericht
- Steuernummer und zuständiges Finanzamt
- Geschäftsjahr von/bis
- Vereinsheim bzw. Standardort mit eigener Anschrift
- Vereinsbeschreibung und interne Hinweise
- Verknüpfungen zu den bestehenden Funktionen für Vorsitz, Schriftführung und Kasse

Die verantwortlichen Personen werden **nicht doppelt gespeichert**. Die Stammdaten verweisen auf bereits vorhandene Funktionen. Wechselt die besetzte Person einer Funktion, bleibt die Verknüpfung zur Funktion bestehen.

Die bisherige Angabe **Eigene Rolle** wurde in eine separate Karte **Eigenes Profil** verschoben, weil sie zum Benutzer und nicht zu den Vereinsstammdaten gehört.

Das Vereinslogo und der Kurzname werden bereits auf der digitalen Mitgliedskarte verwendet.

### Kompatibilität

Bestehende Datenbanken werden automatisch normalisiert. Die bisherigen Felder `clubName` und `userRole` bleiben aus Kompatibilitätsgründen erhalten. Google-Drive-Storage-Key und AppData-Dateiname bleiben ebenfalls unverändert, damit bestehende Cloud-Daten ohne Migration weiterverwendet werden können.

## V-Planer 1.5.0 – Suche, Verknüpfungen & Papierkorb

### Zentrale Suche
Die Suche in der oberen Leiste durchsucht bereichsübergreifend:
- Aufgaben
- Projekte
- Termine
- Mitglieder
- Gruppen
- Funktionen
- Sitzungen & Beschlüsse
- Dokumente & Bilder
- Vereinswissen
- Strafen

Treffer öffnen direkt den passenden Datensatz. Auf dem Smartphone wird die Suche über die Lupe geöffnet. `Strg+K` bzw. `Cmd+K` fokussiert die Suche auf Desktop-Geräten.

### Allgemeines Verknüpfungssystem
Aufgaben, Projekte, Termine, Mitglieder, Gruppen, Funktionen, Sitzungen, Dokumente, Vereinswissen und Strafen können miteinander verknüpft werden.

Bereits vorhandene Spezialbeziehungen werden weiterverwendet:
- Projekt ↔ Termin
- Projekt ↔ Aufgaben
- Vereinswissen ↔ Dokumente

Damit entstehen keine doppelten Datensätze. Zusätzliche Beziehungen werden in der Collection `links` gespeichert.

### Papierkorb
Gelöschte Datensätze werden zunächst im V-Planer-Papierkorb angezeigt und können wiederhergestellt oder endgültig gelöscht werden.

Bei rekursiv gelöschten Ordnern bzw. Gruppen werden zusammengehörige Inhalte über eine Lösch-Batch-ID gemeinsam behandelt. Dateien und Ordner werden beim Wiederherstellen nach Möglichkeit auch aus dem Google-Drive-Papierkorb zurückgeholt.

Beim endgültigen Löschen bleiben intern minimale Tombstones mit `deletedAt`/`purgedAt` erhalten. Dadurch kann ein älterer Cloud-Stand einen endgültig gelöschten Datensatz nicht unbeabsichtigt wiederherstellen.

## V-Planer 1.6.0 – Mitgliederbeziehungen & Datenaustausch

### Echte Mitgliederbeziehungen
Beziehungen werden strukturiert zwischen zwei Mitgliedern gespeichert, z. B.:
- Mutter / Vater / Elternteil
- Kind
- Partner/in
- Geschwister
- gesetzliche Vertretung
- sonstige Beziehung

Die Gegenbeziehung wird automatisch gesetzt. Bestehender alter Freitext bleibt lesbar, damit keine Altinformationen verloren gehen.

### Haushalte
Mitglieder können einem gemeinsamen Haushalt zugeordnet werden. Ein Haushalt besitzt:
- Namen
- optionale gemeinsame Anschrift
- mehrere zugeordnete Mitglieder

### CSV-/Excel-Import
Der Mitgliederimport unterstützt `.csv` und `.xlsx`:
1. Datei auswählen
2. Spalten automatisch erkennen bzw. manuell zuordnen
3. Vorschau prüfen
4. optional bestehende Mitglieder aktualisieren
5. Import ausführen

Vor jedem tatsächlichen Import erzeugt V-Planer automatisch ein Sicherheitsbackup. Dubletten werden zuerst über die Mitgliedsnummer und anschließend über Name + Geburtsdatum erkannt.

Der XLSX-Import nutzt Browserfunktionen zum Lesen des OpenXML-ZIP-Formats. Falls ein älterer Browser die benötigte Dekomprimierung nicht unterstützt, kann derselbe Datenbestand als CSV importiert werden.

### Mitgliederexport
Mitglieder können als:
- Excel `.xlsx`
- CSV `.csv`

exportiert werden. Es lassen sich alle Mitglieder oder nur die aktuell gefilterte Liste sowie die gewünschten Felder auswählen. Die Excel-Datei enthält eine formatierte Kopfzeile, sinnvolle Spaltenbreiten und eine fixierte erste Zeile.

## V-Planer 1.7.0 – Smartphone & Kalender-Agenda

Auf kleinen Displays startet der Kalender standardmäßig in einer Agenda-Ansicht. Dort werden Termine, Aufgaben, Projekte, Geburtstage, runde Geburtstage und konfigurierte Vereinsjubiläen chronologisch dargestellt.

Über **Agenda | Monat** kann jederzeit in den bisherigen Monatskalender gewechselt werden. Die Auswahl wird lokal gespeichert.

Weitere mobile Verbesserungen:
- Mitgliederliste als Kartenansicht
- Aufgabenliste als Kartenansicht
- Vollbild-Dialoge
- touchfreundliche Aktionsflächen
- mobile globale Suche
- responsive Papierkorb-, Verknüpfungs-, Import- und Exportdialoge

Der 42-Zellen-Monatskalender für Desktop/Tablet bleibt vollständig erhalten.

## Technischer Hinweis zu Google APIs
Die Änderungen wurden statisch und syntaktisch geprüft. Live-Zugriffe gegen das konkrete Google-Drive- bzw. Google-Kalender-Konto sind Bestandteil des späteren Praxistests im realen Deployment und werden hier nicht als erfolgreich getestet behauptet.

## V-Planer 1.8.0 – Übersicht & Bedienbarkeit

### Übersicht
- Die Kennzahlen **Offene Aufgaben**, **Aktive Projekte** und **Mitglieder** sind jetzt direkt anklickbar und führen in den jeweiligen Bereich.
- Die bisherige Kennzahl **Nächster Geburtstag** wurde entfernt. Geburtstage und Jubiläen bleiben in der ausführlicheren Karte darunter sichtbar.
- Hinweise zu **runden Geburtstagen** und **Vereinsjubiläen** können über `×` aus der Übersicht ausgeblendet werden. Das Ausblenden betrifft nur die Übersicht und verändert keine Mitgliedsdaten, Geburtstage oder Jubiläen.
- Auch die kompakten Sonderhinweise im oberen Hinweisbereich lassen sich für den jeweiligen Zeitraum schließen.

### Verknüpfungen aufgeräumt
Das allgemeine Verknüpfungssystem bleibt technisch erhalten, damit bereits angelegte Beziehungen nicht verloren gehen. Die vielen ausgeschriebenen **„Verknüpfen“**-Schaltflächen wurden jedoch aus der Oberfläche entfernt.

Stattdessen gibt es an den betreffenden Stellen nur noch eine kompakte **Büroklammer `📎`**. Eine kleine Zahl an der Büroklammer zeigt vorhandene Verknüpfungen. Erst beim Anklicken öffnet sich der Verknüpfungsdialog.

Die etablierten Fachverknüpfungen bleiben unverändert, insbesondere:
- Projekt ↔ Termin
- Projekt ↔ Aufgaben
- Vereinswissen ↔ Dokumente

### Funktionen & Ämter überarbeitet
Der Bereich **Gruppen** heißt jetzt **Gruppen & Funktionen**. Funktionen sind keine Benutzerrechte, sondern Ämter bzw. Zuständigkeiten, z. B. Vorsitz, Kassenwart, Trainer, Betreuer oder Ansprechpartner.

Neu ist eine eigene Übersicht **Funktionen & Ämter** mit:
- verständlicher Erklärung des Einsatzzwecks
- Suche nach Funktion oder Person
- Filter Aktuell / Künftig / Früher / Unbesetzt
- direktem Bearbeiten und Löschen jeder Funktion
- klarer Kennzeichnung des Zeitraums und der zugeordneten Person
- Plausibilitätsprüfung für Beginn und Ende

Künftige Funktionen werden nicht mehr versehentlich als aktuell gezählt. Die Vereinsdaten können weiterhin aktuelle Funktionen für Vorsitz, Schriftführung und Kasse referenzieren.

### Speicher & Sync in Einstellungen
Der eigenständige Navigationspunkt **Speicher & Sync** wurde entfernt. Speicherübersicht, Google-Drive-Verbindung, Synchronisierung, Speicherlimit und Bildkomprimierung befinden sich jetzt gemeinsam unter:

**Einstellungen → Speicher & Sync**

Der Sync-Status und die manuelle Synchronisierung in der oberen Leiste bleiben für den schnellen Zugriff erhalten.

### Einstellungen neu gegliedert
Die Einstellungen sind nicht mehr eine einzige lange Seite. Auf Desktop/Tablet gibt es links ein eigenes Untermenü mit:
- Vereinsdaten
- Verein & Mitglieder
- Darstellung & Bereiche
- Erinnerungen
- Google Kalender
- Speicher & Sync
- Backup & Daten

Das linke Menü kann eingeklappt werden. Auf Smartphones wird daraus ein platzsparendes aufklappbares Auswahlmenü.

### Bedienbarkeitsprüfung
Für 1.8.0 wurde zusätzlich eine statische UI-Prüfung durchgeführt. Kontrolliert wurden u. a.:
- eindeutige HTML-IDs
- JavaScript-Selektoren gegen vorhandene statische oder dynamisch erzeugte Felder
- statische Buttons auf erreichbare Event-Handler bzw. deklarative Aktionen
- Formulareingaben auf JavaScript-Anbindung
- sichtbare Such-/Filterfelder auf Beschriftung bzw. `aria-label`
- JavaScript-Syntax
- Erhalt der bestehenden Drive-/Kalender-Konfiguration und des eingebetteten KassenKumpel

Details stehen in `USABILITY_AUDIT.md`.
