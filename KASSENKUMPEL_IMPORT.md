# KassenKumpel -> V-Planer

V-Planer 2.1.1 erwartet den Finanzexport aus KassenKumpel 1.2.0 als JSON.

## Ablauf

1. Der Kassenwart arbeitet ausschliesslich im lokalen KassenKumpel.
2. In KassenKumpel das gewuenschte Geschaeftsjahr waehlen.
3. `Fuer V-Planer exportieren` ausfuehren.
4. Die erzeugte JSON-Datei an den V-Planer-Nutzer uebergeben.
5. In V-Planer `Finanzen -> KassenKumpel-Daten einlesen` waehlen.

Der Kassenwart braucht dafuer keinen V-Planer-, Google-, Firebase- oder Cloud-Account.

## Erwartetes Schema

```json
{
  "schemaVersion": 1,
  "kind": "vplaner-finance-snapshot",
  "source": "KassenKumpel",
  "sourceVersion": "1.2.0",
  "exportId": "kk-2026-...",
  "generatedAt": "2026-08-18T11:45:00.000Z",
  "businessYear": 2026,
  "currency": "EUR",
  "balances": {
    "bank": 17210.55,
    "cash": 1210.00,
    "total": 18420.55,
    "accounts": []
  },
  "yearToDate": {
    "income": 32580.00,
    "expenses": 27340.00,
    "result": 5240.00
  }
}
```

V-Planer validiert Quelle, Schema-Version, Geschaeftsjahr, Zeitstempel und die benoetigten Zahlenwerte. Bereits importierte `exportId`-Werte werden nicht als neuer Snapshot gespeichert.

V-Planer importiert keine einzelnen Buchungen, Belege oder personenbezogenen Zahlungsdaten.
