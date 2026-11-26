# Garmin Reader (iPhone-App)

SwiftUI-App, die Garmin-Daten auf dem iPhone anzeigt:

- **Health-Tab:** liest aus Apple Health, was Garmin Connect dort ablegt – Schritte, Puls, Ruhepuls, HRV,
  VO₂max, Schlaf, aktive Kalorien und Aktivitäten. Schalter „Nur Daten von Garmin Connect“ filtert nach Quelle.
- **FIT-Tab:** öffnet `.fit`-Dateien (Original-Export aus Garmin Connect oder direkt von der Uhr) und zeigt
  Zusammenfassung, Strecke auf der Karte sowie Puls, Höhe, Tempo und Leistung als Diagramm.
  Der FIT-Decoder (`FITParser.swift`) ist selbst geschrieben, ohne fremde Bibliothek.

## Starten

1. Am Mac `GarminReader.xcodeproj` mit Xcode 16 oder neuer öffnen.
2. Target „GarminReader“ → *Signing & Capabilities*: eigenes Team wählen (kostenlose Apple-ID reicht),
   ggf. Bundle-ID ändern.
3. iPhone anschließen, auswählen, ▶ drücken (iOS 17 oder neuer).
4. In der Garmin Connect App: *Mehr → Einstellungen → Verbundene Apps → Apple Health* einschalten.
