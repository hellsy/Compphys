"""Lernvideo (Motion Graphic): Das Hopf-Bündel  P : S³ → S².

Nach Naber, "Topology, Geometry and Gauge Fields: Foundations", Abschnitt 0.3.

Teil 1: Die Sphären S¹ = U(1), S² (stereographische Projektion) und S³ ⊂ ℂ²
Teil 2: S³ als Schichtung von Tori (stereographisch nach ℝ³ projiziert)
Teil 3: Die U(1)-Wirkung p·g = (z₁g, z₂g) – ihre Bahnen sind Großkreise
Teil 4: Die Hopf-Abbildung: jeder Faserkreis wird zu einem Punkt auf S²
Teil 5: Je zwei Fasern sind verschlungen  ->  π₃(S²) ≠ 0
Teil 6: Hauptfaserbündel, lokale Trivialisierung, Übergangsfunktion g_SN = e^(−iθ)

Alle Kurven werden exakt aus den Formeln des Buches berechnet:
    S³ = {(z₁, z₂) : |z₁|² + |z₂|² = 1},  z₁ = cos(φ/2) e^(iξ₁),  z₂ = sin(φ/2) e^(iξ₂)
    P(z₁, z₂) = (2 Re z₁z̄₂, 2 Im z₁z̄₂, |z₁|² − |z₂|²)
    Projektion S³ → ℝ³ vom Punkt (0,0,0,1):  (x₁, y₁, x₂, y₂) ↦ (x₁, y₁, x₂)/(1 − y₂)

Aufruf:  python3 hopf_video.py   ->  hopf.mp4
         VORSCHAU=1 python3 hopf_video.py   ->  schneller Testlauf mit 10 fps
Benötigt: numpy, matplotlib, ffmpeg
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
from matplotlib.colors import hsv_to_rgb

# ---------------------------------------------------------------- Stil
VORSCHAU = os.environ.get("VORSCHAU") == "1"
FPS = 10 if VORSCHAU else 30
BG, FG, GRAU, HELL = "#fbfaf7", "#1f2328", "#8a8f98", "#d9d6cf"
BLAU, ORANGE, GRUEN, LILA, ROT = "#2a7de1", "#e8590c", "#2f9e44", "#7048e8", "#e03131"
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 13,
    "text.color": FG, "axes.labelcolor": FG, "mathtext.fontset": "dejavusans",
    "xtick.color": GRAU, "ytick.color": GRAU, "axes.edgecolor": GRAU,
})
fig = plt.figure(figsize=(12.8, 7.2), dpi=100, facecolor=BG)
writer = FFMpegWriter(fps=FPS, codec="libx264",
                      extra_args=["-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p"])


def n_frames(sekunden):
    return max(1, int(round(sekunden * FPS)))


def glatt(u):
    """Weiche Ein-/Ausblendkurve 0 -> 1 (smoothstep)."""
    u = np.clip(u, 0, 1)
    return u * u * (3 - 2 * u)


def grab():
    writer.grab_frame(facecolor=BG)


def halten(sekunden):
    for _ in range(n_frames(sekunden)):
        grab()


def textkarte(zeilen, sekunden):
    """Standbild mit Text, sanft ein- und ausgeblendet; Zeilen erscheinen gestaffelt."""
    fig.clf()
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off")
    objekte = [ax.text(0.5, y, s, ha="center", va="center", fontsize=fs,
                       weight=w, color=c, transform=ax.transAxes)
               for s, y, fs, w, c in zeilen]
    n = n_frames(sekunden)
    rampe = max(1, n_frames(0.4))
    for i in range(n):
        aus = min(1, (n - 1 - i) / rampe)
        for k, o in enumerate(objekte):
            o.set_alpha(min(aus, glatt((i - k * n_frames(0.35)) / rampe)))
        grab()


def kopfzeile(titel, teil):
    fig.text(0.03, 0.935, titel, fontsize=21, weight="bold")
    fig.text(0.97, 0.935, teil, fontsize=13, color=GRAU, ha="right")


def achse3d(rect, lim, zoom=1.0):
    ax = fig.add_axes(rect, projection="3d")
    ax.set_axis_off(); ax.set_facecolor(BG)
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim); ax.set_zlim(-lim, lim)
    ax.set_box_aspect((1, 1, 1), zoom=zoom)
    return ax


# ---------------------------------------------------------------- Mathematik
def stereo(x1, y1, x2, y2):
    """Stereographische Projektion S³ -> ℝ³ vom Punkt (0,0,0,1)."""
    d = 1 - y2
    return x1 / d, y1 / d, x2 / d


def faser(phi, theta, n=240, rmax=None):
    """Faser P⁻¹(x) über x = (sinφ cosθ, sinφ sinθ, cosφ), projiziert nach ℝ³.

    Mit rmax werden Punkte außerhalb der Kugel vom Radius rmax ausgeblendet
    (die Fasern nahe dem Südpol laufen durch den Punkt ∞)."""
    xi = np.linspace(0, 2 * np.pi, n)
    z1 = np.cos(phi / 2) * np.exp(1j * (theta + xi))
    z2 = np.sin(phi / 2) * np.exp(1j * xi)
    x, y, z = stereo(z1.real, z1.imag, z2.real, z2.imag)
    if rmax is not None:
        r = np.sqrt(x * x + y * y + z * z)
        x, y, z = (np.where(r > rmax, np.nan, q) for q in (x, y, z))
    return x, y, z


def hopf(z1, z2):
    w = z1 * np.conj(z2)
    return 2 * w.real, 2 * w.imag, abs(z1) ** 2 - abs(z2) ** 2


def s2(phi, theta):
    return np.sin(phi) * np.cos(theta), np.sin(phi) * np.sin(theta), np.cos(phi)


def farbe(phi, theta):
    """Farbe eines Punktes auf S²: Farbton aus θ, Helligkeit aus φ."""
    h = (theta / (2 * np.pi)) % 1
    v = 0.55 + 0.4 * (1 - phi / np.pi)
    return hsv_to_rgb([h, 0.78, v])


def torus_linien(halbphi, n_ring=14, n_pkt=160, rmax=3.6):
    """Gitterlinien des Torus |z₁| = cos(φ/2), |z₂| = sin(φ/2) in ℝ³."""
    c, s = np.cos(halbphi), np.sin(halbphi)
    t = np.linspace(0, 2 * np.pi, n_pkt)
    linien = []
    for a in np.linspace(0, 2 * np.pi, n_ring, endpoint=False):
        for xi1, xi2 in ((np.full_like(t, a), t), (t, np.full_like(t, a))):
            x, y, z = stereo(c * np.cos(xi1), c * np.sin(xi1), s * np.cos(xi2), s * np.sin(xi2))
            r = np.sqrt(x * x + y * y + z * z)
            x, y, z = (np.where(r > rmax, np.nan, q) for q in (x, y, z))
            linien.append((x, y, z))
    return linien


def kugel_gitter(ax, r=1.0, farbe_=HELL, lw=0.7):
    t = np.linspace(0, 2 * np.pi, 120)
    for p in np.linspace(np.pi / 6, 5 * np.pi / 6, 5):
        ax.plot(r * np.sin(p) * np.cos(t), r * np.sin(p) * np.sin(t),
                np.full_like(t, r * np.cos(p)), color=farbe_, lw=lw)
    for th in np.linspace(0, np.pi, 6, endpoint=False):
        ax.plot(r * np.sin(t) * np.cos(th), r * np.sin(t) * np.sin(th), r * np.cos(t),
                color=farbe_, lw=lw)


# Kontrolle: die konstruierte Faser liegt wirklich über dem gewünschten Punkt
_xi = np.linspace(0, 6, 7)
_z1, _z2 = np.cos(0.6) * np.exp(1j * (0.9 + _xi)), np.sin(0.6) * np.exp(1j * _xi)
assert np.allclose(np.array(hopf(_z1, _z2)).T, s2(1.2, 0.9))

# ================================================================ Video
with writer.saving(fig, "hopf.mp4", dpi=100):

    # ------------------------------------------------------------ Titel
    textkarte([
        ("Das Hopf-Bündel", 0.64, 40, "bold", FG),
        (r"$\mathcal{P} : S^3 \to S^2$", 0.49, 34, "normal", BLAU),
        ("Naber – Topology, Geometry and Gauge Fields, Abschnitt 0.3", 0.32, 16, "normal", GRAU),
    ], 4.5)

    textkarte([
        ("1931 – zwei Arbeiten, scheinbar ohne Zusammenhang:", 0.72, 22, "normal", FG),
        ("Dirac: der magnetische Monopol  (Physik)", 0.58, 21, "normal", ORANGE),
        ("Hopf: Abbildungen zwischen Sphären  (Topologie)", 0.48, 21, "normal", BLAU),
        ("Erst Jahrzehnte später zeigt sich: es ist dieselbe Mathematik.", 0.30, 20, "bold", FG),
    ], 6.5)

    # ------------------------------------------------------------ Teil 1: S¹ und S²
    fig.clf()
    kopfzeile("Teil 1 · Kreis und Kugel", "S¹ = U(1)   und   S²")
    ax1 = fig.add_axes([0.04, 0.27, 0.40, 0.62])
    ax1.set_xlim(-1.6, 1.6); ax1.set_ylim(-1.3, 1.3); ax1.set_aspect("equal"); ax1.axis("off")
    t = np.linspace(0, 2 * np.pi, 300)
    ax1.plot(np.cos(t), np.sin(t), color=BLAU, lw=2.5)
    ax1.plot([-1.5, 1.5], [0, 0], color=GRAU, lw=0.8); ax1.plot([0, 0], [-1.25, 1.25], color=GRAU, lw=0.8)
    ax1.text(1.5, 0.08, "Re", color=GRAU, ha="right"); ax1.text(0.06, 1.15, "Im", color=GRAU)
    pfeil1, = ax1.plot([], [], color=FG, lw=2)
    punkt1, = ax1.plot([], [], "o", color=ORANGE, ms=11)
    bogen1, = ax1.plot([], [], color=ORANGE, lw=1.5)
    lab1 = ax1.text(0, 0, "", fontsize=17, color=ORANGE)
    fig.text(0.24, 0.20, r"$S^1 = \{e^{i\xi}\} = U(1)$", fontsize=18, ha="center", color=BLAU)
    fig.text(0.24, 0.13, r"Gruppe:  $e^{i\xi_1}e^{i\xi_2} = e^{i(\xi_1+\xi_2)}$",
             fontsize=14, ha="center", color=GRAU)

    ax2 = achse3d([0.47, 0.13, 0.50, 0.76], 1.25, zoom=1.25)
    kugel_gitter(ax2)
    gx, gy = np.meshgrid(np.linspace(-1.2, 1.2, 7), np.linspace(-1.2, 1.2, 7))
    for k in range(7):
        ax2.plot(gx[k], gy[k], 0 * gx[k], color="#e9e6df", lw=0.6)
        ax2.plot(gx[:, k], gy[:, k], 0 * gx[k], color="#e9e6df", lw=0.6)
    ax2.plot([0], [0], [1], "o", color=FG, ms=6); ax2.text(0.05, 0, 1.12, "N", fontsize=13)
    strahl, = ax2.plot([], [], [], color=GRAU, lw=1.2, ls="--")
    pk, = ax2.plot([], [], [], "o", color=ORANGE, ms=8)
    pe, = ax2.plot([], [], [], "o", color=LILA, ms=8)
    spur, = ax2.plot([], [], [], color=LILA, lw=1.5)
    fig.text(0.72, 0.20, r"stereographische Projektion  $\varphi_S : S^2 \setminus N \to \mathbb{R}^2 = \mathbb{C}$",
             fontsize=14, ha="center", color=FG)
    fig.text(0.72, 0.13, r"$S^2 \cong \mathbb{C} \cup \{\infty\}$   (Riemannsche Zahlenkugel)",
             fontsize=14, ha="center", color=GRAU)

    n = n_frames(11)
    sp = []
    for i in range(n):
        u = i / (n - 1)
        xi = 2 * np.pi * 1.5 * glatt(u)
        pfeil1.set_data([0, np.cos(xi)], [0, np.sin(xi)])
        punkt1.set_data([np.cos(xi)], [np.sin(xi)])
        tb = np.linspace(0, xi % (2 * np.pi) if u < 0.999 else np.pi, 60)
        bogen1.set_data(0.3 * np.cos(tb), 0.3 * np.sin(tb))
        lab1.set_position((1.12 * np.cos(xi) - 0.15, 1.12 * np.sin(xi)))
        lab1.set_text(r"$e^{i\xi}$")
        # Punkt auf S² wandert auf einer Spirale; Projektion in die Ebene
        ph = 0.35 + 1.9 * u
        th = 4 * np.pi * u
        p = np.array(s2(ph, th))
        q = p[:2] / (1 - p[2])
        sp.append(q)
        strahl.set_data_3d([0, q[0]], [0, q[1]], [1, 0])
        pk.set_data_3d([p[0]], [p[1]], [p[2]])
        pe.set_data_3d([q[0]], [q[1]], [0])
        arr = np.array(sp)
        m = np.hypot(arr[:, 0], arr[:, 1]) < 1.25
        spur.set_data_3d(np.where(m, arr[:, 0], np.nan), np.where(m, arr[:, 1], np.nan), 0 * arr[:, 0])
        ax2.view_init(elev=22, azim=-60 + 25 * u)
        grab()
    halten(1.0)

    textkarte([
        ("Die 3-Sphäre", 0.80, 30, "bold", FG),
        (r"$S^3 = \{(z_1, z_2) \in \mathbb{C}^2 : |z_1|^2 + |z_2|^2 = 1\} \subset \mathbb{C}^2 = \mathbb{R}^4$",
         0.63, 23, "normal", FG),
        (r"$z_1 = \cos\frac{\varphi}{2}\, e^{i\xi_1}, \qquad z_2 = \sin\frac{\varphi}{2}\, e^{i\xi_2},"
         r"\qquad 0 \leq \frac{\varphi}{2} \leq \frac{\pi}{2}$", 0.47, 23, "normal", BLAU),
        ("Vierdimensional – wir sehen sie über die stereographische Projektion", 0.29, 18, "normal", GRAU),
        (r"$S^3 \setminus \{\mathrm{Pol}\} \to \mathbb{R}^3, \quad S^3 \cong \mathbb{R}^3 \cup \{\infty\}$",
         0.21, 18, "normal", GRAU),
    ], 8.0)

    # ------------------------------------------------------------ Teil 2: Tori
    fig.clf()
    kopfzeile("Teil 2 · S³ ist aus Tori geschichtet", "|z₁| = cos(φ/2),  |z₂| = sin(φ/2) fest")
    ax = achse3d([0.0, 0.0, 0.66, 0.92], 2.2, zoom=1.35)
    t = np.linspace(0, 2 * np.pi, 200)
    ax.plot(np.cos(t), np.sin(t), 0 * t, color=ROT, lw=2.5)            # z₂ = 0
    ax.plot([0, 0], [0, 0], [-2.2, 2.2], color=BLAU, lw=2.5)             # z₁ = 0
    linien = [ax.plot([], [], [], lw=0.9)[0] for _ in range(28)]
    info = [fig.text(0.68, 0.74, "", fontsize=19, weight="bold"),
            fig.text(0.68, 0.66, "", fontsize=17),
            fig.text(0.68, 0.58, "", fontsize=15, color=GRAU)]
    fig.text(0.68, 0.40, "rot:   φ = 0      →  z₂ = 0,  Kreis", fontsize=14, color=ROT)
    fig.text(0.68, 0.34, "blau:  φ = π     →  z₁ = 0,  Gerade", fontsize=14, color=BLAU)
    fig.text(0.68, 0.30, "         (ein Kreis durch ∞ !)", fontsize=13, color=GRAU)
    fig.text(0.68, 0.18, "S³ = K₁ ∪ K₂: zwei Volltori,", fontsize=15)
    fig.text(0.68, 0.13, "verklebt längs des Torus T.", fontsize=15)

    n = n_frames(15)
    for i in range(n):
        u = i / (n - 1)
        hp = 0.10 + (1.18 - 0.10) * (0.5 - 0.5 * np.cos(2 * np.pi * u))   # hin und zurück
        if abs(hp - np.pi / 4) < 0.05:
            col, t1, t2 = GRUEN, "Torus T", "|z₁| = |z₂| = √2/2"
        elif hp < np.pi / 4:
            col, t1, t2 = ORANGE, "in K₂", "|z₁| > |z₂|"
        else:
            col, t1, t2 = LILA, "in K₁", "|z₁| < |z₂|"
        for l, (x, y, z) in zip(linien, torus_linien(hp, n_ring=14)):
            l.set_data_3d(x, y, z); l.set_color(col)
        info[0].set_text(t1); info[0].set_color(col)
        info[1].set_text(t2)
        info[2].set_text(f"φ/2 = {hp:.2f}   (π/4 ≈ 0.79)".replace(".", ","))
        ax.view_init(elev=20 + 8 * np.sin(2 * np.pi * u), azim=-50 + 50 * u)
        grab()

    # ------------------------------------------------------------ Teil 3: U(1)-Wirkung
    textkarte([
        ("Die Kreisgruppe U(1) wirkt auf S³", 0.74, 28, "bold", FG),
        (r"$p \cdot g = (z_1, z_2)\cdot g = (z_1 g,\; z_2 g), \qquad g = e^{it} \in U(1)$", 0.56, 24, "normal", BLAU),
        (r"$(p\cdot g_1)\cdot g_2 = p\cdot(g_1 g_2), \qquad p \cdot e = p$", 0.43, 20, "normal", FG),
        ("Bahn von p:  {p·g : g ∈ U(1)}  – ein Kreis durch p", 0.27, 19, "normal", GRAU),
    ], 6.5)

    fig.clf()
    kopfzeile("Teil 3 · Die Bahnen der U(1)-Wirkung", "p · e^(it)  für  t von 0 bis 2π")
    ax = achse3d([0.0, 0.0, 0.66, 0.92], 1.9, zoom=1.35)
    for x, y, z in torus_linien(np.pi / 4, n_ring=18):
        ax.plot(x, y, z, color=HELL, lw=0.7)
    bahnen = [(np.pi / 2, 0.0, BLAU), (np.pi / 2, 2.1, ORANGE), (np.pi / 2, 4.2, GRUEN)]
    spuren = [ax.plot([], [], [], color=c, lw=3)[0] for *_, c in bahnen]
    punkte = [ax.plot([], [], [], "o", color=c, ms=10)[0] for *_, c in bahnen]
    fig.text(0.68, 0.76, "Jede Bahn ist ein", fontsize=17)
    fig.text(0.68, 0.70, "Großkreis in S³.", fontsize=17, weight="bold")
    fig.text(0.68, 0.60, "Sie liegt auf einem der Tori", fontsize=15, color=GRAU)
    fig.text(0.68, 0.555, "(hier: auf T) und windet sich", fontsize=15, color=GRAU)
    fig.text(0.68, 0.51, "einmal längs und einmal quer.", fontsize=15, color=GRAU)
    fig.text(0.68, 0.38, "Verschiedene Bahnen sind", fontsize=15)
    fig.text(0.68, 0.335, "disjunkt  →  Äquivalenzklassen.", fontsize=15)
    tt = fig.text(0.68, 0.20, "", fontsize=18, color=FG)
    seg = n_frames(4.0)
    for k, (ph, th, _) in enumerate(bahnen):
        X, Y, Z = faser(ph, th, 400)
        for i in range(seg):
            u = glatt(i / (seg - 1))
            m = max(2, int(u * 399) + 1)
            spuren[k].set_data_3d(X[:m], Y[:m], Z[:m])
            punkte[k].set_data_3d([X[m - 1]], [Y[m - 1]], [Z[m - 1]])
            tt.set_text(f"t = {u * 2:.2f} π".replace(".", ","))
            ax.view_init(elev=28, azim=-60 + 15 * (k + i / seg))
            grab()
    for i in range(n_frames(2.0)):
        ax.view_init(elev=28, azim=-15 + 10 * i / n_frames(2.0))
        grab()

    # ------------------------------------------------------------ Teil 4: Hopf-Abbildung
    textkarte([
        ("Jede Bahn wird zu einem Punkt", 0.82, 28, "bold", FG),
        (r"Gleiche Bahn  $\Leftrightarrow$  gleicher Quotient  $z_1/z_2 \in \mathbb{C}\cup\{\infty\} \cong S^2$",
         0.67, 21, "normal", FG),
        (r"$\mathcal{P}(z_1, z_2) = \left(2\,\mathrm{Re}\,z_1\bar z_2,\;\; 2\,\mathrm{Im}\,z_1\bar z_2,\;\; |z_1|^2 - |z_2|^2\right)$",
         0.50, 24, "normal", BLAU),
        (r"$\mathcal{P}(\varphi, \xi_1, \xi_2) = (\sin\varphi\cos\theta,\; \sin\varphi\sin\theta,\; \cos\varphi),"
         r"\qquad \theta = \xi_1 - \xi_2$", 0.36, 20, "normal", FG),
        (r"Faser über $x$:   $\mathcal{P}^{-1}(x)$ = ein Kreis in $S^3$", 0.20, 19, "normal", GRAU),
    ], 9.0)

    fig.clf()
    kopfzeile("Teil 4 · Die Hopf-Faserung", "links: Punkt x ∈ S²    rechts: Faser P⁻¹(x) ⊂ S³ → ℝ³")
    axS = achse3d([0.0, 0.12, 0.36, 0.72], 1.15, zoom=1.2)
    kugel_gitter(axS)
    axF = achse3d([0.33, 0.0, 0.67, 0.92], 2.3, zoom=1.4)
    fus = fig.text(0.03, 0.08, "", fontsize=16)
    fus2 = fig.text(0.03, 0.035, "", fontsize=13, color=GRAU)

    # Reihenfolge: Nordpol, Äquator, Breitenkreis, Breitenkreis südlich
    plan = [([0.0], [0.0], "Nordpol (z₂ = 0)  →  Faser ist der Einheitskreis", 2.5)]
    plan.append(([np.pi / 2] * 12, list(np.linspace(0, 2 * np.pi, 12, endpoint=False)),
                 "Äquator  →  die Fasern bilden zusammen den Torus T", 6.0))
    plan.append(([np.pi / 4] * 10, list(np.linspace(0, 2 * np.pi, 10, endpoint=False) + 0.2),
                 "Breitenkreis φ = π/4  →  ein kleinerer Torus", 5.0))
    plan.append(([1.75] * 9, list(np.linspace(0, 2 * np.pi, 9, endpoint=False) + 0.4),
                 "weiter südlich  →  ein großer Torus um die z-Achse ", 5.0))
    azim = -55.0
    for phis, thetas, text, dauer in plan:
        fus.set_text(text)
        fus2.set_text("Jeder Breitenkreis auf S² ↦ ein Torus in S³ – disjunkte Kreise füllen alles.")
        seg = n_frames(dauer)
        anz = len(phis)
        for i in range(seg):
            u = i / (seg - 1)
            gezeigt = int(np.ceil(glatt(min(1, u / 0.8)) * anz))
            # neue Objekte nur einmal zeichnen
            while getattr(axF, "_neu", 0) < gezeigt:
                j = axF._neu if hasattr(axF, "_neu") else 0
                ph, th = phis[j], thetas[j]
                c = farbe(ph, th)
                axS.plot(*[[v] for v in s2(ph, th)], "o", color=c, ms=8)
                axF.plot(*faser(ph, th, 600, rmax=3.0), color=c, lw=1.9)
                axF._neu = j + 1
            azim += 18 / FPS
            axF.view_init(elev=24, azim=azim)
            axS.view_init(elev=22, azim=azim)
            grab()
        axF._neu = 0
    for i in range(n_frames(3.5)):
        azim += 18 / FPS
        axF.view_init(elev=24, azim=azim); axS.view_init(elev=22, azim=azim)
        grab()

    # ------------------------------------------------------------ Teil 5: Verschlingung
    fig.clf()
    kopfzeile("Teil 5 · Je zwei Fasern sind verschlungen", "Hopf-Link")
    axS = achse3d([0.0, 0.40, 0.30, 0.50], 1.15, zoom=1.2)
    kugel_gitter(axS)
    axF = achse3d([0.22, 0.0, 0.56, 0.92], 1.9, zoom=1.35)
    phA, thA = 0.0, 0.0
    axF.plot(*faser(phA, thA), color=BLAU, lw=3.5)
    axS.plot(*[[v] for v in s2(phA, thA)], "o", color=BLAU, ms=9)
    fB, = axF.plot([], [], [], color=ORANGE, lw=3.5)
    pB, = axS.plot([], [], [], "o", color=ORANGE, ms=9)
    wegB, = axS.plot([], [], [], color=ORANGE, lw=1.2)
    fig.text(0.78, 0.74, "Bewegt sich x auf S²,", fontsize=16)
    fig.text(0.78, 0.69, "bewegt sich die Faser –", fontsize=16)
    fig.text(0.78, 0.64, "aber sie bleibt immer", fontsize=16)
    fig.text(0.78, 0.59, "einmal durch die andere", fontsize=16)
    fig.text(0.78, 0.54, "gefädelt.", fontsize=16, weight="bold")
    fig.text(0.03, 0.17, "Folge (Hopf 1931):  P ist nicht nullhomotop,", fontsize=17)
    fig.text(0.03, 0.11, r"also ist  $\pi_3(S^2) \neq 0$  – eine Überraschung: Abbildungen in eine", fontsize=17)
    fig.text(0.03, 0.05, "niedriger-dimensionale Sphäre lassen sich nicht immer zusammenziehen.", fontsize=17)
    n = n_frames(14)
    weg = []
    for i in range(n):
        u = i / (n - 1)
        ph = 1.45 + 0.5 * np.sin(2 * np.pi * u)
        th = 2 * np.pi * u * 1.5
        fB.set_data_3d(*faser(ph, th, 400, rmax=2.6))
        p = s2(ph, th)
        weg.append(p)
        pB.set_data_3d([p[0]], [p[1]], [p[2]])
        w = np.array(weg)
        wegB.set_data_3d(w[:, 0], w[:, 1], w[:, 2])
        axF.view_init(elev=38 - 10 * np.sin(np.pi * u), azim=-60 + 70 * u)
        axS.view_init(elev=22, azim=-60 + 70 * u)
        grab()

    # ------------------------------------------------------------ Teil 6: Hauptfaserbündel
    textkarte([
        ("Ein Hauptfaserbündel mit Strukturgruppe U(1)", 0.84, 26, "bold", FG),
        ("Totalraum P = S³     Basis X = S²     Gruppe G = U(1)", 0.71, 20, "normal", BLAU),
        (r"(1)  Die Wirkung erhält die Fasern:   $\mathcal{P}(p\cdot g) = \mathcal{P}(p)$", 0.57, 20, "normal", FG),
        (r"(2)  Lokal trivial:   $\mathcal{P}^{-1}(V) \cong V \times U(1)$,   "
         r"$\Psi(p) = (\mathcal{P}(p), \psi(p))$,  $\psi(p\cdot g) = \psi(p)\,g$",
         0.45, 18, "normal", FG),
        (r"$U_S = S^2\setminus\{N\}:\; \psi_S = z_2/|z_2| \qquad U_N = S^2\setminus\{S\}:\; \psi_N = z_1/|z_1|$",
         0.31, 19, "normal", ORANGE),
        (r"Lokal wie das triviale Bündel $S^2\times U(1)$ – global aber anders verklebt!", 0.16, 18, "bold", GRAU),
    ], 11.0)

    fig.clf()
    kopfzeile("Teil 6 · Die Übergangsfunktion", r"wie werden die beiden Karten verklebt?")
    axS = achse3d([0.0, 0.10, 0.42, 0.78], 1.15, zoom=1.25)
    kugel_gitter(axS)
    t = np.linspace(0, 2 * np.pi, 200)
    axS.plot(np.cos(t), np.sin(t), 0 * t, color=GRAU, lw=1.5)
    axS.plot([0], [0], [1], "o", color=FG, ms=6); axS.text(0.08, 0, 1.12, "N", fontsize=13)
    axS.plot([0], [0], [-1], "o", color=FG, ms=6); axS.text(0.08, 0, -1.25, "S", fontsize=13)
    px, = axS.plot([], [], [], "o", color=ORANGE, ms=10)
    pw, = axS.plot([], [], [], color=ORANGE, lw=3)
    axS.view_init(elev=24, azim=-60)
    fig.text(0.21, 0.13, r"x läuft einmal um den Äquator ($U_S \cap U_N$)", fontsize=14, ha="center")

    def u1_panel(rect, titel, col):
        a = fig.add_axes(rect)
        a.set_xlim(-1.5, 1.5); a.set_ylim(-1.5, 1.5); a.set_aspect("equal"); a.axis("off")
        a.plot(np.cos(t), np.sin(t), color=GRAU, lw=1.5)
        a.plot([0], [0], "o", color=GRAU, ms=3)
        a.text(1.28, -0.2, "1", color=GRAU, fontsize=12, va="center")
        a.set_title(titel, color=col, fontsize=15, pad=4)
        pf, = a.plot([], [], color=col, lw=2.5)
        pt, = a.plot([], [], "o", color=col, ms=9)
        sp, = a.plot([], [], color=col, lw=4, alpha=0.35)
        return pf, pt, sp

    hopfP = u1_panel([0.44, 0.33, 0.27, 0.50], r"Hopf:  $g_{SN}(x) = e^{-i\theta}$", ORANGE)
    trivP = u1_panel([0.71, 0.33, 0.27, 0.50], r"trivial:  $g_{SN}(x) \equiv 1$", GRUEN)
    wz = fig.text(0.575, 0.27, "", fontsize=16, ha="center", color=ORANGE)
    fig.text(0.845, 0.27, "Windungszahl 0", fontsize=16, ha="center", color=GRUEN)
    fig.text(0.71, 0.16, r"$\psi_{S,x}\circ\psi_{N,x}^{-1}(g) = g_{SN}(x)\, g, \qquad"
             r"g_{SN} = \frac{z_2/|z_2|}{z_1/|z_1|}$", fontsize=17, ha="center")
    fig.text(0.71, 0.08, "Die Windungszahl ∈ π₁(U(1)) = ℤ klassifiziert das Bündel (Abschnitt 4.4).",
             fontsize=13, ha="center", color=GRAU)

    n = n_frames(10)
    weg = []
    for i in range(n_frames(1.0)):
        grab()
    for i in range(n):
        u = glatt(i / (n - 1))
        th = 2 * np.pi * u
        x = s2(np.pi / 2, th)
        weg.append(x)
        w = np.array(weg)
        px.set_data_3d([x[0]], [x[1]], [x[2]]); pw.set_data_3d(w[:, 0], w[:, 1], w[:, 2])
        # g_SN direkt aus einem Punkt der Faser berechnet (nicht nur aus der Formel)
        z1 = np.cos(np.pi / 4) * np.exp(1j * (th + 0.3)); z2 = np.sin(np.pi / 4) * np.exp(1j * 0.3)
        g = (z2 / abs(z2)) / (z1 / abs(z1))
        ws = np.linspace(0, -th, 100)
        for (pf, pt, sp), gg, wl in ((hopfP, g, ws), (trivP, 1 + 0j, np.zeros(2))):
            pf.set_data([0, gg.real], [0, gg.imag]); pt.set_data([gg.real], [gg.imag])
            sp.set_data(1.18 * np.cos(wl), 1.18 * np.sin(wl))
        wz.set_text(f"Umläufe: {u:.2f}".replace(".", ",") if u < 0.999 else "Windungszahl −1")
        axS.view_init(elev=24, azim=-60 + 30 * u)
        grab()
    halten(2.5)

    # ------------------------------------------------------------ Ausblick + Zusammenfassung
    textkarte([
        ("Zurück zu Dirac", 0.80, 28, "bold", FG),
        ("Die U(1)-Bündel über S² entsprechen den ganzen Zahlen –", 0.64, 20, "normal", FG),
        ("genau wie die quantisierten Monopolstärken  (qg = n/2).", 0.56, 20, "normal", FG),
        ("Die beiden Eichpotentiale des Monopols (g = 1/2) werden auf U_S ∩ U_N", 0.42, 18, "normal", GRAU),
        (r"durch dieselbe Funktion verklebt:   $\mathcal{A}_N = e^{i\theta}\mathcal{A}_S e^{-i\theta} + e^{i\theta}\,d\,e^{-i\theta}$",
         0.34, 18, "normal", ORANGE),
        ("→ Abschnitt 0.4: Zusammenhänge auf Hauptfaserbündeln", 0.18, 17, "normal", BLAU),
    ], 10.0)

    textkarte([
        ("Zusammenfassung", 0.86, 30, "bold", FG),
        (r"$S^3$ zerfällt in disjunkte Kreise: die Bahnen von $U(1)$,  $p\cdot g = (z_1 g, z_2 g)$",
         0.71, 18, "normal", FG),
        (r"Hopf-Abbildung $\mathcal{P}: S^3 \to S^2$ zieht jeden Kreis auf einen Punkt zusammen",
         0.61, 18, "normal", FG),
        ("Breitenkreise auf S² ↦ Tori in S³;  je zwei Fasern sind verschlungen  ⇒  π₃(S²) ≠ 0",
         0.51, 18, "normal", FG),
        ("Lokal S² × U(1), global nicht: ein nichttriviales U(1)-Hauptfaserbündel", 0.41, 18, "normal", BLAU),
        (r"Übergangsfunktion $g_{SN} = e^{-i\theta}$ windet sich einmal um $U(1)$", 0.31, 18, "normal", ORANGE),
        ("Das Hopf-Bündel ist das geometrische Modell des Dirac-Monopols", 0.17, 18, "bold", FG),
    ], 11.0)

print("fertig: hopf.mp4")
