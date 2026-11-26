import Foundation
import HealthKit
import Observation

struct TimeValue: Identifiable {
    let date: Date
    let value: Double
    var id: Date { date }
}

struct WorkoutItem: Identifiable {
    let id: UUID
    let name: String
    let symbol: String
    let start: Date
    let duration: TimeInterval
    let distance: Double?   // m
    let kcal: Double?
    let source: String
}

/// Reads Garmin data from Apple Health. Garmin Connect writes steps, heart rate,
/// sleep, workouts etc. into Apple Health once the connection is switched on in the Connect app.
@MainActor @Observable
final class HealthStore {
    private let store = HKHealthStore()

    var garminOnly = true
    var isAuthorized = false
    var isLoading = false
    var errorText: String?
    var garminSourceFound = true

    var stepsToday: Double?
    var activeKcalToday: Double?
    var latestHR: Double?
    var restingHR: Double?
    var hrv: Double?
    var vo2max: Double?
    var sleepHours: Double?
    var weeklySteps: [TimeValue] = []
    var heartRateToday: [TimeValue] = []
    var workouts: [WorkoutItem] = []

    static var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private let bpm = HKUnit.count().unitDivided(by: .minute())

    private var readTypes: Set<HKObjectType> {
        [HKQuantityType(.stepCount), HKQuantityType(.heartRate), HKQuantityType(.restingHeartRate),
         HKQuantityType(.heartRateVariabilitySDNN), HKQuantityType(.vo2Max),
         HKQuantityType(.activeEnergyBurned), HKQuantityType(.distanceWalkingRunning),
         HKQuantityType(.distanceCycling), HKQuantityType(.distanceSwimming),
         HKCategoryType(.sleepAnalysis), HKObjectType.workoutType()]
    }

    /// Called on launch: if permission was already requested, load data right away.
    func checkStatus() async {
        guard Self.isAvailable else { return }
        if let status = try? await store.statusForAuthorizationRequest(toShare: [], read: readTypes),
           status == .unnecessary {
            isAuthorized = true
            await refresh()
        }
    }

