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

## Explorer-Ordnerbaum testen
- In allen drei Bereichen einen Ordner mit mindestens zwei Ebenen Unterordnern anlegen.
- Pfeil am Elternordner anklicken: Unterordner müssen ein-/ausklappen, ohne den aktuellen Ordner zu wechseln.
- Ordnername anklicken: Ordner muss geöffnet werden.
- Einen tiefen Unterordner über Breadcrumb öffnen: der gesamte Pfad muss sichtbar/aufgeklappt sein.
- Smartphone prüfen: Auf-/Zuklapp-Pfeile müssen touchfreundlich sein.

## Rekursives Ordnerlöschen testen
- Elternordner mit Unterordnern, Dateien und ggf. Sitzungs-/Wissenseinträgen anlegen.
- Löschen: Bestätigungsdialog muss Anzahl Unterordner/Dateien/Einträge nennen.
- Bestätigen: kompletter Baum muss aus V-Planer verschwinden.
- Dateien/Drive-Ordner anschließend im Google-Drive-Papierkorb prüfen.
- Abbrechen: keinerlei Daten dürfen verändert werden.

## Dokumente & Bilder ohne Kategorien
- Prüfen: keine Kategorie-Kacheln mehr sichtbar.
- Prüfen: beim Datei-/Ordnerupload keine Kategorie-Auswahl mehr.
- Datei hochladen und nach Dateiname suchen.
- Explorer-Ordner, Verschieben und Export weiterhin testen.

## Vereinswissen ↔ Dokumente
- Mehrere Dateien unter Dokumente & Bilder anlegen.
- Wissenseintrag erstellen und mehrere Dokumente auswählen.
- Speichern: Dokumente müssen auf der Wissenskarte erscheinen.
- Dokument öffnen und exportieren.
- Wissenseintrag bearbeiten und eine Verknüpfung entfernen: Datei muss erhalten bleiben.
- Dieselbe Datei mit zwei Wissenseinträgen verknüpfen: Dokumentenliste muss 2× anzeigen.
- Datei im Dokumentenbereich löschen: Verknüpfungen müssen automatisch aus allen Wissenseinträgen verschwinden.
- Dokumentenordner rekursiv löschen: Verknüpfungen zu enthaltenen Dateien müssen verschwinden.
- Smartphone: Dokumentauswahl und verknüpfte Dokumentzeilen ohne horizontales Scrollen testen.

## V-Planer 1.4.0 – Vereinsdaten
- Bestehenden Datenbestand laden: alte Vereinsnamen-/Rollenfelder müssen erhalten bleiben.
- Grunddaten speichern und Seite neu laden.
- Vereinslogo auswählen, speichern, neu laden und wieder entfernen.
- Vereinsanschrift, Kontakt, Registerdaten, Geschäftsjahr und Standardort testen.
- Funktionen für Vorsitz, Schriftführung und Kasse auswählen; Funktionsoption muss Person und Gruppe anzeigen.
- Bereits ausgewählte, inzwischen beendete Funktion muss weiterhin erkennbar bleiben.
- Digitale Mitgliedskarte öffnen: Kurzname/Vereinsname und Vereinslogo prüfen.
- Smartphone: Vereinsdaten einspaltig, Logo-Editor touchfreundlich und keine horizontale Überbreite.
- Tablet/Desktop: zweispaltige Vereinsdatenabschnitte prüfen.

## V-Planer 1.5.0 – Suche, Verknüpfungen & Papierkorb
- Zentrale Suche mit Begriff testen, der in Aufgabe, Projekt, Mitglied, Sitzung, Dokument und Vereinswissen vorkommt.
- Treffer aus jedem Bereich direkt öffnen.
- Desktop: Strg/Cmd+K fokussiert die globale Suche.
- Smartphone: Lupe öffnet Suche; Suchtreffer dürfen nicht abgeschnitten werden.
- Aufgabe ↔ Dokument, Mitglied ↔ Projekt, Sitzung ↔ Vereinswissen und Strafe ↔ Dokument verknüpfen.
- Spezialverknüpfungen Projekt ↔ Termin und Vereinswissen ↔ Dokument weiterhin testen.
- Verknüpfung lösen: beide Originaldatensätze müssen erhalten bleiben.
- Datensatz löschen → Papierkorb → wiederherstellen.
- Projekt mit Aufgaben/Termin löschen und wiederherstellen: Beziehungen müssen erhalten bleiben.
- Ordnerbaum rekursiv löschen und als einen zusammengehörigen Papierkorb-Eintrag wiederherstellen.
- Gruppe mit Untergruppen/Funktionen löschen und wiederherstellen.
- Endgültig löschen: Eintrag verschwindet aus Papierkorb; nach Drive-Sync darf er nicht wieder auftauchen.

