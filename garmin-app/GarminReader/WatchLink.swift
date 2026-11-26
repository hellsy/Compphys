import Foundation
import ConnectIQ

/// Values of a full "snapshot" message from the watch app.
struct WatchSnapshot {
    var time: Date
    var heartRate: Int?
    var steps: Int?
    var stepGoal: Int?
    var kcal: Int?
    var distance: Double?      // m
    var floors: Int?
    var activeMinutes: Int?
    var restingHR: Int?
    var stress: Int?
    var bodyBattery: Int?
    var spo2: Int?
    var hrHistory: [TimeValue]
}

/// Bluetooth link to the Connect IQ watch app (garmin-app/watch-app) via the Connect IQ Mobile SDK.
/// Garmin Connect is only needed once, to pick the watch; data then flows directly.
final class WatchLink: NSObject, ObservableObject, IQDeviceEventDelegate, IQAppMessageDelegate {
    static let shared = WatchLink()

    /// URL scheme Garmin Connect uses to return the device list (also in Info.plist).
    static let urlScheme = "garminreader-ciq"
    /// Must match the application id in watch-app/manifest.xml.
    static let watchAppID = UUID(uuidString: "507d8a11-8423-41da-9892-9bfc57ce3d5a")!

    @Published var devices: [IQDevice] = []
    @Published var deviceStatus: [UUID: String] = [:]
    @Published var liveHR: Int?
    @Published var liveTime: Date?
    @Published var liveSeries: [TimeValue] = []
    @Published var snapshot: WatchSnapshot?
    @Published var message: String?

    private var apps: [UUID: IQApp] = [:]
    private var started = false
    private let storeKey = "ciqDevices"

    private var ciq: ConnectIQ { ConnectIQ.sharedInstance() }

    func start() {
        guard !started else { return }
        started = true
        ciq.initialize(withUrlScheme: Self.urlScheme, uiOverrideDelegate: nil)
        devices = loadDevices()
        registerAll()
    }

    /// Opens Garmin Connect to choose the watch; it returns via the URL scheme.
    func chooseDevices() {
        ciq.showConnectIQDeviceSelection()
    }

    func handle(url: URL) {
        guard url.scheme == Self.urlScheme,
              let list = ciq.parseDeviceSelectionResponse(from: url) as? [IQDevice] else { return }
        ciq.unregisterForAllDeviceEvents(self)
        ciq.unregisterForAllAppMessages(self)
        devices = list
        saveDevices()
        registerAll()
    }

    /// Asks the watch app for a full snapshot.
    func requestSync() {
        guard !apps.isEmpty else { message = "Keine Uhr ausgewählt."; return }
        for app in apps.values {
            ciq.sendMessage("sync", to: app, progress: nil) { [weak self] result in
                DispatchQueue.main.async {
                    self?.message = result.rawValue == 0 ? "Anfrage gesendet" : "Senden fehlgeschlagen (Code \(result.rawValue)) – ist die App auf der Uhr offen?"
                }
            }
        }
    }

    /// Shows a prompt on the watch to open the watch app.
    func openOnWatch() {
        for app in apps.values {
            ciq.openAppRequest(app) { [weak self] result in
                DispatchQueue.main.async {
                    self?.message = result.rawValue == 0 ? "Bitte auf der Uhr bestätigen" : "Uhr nicht erreichbar (Code \(result.rawValue))"
                }
            }
        }
    }

    // MARK: - Registration and persistence

    private func registerAll() {
        apps = [:]
        for device in devices {
            ciq.register(forDeviceEvents: device, delegate: self)
            let app = IQApp(uuid: Self.watchAppID, storeUuid: nil, device: device)
            apps[device.uuid] = app
            ciq.register(forAppMessages: app, delegate: self)
            deviceStatus[device.uuid] = Self.text(for: ciq.getDeviceStatus(device))
        }
    }

    private func saveDevices() {
        if let data = try? NSKeyedArchiver.archivedData(withRootObject: devices, requiringSecureCoding: true) {
            UserDefaults.standard.set(data, forKey: storeKey)
        }
    }

    private func loadDevices() -> [IQDevice] {
        guard let data = UserDefaults.standard.data(forKey: storeKey),
              let list = try? NSKeyedUnarchiver.unarchivedArrayOfObjects(ofClass: IQDevice.self, from: data)
        else { return [] }
        return list
    }

    private static func text(for status: IQDeviceStatus) -> String {
        // Raw values from IQDevice.h: InvalidDevice, BluetoothNotReady, NotFound, NotConnected, Connected
        switch status.rawValue {
        case 4: return "Verbunden"
        case 3: return "Nicht verbunden"
        case 2: return "Nicht gefunden"
        case 1: return "Bluetooth aus"
        default: return "Ungültig"
        }
    }

    // MARK: - SDK delegates

    func deviceStatusChanged(_ device: IQDevice!, status: IQDeviceStatus) {
        let text = Self.text(for: status)
        DispatchQueue.main.async {
            self.deviceStatus[device.uuid] = text
            if status.rawValue == 4 { self.requestSync() }
        }
    }

    func receivedMessage(_ message: Any!, from app: IQApp!) {
        guard let d = message as? [String: Any] else { return }
        DispatchQueue.main.async { self.apply(d) }
    }

    private func apply(_ d: [String: Any]) {
        func int(_ key: String) -> Int? { (d[key] as? NSNumber)?.intValue }
        let time = int("time").map { Date(timeIntervalSince1970: TimeInterval($0)) } ?? Date()

        if let hr = int("hr") {
            liveHR = hr
            liveTime = time
            liveSeries.append(TimeValue(date: time, value: Double(hr)))
            if liveSeries.count > 360 { liveSeries.removeFirst(liveSeries.count - 360) }
        }

        guard d["type"] as? String == "snapshot" else { return }
        let hist: [TimeValue] = (d["hrHist"] as? [[Any]] ?? []).compactMap { pair in
            guard pair.count == 2,
                  let t = (pair[0] as? NSNumber)?.doubleValue,
                  let v = (pair[1] as? NSNumber)?.doubleValue else { return nil }
            return TimeValue(date: Date(timeIntervalSince1970: t), value: v)
        }
        snapshot = WatchSnapshot(time: time,
                                 heartRate: int("hr"),
                                 steps: int("steps"),
                                 stepGoal: int("stepGoal"),
                                 kcal: int("kcal"),
                                 distance: (d["distM"] as? NSNumber)?.doubleValue,
                                 floors: int("floors"),
                                 activeMinutes: int("activeMin"),
                                 restingHR: int("restHR"),
                                 stress: int("stress"),
                                 bodyBattery: int("bodyBattery"),
                                 spo2: int("spo2"),
                                 hrHistory: hist)
        message = "Daten empfangen \(time.formatted(date: .omitted, time: .shortened))"
    }
}
