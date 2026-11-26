import SwiftUI
import Charts
import MapKit
import UniformTypeIdentifiers

struct FITView: View {
    @State private var activity: FITActivity?
    @State private var showImporter = false
    @State private var errorText: String?
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    private var fitTypes: [UTType] {
        [UTType(filenameExtension: "fit"), .data].compactMap { $0 }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        showImporter = true
                    } label: {
                        Label("FIT-Datei öffnen", systemImage: "folder")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    Text("FIT-Datei aus Garmin Connect (Web: Aktivität → Zahnrad → „Original exportieren“, ZIP in der Dateien-App entpacken) oder direkt von der Uhr.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if let err = errorText {
                    Text(err).foregroundStyle(.red)
                }
                if let a = activity {
                    summary(a)
                    if a.coordinates.count > 1 { mapSection(a) }
                    chartSection("Puls", unit: "bpm", color: .red, a) { $0.heartRate }
                    chartSection("Höhe", unit: "m", color: .green, a) { $0.altitude }
                    chartSection("Tempo", unit: "km/h", color: .blue, a) { $0.speed.map { $0 * 3.6 } }
                    chartSection("Leistung", unit: "W", color: .orange, a) { $0.power }
                }
            }
            .navigationTitle(activity?.session?.sport ?? "FIT-Datei")
            .fileImporter(isPresented: $showImporter, allowedContentTypes: fitTypes) { result in
                load(result)
            }
        }
    }

    private func load(_ result: Result<URL, Error>) {
        errorText = nil
        do {
            let url = try result.get()
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let data = try Data(contentsOf: url)
            activity = try FITParser.parse(data, fileName: url.lastPathComponent)
        } catch {
            activity = nil
            errorText = error.localizedDescription
        }
    }

    private func summary(_ a: FITActivity) -> some View {
        Section(a.start?.formatted(date: .long, time: .shortened) ?? a.fileName) {
            LazyVGrid(columns: columns, spacing: 10) {
                StatTile(title: "Dauer", value: Fmt.duration(a.duration), symbol: "stopwatch", color: .teal)
                StatTile(title: "Distanz", value: Fmt.km(a.distance), symbol: "point.topleft.down.to.point.bottomright.curvepath", color: .blue)
                StatTile(title: "Ø Puls", value: Fmt.number(a.avgHR, unit: "bpm"), symbol: "heart.fill", color: .red)
                StatTile(title: "Max Puls", value: Fmt.number(a.maxHR, unit: "bpm"), symbol: "heart", color: .pink)
                StatTile(title: "Ø Pace", value: Fmt.pace(a.session?.avgSpeed), symbol: "speedometer", color: .indigo)
                StatTile(title: "Kalorien", value: Fmt.number(a.session?.kcal, unit: "kcal"), symbol: "flame.fill", color: .orange)
                StatTile(title: "Anstieg", value: Fmt.number(a.session?.ascent, unit: "m"), symbol: "mountain.2.fill", color: .green)
                StatTile(title: "Messpunkte", value: "\(a.records.count)", symbol: "chart.dots.scatter", color: .gray)
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
        }
    }

    private func mapSection(_ a: FITActivity) -> some View {
        Section("Strecke") {
            Map(initialPosition: .automatic) {
                MapPolyline(coordinates: a.coordinates)
                    .stroke(.orange, lineWidth: 4)
            }
            .frame(height: 260)
            .listRowInsets(EdgeInsets())
        }
    }

    /// Line chart over elapsed minutes; thinned out to at most ~1500 points.
    @ViewBuilder
    private func chartSection(_ title: String, unit: String, color: Color, _ a: FITActivity,
                              value: (FITRecord) -> Double?) -> some View {
        let t0 = a.records.first?.time ?? Date()
        let step = max(1, a.records.count / 1500)
        let points: [(Double, Double)] = stride(from: 0, to: a.records.count, by: step).compactMap { i in
            let r = a.records[i]
            guard let v = value(r) else { return nil }
            return (r.time.timeIntervalSince(t0) / 60, v)
        }
        if points.count > 1 {
            Section("\(title) (\(unit))") {
                Chart(points.indices, id: \.self) { i in
                    LineMark(x: .value("Minuten", points[i].0), y: .value(title, points[i].1))
                        .foregroundStyle(color)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .chartXAxisLabel("Minuten")
                .frame(height: 170)
            }
        }
    }
}