## V-Planer 1.6.0 – Mitgliederbeziehungen & Import/Export
- Mutter/Vater/Kind/Partner/Geschwister/Vertretung zwischen zwei Mitgliedern anlegen.
- Gegenbeziehung aus Sicht des zweiten Mitglieds kontrollieren.
- Beziehung lösen: beide Mitglieder bleiben erhalten.
- Haushalt anlegen, mehrere Mitglieder zuordnen, gemeinsame Anschrift speichern.
- Mitglied direkt einem Haushalt zuordnen.
- Haushalt in Papierkorb verschieben und wiederherstellen.
- CSV mit Semikolon, Komma und Tabulator testen.
- CSV mit Anführungszeichen und Zeilenumbrüchen testen.
- XLSX mit Shared Strings und Inline Strings testen.
- Import-Mapping prüfen; Vorschau kontrollieren.
- Dubletten über Mitgliedsnummer sowie Name + Geburtsdatum testen.
- Import ohne „Aktualisieren“ darf Dubletten nicht überschreiben.
- Import mit „Aktualisieren“ darf leere Zellen nicht über bestehende Werte schreiben.
- Vor Import muss ein Sicherheitsbackup erzeugt werden.
- Export als CSV und XLSX testen.
- XLSX in Excel/LibreOffice öffnen: Kopfzeile, Spaltenbreiten und fixierte erste Zeile prüfen.
- Export „aktuelle Filter/Suche“ testen.

## V-Planer 1.7.0 – Smartphone
- Smartphone ≤760 px: Kalender startet ohne gespeicherte Präferenz in Agenda.
- Agenda zeigt Termine, Aufgaben, Projekte, Geburtstage und Jubiläen.
- Agenda-Eintrag öffnet den korrekten Datensatz.
- Umschalten Agenda ↔ Monat; Einstellung nach Neuladen erhalten.
- Monatsansicht bleibt vollständig mit 42 Zellen und horizontal bedienbar.
- Mitgliederliste wird als Kartenansicht dargestellt.
- Aufgabenliste wird als Kartenansicht dargestellt.
- Dialoge nutzen Smartphone-Vollbild und 16px-Eingaben/Touch-Ziele aus bestehendem Responsive-System.
- Papierkorb, Verknüpfungsmanager, Beziehungen, Haushalte, Import und Export auf Smartphone ohne horizontale Seitenüberbreite testen.
- Tablet: Monatskalender und Desktop-Strukturen bleiben nutzbar.

## V-Planer 1.8.0 – Übersicht
- Kennzahl Offene Aufgaben anklicken → Aufgabenbereich.
- Kennzahl Aktive Projekte anklicken → Projektbereich.
- Kennzahl Mitglieder anklicken → Mitgliederbereich.
- Prüfen: keine separate Kennzahl „Nächster Geburtstag“ mehr.
- Runden Geburtstag über `×` aus Übersicht ausblenden: Mitglied und Geburtstag müssen in anderen Bereichen erhalten bleiben.
- Jubiläum über `×` aus Übersicht ausblenden: Mitglied und Vereinsjahr müssen unverändert bleiben.
- Sonderhinweis oben über `×` schließen und Seite neu rendern: Hinweis darf für den vorgesehenen Zeitraum nicht sofort wieder erscheinen.

## V-Planer 1.8.0 – Verknüpfungen
- In Aufgaben, Projekten, Terminen, Mitgliedern, Gruppen, Funktionen, Sitzungen, Dokumenten, Vereinswissen und Strafen prüfen: kompakte Büroklammer statt ausgeschriebenem Verknüpfen-Button.
- Büroklammer ohne Verknüpfung öffnen und neue Verknüpfung anlegen.
- Büroklammer mit vorhandenen Verknüpfungen: Anzahl prüfen.
- Verknüpfung lösen: Originaldatensätze bleiben erhalten.
- Projekt ↔ Termin und Vereinswissen ↔ Dokumente weiterhin separat prüfen.

## V-Planer 1.8.0 – Funktionen & Ämter
- Ohne ausgewählte Gruppe über „+ Funktion / Amt“ neue Funktion anlegen.
- Funktion mit und ohne Person speichern.
- Beginn/Ende mit Ende vor Beginn muss abgewiesen werden.
- Suche nach Funktionsname und Mitglied testen.
- Filter Aktuell / Künftig / Früher / Unbesetzt testen.
- Funktion aus globaler Übersicht bearbeiten und speichern.
- Funktion im Gruppendetail bearbeiten.
- Künftige Funktion darf nicht unter „Aktuelle Funktionen“ erscheinen.
- Vereinsdaten → Vorsitz/Schriftführung/Kasse: nur aktuelle Funktionen standardmäßig anbieten.

## V-Planer 1.8.0 – Einstellungen
- Desktop: alle sieben Unterbereiche über linkes Menü öffnen.
- Desktop: Einstellungsmenü einklappen und wieder ausklappen; Zustand nach Neuladen prüfen.
- Smartphone/Tablet: aufklappbares Einstellungsmenü testen.
- Speicher & Sync darf nicht mehr als eigener Hauptnavigationspunkt erscheinen.
- Dashboard → Speicher & Synchronisation → Einstellungen öffnet direkt Speicher & Sync.
- Google Drive verbinden / Jetzt synchronisieren im Einstellungsbereich testen.
- Speicherlimit und Bildkomprimierung ändern, Einstellungen speichern, neu laden.
- Backup & Daten: globaler Speichern-Button soll dort nicht unnötig im Vordergrund stehen.
