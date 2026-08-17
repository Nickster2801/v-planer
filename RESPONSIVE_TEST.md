# Responsive Testcheck V-Planer 1.0

Geprüfte Zielbreiten:
- Smartphone: 390 x 844
- kleines Smartphone: 360 x 800
- Tablet Hochformat: 768 x 1024
- Tablet Querformat: 1024 x 768
- Desktop: 1440 x 900

Wichtige mobile Anpassungen:
- Bottom-Navigation + vollständiges „Mehr“-Menü
- Aufgaben/Mitglieder/Dokumente werden unter 620 px als Karten dargestellt
- Dialoge nutzen auf Smartphones den ganzen Bildschirm
- Kalender bleibt lesbar und kann horizontal gewischt werden
- Touch-Ziele ca. 42–48 px
- Safe-Area-Unterstützung für iPhone/iPad


## Mitgliedersortierung
- Desktop: Sortierung direkt über die Tabellenüberschriften testen.
- Tablet/Smartphone: Sortierauswahl und Richtungsbutton testen.
- Gelöschte Mitgliedsnummer erneut bei einem neuen Mitglied vergeben.

## Skalierung & Backup
- Skalierung auf 80 %, 100 % und 125 % auf Desktop testen.
- Auf Smartphone und Tablet kontrollieren, dass Navigation und Dialoge weiterhin erreichbar bleiben.
- Backup exportieren und JSON-Datei speichern.
- Einen Testdatensatz ändern, anschließend Backup importieren und Wiederherstellung prüfen.
- Sicherheitsabfrage und automatisches Vor-Import-Backup prüfen.

## Aufgabeninformationen
- Mehr als 5 offene Aufgaben auf der Übersicht anlegen und Scrollbereich prüfen.
- Mehr als 5 aktive Projekte auf der Übersicht anlegen und Scrollbereich prüfen.
- Aufgabe mit Beschreibung speichern und Darstellung in Aufgabenliste/Projektkarte prüfen.
- Bestehende Aufgabe bearbeiten, PDF/Word/Bild anhängen und Upload nach Google Drive prüfen.
- Anhang öffnen und mit Sicherheitsabfrage löschen.
- Smartphone: Scrollkarten und Dateiaktionen auf Touch-Bedienung prüfen.

## Archiv
- Erledigte Einzelaufgabe archivieren und prüfen, dass sie aus Aufgabenliste, Dashboard und Kanban verschwindet.
- Archivierte Aufgabe wiederherstellen.
- Abgeschlossenes Projekt mit vollständig erledigten Aufgaben archivieren.
- Prüfen, dass die automatisch mitarchivierten Aufgaben ebenfalls aus aktiven Ansichten verschwinden.
- Projekt wiederherstellen und zugehörige automatisch archivierte Aufgaben prüfen.
- Versuch testen, ein Projekt mit noch offener Aufgabe zu archivieren.
- Smartphone/Tablet: Archivkarten und Wiederherstellen-Schaltflächen prüfen.

## Aufgabensortierung
- Desktop: Jede Aufgaben-Spaltenüberschrift zweimal anklicken und beide Sortierrichtungen prüfen.
- Fälligkeit: ohne Datum / frühe / späte Termine testen.
- Priorität: Hoch/Mittel/Niedrig in beide Richtungen testen.
- Smartphone/Tablet: Sortierauswahl und Richtungsbutton prüfen.
- Sortierung zusammen mit Suche, Statusfilter und Archivierung testen.


## Finanzen
- Finanzmodul in Einstellungen aus- und wieder einschalten.
- KassenKumpel öffnen, Buchung ändern und prüfen, dass der V-Planer-Brückenstatus reagiert.
- Strafe anlegen, bezahlen, erlassen, wieder öffnen, bearbeiten und löschen.
- Smartphone/Tablet: KassenKumpel-Iframe, Strafenmetriken und Sortierung testen.

## Aufgaben/Projekte im Kalender
- Aufgabe mit Fälligkeit anlegen und Kalenderchip prüfen.
- Projekt mit Zieldatum anlegen und Kalenderchip prüfen.
- Aufgabe/Projekt im Kalender anklicken und Bearbeitungsdialog prüfen.
- Aufgabe/Projekt archivieren und prüfen, dass der Kalendereintrag verschwindet.
- Mehrtägige Termine parallel zu Aufgaben/Projekten testen.

## Google Kalender
- Google Calendar API im Google-Cloud-Projekt aktivieren.
- Einstellungen → Google Kalender → Synchronisierung aktivieren.
- „Google Kalender verbinden“ ausführen und OAuth-Freigabe prüfen.
- Prüfen, dass ein separater Kalender „V-Planer“ im Google Kalender erscheint.
- Ein- und mehrtägigen Termin mit Uhrzeiten anlegen und synchronisieren.
- Aufgabe mit Fälligkeit und Projekt mit Zieldatum synchronisieren.
- Termin bearbeiten und prüfen, dass kein Duplikat entsteht, sondern der Google-Eintrag aktualisiert wird.
- Aufgabe/Projekt archivieren und beim nächsten Sync das Entfernen aus Google Kalender prüfen.
- Browser neu laden: anschließend „Erneut verbinden & synchronisieren“ prüfen.
- Smartphone: Google-Kalender-App öffnen und Sichtbarkeit des Kalenders „V-Planer“ prüfen.
