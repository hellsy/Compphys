import SwiftUI
import Charts

struct HealthView: View {
    @State private var health = HealthStore()
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            List {
                if !health.isAuthorized {
                    connectSection
                } else {
                    Section {
                        Toggle("Nur Daten von Garmin Connect", isOn: $health.garminOnly)
                        if health.garminOnly && !health.garminSourceFound {
                            Text("Keine Garmin-Daten in Apple Health gefunden. Prüfe in Garmin Connect: Mehr → Einstellungen → Verbundene Apps → Apple Health.")
                                .font(.footnote)
                                .foregroundStyle(.orange)
                        }
                    }
                    todaySection
                    stepsSection
                    heartSection
                    workoutsSection
                }
                if let err = health.errorText {
                    Text(err).foregroundStyle(.red)
                }
            }
            .navigationTitle("Garmin-Daten")
            .toolbar {
                if health.isLoading { ProgressView() }
            }
            .refreshable { await health.refresh() }
            .task { await health.checkStatus() }
            .onChange(of: health.garminOnly) {
                Task { await health.refresh() }
            }
        }
    }

    private var connectSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                Text("So kommen die Daten aufs iPhone")
                    .font(.headline)
                Text("1. In der Garmin Connect App: Mehr → Einstellungen → Verbundene Apps → Apple Health einschalten.\n2. Hier den Zugriff auf Apple Health erlauben.")
                    .font(.subheadline)
                Button {
                    Task { await health.requestAccess() }
                } label: {
                    Label("Zugriff auf Apple Health erlauben", systemImage: "heart.text.square")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!HealthStore.isAvailable)
            }
            .padding(.vertical, 6)
        }
    }

    private var todaySection: some View {
        Section("Heute") {
            LazyVGrid(columns: columns, spacing: 10) {
                StatTile(title: "Schritte", value: Fmt.number(health.stepsToday), symbol: "figure.walk", color: .teal)
                StatTile(title: "Aktive kcal", value: Fmt.number(health.activeKcalToday), symbol: "flame.fill", color: .orange)
                StatTile(title: "Puls zuletzt", value: Fmt.number(health.latestHR, unit: "bpm"), symbol: "heart.fill", color: .red)
                StatTile(title: "Ruhepuls", value: Fmt.number(health.restingHR, unit: "bpm"), symbol: "heart", color: .pink)
                StatTile(title: "HRV", value: Fmt.number(health.hrv, unit: "ms"), symbol: "waveform.path.ecg", color: .purple)
                StatTile(title: "VO₂max", value: Fmt.number(health.vo2max, digits: 1), symbol: "lungs.fill", color: .blue)
                StatTile(title: "Schlaf", value: Fmt.number(health.sleepHours, digits: 1, unit: "h"), symbol: "bed.double.fill", color: .indigo)
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
        }
    }

    private var stepsSection: some View {
        Section("Schritte, letzte 7 Tage") {
            if health.weeklySteps.isEmpty {
                Text("Keine Daten").foregroundStyle(.secondary)
            } else {
                Chart(health.weeklySteps) { d in
                    BarMark(x: .value("Tag", d.date, unit: .day),
                            y: .value("Schritte", d.value))
                        .foregroundStyle(.teal.gradient)
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day)) { _ in
                        AxisValueLabel(format: .dateTime.weekday(.abbreviated))
                    }
                }
                .frame(height: 180)
            }
        }
    }

    private var heartSection: some View {
        Section("Puls heute") {
            if health.heartRateToday.isEmpty {
                Text("Keine Daten").foregroundStyle(.secondary)
            } else {
                Chart(health.heartRateToday) { d in
                    LineMark(x: .value("Zeit", d.date), y: .value("bpm", d.value))
                        .foregroundStyle(.red)
                        .interpolationMethod(.monotone)
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 180)
            }
        }
    }

    private var workoutsSection: some View {
        Section("Aktivitäten") {
            if health.workouts.isEmpty {
                Text("Keine Aktivitäten").foregroundStyle(.secondary)
            }
            ForEach(health.workouts) { w in
                HStack(spacing: 12) {
                    Image(systemName: w.symbol)
                        .font(.title2)
                        .foregroundStyle(.teal)
                        .frame(width: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(w.name).font(.headline)
                        Text(w.start.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(Fmt.duration(w.duration)).monospacedDigit()
                        if let d = w.distance {
                            Text(Fmt.km(d)).font(.caption).foregroundStyle(.secondary)
                        } else if let k = w.kcal {
                            Text(Fmt.number(k, unit: "kcal")).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
}
