# Essenswahl für Home Assistant

Lokale Familien-Essenswahl für Home Assistant mit NAS-gestützter Gerichtsliste, Bildern, Abstimmungen und Kochhistorie.

## Funktionen

- Jede konfigurierte Person hat höchstens eine Stimme pro Gericht.
- Sichtbar, wer für welches Gericht abgestimmt hat.
- **Gekocht** löscht nur die Stimmen des gewählten Gerichts.
- Gericht bleibt danach sofort wieder wählbar.
- Gerichte hinzufügen, bearbeiten, deaktivieren und löschen.
- Bilder auf einem NAS speichern und über Home Assistant anzeigen.
- CSV auf einer Synology-Freigabe als Stammdatenquelle.
- Lokaler Home-Assistant-Cache für NAS-Ausfälle.
- Automatische Synchronisierung alle zwei Minuten.
- Lovelace-Karte ist ab v0.3 direkt in der Integration enthalten.

## HACS-Installation

1. Dieses Repository als **Custom repository** in HACS hinzufügen, Kategorie **Integration**.
2. `Essenswahl` über HACS installieren.
3. Home Assistant neu starten.
4. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** `Essenswahl` wählen.
5. Als Datenpfad z. B. `/share/essenswahl` angeben.
6. Unter **Einstellungen → Dashboards → Ressourcen** einmalig folgende Ressource ergänzen:
   - URL: `/meal_vote_static/meal-vote-card.js`
   - Typ: `JavaScript-Modul`
7. Dashboard-Karte hinzufügen:

```yaml
type: custom:meal-vote-card
```

## Synology

Empfohlene Struktur:

```text
essenswahl/
├── dishes.csv
└── images/
```

Home Assistant OS kann die SMB/CIFS-Freigabe als Network Storage einbinden. Die Integration selbst benötigt dadurch keine NAS-Zugangsdaten.

## Update von v0.2 auf v0.3

Die bestehenden Stimmen und die Kochhistorie liegen im Home-Assistant-Storage und bleiben erhalten. `dishes.csv` und Bilder auf dem NAS werden nicht ersetzt.

Nach Installation von v0.3 kann die alte Dashboard-Ressource `/local/meal-vote-card.js` entfernt und einmalig durch `/meal_vote_static/meal-vote-card.js` ersetzt werden. Danach werden Backend und Karte gemeinsam über HACS aktualisiert.

## GitHub-Repository

Dieses Paket ist für `https://github.com/Matzebodyguard/meal_vote` vorbereitet.

Empfohlene erste Veröffentlichung: GitHub Release/Tag `v0.3.0`.
