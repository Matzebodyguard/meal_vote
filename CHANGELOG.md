# Changelog

## 0.6.0
- Wochenplan-Karte nutzt jetzt konsequent die volle verfügbare Dashboardbreite.
- Maximalbreiten entfernt und Grid auf 100 % gesetzt.
- Außenabstände für Wandpanels leicht reduziert.

## 0.6.0
- Wochenplan auf großen Wandpanels als 7 gleich breite Wochentag-Spalten.
- Geplante Gerichte werden als kompakte Kacheln statt dauerhaft sichtbarer Dropdowns angezeigt.
- Antippen einer Gerichtskachel öffnet die Auswahl zum Ändern.
- Responsive Darstellung: 4 Spalten auf kleineren Tablets, 2 auf schmalen Displays.

## 0.6.0
- Neue separate Dashboardkarte `meal-week-plan-card`.
- Montag bis Sonntag planbar; mehrere Gerichte pro Tag möglich.
- Wochenplan wird lokal in Home Assistant gespeichert.
- Gemeinsamer Wocheneinkauf mit Standardvorrat und bestehender Mengen-/Duplikatlogik.

## 0.6.0
- Globale Standardvorrat-Markierung wird jetzt in allen Gerichten direkt im Zutateneditor angezeigt.
- Aktive 🏠-Schaltflächen werden optisch hervorgehoben.
- Entfernen/Hinzufügen aktualisiert die Markierung sofort.

## 0.6.0
- Standardvorrat-Liste ergänzt.
- Vorratszutaten sind im Einkaufsdialog standardmäßig abgewählt und mit 🏠 markiert.
- Zutaten können direkt im Zutateneditor dem Standardvorrat hinzugefügt oder daraus entfernt werden.
- Standardvorrat wird lokal in Home Assistant gespeichert.

## 0.6.0
- Zutaten-Autovervollständigung aus bereits verwendeten Zutaten.
- Häufigste bisherige Einheit wird beim Auswählen vorgeschlagen.
- Keine separate Zutaten-Datenbank nötig.

## 0.6.0
- Neue Touch-optimierte Zutatenverwaltung mit eigenen Feldern für Zutat, Menge und Einheit.
- Zutaten können direkt hinzugefügt, gelöscht und per Pfeiltasten sortiert werden.
- Einheit mit Vorschlägen (g, kg, ml, l, Stück, Dose, Packung, EL, TL, Prise, Bund), Freitext bleibt möglich.
- Bestehende `ingredients.csv` bleibt vollständig kompatibel.

## 0.4.8
- Neuer eindeutiger Lovelace-Kartentyp `meal-vote-card-v048`, damit alte gecachte Ressourcen die neue UI nicht mehr blockieren.
- Sichtbares UI-Badge `UI 0.4.8`.
- Einkaufs-Auswahldialog und Mengen-Diagnose aus 0.4.7 enthalten.

## 0.4.7

- Frontend-Ressource wieder auf stabilen Pfad `meal-vote-card.js` zurückgestellt.
- Sichtbares UI-0.4.7-Badge ergänzt.
- Registrierung des Custom Elements gegen doppelte Definition abgesichert.
- Cache-Busting erfolgt über `?v=0.4.7`.


## 0.4.6
- Frontend zusätzlich unter eindeutig versionierter Datei `meal-vote-card-v0.4.6.js`.
- Sichtbarer Badge `UI 0.4.6` zur sicheren Cache-Prüfung.
- Einkaufsliste meldet die Anzahl bereits erkannter offener To-do-Einträge zurück.
- Auswahl-Dialog und Mengen-Zusammenführung aus 0.4.5 bleiben enthalten.

## 0.4.5
- Frontend-Version sichtbar gemacht, damit Browser-Cache-Probleme sofort erkennbar sind.
- Einkaufsliste: robustere Erkennung vorhandener Zutaten inklusive häufiger Singular-/Pluralformen.
- Mengen ohne Einheit und `Stück` können gemeinsam addiert werden (z. B. `2 Zwiebeln` + `1 Stück Zwiebel`).
- Wichtig nach Update: Dashboard-Ressource mit `?v=0.4.5` laden, um den Frontend-Cache sicher zu umgehen.

