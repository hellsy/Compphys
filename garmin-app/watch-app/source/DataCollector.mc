import Toybox.Activity;
import Toybox.ActivityMonitor;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.SensorHistory;
import Toybox.Time;
import Toybox.Timer;
import Toybox.UserProfile;
import Toybox.WatchUi;

// Collects values on the watch and sends them to the phone.
//  - every 5 s a small "live" message with the current heart rate
//  - a full "snapshot" (steps, calories, stress, body battery, HR history ...)
//    when the phone sends "sync" or the START button is pressed
class DataCollector {
    var heartRate = null;
    var steps = null;
    var status = "Bereit";
    var sentCount = 0;

    hidden var _timer;
    hidden var _tick = 0;
    hidden var _busy = false;

    function initialize() {
        _timer = new Timer.Timer();
    }

    function start() {
        Communications.registerForPhoneAppMessages(method(:onPhoneMessage));
        _timer.start(method(:onTimer), 1000, true);
    }

    function stop() {
        _timer.stop();
    }

    function onTimer() as Void {
        var info = Activity.getActivityInfo();
        heartRate = (info != null) ? info.currentHeartRate : null;
        steps = ActivityMonitor.getInfo().steps;
        _tick += 1;
        if (_tick % 5 == 0) {
            send(live());
        }
        WatchUi.requestUpdate();
    }

    function onPhoneMessage(msg as Communications.PhoneAppMessage) as Void {
        var data = msg.data;
        if (data instanceof Lang.String && data.equals("sync")) {
            send(snapshot());
        }
    }

    function live() {
        var d = { "type" => "live", "time" => Time.now().value() };
        if (heartRate != null) { d["hr"] = heartRate; }
        return d;
    }

    function snapshot() {
        var d = live();
        d["type"] = "snapshot";

        var am = ActivityMonitor.getInfo();
        if (am.steps != null) { d["steps"] = am.steps; }
        if (am.stepGoal != null) { d["stepGoal"] = am.stepGoal; }
        if (am.calories != null) { d["kcal"] = am.calories; }
        if (am.distance != null) { d["distM"] = am.distance / 100; }   // cm -> m
        if ((am has :floorsClimbed) && am.floorsClimbed != null) { d["floors"] = am.floorsClimbed; }
        if ((am has :activeMinutesDay) && am.activeMinutesDay != null) { d["activeMin"] = am.activeMinutesDay.total; }

        var profile = UserProfile.getProfile();
        if ((profile has :restingHeartRate) && profile.restingHeartRate != null) {
            d["restHR"] = profile.restingHeartRate;
        }

        var v = latestSensor(:getStressHistory);
        if (v != null) { d["stress"] = v; }
        v = latestSensor(:getBodyBatteryHistory);
        if (v != null) { d["bodyBattery"] = v; }
        v = latestSensor(:getOxygenSaturationHistory);
        if (v != null) { d["spo2"] = v; }

        d["hrHist"] = heartRateHistory();
        return d;
    }

    // Newest value of a SensorHistory series, or null if the watch does not support it.
    hidden function latestSensor(sym) {
        if (!(Toybox has :SensorHistory) || !(SensorHistory has sym)) {
            return null;
        }
        var fn = new Lang.Method(Toybox.SensorHistory, sym);
        var it = fn.invoke({ :period => 1 });
        var sample = (it != null) ? it.next() : null;
        return (sample != null && sample.data != null) ? sample.data.toNumber() : null;
    }

    // Heart rate of the last 2 hours, at most one value per minute: [[unixTime, bpm], ...]
    hidden function heartRateHistory() {
        var out = [];
        var it = ActivityMonitor.getHeartRateHistory(new Time.Duration(2 * 3600), false);
        var s = it.next();
        var lastT = 0;
        while (s != null && out.size() < 120) {
            if (s.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
                var t = s.when.value();
                if (t - lastT >= 60) {
                    out.add([t, s.heartRate]);
                    lastT = t;
                }
            }
            s = it.next();
        }
        return out;
    }

    function send(data) {
        if (_busy) { return; }
        _busy = true;
        Communications.transmit(data, null, new SendListener(self));
    }

    function onSent(ok) {
        _busy = false;
        if (ok) {
            sentCount += 1;
            status = "Gesendet: " + sentCount;
        } else {
            status = "Kein iPhone";
        }
        WatchUi.requestUpdate();
    }
}

class SendListener extends Communications.ConnectionListener {
    hidden var _collector;

    function initialize(collector) {
        ConnectionListener.initialize();
        _collector = collector;
    }

    function onComplete() {
        _collector.onSent(true);
    }

    function onError() {
        _collector.onSent(false);
    }
}
