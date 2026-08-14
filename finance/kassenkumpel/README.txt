KassenKumpel – Version 1.1.1
==========================
Made by N. Stricker with KI

ZWECK
-----
KassenKumpel ist eine einfache lokale Vereins-Kassenführung. Die Anwendung ist auf eine gut nachvollziehbare
Erfassung von Vereinskonto, Barkasse, weiteren Konten, Veranstaltungen, Kassenabschlüssen, Belegen und Auswertungen ausgelegt.

WICHTIGE FUNKTIONEN
-------------------
- Einnahmen, Ausgaben und Umbuchungen zwischen beliebig ergänzbaren Konten
- Tauschbutton für Von-/Nach-Konto bei Umbuchungen
- Beleg bei Einnahme, Ausgabe und Umbuchung direkt hinterlegen, nachreichen oder als „nicht erforderlich“ markieren
- fortlaufende Belegnummern
- Veranstaltungen/Bereiche und Kategorien frei sortierbar
- mehrere Kassen/Theken und mehrere Zwischenabschlüsse je Veranstaltung
- Kassenabschlüsse mit Zeitstempel, Export/Import und Storno
- stornierte Buchungen bleiben nachvollziehbar sichtbar, werden aber nicht in Auswertungen eingerechnet
- Jahresauswertung mit Mehrfachauswahl von Veranstaltungen
- einklappbarer Jahresvergleich
- CSV- und Excel-kompatibler Export
- Jahresabschluss/Jahressperre und Anfangsbestände je Jahr
- Plausibilitätsprüfungen und Änderungsprotokoll
- vollständiges Backup, bis zu drei lokale Notfall-Backups und Jahresarchiv als ZIP
- anpassbare Oberflächenskalierung von 70 % bis 115 %
- automatische Komprimierung neuer Belegfotos mit einstellbarer Bildqualität (Standard 75 %)
- Belegablage intern nach Jahr und Belegnummer; Jahresarchive enthalten z. B. Belege/2026/B-2026-001.jpg
- JPG, JPEG, PNG, HEIC/HEIF und PDF als Belegdateien
- frei verstellbare und gespeicherte Spaltenbreiten in den Buchungsübersichten
- Beschreibungs- und Bemerkungsfelder ohne Zeichenlimit

KASSENABSCHLUSS – BEISPIEL
---------------------------
Anfangsbestand:             150,00 EUR
Tatsächlich gezählt:      1.920,00 EUR
Barumsatz:                1.770,00 EUR
Geld entnommen:           1.770,00 EUR
Verbleibendes Wechselgeld: 150,00 EUR

Der Barumsatz wird automatisch als Einnahme auf der Barkasse verbucht. Die Entnahme selbst ist keine zusätzliche
Einnahme oder Ausgabe. Eine spätere Einzahlung des Bargelds auf das Vereinskonto wird als Umbuchung erfasst.

DATENSPEICHERUNG
----------------
Die Daten werden in Version 1.1.1 lokal im Browser gespeichert. Buchungsdaten und Einstellungen liegen im lokalen
Browser-Speicher (localStorage). Hochgeladene Belegbilder und PDFs werden als Dateien/Blobs in der Browser-Datenbank
IndexedDB (Datenbank „kirmeskasse_v1_files“, Bereich „receipts“) gespeichert. Es wird KEIN separater Belegordner
neben der Anwendung angelegt. Nur bei Backup/Jahresarchiv werden Belege als echte Dateien in den Download exportiert.
JPG/JPEG/PNG werden standardmäßig mit 75 % JPEG-Qualität komprimiert; der Wert ist in den Einstellungen änderbar.
HEIC/HEIF wird nur dann komprimiert, wenn der verwendete Browser das Format dekodieren kann; andernfalls bleibt die Datei unverändert.
PDF-Dateien werden unverändert gespeichert. Intern bleiben bestehende Beleg-IDs erhalten. Zusätzlich werden Jahr, Belegnummer und ein Archivname hinterlegt.
Beim Jahresarchiv werden die Belege als echte Dateien unter Belege/<Jahr>/<Belegnummer>.<Dateityp> ausgegeben. Deshalb:
- nicht im privaten / Inkognito-Modus arbeiten,
- möglichst immer denselben Browser verwenden,
- Browserdaten für KassenKumpel nicht löschen,
- regelmäßig ein vollständiges Backup bzw. Jahresarchiv extern sichern.

WINDOWS / MAC – DIREKT STARTEN
------------------------------
1. ZIP-Datei vollständig entpacken.
2. Den kompletten Ordner dauerhaft an einem geeigneten Speicherort ablegen.
3. index.html mit Edge, Chrome oder Safari öffnen.

ALS APP / PWA
-------------
Für die vollständige PWA-Installation muss der Ordner über localhost oder HTTPS geöffnet werden. Beispiel:

  python -m http.server 8765

Unter Windows je nach Installation alternativ:

  py -m http.server 8765

Danach im Browser http://localhost:8765 öffnen und die Browser-Funktion „App installieren“ verwenden.
Auf dem iPhone kann eine HTTPS-bereitgestellte Version in Safari über „Teilen“ -> „Zum Home-Bildschirm“ abgelegt werden.

KOMPATIBILITÄT
--------------
Die Release-Version 1.1.1 verwendet weiterhin denselben localStorage-Schlüssel und dieselbe IndexedDB-Datenbank wie die vorherigen Entwicklungsstände
von KassenKumpel. Bereits vorhandene Buchungen und hochgeladene Belege bleiben erhalten. Neue Beleg-Metadaten (Jahr, Belegnummer, Archivname)
werden für vorhandene Dateien beim Start automatisch ergänzt, ohne die bestehende Beleg-ID zu ändern. Alte vollständige Backups bleiben importierbar.
Vor einem Programmwechsel wird trotzdem ein vollständiges Backup empfohlen.

HINWEIS
-------
KassenKumpel ist ein einfaches Erfassungs- und Nachweiswerkzeug und ersetzt keine individuelle steuerliche oder rechtliche Beratung.

Version 1.1.1
- In der Übersicht wird zwischen Barkasse und Jahreseinnahmen das Gesamtkapital angezeigt.
- Das Gesamtkapital ist die Summe der Kontostände aller angelegten Konten im ausgewählten Jahr.
