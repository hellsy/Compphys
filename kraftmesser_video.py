"""Lernvideo: Kraft, Gewichtskraft, Feder und Kraftmesser.

Teil 1: Versuch -- Wägestücke an einer Feder, Messwerte F über s (Hookesches Gesetz)
Teil 2: Der Kraftmesser ist eine Feder mit Newton-Skala
Teil 3: Gleiche Masse auf Erde und Mond -> verschiedene Gewichtskraft

Die Federbewegung beim Anhängen ist eine gedämpfte Schwingung um die neue
Ruhelage.

Aufruf:  python3 kraftmesser_video.py   ->  kraftmesser.mp4
Benötigt: numpy, matplotlib, ffmpeg
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
from matplotlib.patches import Rectangle, FancyBboxPatch, FancyArrowPatch, Circle

# ---------------------------------------------------------------- Physik
G_ERDE = 9.81           # N/kg
G_MOND = 1.62           # N/kg
D = 0.4905              # Federkonstante in N/cm  (100 g -> 2,0 cm auf der Erde)
OMEGA = 2 * np.pi * 1.4  # Kreisfrequenz der Nachschwingung (nur Optik)
GAMMA = 2.6             # Dämpfung der Nachschwingung


def nachschwingen(s_alt, s_neu, tau):
    """Gedämpfte Schwingung von s_alt in die neue Ruhelage s_neu."""
    if tau <= 0:
        return s_alt
    return s_neu - (s_neu - s_alt) * np.exp(-GAMMA * tau) * np.cos(OMEGA * tau)


def de(x, n=1):
    """Zahl mit deutschem Dezimalkomma."""
    return f"{x:.{n}f}".replace(".", ",")


# ---------------------------------------------------------------- Stil
FPS = 30
BG, FG, GRAU, HELL = "#fbfaf7", "#1f2328", "#8a8f98", "#d9d6cf"
BLAU, ORANGE, GRUEN, ROT = "#2a7de1", "#e8590c", "#2f9e44", "#d6336c"
METALL = "#6c7480"
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 13,
    "text.color": FG, "axes.labelcolor": FG,
    "xtick.color": GRAU, "ytick.color": GRAU, "axes.edgecolor": GRAU,
})

fig = plt.figure(figsize=(12.8, 7.2), dpi=100, facecolor=BG)
writer = FFMpegWriter(fps=FPS, bitrate=4500)


def frame():
    writer.grab_frame(facecolor=BG)


def halten(sekunden):
    for _ in range(int(sekunden * FPS)):
        frame()


def einblenden(i, start, dauer=12):
    return float(np.clip((i - start) / dauer, 0, 1))


def textkarte(zeilen, sekunden):
    """Standbild mit Text, sanft ein- und ausgeblendet."""
    fig.clf()
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off")
    objekte = [ax.text(0.5, y, s, ha="center", va="center", fontsize=fs,
                       weight=w, color=c, transform=ax.transAxes)
               for s, y, fs, w, c in zeilen]
    n = int(sekunden * FPS)
    for i in range(n):
        a = min(1, i / 12, (n - 1 - i) / 12)
        for o in objekte:
            o.set_alpha(a)
        frame()


def feder_punkte(x, y_oben, y_unten, windungen=11, breite=0.75):
    """Senkrechte Zickzack-Feder zwischen y_oben und y_unten."""
    ys = np.linspace(y_oben, y_unten, 2 * windungen + 3)
    xs = np.full_like(ys, x)
    xs[1:-1:2] += breite
    xs[2:-1:2] -= breite
    xs[1], xs[-2] = x, x
    return xs, ys


def gleiche_skala(ax, xmin, xmax, ymin, ymax):
    ax.set_xlim(xmin, xmax); ax.set_ylim(ymin, ymax)
    ax.set_aspect("equal", adjustable="box")


with writer.saving(fig, "kraftmesser.mp4", dpi=100):

    # ============================================================ Intro
    textkarte([
        ("Kraft, Feder und Kraftmesser", 0.62, 36, "bold", FG),
        ("Wie misst man eigentlich eine Kraft?", 0.47, 22, "normal", GRAU),
    ], 4.0)

    textkarte([
        ("Kräfte kann man nicht sehen —", 0.60, 24, "normal", FG),
        ("aber ihre Wirkung: Eine Kraft kann einen Körper verformen.", 0.50, 22, "normal", FG),
        ("Zum Beispiel eine Feder.", 0.36, 24, "bold", BLAU),
    ], 4.5)

    # ============================================================ Teil 1: Federversuch
    fig.clf()
    fig.text(0.03, 0.94, "Versuch: Wägestücke an einer Feder", fontsize=20, weight="bold")
    info = fig.text(0.55, 0.86, "", fontsize=16, color=FG)

    ax = fig.add_axes([0.02, 0.02, 0.46, 0.88]); ax.axis("off")
    gleiche_skala(ax, -12, 10, -28.5, 2.5)
    L0 = 8.0                      # Länge der unbelasteten Feder in cm
    H_GEW, B_GEW = 1.3, 3.2       # Wägestück-Höhe/-Breite in cm

    # Stativ
    ax.add_patch(Rectangle((-9, 0), 11, 0.6, color=METALL))
    ax.add_patch(Rectangle((-9, -27), 0.6, 27.6, color=METALL))
    ax.add_patch(Rectangle((-11.5, -27.8), 6, 0.8, color=METALL))

    # Lineal für die Verlängerung s
    X_LIN = 4.3
    ax.add_patch(Rectangle((X_LIN, -L0 - 11), 1.6, 11.6, facecolor="#f3e7c4",
                           edgecolor="#c9b37a", lw=1))
    for cm in range(0, 12):
        lang = 0.8 if cm % 2 == 0 else 0.45
        ax.plot([X_LIN, X_LIN + lang], [-L0 - cm] * 2, color=FG, lw=1)
        if cm % 2 == 0:
            ax.text(X_LIN + 1.0, -L0 - cm, str(cm), va="center", fontsize=10)
    ax.text(X_LIN + 0.8, -L0 + 1.3, "s in cm", ha="center", fontsize=11, color=GRAU)

    feder, = ax.plot([], [], color=FG, lw=1.8)
    zeiger, = ax.plot([], [], color=ROT, lw=1.2, ls="--")
    marke, = ax.plot([], [], marker=">", color=ROT, ms=9)
    haken, = ax.plot([], [], color=FG, lw=2)
    kraftpfeil = FancyArrowPatch((0, 0), (0, 0), arrowstyle="-|>", mutation_scale=18,
                                 color=ROT, lw=2.5)
    ax.add_patch(kraftpfeil)
    pfeil_text = ax.text(0, 0, r"$F_G$", color=ROT, fontsize=15, ha="right", va="center")

    gewichte, gewicht_texte = [], []
    for k in range(5):
        r = FancyBboxPatch((0, 0), B_GEW, H_GEW - 0.12, boxstyle="round,pad=0,rounding_size=0.25",
                           facecolor=METALL, edgecolor="#4b525c", lw=1, alpha=0)
        ax.add_patch(r); gewichte.append(r)
        gewicht_texte.append(ax.text(0, 0, "100 g", color="white", fontsize=9,
                                     ha="center", va="center", alpha=0))

    def zeichne_feder(s, n_sichtbar, alpha_neu=1.0):
        y_unten = -L0 - s
        feder.set_data(*feder_punkte(0, 0, y_unten))
        haken.set_data([0, 0], [y_unten, y_unten - 1.0])
        zeiger.set_data([0.9, X_LIN], [y_unten] * 2)
        marke.set_data([X_LIN - 0.25], [y_unten])
        y = y_unten - 1.0
        for k in range(5):
            gewichte[k].set_x(-B_GEW / 2)
            gewichte[k].set_y(y - (k + 1) * H_GEW)
            gewicht_texte[k].set_position((0, y - (k + 0.5) * H_GEW - 0.06))
            a = 1.0 if k < n_sichtbar - 1 else (alpha_neu if k == n_sichtbar - 1 else 0)
            gewichte[k].set_alpha(a); gewicht_texte[k].set_alpha(a)
        # Kraftpfeil: Länge 1 cm pro Newton, am Schwerpunkt des Stapels
        F = n_sichtbar * 0.1 * G_ERDE
        if n_sichtbar:
            y_s = y - n_sichtbar * H_GEW / 2
            kraftpfeil.set_positions((-B_GEW / 2 - 1.2, y_s), (-B_GEW / 2 - 1.2, y_s - 1.0 * F))
            kraftpfeil.set_alpha(1); pfeil_text.set_alpha(1)
            pfeil_text.set_position((-B_GEW / 2 - 1.6, y_s - 0.5 * F))
        else:
            kraftpfeil.set_alpha(0); pfeil_text.set_alpha(0)

    # Diagramm F über s
    ax_d = fig.add_axes([0.57, 0.13, 0.40, 0.64])
    ax_d.set_facecolor(BG)
    ax_d.set_xlim(0, 11); ax_d.set_ylim(0, 5.6)
    ax_d.set_xlabel("Verlängerung s (cm)"); ax_d.set_ylabel("Kraft F (N)")
    for sp in ("top", "right"):
        ax_d.spines[sp].set_visible(False)
    ax_d.grid(color=HELL, lw=0.6)
    punkte = [ax_d.plot([], [], "o", color=BLAU, ms=10, zorder=3)[0] for _ in range(6)]
    gerade, = ax_d.plot([], [], color=BLAU, lw=2, alpha=0.6, zorder=2)
    gesetz = ax_d.text(0.6, 4.85, r"$F = D \cdot s$", fontsize=24, color=BLAU, alpha=0)
    gesetz2 = ax_d.text(0.6, 4.2, "doppelte Kraft → doppelte Verlängerung", fontsize=13,
                        color=FG, alpha=0)
    gesetz3 = ax_d.text(0.6, 3.7, f"Federkonstante D ≈ {de(D, 2)} N/cm", fontsize=12,
                        color=GRAU, alpha=0)

    def info_text(n, s):
        F = n * 0.1 * G_ERDE
        return f"m = {n * 100} g      F = {de(F, 2)} N      s = {de(s)} cm"

    # Feder leer
    zeichne_feder(0, 0)
    punkte[0].set_data([0], [0])
    info.set_text(info_text(0, 0))
    halten(1.5)

    s_alt = 0.0
    TAKT = int(3.2 * FPS)
    for n in range(1, 6):
        s_neu = n * 0.1 * G_ERDE / D
        for i in range(TAKT):
            tau = (i - 12) / FPS
            s = nachschwingen(s_alt, s_neu, tau)
            zeichne_feder(s, n, alpha_neu=einblenden(i, 0, 12))
            if i == TAKT - 22:
                punkte[n].set_data([s_neu], [n * 0.1 * G_ERDE])
                info.set_text(info_text(n, s_neu))
            frame()
        s_alt = s_neu

    # Ursprungsgerade einzeichnen
    for i in range(45):
        smax = 10.6 * (i + 1) / 45
        gerade.set_data([0, smax], [0, D * smax])
        frame()
    for i in range(30):
        a = einblenden(i, 0, 15)
        gesetz.set_alpha(a); gesetz2.set_alpha(einblenden(i, 8, 15)); gesetz3.set_alpha(einblenden(i, 15, 15))
        frame()
    halten(4.0)

    textkarte([
        ("Hookesches Gesetz", 0.64, 32, "bold", BLAU),
        ("Die Verlängerung einer Feder ist proportional zur Kraft.", 0.50, 22, "normal", FG),
        ("Genau das nutzt der Kraftmesser.", 0.36, 22, "bold", FG),
    ], 4.5)

    # ============================================================ Teil 2+3: Kraftmesser, Erde/Mond
    MASSE = 0.3   # kg

    def baue_panel(rect, ort, g, farbe, tint, xlim=(-13, 13)):
        """Zeichnet einen Kraftmesser in einem Panel; gibt die beweglichen Teile zurück."""
        axp = fig.add_axes(rect)
        axp.set_xticks([]); axp.set_yticks([])
        for sp in axp.spines.values():
            sp.set_visible(False)
        axp.set_facecolor(tint)
        gleiche_skala(axp, xlim[0], xlim[1], -27.5, 3.5)
        x0 = xlim[0]

        # Kopfzeile mit Planet
        axp.add_patch(Circle((x0 + 2, 1.4), 1.0, color=farbe))
        if ort == "Erde":
            axp.add_patch(Circle((x0 + 1.7, 1.7), 0.45, color=GRUEN))
        else:
            for cx, cy, r in [(x0 + 1.6, 1.8, 0.25), (x0 + 2.3, 1.1, 0.2)]:
                axp.add_patch(Circle((cx, cy), r, color="#55595f"))
            for cx, cy, r in [(8, -6, 1.3), (10.5, -20, 0.9), (-9, -23, 1.6), (-10, -10, 0.7)]:
                axp.add_patch(Circle((cx, cy), r, color="#e2e2de"))
        axp.text(x0 + 3.5, 1.4, ort, fontsize=18, weight="bold", va="center")
        axp.text(x0 + 8.2, 1.4, f"g = {de(g, 2)} N/kg", fontsize=14, va="center", color=GRAU)

        # Kraftmesser-Gehäuse mit Skala
        axp.add_patch(Rectangle((-4, -0.6), 8, 0.5, color=METALL))
        axp.add_patch(FancyBboxPatch((-1.1, -14.5), 2.2, 14.0,
                                     boxstyle="round,pad=0,rounding_size=0.5",
                                     facecolor="white", edgecolor=GRAU, lw=1.5, alpha=0.85))
        for n10 in range(0, 51, 5):
            y = -2.5 - 2 * n10 / 10
            lang = 0.6 if n10 % 10 == 0 else 0.35
            axp.plot([1.1 - lang, 1.1], [y, y], color=FG, lw=1.2, zorder=4)
            if n10 % 10 == 0:
                axp.text(1.5, y, str(n10 // 10), va="center", fontsize=12, zorder=4)
        axp.text(1.5, -1.2, "N", va="center", fontsize=12, weight="bold", zorder=4)

        p = dict(ort=ort, g=g, ax=axp)
        p["feder"], = axp.plot([], [], color=FG, lw=1.4, zorder=3)
        p["stab"], = axp.plot([], [], color=METALL, lw=3, zorder=2, solid_capstyle="butt")
        p["anzeige"], = axp.plot([], [], color=ROT, lw=3, zorder=5)
        p["haken"] = axp.add_patch(Circle((0, 0), 0.45, fill=False, ec=FG, lw=2))
        p["faden"], = axp.plot([], [], color=FG, lw=1.2)
        p["koerper"] = axp.add_patch(FancyBboxPatch((0, 0), 3.6, 2.8,
                                     boxstyle="round,pad=0,rounding_size=0.4",
                                     facecolor=ORANGE, edgecolor="#b8470a", lw=1, alpha=0))
        p["koerper_text"] = axp.text(0, 0, "300 g", color="white", fontsize=12, weight="bold",
                                     ha="center", va="center", alpha=0)
        p["wert"] = axp.text(7.0, -9, f"{de(MASSE * g)} N", fontsize=28, weight="bold",
                             color=ROT, ha="center", va="center", alpha=0)
        p["wert_unter"] = axp.text(7.0, -11.5, r"$F_G = m \cdot g$", fontsize=15,
                                   color=GRAU, ha="center", va="center", alpha=0)
        zeichne_kraftmesser(p, 0, 0)
        return p

    def zeichne_kraftmesser(p, F, alpha_koerper):
        y_i = -2.5 - 2 * F                         # 1 N  ->  2 cm
        p["feder"].set_data(*feder_punkte(0, -0.6, y_i, windungen=9, breite=0.6))
        p["anzeige"].set_data([-0.9, 0.9], [y_i, y_i])
        p["stab"].set_data([0, 0], [y_i, y_i - 13.5])
        y_h = y_i - 13.5 - 0.45
        p["haken"].center = (0, y_h)
        p["faden"].set_data([0, 0], [y_h - 0.45, y_h - 1.3])
        p["koerper"].set_x(-1.8); p["koerper"].set_y(y_h - 1.3 - 2.8)
        for k in ("koerper", "faden", "koerper_text"):
            p[k].set_alpha(alpha_koerper)
        p["koerper_text"].set_position((0, y_h - 1.3 - 1.4))

    # --- Teil 2: ein Kraftmesser (Erde), Aufbau erklären, dann Körper anhängen
    fig.clf()
    fig.text(0.03, 0.94, "Der Kraftmesser: eine Feder mit Newton-Skala",
             fontsize=20, weight="bold")
    erde = baue_panel([0.2, 0.03, 0.6, 0.86], "Erde", G_ERDE, BLAU, "#eef4fb", xlim=(-17, 17))
    axe = erde["ax"]
    notizen = []
    for (xy, xt, s) in [((-0.7, -1.6), (-9, -4.5), "Feder (innen)"),
                        ((-1.0, -2.5), (-9, -8.0), "Zeiger"),
                        ((2.6, -4.5), (7, -4.5), "Skala in Newton")]:
        notizen.append(axe.annotate(s, xy=xy, xytext=xt, fontsize=14, color=FG,
                                    ha="right" if xt[0] < 0 else "left", va="center",
                                    arrowprops=dict(arrowstyle="->", color=GRAU, lw=1.2,
                                                    shrinkA=4)))
    for n in notizen:
        n.set_alpha(0)
    for i in range(int(4.5 * FPS)):
        for k, n in enumerate(notizen):
            a = einblenden(i, 10 + 25 * k, 15)
            n.set_alpha(a); n.arrow_patch.set_alpha(a)
        frame()

    F_erde = MASSE * G_ERDE
    for i in range(int(4.0 * FPS)):
        F = nachschwingen(0, F_erde, (i - 12) / FPS)
        zeichne_kraftmesser(erde, F, einblenden(i, 0, 12))
        for n in notizen:                       # Beschriftungen ausblenden
            a = 1 - einblenden(i, 0, 12)
            n.set_alpha(a); n.arrow_patch.set_alpha(a)
        frame()
    for i in range(int(3.0 * FPS)):
        erde["wert"].set_alpha(einblenden(i, 0, 12))
        erde["wert_unter"].set_alpha(einblenden(i, 10, 12))
        frame()

    # Zwischenkarte
    textkarte([
        ("Und auf dem Mond?", 0.58, 32, "bold", FG),
        ("Derselbe Körper, derselbe Kraftmesser.", 0.44, 22, "normal", GRAU),
    ], 3.0)

    # --- Teil 3: Erde und Mond nebeneinander
    fig.clf()
    fig.text(0.03, 0.94, "Gleiche Masse — andere Gewichtskraft", fontsize=20, weight="bold")
    unten1 = fig.text(0.5, 0.075, "Die Masse ist überall gleich: m = 300 g.",
                      ha="center", fontsize=17, color=FG, alpha=0)
    unten2 = fig.text(0.5, 0.025, "Die Gewichtskraft hängt vom Ort ab — "
                      "auf dem Mond ist sie etwa 6-mal kleiner.",
                      ha="center", fontsize=17, color=FG, alpha=0)
    panels = [baue_panel([0.03, 0.13, 0.455, 0.76], "Erde", G_ERDE, BLAU, "#eef4fb"),
              baue_panel([0.515, 0.13, 0.455, 0.76], "Mond", G_MOND, METALL, "#f1f1ef")]
    halten(1.2)
    for i in range(int(4.0 * FPS)):
        for p in panels:
            F = nachschwingen(0, MASSE * p["g"], (i - 12) / FPS)
            zeichne_kraftmesser(p, F, einblenden(i, 0, 12))
        frame()
    for i in range(int(2.0 * FPS)):
        for p in panels:
            p["wert"].set_alpha(einblenden(i, 0, 12))
            p["wert_unter"].set_alpha(einblenden(i, 10, 12))
        frame()
    for i in range(int(6.5 * FPS)):
        unten1.set_alpha(einblenden(i, 0, 15))
        unten2.set_alpha(einblenden(i, 30, 15))
        frame()

    # ============================================================ Zusammenfassung
    textkarte([
        ("Zusammenfassung", 0.86, 30, "bold", FG),
        ("Kräfte misst man in Newton (N).", 0.72, 19, "normal", FG),
        (r"Gewichtskraft:  $F_G = m \cdot g$     (auf der Erde: 100 g ≈ 1 N)", 0.61, 19, "normal", ORANGE),
        (r"Hookesches Gesetz:  $F = D \cdot s$  —  doppelte Kraft, doppelte Verlängerung", 0.50, 19, "normal", BLAU),
        ("Ein Kraftmesser ist eine Feder mit Newton-Skala.", 0.39, 19, "normal", FG),
        ("Masse bleibt gleich, Gewichtskraft hängt vom Ort ab.", 0.28, 19, "normal", METALL),
    ], 9.0)

print("fertig: kraftmesser.mp4")
