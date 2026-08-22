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
