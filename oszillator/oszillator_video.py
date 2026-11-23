"""Lernvideo: Der gedämpfte harmonische Oszillator.

Löst  x'' + 2*gamma*x' + omega0^2 * x = 0  numerisch mit dem Runge-Kutta-Verfahren
4. Ordnung (RK4) für drei Dämpfungsfälle und rendert daraus ein MP4-Video.

Aufruf:  python3 oszillator_video.py   ->  oszillator.mp4
Benötigt: numpy, matplotlib, ffmpeg
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter

# ---------------------------------------------------------------- Physik
OMEGA0 = np.pi          # Eigenkreisfrequenz -> Periode 2 s
X0, V0 = 1.0, 0.0       # Anfangsauslenkung und -geschwindigkeit
T_END = 12.0            # simulierte Zeit in s

FAELLE = [
    ("Schwingfall",          r"$\gamma < \omega_0$", 0.15 * OMEGA0, "#2a7de1"),
    ("Aperiodischer Grenzfall", r"$\gamma = \omega_0$", 1.0 * OMEGA0, "#e8590c"),
    ("Kriechfall",           r"$\gamma > \omega_0$", 3.0 * OMEGA0, "#2f9e44"),
]


def rk4(gamma, dt, n):
    """Integriert die Oszillatorgleichung mit RK4, gibt x(t) zurück."""
    def f(s):
        x, v = s
        return np.array([v, -2 * gamma * v - OMEGA0**2 * x])

    s = np.array([X0, V0])
    xs = np.empty(n)
    for i in range(n):
        xs[i] = s[0]
        k1 = f(s)
        k2 = f(s + dt / 2 * k1)
        k3 = f(s + dt / 2 * k2)
        k4 = f(s + dt * k3)
        s = s + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
    return xs


# ---------------------------------------------------------------- Video
FPS = 30
VIDEO_DAUER = 18.0                      # Sekunden für die Simulation
N = int(FPS * VIDEO_DAUER)
t = np.linspace(0, T_END, N)
dt = t[1] - t[0]
loesungen = [rk4(g, dt, N) for _, _, g, _ in FAELLE]

BG, FG, GRAU = "#fbfaf7", "#1f2328", "#8a8f98"
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 13,
    "text.color": FG, "axes.labelcolor": FG,
    "xtick.color": GRAU, "ytick.color": GRAU, "axes.edgecolor": GRAU,
})

fig = plt.figure(figsize=(12.8, 7.2), dpi=100, facecolor=BG)
writer = FFMpegWriter(fps=FPS, bitrate=4000)


def feder(x_masse, y, wand=-2.6, windungen=10, breite=0.12):
    """Zickzack-Linie von der Wand bis zur Masse."""
    ende = x_masse - 0.25
    xs = np.linspace(wand, ende, 2 * windungen + 3)
    ys = np.full_like(xs, y)
    ys[1:-1:2] += breite
    ys[2:-1:2] -= breite
    ys[1], ys[-2] = y, y
    return xs, ys


def textkarte(zeilen, sekunden):
    """Standbild mit Text, sanft ein- und ausgeblendet."""
    fig.clf()
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off"); ax.set_facecolor(BG)
    objekte = [ax.text(0.5, y, s, ha="center", va="center", fontsize=fs,
                       weight=w, color=c, transform=ax.transAxes)
               for s, y, fs, w, c in zeilen]
    n = int(sekunden * FPS)
    for i in range(n):
        a = min(1, i / 12, (n - 1 - i) / 12)
        for o in objekte:
            o.set_alpha(a)
        writer.grab_frame(facecolor=BG)


with writer.saving(fig, "oszillator.mp4", dpi=100):
    # --- Titel
    textkarte([
        ("Der gedämpfte harmonische Oszillator", 0.62, 34, "bold", FG),
        (r"$\ddot{x} + 2\gamma\,\dot{x} + \omega_0^2\,x = 0$", 0.45, 30, "normal", FG),
        ("γ: Dämpfung     ω₀: Eigenfrequenz", 0.32, 16, "normal", GRAU),
    ], 4.0)

    textkarte([
        ("Gleiche Feder, gleicher Start bei x = 1 —", 0.56, 24, "normal", FG),
        ("nur die Dämpfung γ ist verschieden.", 0.46, 24, "normal", FG),
        ("Was passiert?", 0.32, 24, "bold", "#2a7de1"),
    ], 3.5)

    # --- Simulation
    fig.clf()
    fig.text(0.03, 0.94, "Drei Dämpfungsfälle im Vergleich", fontsize=20, weight="bold")
    zeit_text = fig.text(0.97, 0.94, "", ha="right", fontsize=16, color=GRAU)

    ax_f = fig.add_axes([0.03, 0.10, 0.40, 0.76])   # Federn
    ax_f.set_xlim(-2.8, 1.7); ax_f.set_ylim(-0.6, 3 * 1.2 - 0.1); ax_f.axis("off")
    ax_x = fig.add_axes([0.52, 0.12, 0.45, 0.72])   # x(t)
    ax_x.set_facecolor(BG)
    ax_x.set_xlim(0, T_END); ax_x.set_ylim(-0.85, 1.1)
    ax_x.axhline(0, color=GRAU, lw=0.8)
    ax_x.set_xlabel("Zeit t (s)"); ax_x.set_ylabel("Auslenkung x")
    for s in ("top", "right"):
        ax_x.spines[s].set_visible(False)

    ax_f.plot([-2.6, -2.6], [-0.5, 3.4], color=FG, lw=4)       # Wand
    federn, massen, kurven, punkte = [], [], [], []
    for k, (name, bed, _, farbe) in enumerate(FAELLE):
        y = 2.4 - 1.2 * k
        ax_f.plot([-2.6, 1.6], [y - 0.28, y - 0.28], color=GRAU, lw=0.8)
        ax_f.plot([0, 0], [y - 0.35, y + 0.35], color=GRAU, lw=0.8, ls=":")
        ax_f.text(-2.45, y + 0.48, f"{name}  ", fontsize=13, weight="bold", color=farbe)
        ax_f.text(0.2, y + 0.48, bed, fontsize=14, color=farbe)
        federn.append(ax_f.plot([], [], color=FG, lw=1.6)[0])
        massen.append(plt.Rectangle((0, y - 0.25), 0.5, 0.5, color=farbe))
        ax_f.add_patch(massen[-1])
        kurven.append(ax_x.plot([], [], color=farbe, lw=2.4, label=name)[0])
        punkte.append(ax_x.plot([], [], "o", color=farbe, ms=7)[0])
    ax_x.legend(loc="upper right", frameon=False, fontsize=12)

    for i in range(N):
        for k in range(3):
            y = 2.4 - 1.2 * k
            xm = loesungen[k][i]
            federn[k].set_data(*feder(xm, y))
            massen[k].set_x(xm - 0.25)
            kurven[k].set_data(t[: i + 1], loesungen[k][: i + 1])
            punkte[k].set_data([t[i]], [xm])
        zeit_text.set_text(f"t = {t[i]:4.1f} s")
        writer.grab_frame(facecolor=BG)
    for _ in range(int(1.5 * FPS)):                 # kurz stehen lassen
        writer.grab_frame(facecolor=BG)

    # --- Zusammenfassung
    textkarte([
        ("Zusammenfassung", 0.80, 30, "bold", FG),
        ("Schwingfall (γ < ω₀): schwingt, Amplitude fällt wie e^(−γt)", 0.62, 19, "normal", "#2a7de1"),
        ("Grenzfall (γ = ω₀): schnellste Rückkehr ohne Überschwingen", 0.50, 19, "normal", "#e8590c"),
        ("Kriechfall (γ > ω₀): kriecht langsam zurück", 0.38, 19, "normal", "#2f9e44"),
        ("Numerisch gelöst mit Runge-Kutta 4. Ordnung", 0.18, 15, "normal", GRAU),
    ], 7.0)

print("fertig: oszillator.mp4")
