# Scratch-Einführung: Ein Binärrechner zum Zusammenstecken

*Mathematik Klasse 9 · Gesamtschule NRW*

## Vorwissen: Stellenwerte
Im Zehnersystem ist jede Stelle 10-mal so viel wert wie ihre rechte Nachbarin. Im **Dualsystem** gibt es nur 0 und 1, jede Stelle ist **2-mal** so viel wert: 1011₂ = 8 + 0 + 2 + 1 = 11.

## Neue Begriffe
- **Block:** ein Befehl als Puzzleteil, z. B. `sage ()`.
- **Skript:** zusammengesteckte Blöcke, ausgeführt von oben nach unten.
- **Ereignis:** startet das Skript, z. B. `Wenn ⚑ angeklickt wird`.
- **Variable:** ein beschrifteter Speicher für eine Zahl, z. B. `Ergebnis`.
- **Schleife:** wiederholt Blöcke, z. B. `wiederhole () mal`.

## Beispiel: Dualzahl → Dezimalzahl
Ziffern von links lesen, jedes Mal rechnen: **Ergebnis · 2 + Ziffer**.

```
Wenn ⚑ angeklickt wird
frage [Gib eine Dualzahl ein] und warte
setze [Ergebnis] auf (0)
setze [Stelle] auf (1)
wiederhole (Länge von (Antwort)) mal
    setze [Ergebnis] auf ((Ergebnis) * (2)) + (Zeichen (Stelle) von (Antwort))
    ändere [Stelle] um (1)
end
sage (verbinde [Dezimal: ] und (Ergebnis))
```

Eingabe **1011**:

| Stelle | Ziffer | Rechnung | Ergebnis |
|---|---|---|---|
| 1 | 1 | 0 · 2 + 1 | 1 |
| 2 | 0 | 1 · 2 + 0 | 2 |
| 3 | 1 | 2 · 2 + 1 | 5 |
| 4 | 1 | 5 · 2 + 1 | **11** |

## Analogie: LEGO
Blöcke passen nur in passende Lücken – wie LEGO-Steine.
**Grenze:** Bei LEGO ist die Reihenfolge oft egal, in Scratch bestimmt sie das Ergebnis. Ein passender Block kann trotzdem falsch rechnen.

## Verständnisfragen
1. **Was zeigt der Rechner bei 110?** – 6 (0 → 1 → 3 → 6).
2. **Warum braucht man die Variable `Stelle`?** – Sie merkt sich, welche Ziffer gerade dran ist.
3. **Was passiert, wenn `setze Ergebnis auf 0` fehlt?** – Ab dem zweiten Start rechnet Scratch mit dem alten Ergebnis weiter.
