# Garmin Reader (iPhone-App + Uhren-App)

SwiftUI-App, die Garmin-Daten auf dem iPhone anzeigt. Drei Tabs:

- **Uhr:** direkte Bluetooth-Verbindung zur eigenen Connect-IQ-App auf der Uhr (`watch-app/`).
  Puls kommt live alle 5 Sekunden; auf Anfrage („Daten holen“ oder START an der Uhr) kommen auch
  Schritte, Kalorien, Distanz, Ruhepuls, Stress, Body Battery, SpO₂, Etagen und der Puls der letzten 2 Stunden.
  Nutzt das offizielle Connect IQ Mobile SDK (Swift Package, lädt Xcode automatisch).
- **Health:** liest aus Apple Health, was Garmin Connect dort ablegt (Schritte, Puls, HRV, VO₂max, Schlaf, Aktivitäten).
- **FIT-Datei:** öffnet `.fit`-Dateien und zeigt Karte, Puls, Höhe, Tempo, Leistung (eigener Decoder, `FITParser.swift`).

## 1. Uhren-App bauen und aufspielen

1. Connect IQ SDK installieren (SDK Manager von developer.garmin.com) und VS Code mit der Erweiterung „Monkey C“.
2. Einmalig einen Entwicklerschlüssel erzeugen: VS Code → *Monkey C: Generate a Developer Key*.
3. Ordner `watch-app/` öffnen. Falls dein Uhrenmodell fehlt: *Monkey C: Edit Products* und es anhaken.
4. *Monkey C: Build for Device* → ergibt `GarminReader.prg`.
5. Uhr per USB an den Computer, die `.prg` nach `GARMIN/APPS/` kopieren, Uhr abziehen.

## 2. iPhone-App starten

1. Am Mac `GarminReader.xcodeproj` mit Xcode 16 oder neuer öffnen (das ConnectIQ-Paket wird geladen).
2. Target „GarminReader“ → *Signing & Capabilities*: eigenes Team wählen, ggf. Bundle-ID ändern.
3. iPhone auswählen, ▶ drücken (iOS 17 oder neuer).
4. Tab **Uhr** → „Uhr auswählen“ (öffnet einmal Garmin Connect), dann die App auf der Uhr starten.

Für den Health-Tab in Garmin Connect *Mehr → Einstellungen → Verbundene Apps → Apple Health* einschalten.

Die App-ID der Uhren-App (`manifest.xml`) und `WatchLink.watchAppID` müssen gleich sein.
