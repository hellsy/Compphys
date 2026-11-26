import SwiftUI

@main
struct GarminReaderApp: App {
    init() {
        WatchLink.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            TabView {
                WatchView()
                    .tabItem { Label("Uhr", systemImage: "applewatch.radiowaves.left.and.right") }
                HealthView()
                    .tabItem { Label("Health", systemImage: "heart.fill") }
                FITView()
                    .tabItem { Label("FIT-Datei", systemImage: "doc.text.magnifyingglass") }
            }
            .tint(.teal)
            .onOpenURL { WatchLink.shared.handle(url: $0) }
        }
    }
}

// MARK: - Shared helpers

struct StatTile: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: symbol)
                .font(.caption)
                .foregroundStyle(color)
            Text(value)
                .font(.title3.weight(.semibold))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
    }
}

enum Fmt {
    static func number(_ v: Double?, digits: Int = 0, unit: String = "") -> String {
        guard let v else { return "–" }
        let s = v.formatted(.number.precision(.fractionLength(digits)))
        return unit.isEmpty ? s : "\(s) \(unit)"
    }

    static func duration(_ s: Double?) -> String {
        guard let s else { return "–" }
        let t = Int(s.rounded())
        let h = t / 3600, m = (t % 3600) / 60, sec = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
    }

    static func km(_ m: Double?) -> String {
        number(m.map { $0 / 1000 }, digits: 2, unit: "km")
    }

    /// Pace in min/km from speed in m/s.
    static func pace(_ v: Double?) -> String {
        guard let v, v > 0.3 else { return "–" }
        let secPerKm = 1000 / v
        return String(format: "%d:%02d /km", Int(secPerKm) / 60, Int(secPerKm) % 60)
    }
}
