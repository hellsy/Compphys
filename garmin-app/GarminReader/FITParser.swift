import Foundation
import CoreLocation

/// One sample of a "record" message (global message 20).
struct FITRecord: Identifiable {
    let id: Int
    var time: Date
    var heartRate: Double?
    var speed: Double?        // m/s
    var distance: Double?     // m
    var altitude: Double?     // m
    var cadence: Double?
    var power: Double?        // W
    var coordinate: CLLocationCoordinate2D?
}

/// Summary of a "session" message (global message 18).
struct FITSession {
    var sport: String?
    var start: Date?
    var elapsed: Double?      // s
    var timer: Double?        // s
    var distance: Double?     // m
    var kcal: Double?
    var avgHR: Double?
    var maxHR: Double?
    var avgSpeed: Double?     // m/s
    var ascent: Double?       // m
}

struct FITActivity {
    var fileName: String
    var records: [FITRecord]
    var session: FITSession?

    var coordinates: [CLLocationCoordinate2D] { records.compactMap(\.coordinate) }
    var start: Date? { session?.start ?? records.first?.time }
    var duration: Double? {
        if let t = session?.timer ?? session?.elapsed { return t }
        guard let a = records.first?.time, let b = records.last?.time else { return nil }
        return b.timeIntervalSince(a)
    }
    var distance: Double? { session?.distance ?? records.last(where: { $0.distance != nil })?.distance }
    var avgHR: Double? {
        if let h = session?.avgHR { return h }
        let hr = records.compactMap(\.heartRate)
        return hr.isEmpty ? nil : hr.reduce(0, +) / Double(hr.count)
    }
    var maxHR: Double? { session?.maxHR ?? records.compactMap(\.heartRate).max() }
}

enum FITError: LocalizedError {
    case notFIT, truncated, missingDefinition(Int)

    var errorDescription: String? {
        switch self {
        case .notFIT: return "Das ist keine FIT-Datei."
        case .truncated: return "Die Datei ist unvollständig."
        case .missingDefinition(let n): return "Fehlende Definition für lokale Nachricht \(n)."
        }
    }
}

/// Minimal decoder for Garmin FIT activity files (binary protocol, see the FIT SDK).
/// Reads definition and data messages, compressed timestamps and developer fields (skipped).
enum FITParser {
    static let fitEpoch: TimeInterval = 631_065_600   // 1989-12-31 00:00 UTC

    private struct FieldDef { let num: UInt8; let size: Int; let baseType: UInt8 }
    private struct MessageDef { let global: UInt16; let bigEndian: Bool; let fields: [FieldDef]; let devSize: Int }

    static func parse(_ data: Data, fileName: String = "") throws -> FITActivity {
        let b = [UInt8](data)
        guard b.count >= 12 else { throw FITError.notFIT }
        let headerSize = Int(b[0])
        guard headerSize >= 12, b.count >= headerSize,
              b[8..<12].elementsEqual(Array(".FIT".utf8)) else { throw FITError.notFIT }
        let dataSize = Int(b[4]) | Int(b[5]) << 8 | Int(b[6]) << 16 | Int(b[7]) << 24
        let end = min(headerSize + dataSize, b.count)

        var pos = headerSize
        var defs: [Int: MessageDef] = [:]
        var lastTimestamp: UInt32 = 0
        var records: [FITRecord] = []
        var session: FITSession?

        func handle(_ global: UInt16, _ v: [UInt8: Double]) {
            switch global {
            case 20:
                guard let t = date(v[253]) else { return }
                var r = FITRecord(id: records.count, time: t)
                r.heartRate = v[3]
                r.cadence = v[4]
                r.power = v[7]
                r.distance = v[5].map { $0 / 100 }
                r.speed = (v[73] ?? v[6]).map { $0 / 1000 }
                r.altitude = (v[78] ?? v[2]).map { $0 / 5 - 500 }
                if let lat = v[0], let lon = v[1] {
                    let k = 180.0 / 2_147_483_648.0   // semicircles -> degrees
                    r.coordinate = CLLocationCoordinate2D(latitude: lat * k, longitude: lon * k)
                }
                records.append(r)
            case 18 where session == nil:
                session = FITSession(
                    sport: v[5].map { sportName(Int($0)) },
                    start: date(v[2]),
                    elapsed: v[7].map { $0 / 1000 },
                    timer: v[8].map { $0 / 1000 },
                    distance: v[9].map { $0 / 100 },
                    kcal: v[11],
                    avgHR: v[16],
                    maxHR: v[17],
                    avgSpeed: (v[124] ?? v[14]).map { $0 / 1000 },
                    ascent: v[22])
            default:
                break
            }
        }

        while pos < end {
            let h = b[pos]; pos += 1
            if h & 0x80 != 0 {
                // Compressed timestamp header: data message with 5-bit time offset.
                let local = Int((h >> 5) & 0x03)
                let offset = UInt32(h & 0x1F)
                var ts = (lastTimestamp & ~UInt32(0x1F)) + offset
                if offset < (lastTimestamp & 0x1F) { ts += 0x20 }
                lastTimestamp = ts
                guard let def = defs[local] else { throw FITError.missingDefinition(local) }
                var values = try readFields(def, b, &pos, end)
                if values[253] == nil { values[253] = Double(ts) }
                handle(def.global, values)
            } else if h & 0x40 != 0 {
                // Definition message.
                let local = Int(h & 0x0F)
                guard pos + 5 <= end else { throw FITError.truncated }
                let big = b[pos + 1] == 1
                let global = big ? UInt16(b[pos + 2]) << 8 | UInt16(b[pos + 3])
                                 : UInt16(b[pos + 3]) << 8 | UInt16(b[pos + 2])
                let n = Int(b[pos + 4]); pos += 5
                guard pos + 3 * n <= end else { throw FITError.truncated }
                var fields: [FieldDef] = []
                for i in 0..<n {
                    let p = pos + 3 * i
                    fields.append(FieldDef(num: b[p], size: Int(b[p + 1]), baseType: b[p + 2]))
                }
                pos += 3 * n
                var devSize = 0
                if h & 0x20 != 0 {
                    guard pos < end else { throw FITError.truncated }
                    let nd = Int(b[pos]); pos += 1
                    guard pos + 3 * nd <= end else { throw FITError.truncated }
                    for i in 0..<nd { devSize += Int(b[pos + 3 * i + 1]) }
                    pos += 3 * nd
                }
                defs[local] = MessageDef(global: global, bigEndian: big, fields: fields, devSize: devSize)
            } else {
                // Normal data message.
                let local = Int(h & 0x0F)
                guard let def = defs[local] else { throw FITError.missingDefinition(local) }
                let values = try readFields(def, b, &pos, end)
                if let t = values[253] { lastTimestamp = UInt32(t) }
                handle(def.global, values)
            }
        }
        return FITActivity(fileName: fileName, records: records, session: session)
    }

