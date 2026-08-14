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
