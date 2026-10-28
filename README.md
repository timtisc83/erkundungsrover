# Mission Erkundungsrover

Deutschsprachige Spielleitungs- und Team-App für die Rover-Simulation in Woche 1 des Moduls „Technologie- und Innovationsmanagement“ (TIM). Weiterentwicklung von `lunar_rover_game` (Konzept gefördert durch die Claussen-Simon-Stiftung).

Eine Datei (`index.html`), drei Ansichten:

| Ansicht | URL | Zweck |
|---|---|---|
| Spielleitung | `https://timtisc83.github.io/erkundungsrover/?host=true` | Sitzung anlegen, Phasen steuern, Budgets buchen, Anfragen, Export |
| Beamer | `https://timtisc83.github.io/erkundungsrover/?view=beamer&s=HSU26` | Phase, Timer, Budgets, QR-Code für den Saal |
| Team (Smartphone) | `https://timtisc83.github.io/erkundungsrover/?s=HSU26` | Beitritt, Planung, Support-Anfragen, Voting |

## Ablauf in der Veranstaltung

1. Vorher: Spielleitung öffnen, Sitzungscode `HSU26` belassen (dann bleibt der QR-Code auf den Folien gültig), Format wählen (`Modulwoche 1` oder `Kurzdemo` für die Lehrprobe), Teams anlegen, „Sitzung starten“.
2. Beamer-Ansicht im zweiten Tab bzw. auf dem Beamer öffnen.
3. Studierende scannen den QR-Code, wählen Team, Rolle (Leitung, Hardware-Engineering, Software-Engineering, Finance, Marketing & Sales) und Vornamen.
4. Phasen 0 bis 6 über die Spielleitung weiterschalten.

## Regeln (Stand: angeglichen an die Masterarbeit zur Simulation)

- Code-Stufen Basis / Standard / Premium (0 / 4 / 8 Mio. $). Was der Code kann, sehen die Teams erst nach Übernahme ihres Plans.
- Abzüge: zusätzliche Testläufe, mehr als 3 Beratungen, fehlendes Alignment, Konzeptänderung nach Pitch 1 (0,2 Mio.), Ergänzung nach Design Freeze (0,5 Mio.), Regel- oder Zeitverstoß (0,1 Mio.).
- Voting: eine Stimme pro Team (die zuletzt abgegebene zählt), keine Eigenstimme, fünf Kriterien von 0 bis 5: Pflichterfüllung, Stabilität im Einsatz, Integration der Zusatzfunktionen, Begründung der Investitionen, Kommunikation des Werts.

## Technik und Risiken

- Synchronisation zwischen Geräten über WebRTC (PeerJS 1.5.4, öffentlicher PeerJS-Broker). Ein Beamer-Tab im selben Browser synchronisiert zusätzlich lokal.
- **Vor Ort testen.** Hochschulnetze blockieren WebRTC teilweise. Fallback: mobiler Hotspot. Notfalls bucht die Spielleitung allein, Teams melden mündlich.
- Keine Server, keine Accounts. Gespeichert werden nur frei gewählte Vornamen, Team und Rolle, im Browser der Spielleitung. Export als CSV/JSON.
- Regeln (Budget, Code-Stufen, Boni, Abzüge, Phasen, Formate) stehen gebündelt in `CFG`, `PHASES` und `FORMATS` am Anfang des Skripts. Die Wertung (Stimmen × Punktwert) ist eine Annahme und sollte gegen die Originalregeln geprüft werden.

## Veröffentlichung

GitHub Pages: Settings → Pages → Branch `main`, Ordner `/ (root)`. Danach ist die Seite unter der oben genannten URL erreichbar.

## Lizenz

Code: MIT (wie das Original `lunar_rover_game`). Lehrmaterial: CC BY 4.0.