## v0.4.3
- Auswahl-Dialog vor dem Übertragen von Zutaten zur Einkaufsliste.
- Zutaten können einzeln abgewählt werden; standardmäßig sind alle ausgewählt.
- Buttons „Alle“ und „Keine“ für schnelle Auswahl.
- Duplikat- und Mengen-Zusammenführung bleibt unverändert aktiv.

# Changelog

## 0.6.0
- Wochenplan-Karte nutzt jetzt konsequent die volle verfügbare Dashboardbreite.
- Maximalbreiten entfernt und Grid auf 100 % gesetzt.
- Außenabstände für Wandpanels leicht reduziert.

## 0.6.0
- Wochenplan auf großen Wandpanels als 7 gleich breite Wochentag-Spalten.
- Geplante Gerichte werden als kompakte Kacheln statt dauerhaft sichtbarer Dropdowns angezeigt.
- Antippen einer Gerichtskachel öffnet die Auswahl zum Ändern.
- Responsive Darstellung: 4 Spalten auf kleineren Tablets, 2 auf schmalen Displays.

## 0.6.0
- Neue separate Dashboardkarte `meal-week-plan-card`.
- Montag bis Sonntag planbar; mehrere Gerichte pro Tag möglich.
- Wochenplan wird lokal in Home Assistant gespeichert.
- Gemeinsamer Wocheneinkauf mit Standardvorrat und bestehender Mengen-/Duplikatlogik.

## 0.6.0
- Globale Standardvorrat-Markierung wird jetzt in allen Gerichten direkt im Zutateneditor angezeigt.
- Aktive 🏠-Schaltflächen werden optisch hervorgehoben.
- Entfernen/Hinzufügen aktualisiert die Markierung sofort.

## 0.6.0
- Standardvorrat-Liste ergänzt.
- Vorratszutaten sind im Einkaufsdialog standardmäßig abgewählt und mit 🏠 markiert.
- Zutaten können direkt im Zutateneditor dem Standardvorrat hinzugefügt oder daraus entfernt werden.
- Standardvorrat wird lokal in Home Assistant gespeichert.

## 0.6.0
- Zutaten-Autovervollständigung aus bereits verwendeten Zutaten.
- Häufigste bisherige Einheit wird beim Auswählen vorgeschlagen.
- Keine separate Zutaten-Datenbank nötig.

## 0.4.2
- Einkaufsliste prüft vorhandene offene Einträge vor dem Hinzufügen.
- Gleiche Zutaten mit gleicher/kompatibler Einheit werden mengenmäßig ergänzt.
- Unterstützt automatische Umrechnung kg↔g und l↔ml beim Zusammenführen.
- Nicht sicher zusammenführbare vorhandene Zutaten werden nicht doppelt angelegt.
- Rückmeldung unterscheidet neue, ergänzte und bereits vorhandene Zutaten.

## 0.4.1
- Einkaufsliste auf Home Assistants `todo.add_item` umgestellt.
- Standardziel ist `todo.zuhause`.
- Ziel-To-do-Entität ist in den Integrationsoptionen konfigurierbar.
- Änderungen an den Optionen laden die Integration automatisch neu.

## 0.4.0
- Kochhistorie direkt auf den Gerichtskarten sichtbar
- vollständige Liste der letzten Kochzeitpunkte im lokalen Home-Assistant-Speicher
- Sortierung „Lange nicht gekocht“, „Zuletzt gekocht“, „Meiste Stimmen“ und „Name“
- Zutaten je Gericht über `ingredients.csv`
- Zutaten können im Bearbeiten-Dialog gepflegt werden
- Zutatensuche in der Dashboard-Suche
- Zutaten-Dialog auf jeder Gerichtskarte
- Übergabe aller Zutaten eines Gerichts an Home Assistants Einkaufsliste
- automatischer Sync bleibt bei 10 Minuten

## 0.3.3
- Namensauswahl beim Abstimmen
- 10-Minuten-Synchronisierung

## 0.4.4
- Fix: Einkaufsauswahl verwendet einen eigenen Dialog und öffnet zuverlässig auch aus der Zutatenansicht.
- Fix: To-do-Aktionen adressieren die konfigurierte Liste über Home-Assistant-Targets.
- Fix: vorhandene offene To-do-Einträge werden robuster eingelesen und aktualisiert.
- Verbesserung: Mengenerkennung unterstützt zusätzlich Einträge wie `2 Zwiebeln` ohne explizite Einheit.
