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
3. Studierende scannen den QR-Code, wählen Team, Rolle (Engineering, Marketing, Finance) und Vornamen.
4. Phasen 0 bis 6 über die Spielleitung weiterschalten.

## Technik und Risiken

- Synchronisation zwischen Geräten über WebRTC (PeerJS 1.5.4, öffentlicher PeerJS-Broker). Ein Beamer-Tab im selben Browser synchronisiert zusätzlich lokal.
- **Vor Ort testen.** Hochschulnetze blockieren WebRTC teilweise. Fallback: mobiler Hotspot. Notfalls bucht die Spielleitung allein, Teams melden mündlich.
- Keine Server, keine Accounts. Gespeichert werden nur frei gewählte Vornamen, Team und Rolle, im Browser der Spielleitung. Export als CSV/JSON.
- Regeln (Budget, Code-Stufen, Boni, Abzüge, Phasen, Formate) stehen gebündelt in `CFG`, `PHASES` und `FORMATS` am Anfang des Skripts. Die Wertung (Stimmen × Punktwert) ist eine Annahme und sollte gegen die Originalregeln geprüft werden.

## Veröffentlichung

GitHub Pages: Settings → Pages → Branch `main`, Ordner `/ (root)`. Danach ist die Seite unter der oben genannten URL erreichbar.

## Lizenz

Code: MIT (wie das Original `lunar_rover_game`). Lehrmaterial: CC BY 4.0.
