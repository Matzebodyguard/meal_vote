# Changelog

## 0.3.2
- Behebt das wiederholte Neuladen der Dashboard-Karte bei Home-Assistant-State-Updates.
- Initialer Datenabruf erfolgt nur noch einmal; automatische Kartenaktualisierung maximal alle 2 Minuten.
- Während Eingabe oder geöffnetem Gericht-Dialog wird kein automatischer Neuaufbau ausgeführt.
- Karte und Gerichteraster nutzen die verfügbare Dashboard-Breite vollständig.

## 0.3.1
- Fix: fehlende `DEFAULT_DATA_PATH`-Konstante ergänzt; behebt den Home-Assistant-Fehler „Import error“ beim Einrichten.


## 0.3.0

- HACS-/GitHub-Repository-Struktur hinzugefügt.
- Lovelace-Karte in die Integration verschoben.
- Statische Frontend-URL `/meal_vote_static/meal-vote-card.js` hinzugefügt.
- Manifest auf SemVer `0.3.0` aktualisiert.
- GitHub Actions für HACS- und Hassfest-Validierung hinzugefügt.
- Upgrade-Pfad von v0.2 dokumentiert.

## 0.2.0

- Bearbeiten, Deaktivieren und Löschen von Gerichten.
- Bild-Upload aufs NAS.
- Automatische NAS-Synchronisierung.
- Offline-Cache.