    func requestAccess() async {
        guard Self.isAvailable else {
            errorText = "Apple Health ist auf diesem Gerät nicht verfügbar."
            return
        }
        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            isAuthorized = true
            await refresh()
        } catch {
            errorText = error.localizedDescription
        }
    }

    func refresh() async {
        isLoading = true
        errorText = nil
        defer { isLoading = false }

        let src = await sourcePredicate()
        let cal = Calendar.current
        let todayStart = cal.startOfDay(for: Date())
        let today = HKQuery.predicateForSamples(withStart: todayStart, end: Date())

        let steps = (try? await dailySum(.stepCount, unit: .count(), days: 7, source: src)) ?? []
        weeklySteps = steps
        stepsToday = steps.last?.value
        activeKcalToday = try? await dailySum(.activeEnergyBurned, unit: .kilocalorie(), days: 1, source: src).last?.value

        latestHR = try? await latest(.heartRate, unit: bpm, source: src)
        restingHR = try? await latest(.restingHeartRate, unit: bpm, source: src)
        hrv = try? await latest(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), source: src)
        vo2max = try? await latest(.vo2Max, unit: HKUnit(from: "ml/kg*min"), source: src)

        heartRateToday = (try? await samples(.heartRate, unit: bpm, predicate: and(today, src))) ?? []
        sleepHours = try? await sleepLastNight(source: src)
        workouts = (try? await loadWorkouts(source: src)) ?? []
    }

    // MARK: - Queries

    private func and(_ a: NSPredicate, _ b: NSPredicate?) -> NSPredicate {
        guard let b else { return a }
        return NSCompoundPredicate(andPredicateWithSubpredicates: [a, b])
    }

    /// Restricts queries to Garmin Connect as data source (if the toggle is on).
    private func sourcePredicate() async -> NSPredicate? {
        guard garminOnly else { garminSourceFound = true; return nil }
        var all = Set<HKSource>()
        let types: [HKSampleType] = [HKQuantityType(.stepCount), HKQuantityType(.heartRate), HKObjectType.workoutType()]
        for type in types {
            let found: Set<HKSource> = await withCheckedContinuation { cont in
                let q = HKSourceQuery(sampleType: type, samplePredicate: nil) { _, sources, _ in
                    cont.resume(returning: sources ?? [])
                }
                store.execute(q)
            }
            all.formUnion(found)
        }
        let garmin = all.filter {
            $0.bundleIdentifier.lowercased().contains("garmin") || $0.name.lowercased().contains("garmin")
        }
        garminSourceFound = !garmin.isEmpty
        return HKQuery.predicateForObjects(from: garmin)
    }

    private func dailySum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, days: Int, source: NSPredicate?) async throws -> [TimeValue] {
        let cal = Calendar.current
        let end = Date()
        let start = cal.date(byAdding: .day, value: -(days - 1), to: cal.startOfDay(for: end))!
        let pred = and(HKQuery.predicateForSamples(withStart: start, end: end), source)
        let query = HKStatisticsCollectionQueryDescriptor(
            predicate: .quantitySample(type: HKQuantityType(id), predicate: pred),
            options: .cumulativeSum,
            anchorDate: start,
            intervalComponents: DateComponents(day: 1))
        let collection = try await query.result(for: store)
        var out: [TimeValue] = []
        collection.enumerateStatistics(from: start, to: end) { stats, _ in
            out.append(TimeValue(date: stats.startDate, value: stats.sumQuantity()?.doubleValue(for: unit) ?? 0))
        }
        return out
    }

    private func latest(_ id: HKQuantityTypeIdentifier, unit: HKUnit, source: NSPredicate?) async throws -> Double? {
        let query = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(id), predicate: source)],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 1)
        return try await query.result(for: store).first?.quantity.doubleValue(for: unit)
    }

    private func samples(_ id: HKQuantityTypeIdentifier, unit: HKUnit, predicate: NSPredicate) async throws -> [TimeValue] {
        let query = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(id), predicate: predicate)],
            sortDescriptors: [SortDescriptor(\.startDate)],
            limit: 3000)
        return try await query.result(for: store).map {
            TimeValue(date: $0.startDate, value: $0.quantity.doubleValue(for: unit))
        }
    }

    private func sleepLastNight(source: NSPredicate?) async throws -> Double? {
        let start = Date().addingTimeInterval(-24 * 3600)
        let pred = and(HKQuery.predicateForSamples(withStart: start, end: Date()), source)
        let query = HKSampleQueryDescriptor(
            predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: pred)],
            sortDescriptors: [SortDescriptor(\.startDate)],
            limit: HKObjectQueryNoLimit)
        let asleep: Set<Int> = [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                                HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                                HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                                HKCategoryValueSleepAnalysis.asleepREM.rawValue]
        let seconds = try await query.result(for: store)
            .filter { asleep.contains($0.value) }
            .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
        return seconds > 0 ? seconds / 3600 : nil
    }

    private func loadWorkouts(source: NSPredicate?) async throws -> [WorkoutItem] {
        let query = HKSampleQueryDescriptor(
            predicates: [.workout(source)],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 30)
        let distanceTypes = [HKQuantityType(.distanceWalkingRunning), HKQuantityType(.distanceCycling),
                             HKQuantityType(.distanceSwimming)]
        return try await query.result(for: store).map { w in
            let dist = distanceTypes.compactMap { w.statistics(for: $0)?.sumQuantity()?.doubleValue(for: .meter()) }.first
            let kcal = w.statistics(for: HKQuantityType(.activeEnergyBurned))?.sumQuantity()?.doubleValue(for: .kilocalorie())
            return WorkoutItem(id: w.uuid,
                               name: w.workoutActivityType.germanName,
                               symbol: w.workoutActivityType.symbol,
                               start: w.startDate,
                               duration: w.duration,
                               distance: dist,
                               kcal: kcal,
                               source: w.sourceRevision.source.name)
        }
    }
}

extension HKWorkoutActivityType {
    var germanName: String {
        switch self {
        case .running: return "Laufen"
        case .cycling: return "Radfahren"
        case .swimming: return "Schwimmen"
        case .walking: return "Gehen"
        case .hiking: return "Wandern"
        case .rowing: return "Rudern"
        case .yoga: return "Yoga"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Krafttraining"
        case .crossCountrySkiing: return "Langlauf"
        case .downhillSkiing: return "Ski alpin"
        case .elliptical: return "Crosstrainer"
        default: return "Training"
        }
    }

    var symbol: String {
        switch self {
        case .running: return "figure.run"
        case .cycling: return "figure.outdoor.cycle"
        case .swimming: return "figure.pool.swim"
        case .walking: return "figure.walk"
        case .hiking: return "figure.hiking"
        case .rowing: return "figure.rower"
        case .yoga: return "figure.yoga"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "dumbbell"
        case .crossCountrySkiing: return "figure.skiing.crosscountry"
        case .downhillSkiing: return "figure.skiing.downhill"
        case .elliptical: return "figure.elliptical"
        default: return "figure.mixed.cardio"
        }
    }
}
