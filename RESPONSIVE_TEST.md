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

## Mehrtägige Projekte testen
- Neues Projekt mit gleichem Von-/Bis-Datum anlegen: nur an diesem Tag im Kalender sichtbar.
- Projekt über mehrere Tage anlegen: an jedem betroffenen Kalendertag sichtbar.
- Projekt über Monatsgrenze anlegen: in beiden Monaten im Vereinsjahr sichtbar.
- Projekt bearbeiten und Zeitraum verkürzen/verlängern.
- Bestehendes altes Projekt mit nur Zieldatum öffnen: Von und Bis müssen mit dem bisherigen Datum vorbelegt sein.
- Google-Kalender-Sync aktivieren und prüfen, dass das Projekt als ganztägiger Zeitraum übertragen wird.
- Projekt archivieren/wiederherstellen und Zeitraum im Archiv prüfen.

## Geburtstage & Jubiläen
- Mehrere Geburtstage und Jubiläen mit unterschiedlichen Abständen anlegen.
- Prüfen, dass die Dashboard-Liste unabhängig vom Typ chronologisch sortiert ist.
- Prüfen, dass höchstens 8 Einträge angezeigt werden.
- Dashboard-Eintrag antippen/anklicken und direkten Sprung zum Mitglied prüfen.
- Einstellungen: Jubiläumsjahre z. B. auf `10, 25, 50` setzen.
- Prüfen, dass ein 20-jähriges Jubiläum danach nicht mehr als wichtiges Jubiläum erscheint.
- Vereinsjahr auf dieselben Jubiläumsjahre prüfen.
- Jubiläumserinnerung deaktivieren: Dashboard darf keine Jubiläen mehr zeigen; Geburtstage bleiben sichtbar.
- Smartphone-Breite prüfen: Anlass-Badge, Name und Datumszeile müssen ohne horizontales Scrollen nutzbar sein.

## Kanban-Sortierung
- In derselben Spalte Aufgaben mit gestern, heute, morgen, +3 Tagen, +20 Tagen und ohne Termin anlegen.
- Reihenfolge muss genau dieser zeitlichen Dringlichkeit entsprechen.
- Zwei Aufgaben mit identischem Datum und unterschiedlicher Priorität anlegen: Hoch muss vor Mittel, Mittel vor Niedrig stehen.
- Überfällige Karte muss den Text „X Tage überfällig“ zeigen.
- Heute/Morgen/nächste Tage müssen als verständlicher Text sichtbar sein.
- Aufgabe per Drag & Drop in eine andere Status-Spalte verschieben: danach automatische Neusortierung prüfen.
- Smartphone-Breite prüfen: Fälligkeitsbadge und Datum dürfen die Karte nicht horizontal sprengen.

## Projekt ↔ Termin
- Projekt anlegen: Felder Projektbeginn / Projektende prüfen.
- Auf Projektkarte „+ Termin zum Projekt“ wählen.
- Projektname, Gruppe, Beschreibung und vorgeschlagenes Termindatum prüfen.
- Termin speichern: Projektkarte muss den Termin anzeigen.
- Termindetails öffnen: „Gehört zu Projekt“ prüfen.
- Bestehenden freien Termin im Projekt auswählen und speichern.
- Zugehöriges Projekt im Termin ändern.
- „Verknüpfung lösen“: beide Datensätze müssen erhalten bleiben.
- Projekt löschen: Termin muss erhalten bleiben.
- Termin löschen: Projekt muss erhalten bleiben.
- Smartphone: Verknüpfungsbereich und Buttons ohne horizontales Scrollen testen.

## Strafkatalog UX
- Strafkatalog öffnen und **+ Neue Strafe** wählen: Eingabe muss im selben Dialog erscheinen.
- Neue Strafart speichern: Eingabe muss verschwinden und neuer Eintrag sofort in der Liste sichtbar/kurz hervorgehoben sein.
- Neue Strafe danach öffnen: gerade angelegte Strafart muss direkt in der Katalogauswahl vorhanden sein.
- Bearbeiten → speichern: Eingabe schließt, geänderte Zeile bleibt sichtbar.
- Abbrechen: keine Änderung speichern, Katalog bleibt geöffnet.
- Suche nach Name und Betrag testen; Escape im Suchfeld leert den Suchbegriff.
- Löschen mit bereits verwendeter Strafart testen: historische vergebene Strafen bleiben erhalten.
- Smartphone: Eingabefelder und Buttons mindestens touchfreundlich, keine horizontale Überbreite.

## Google-Kalender-Sync-Fix
- Einstellungen → Google Kalender öffnen: Checkbox „Geburtstage synchronisieren“ muss sichtbar sein.
- Alle fünf Sync-Checkboxen einzeln umschalten und Einstellungen erneut öffnen.
- „Google Kalender verbinden“ klicken: es darf kein `$(...) is null` / `.checked`-Fehler erscheinen.
- Geburtstage-Sync deaktivieren: Geburtstage dürfen nicht für den Sync ausgewählt werden.
- Geburtstage-Sync aktivieren: Geburtstage werden als jährliche ganztägige Einträge berücksichtigt.
- Bestehende lokale Calendar-Prefs ohne neues UI-Feld laden: kein Absturz.

## Datei- und Ordnerexport
- In allen drei Bereichen einzelne Datei über „Exportieren“ herunterladen.
- Unterordner mit mehreren Dateien exportieren: ZIP-Struktur prüfen.
- Hauptordner „Bereich exportieren“: alle Unterordner müssen enthalten sein.
- Sitzungen & Beschlüsse: Sitzungs-/Beschlusseintrag muss als TXT im ZIP liegen.
- Vereinswissen: Wissenseintrag muss als TXT im ZIP liegen.
- Leeren Ordner exportieren: gültiges ZIP ohne Fehler.
- Abgelaufene Drive-Anmeldung: manueller Export muss die erneute Drive-Freigabe anstoßen.
- Smartphone: Exportbutton und Dateiactions müssen ohne horizontales Scrollen bedienbar sein.

## Dokumente & Bilder
- Kategorieübersicht enthält nur Protokolle, Dokumente, Bilder.
- Upload-Auswahl enthält keine Quittungen.
- Vorhandene Altdatei mit Kategorie Quittungen bleibt erhalten und sichtbar.

## Runde Geburtstage
- Einstellungen: Schalter und Altersliste speichern/neu laden.
- Mitglied so anlegen, dass es 50 wird: Dashboard zeigt 🎉 / Runder Geburtstag.
- Altersstufe 50 aus Einstellungen entfernen: Geburtstag wird wieder normal dargestellt.
- Runder Geburtstag innerhalb 30 Tagen: Hinweisstreifen prüfen.
- Vereinsjahr: runden Geburtstag optisch prüfen.
