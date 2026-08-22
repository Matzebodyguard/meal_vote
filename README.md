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
