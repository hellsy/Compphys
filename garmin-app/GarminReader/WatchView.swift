import SwiftUI
import Charts

struct WatchView: View {
    @ObservedObject var link = WatchLink.shared
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            List {
                deviceSection
                if !link.devices.isEmpty {
                    liveSection
                    if let s = link.snapshot { snapshotSection(s) }
                }
                if let m = link.message {
                    Text(m).font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Uhr live")
            .refreshable { link.requestSync() }
        }
    }

    private var deviceSection: some View {
        Section {
            if link.devices.isEmpty {
                Text("1. Uhren-App „Garmin Reader“ auf die Uhr laden (siehe README).\n2. Hier die Uhr auswählen – dafür öffnet sich einmal Garmin Connect.\n3. App auf der Uhr starten.")
                    .font(.subheadline)
            }
            ForEach(link.devices, id: \.uuid) { d in
                HStack {
                    Image(systemName: "applewatch.side.right")
                    Text(d.friendlyName ?? d.modelName ?? "Garmin")
                    Spacer()
                    Text(link.deviceStatus[d.uuid] ?? "–")
                        .font(.caption)
                        .foregroundStyle(link.deviceStatus[d.uuid] == "Verbunden" ? .green : .secondary)
                }
            }
            Button(link.devices.isEmpty ? "Uhr auswählen" : "Andere Uhr wählen") {
                link.chooseDevices()
            }
            if !link.devices.isEmpty {
                HStack {
                    Button("Daten holen") { link.requestSync() }
                        .buttonStyle(.borderedProminent)
                    Spacer()
                    Button("App auf Uhr öffnen") { link.openOnWatch() }
                        .buttonStyle(.bordered)
                }
            }
        }
    }

    private var liveSection: some View {
        Section("Puls live") {
            HStack(alignment: .firstTextBaseline) {
                Image(systemName: "heart.fill")
                    .foregroundStyle(.red)
                    .symbolEffect(.pulse, isActive: link.liveHR != nil)
                Text(link.liveHR.map(String.init) ?? "--")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text("bpm").foregroundStyle(.secondary)
                Spacer()
                if let t = link.liveTime {
                    Text(t, style: .time).font(.caption).foregroundStyle(.secondary)
                }
            }
            if link.liveSeries.count > 1 {
                Chart(link.liveSeries) { p in
                    LineMark(x: .value("Zeit", p.date), y: .value("bpm", p.value))
                        .foregroundStyle(.red)
                        .interpolationMethod(.monotone)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 150)
            }
        }
    }

    private func snapshotSection(_ s: WatchSnapshot) -> some View {
        Group {
            Section("Heute laut Uhr (\(s.time.formatted(date: .omitted, time: .shortened)))") {
                LazyVGrid(columns: columns, spacing: 10) {
                    StatTile(title: "Schritte", value: steps(s), symbol: "figure.walk", color: .teal)
                    StatTile(title: "Kalorien", value: Fmt.number(s.kcal.map(Double.init), unit: "kcal"), symbol: "flame.fill", color: .orange)
                    StatTile(title: "Distanz", value: Fmt.km(s.distance), symbol: "map", color: .blue)
                    StatTile(title: "Ruhepuls", value: Fmt.number(s.restingHR.map(Double.init), unit: "bpm"), symbol: "heart", color: .pink)
                    StatTile(title: "Stress", value: Fmt.number(s.stress.map(Double.init)), symbol: "brain.head.profile", color: .purple)
                    StatTile(title: "Body Battery", value: Fmt.number(s.bodyBattery.map(Double.init), unit: "%"), symbol: "battery.75percent", color: .green)
                    StatTile(title: "SpO₂", value: Fmt.number(s.spo2.map(Double.init), unit: "%"), symbol: "drop.fill", color: .cyan)
                    StatTile(title: "Etagen", value: Fmt.number(s.floors.map(Double.init)), symbol: "stairs", color: .brown)
                    StatTile(title: "Aktive Min.", value: Fmt.number(s.activeMinutes.map(Double.init)), symbol: "bolt.heart", color: .indigo)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
            }
            if s.hrHistory.count > 1 {
                Section("Puls, letzte 2 Stunden") {
                    Chart(s.hrHistory) { p in
                        AreaMark(x: .value("Zeit", p.date), y: .value("bpm", p.value))
                            .foregroundStyle(.red.opacity(0.15))
                        LineMark(x: .value("Zeit", p.date), y: .value("bpm", p.value))
                            .foregroundStyle(.red)
                    }
                    .frame(height: 170)
                }
            }
        }
    }

    private func steps(_ s: WatchSnapshot) -> String {
        let v = Fmt.number(s.steps.map(Double.init))
        guard let goal = s.stepGoal else { return v }
        return "\(v) / \(Fmt.number(Double(goal)))"
    }
}