    private static func date(_ v: Double?) -> Date? {
        v.map { Date(timeIntervalSince1970: $0 + fitEpoch) }
    }

    private static func readFields(_ def: MessageDef, _ b: [UInt8], _ pos: inout Int, _ end: Int) throws -> [UInt8: Double] {
        var out: [UInt8: Double] = [:]
        for f in def.fields {
            guard pos + f.size <= end else { throw FITError.truncated }
            if let v = decode(b, pos, f.size, f.baseType, def.bigEndian) { out[f.num] = v }
            pos += f.size
        }
        guard pos + def.devSize <= end else { throw FITError.truncated }
        pos += def.devSize
        return out
    }

    /// Decodes the first element of a field; returns nil for invalid values and strings.
    private static func decode(_ b: [UInt8], _ p: Int, _ size: Int, _ baseType: UInt8, _ big: Bool) -> Double? {
        let type = baseType & 0x1F
        let typeSize: Int
        switch type {
        case 0x00, 0x01, 0x02, 0x0A, 0x0D: typeSize = 1
        case 0x03, 0x04, 0x0B: typeSize = 2
        case 0x05, 0x06, 0x08, 0x0C: typeSize = 4
        case 0x09, 0x0E, 0x0F, 0x10: typeSize = 8
        default: return nil
        }
        guard size >= typeSize else { return nil }
        var raw: UInt64 = 0
        for i in 0..<typeSize {
            raw = raw << 8 | UInt64(b[p + (big ? i : typeSize - 1 - i)])
        }
        switch type {
        case 0x00, 0x02, 0x0D: return raw == 0xFF ? nil : Double(raw)
        case 0x0A, 0x0B, 0x0C, 0x10: return raw == 0 ? nil : Double(raw)
        case 0x01:
            let v = Int8(bitPattern: UInt8(raw)); return v == .max ? nil : Double(v)
        case 0x03:
            let v = Int16(bitPattern: UInt16(raw)); return v == .max ? nil : Double(v)
        case 0x04: return raw == 0xFFFF ? nil : Double(raw)
        case 0x05:
            let v = Int32(bitPattern: UInt32(raw)); return v == .max ? nil : Double(v)
        case 0x06: return raw == 0xFFFF_FFFF ? nil : Double(raw)
        case 0x08:
            let f = Float(bitPattern: UInt32(raw)); return raw == 0xFFFF_FFFF || !f.isFinite ? nil : Double(f)
        case 0x09:
            let d = Double(bitPattern: raw); return raw == .max || !d.isFinite ? nil : d
        case 0x0E:
            let v = Int64(bitPattern: raw); return v == .max ? nil : Double(v)
        case 0x0F: return raw == .max ? nil : Double(raw)
        default: return nil
        }
    }

    static func sportName(_ code: Int) -> String {
        switch code {
        case 0: return "Allgemein"
        case 1: return "Laufen"
        case 2: return "Radfahren"
        case 4: return "Fitnessgerät"
        case 5: return "Schwimmen"
        case 10: return "Training"
        case 11: return "Gehen"
        case 12: return "Langlauf"
        case 13: return "Ski alpin"
        case 15: return "Rudern"
        case 17: return "Wandern"
        case 19: return "Paddeln"
        default: return "Sport \(code)"
        }
    }
}
