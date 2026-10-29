# Mission Erkundungsrover

Deutschsprachige Spielleitungs- und Team-App für die Rover-Simulation in Woche 1 des Moduls „Technologie- und Innovationsmanagement“ (TIM). Weiterentwicklung von `lunar_rover_game` (Konzept gefördert durch die Claussen-Simon-Stiftung).

`index.html` (Layout) und `js/er1.js` bis `js/er4.js` (Logik), drei Ansichten:

| Ansicht | URL | Zweck |
|---|---|---|
| Spielleitung | `.../erkundungsrover/?host=true` | Sitzung anlegen, Teams auslosen, Phasen steuern, Anfragen buchen, Export |
| Beamer | `.../erkundungsrover/?view=beamer&s=HSU26` | Phase, Schritte, Timer, Budgets, QR-Code und Teamlisten |
| Team (Smartphone) | `.../erkundungsrover/?s=HSU26` | Beitritt, eigene Rolle und Aufgabe pro Phase, Planung, Support und Testläufe, Voting |

## Ablauf in der Veranstaltung

1. Vorher: Spielleitung öffnen, Sitzungscode `HSU26` belassen (dann bleibt der QR-Code auf den Folien gültig), Format wählen (`Modulwoche 1` oder `Kurzdemo` für die Lehrprobe), „Sitzung starten“.
2. Beamer-Ansicht im zweiten Tab bzw. auf dem Beamer öffnen.
3. Alle Studierenden scannen den QR-Code mit dem eigenen Smartphone und treten mit Vornamen bei.
4. „Teams auslosen“: Teams mit 4 bis 6 Personen (bevorzugt 5), Rollen werden zufällig verteilt. Jedes Smartphone zeigt Team, Rolle und die Aufgabe der Rolle in der aktuellen Phase.
   - 5 Personen: Leitung, Hardware-Engineering, Software-Engineering, Finance, Marketing & Sales.
   - 4 Personen: Finance und Leitung in einer Person.
   - 6 Personen: zusätzlich Hardware- bzw. Software-Engineering.
   - Nachzügler werden automatisch dem kleinsten Team mit der fehlenden Rolle zugelost. Rolle und Team lassen sich unter „Teams & Buchungen“ manuell ändern.
5. Phasen 0 bis 6 über die Spielleitung weiterschalten.

## Rechte im Team

- Den Budgetplan (Code-Stufe, Zusatzfunktionen, Produktname) reicht nur Finance ein; alle anderen können mitrechnen.
- Support (Beratung, Notfall-Debugging, Re-Test) und Testläufe kann jede Person anfragen. Die Anfrage geht zuerst an Finance zur Freigabe, danach an die Spielleitung („Buchen“ bzw. „Durchgeführt“). Anfragen von Finance gehen direkt an die Spielleitung.
- Testläufe: 2 frei, jeder weitere 0,5 Mio. Abzug. Der Preis des nächsten Testlaufs wird in der App angezeigt.
- Die Teamstimme im Voting gibt die Leitung ab.

## Technik und Risiken

- Synchronisation zwischen Geräten über WebRTC (PeerJS 1.5.4, öffentlicher PeerJS-Broker). Ein Beamer-Tab im selben Browser synchronisiert zusätzlich lokal (localStorage, BroadcastChannel).
- **Vor Ort testen.** Hochschulnetze blockieren WebRTC teilweise. Fallback: Laptop und Studierende über einen mobilen Hotspot; notfalls läuft die Spielleitung allein (Teams melden mündlich, Buchung durch die Spielleitung).
- Keine Server, keine personenbezogenen Daten außer frei gewählten Vornamen; Daten liegen im Browser der Spielleitung. Export als CSV/JSON.
- Regeln und Texte (Budget, Preise, Paketinhalte, Rollen, Boni, Strafen, Phasen mit Schritten und Rollenaufgaben, Formate) stehen gebündelt in `CFG`, `PHASES`, `FORMATS` in `js/er1.js`.
- Der Zustand liegt unter dem Schlüssel `odce_erkundungsrover_state_v2`; ältere Sitzungen werden nicht übernommen.

## Veröffentlichung

GitHub Pages aus `main`, Root. Team-URL: `https://timtisc83.github.io/erkundungsrover/?s=HSU26`, Spielleitung: `https://timtisc83.github.io/erkundungsrover/?host=true`. Nach einem Push dauert die Aktualisierung einige Minuten.

## Lizenz

Code: MIT (wie Original). Lehrmaterial: CC BY 4.0.
