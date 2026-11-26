import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

class GarminReaderView extends WatchUi.View {
    hidden var _c;

    function initialize(collector) {
        View.initialize();
        _c = collector;
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var center = Graphics.TEXT_JUSTIFY_CENTER;

        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.14, Graphics.FONT_TINY, "Puls", center);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        var hr = (_c.heartRate != null) ? _c.heartRate.toString() : "--";
        dc.drawText(cx, h * 0.26, Graphics.FONT_NUMBER_MEDIUM, hr, center);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        var st = (_c.steps != null) ? _c.steps.toString() : "--";
        dc.drawText(cx, h * 0.56, Graphics.FONT_SMALL, st + " Schritte", center);

        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.70, Graphics.FONT_XTINY, _c.status, center);

        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.80, Graphics.FONT_XTINY, "START: alles senden", center);
    }
}

class GarminReaderDelegate extends WatchUi.BehaviorDelegate {
    hidden var _c;

    function initialize(collector) {
        BehaviorDelegate.initialize();
        _c = collector;
    }

    function onSelect() {
        _c.send(_c.snapshot());
        return true;
    }
}
