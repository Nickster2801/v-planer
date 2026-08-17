# V-Planer 1.8.0 – Bedienbarkeits- und Funktionsprüfung

Stand: V-Planer 1.8.0

## Ergebnis

Für den statisch prüfbaren Teil der App wurden keine verwaisten Standard-Bedienelemente gefunden.

Geprüft wurden insbesondere:

- **0 doppelte HTML-IDs** im Produktions-`index.html`.
- **0 fehlende DOM-Ziele** für direkte JavaScript-Selektoren der Form `$("#...")`. Statische und in Dialogen dynamisch erzeugte IDs wurden gemeinsam berücksichtigt.
- **0 statische Formularfelder ohne JavaScript-Bezug**: alle statischen Inputs, Selects und Textareas mit ID werden im App-Code verwendet.
- **0 sichtbare Such-/Filter-/Formularfelder ohne Beschriftung** nach Ergänzung der fehlenden `aria-label`-Angaben.
- **0 statische Buttons ohne erkennbaren Auslöseweg**: Buttons arbeiten entweder über einen direkten ID-Handler oder über die vorhandenen deklarativen `data-*`-Handler, z. B. `data-view`, `data-go`, `data-action`, Sortierung oder Kalenderansicht.
- `node --check app.js` ist ohne Syntaxfehler durchgelaufen.

## Im Zuge der Prüfung angepasst

### Übersicht

- Offene Aufgaben, Aktive Projekte und Mitglieder sind echte klick-/tastaturbedienbare Kennzahl-Buttons.
- Die separate Kennzahl „Nächster Geburtstag“ wurde entfernt.
- Runde Geburtstage und Jubiläen können ausschließlich aus der Übersicht ausgeblendet werden, ohne den zugrunde liegenden Datensatz zu verändern.

### Verknüpfungen

- Die ausgeschriebenen Verknüpfungsaktionen wurden aus den Listen entfernt.
- Das bestehende Verknüpfungssystem bleibt aus Kompatibilitätsgründen erhalten und ist über die kompakte Büroklammer `📎` erreichbar.
- Eine Zahl an der Büroklammer zeigt vorhandene Verknüpfungen.

### Funktionen & Ämter

- Funktionen sind jetzt ohne Umweg über eine bestimmte Gruppe in einer eigenen Gesamtübersicht erreichbar.
- Bearbeiten und Löschen sind direkt aus dieser Übersicht möglich.
- Es gibt eine Erklärung, dass Funktionen Ämter/Zuständigkeiten und **keine Benutzerrechte** darstellen.
- Beginn/Ende werden auf Plausibilität geprüft.
- Aktuelle, künftige, frühere und unbesetzte Funktionen können gefiltert werden.
- Künftige Funktionen werden nicht mehr als aktuell gezählt.

### Einstellungen

- Speicher & Sync wurde in Einstellungen integriert; die bisherige separate Hauptnavigation wurde entfernt.
- Einstellungen wurden in sieben Unterbereiche gegliedert.
- Desktop: linkes Untermenü, optional einklappbar.
- Smartphone/kleines Tablet: aufklappbares Einstellungsmenü.
- Zusätzliche Beschriftungen für Such-, Filter- und Uploadfelder wurden ergänzt.

## Regressionen, die statisch mitgeprüft wurden

Folgende bereits vorhandene Funktionen sind weiterhin im Code/DOM vorhanden:

- Google-Kalender-Einstellung „Geburtstage synchronisieren“
- Strafkatalog
- Projekt ↔ Termin
- Explorer-artige Ordnerstruktur
- rekursives Ordnerlöschen
- Papierkorb und Wiederherstellung
- Mitgliederbeziehungen und Haushalte
- CSV-/Excel-Mitgliederimport und -export
- Smartphone-Agenda im Kalender
- runde Geburtstage und Vereinsjubiläen
- Dokumente ↔ Vereinswissen

`config.js`, `manifest.webmanifest` und der eingebettete KassenKumpel-Ordner wurden gegenüber V-Planer 1.7.0 nicht verändert.

## Was mit einer statischen Prüfung nicht vollständig bestätigt werden kann

Die Prüfung ersetzt keinen echten Browser-/Google-Konto-Test. Insbesondere folgende Punkte müssen im realen Deployment einmal praktisch geprüft werden:

- OAuth-Anmeldung mit dem realen Google-Cloud-Projekt
- echte Google-Drive-Dateioperationen und Wiederherstellung aus dem Drive-Papierkorb
- echte Google-Kalender-Synchronisierung
- Verhalten mit realen, großen CSV-/XLSX-Dateien
- Touch-Verhalten auf den konkreten Smartphone-/Tablet-Modellen

Für diese Punkte enthält `RESPONSIVE_TEST.md` passende Prüfschritte.
