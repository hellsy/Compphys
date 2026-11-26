import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Watch app: reads heart rate and daily values on the watch and sends them
// via Bluetooth to the iPhone app (Connect IQ Mobile SDK).
class GarminReaderApp extends Application.AppBase {
    hidden var _collector;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state) {
        _collector = new DataCollector();
        _collector.start();
    }

    function onStop(state) {
        if (_collector != null) {
            _collector.stop();
        }
    }

    function getInitialView() {
        return [new GarminReaderView(_collector), new GarminReaderDelegate(_collector)];
    }
}
