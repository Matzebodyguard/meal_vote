# Essenswahl für Home Assistant

Familien-Voting für Gerichte mit Synology-/NAS-CSV, Bildern, Kochhistorie, Zutaten und Home-Assistant-Einkaufsliste.

## NAS-Struktur

```text
essenswahl/
├── dishes.csv
├── ingredients.csv
└── images/
```

### dishes.csv
```csv
id,name,category,image,active
spaghetti,Spaghetti Bolognese,Pasta,images/spaghetti.jpg,true
```

### ingredients.csv
```csv
dish_id,name,amount,unit
spaghetti,Hackfleisch,500,g
spaghetti,Spaghetti,500,g
spaghetti,Tomaten,2,Dose
```

`ingredients.csv` wird automatisch angelegt/aktualisiert, sobald Zutaten über Home Assistant gespeichert werden.

## Einkaufsliste
Für den Button **Zur Einkaufsliste** nutzt Essenswahl Home Assistants To-do-System. Standardmäßig werden Zutaten mit `todo.add_item` an **`todo.zuhause`** gesendet. Unter **Einstellungen → Geräte & Dienste → Essenswahl → Konfigurieren** kann eine andere To-do-Entität eingetragen werden. Menge, Einheit und Zutatenname werden zu einem To-do-Eintrag zusammengefügt.

## Dashboard
Ressource einmalig:
```text
/meal_vote_static/meal-vote-card.js
```
Typ: JavaScript-Modul

Karte:
```yaml
type: custom:meal-vote-card
```

## Zutaten bearbeiten
Im Gericht-Dialog eine Zutat pro Zeile:
```text
500;g;Hackfleisch
1;Stück;Zwiebel
2;Dose;Tomaten
```

## Update
Bestehende Votes und Kochhistorie bleiben erhalten. Alte Kochhistorien ohne `cooked_dates` werden automatisch weiterverwendet; ab v0.4.1 werden neue Kochzeitpunkte zusätzlich einzeln gespeichert.


## Intelligente Einkaufsliste (v0.4.2)
Vor dem Übertragen liest Essenswahl die offenen Einträge der konfigurierten To-do-Liste. Bereits vorhandene Zutaten werden nach Namen erkannt. Numerische Mengen mit gleicher oder kompatibler Einheit werden addiert (z. B. 500 g + 500 g = 1000 g; 500 g + 1 kg = 1500 g). Ist eine sichere Zusammenführung nicht möglich, wird kein Duplikat erzeugt.


### Zutaten vor dem Einkauf auswählen
Beim Klick auf **Einkaufsliste** öffnet sich ab v0.4.3 zuerst ein Auswahlfenster. Alle Zutaten sind standardmäßig markiert. Zutaten, die bereits zu Hause sind, können abgewählt werden. Nur die verbleibende Auswahl wird an die konfigurierte To-do-Liste übertragen.


### Frontend-Cache bei Updates
Für v0.4.5 die Dashboard-Ressource einmal auf `/meal_vote_static/meal-vote-card.js?v=0.4.5` setzen. Dadurch wird garantiert die neue Karte geladen. In der Überschrift erscheint `UI 0.4.5` als Kontrolle.


## Frontend-Ressource ab 0.4.6
Für einen sicheren Cache-Wechsel die Dashboard-Ressource auf `/meal_vote_static/meal-vote-card.js?v=0.4.8` setzen und alte `meal-vote-card.js`-Ressourcen entfernen. Danach den Browser vollständig neu laden. In der Karte muss `UI 0.4.6` sichtbar sein.


## Wichtig bei Update auf 0.4.8
Dashboard-Ressource: `/meal_vote_static/meal-vote-card.js?v=0.5.1`

Kartentyp:
```yaml
type: custom:meal-vote-card
```
Die alte `custom:meal-vote-card` kann parallel existieren; für den Test bitte die neue Karte verwenden.


## Zutatenverwaltung ab v0.5.1
Beim Bearbeiten eines Gerichts werden Zutaten nicht mehr als Semikolon-Text gepflegt. Jede Zutat besitzt eigene Felder für Name, Menge und Einheit. Mit `＋ Zutat` können neue Zeilen ergänzt, mit `✕` gelöscht und mit `↑`/`↓` sortiert werden. Die Daten werden weiterhin in `ingredients.csv` gespeichert.


### Zutaten-Autovervollständigung
Beim Bearbeiten werden bereits in allen Gerichten verwendete Zutaten vorgeschlagen. Bei Auswahl wird die am häufigsten verwendete Einheit automatisch gesetzt, sofern das Einheitenfeld noch leer ist.


### Tolerante Zutaten-Suche
Die Autovervollständigung erkennt auch kleinere Tippfehler und ähnliche Schreibweisen, z. B. `Tomtaen` → `Tomaten` oder einfache Singular/Plural-Varianten.


### Standardvorrat
Über **🏠 Standardvorrat** können häufig vorhandene Zutaten markiert werden. Diese bleiben in Rezepten sichtbar, sind beim Übertragen auf die Einkaufsliste aber zunächst nicht ausgewählt. Im Zutateneditor kann eine Zutat über das 🏠-Symbol direkt zum Standardvorrat hinzugefügt bzw. daraus entfernt werden.


### Wochenplan (v0.5.1)
Zusätzliche Ressource: `/meal_vote_static/meal-week-plan-card.js?v=0.5.1`

Dashboardkarte:
```yaml
type: custom:meal-week-plan-card
```
Der Wochenplan unterstützt mehrere Gerichte pro Tag und einen gemeinsamen Wocheneinkauf. Standardvorrat wird dabei automatisch abgewählt.
