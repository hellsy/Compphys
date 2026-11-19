"""Lernvideo (Motion Graphic): Hommage an das Noether-Theorem.

Emmy Noether, "Invariante Variationsprobleme", Nachr. Ges. Wiss. Göttingen 1918.

Teil 1: Der Satz – jede kontinuierliche Symmetrie der Wirkung liefert eine Erhaltungsgröße
Teil 2: Zeittranslation  ->  Energie        (nichtlineares Pendel)
Teil 3: Raumtranslation  ->  Impuls         (zwei Massen an einer Feder)
Teil 4: Drehung          ->  Drehimpuls     (Kepler-Bahn, Flächensatz)
Teil 5: Symmetrie gebrochen -> Erhaltung verloren (anisotropes Potential)
Teil 6: Phase ψ -> e^(iα)ψ  ->  Ladung      (Wellenpaket am Tunnelwall, Crank-Nicolson)

Alles wird numerisch gerechnet, nichts ist vorgezeichnet:
    Mechanik:  Störmer-Verlet (symplektisch, Schrittweite dt)
    Quanten:   Crank-Nicolson, ħ = m = 1  (unitär -> Norm erhalten bis auf Rundung)

Aufruf:  python3 noether_video.py   ->  noether.mp4
         VORSCHAU=1 python3 noether_video.py   ->  schneller Testlauf mit 10 fps
Benötigt: numpy, matplotlib, ffmpeg
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
from matplotlib.patches import Polygon, Rectangle

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


def stil(ax):
    ax.set_facecolor(BG)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def de(x, stellen):
    """Zahl mit deutschem Dezimalkomma."""
    return f"{x:.{stellen}f}".replace(".", ",")


def wiss(x):
    """Kleine Zahl als  a·10^b  (mathtext)."""
    if x == 0:
        return "0"
    b = int(np.floor(np.log10(abs(x))))
    a = x / 10 ** b
    return rf"{de(a, 1)}\cdot 10^{{{b}}}"


# ---------------------------------------------------------------- Numerik
def verlet(kraft, q0, v0, dt, t_end):
    """Störmer-Verlet für  q'' = kraft(q)  (Masse in kraft enthalten). Gibt t, q, v zurück."""
    n = int(round(t_end / dt)) + 1
    q = np.zeros((n,) + np.shape(q0)); v = np.zeros_like(q)
    q[0], v[0] = q0, v0
    a = kraft(q[0])
    for i in range(n - 1):
        vh = v[i] + 0.5 * dt * a
        q[i + 1] = q[i] + dt * vh
        a = kraft(q[i + 1])
        v[i + 1] = vh + 0.5 * dt * a
    return np.arange(n) * dt, q, v


def max_rel(x):
    return np.max(np.abs(x - x[0])) / abs(x[0])


# Pendel  L = ½θ̇² + cos θ
tP, thP, omP = verlet(lambda th: -np.sin(th), 2.6, 0.0, 0.002, 30.0)
TP, VP = 0.5 * omP ** 2, 1 - np.cos(thP)
EP = TP + VP

# Zwei Massen an einer Feder (Ruhelänge l0)  L = ½m₁ẋ₁² + ½m₂ẋ₂² − ½k(x₂−x₁−l0)²
m1, m2, kF, l0 = 1.0, 3.0, 6.0, 1.6
def kraft_feder(x):
    f = kF * (x[1] - x[0] - l0)
    return np.array([f / m1, -f / m2])
tF, xF, vF = verlet(kraft_feder, np.array([0.0, l0]), np.array([2.4, 0.0]), 0.002, 14.0)
p1F, p2F = m1 * vF[:, 0], m2 * vF[:, 1]
PF = p1F + p2F
xcm = (m1 * xF[:, 0] + m2 * xF[:, 1]) / (m1 + m2)

# Kepler  L = ½|ṙ|² + 1/|r|
def kraft_kepler(r):
    return -r / np.linalg.norm(r) ** 3
r0, v0 = np.array([1.0, 0.0]), np.array([0.0, 1.22])
E_kep = 0.5 * v0 @ v0 - 1.0
a_kep = -1 / (2 * E_kep)
T_kep = 2 * np.pi * a_kep ** 1.5
tK, rK, vK = verlet(kraft_kepler, r0, v0, 0.0005, T_kep)
LK = rK[:, 0] * vK[:, 1] - rK[:, 1] * vK[:, 0]
EK = 0.5 * (vK ** 2).sum(1) - 1 / np.linalg.norm(rK, axis=1)

# Anisotropes Potential  V = −(x² + y²/q²)^(−1/2): zeitunabhängig, aber nicht drehinvariant
QA = 0.78
def kraft_aniso(r):
    s = r[0] ** 2 + (r[1] / QA) ** 2
    return -np.array([r[0], r[1] / QA ** 2]) * s ** -1.5
tA, rA, vA = verlet(kraft_aniso, r0, v0, 0.0005, 2.2 * T_kep)
LA = rA[:, 0] * vA[:, 1] - rA[:, 1] * vA[:, 0]
EA = 0.5 * (vA ** 2).sum(1) - (rA[:, 0] ** 2 + (rA[:, 1] / QA) ** 2) ** -0.5

# Schrödinger  i ψ_t = −½ψ_xx + Vψ  mit Crank-Nicolson
NX, XMAX = 700, 70.0
xs = np.linspace(-XMAX, XMAX, NX); dx = xs[1] - xs[0]
V0, BX0, BX1 = 1.15, 0.0, 1.6
Vx = np.where((xs >= BX0) & (xs <= BX1), V0, 0.0)
dtS, t_endS = 0.05, 34.0
H = (np.diag(1 / dx ** 2 + Vx) - np.diag(np.full(NX - 1, 0.5 / dx ** 2), 1)
     - np.diag(np.full(NX - 1, 0.5 / dx ** 2), -1)).astype(complex)
I = np.eye(NX)
U = np.linalg.solve(I + 0.5j * dtS * H, I - 0.5j * dtS * H)
psi = np.exp(-(xs + 22) ** 2 / (2 * 3.0 ** 2) + 1j * 1.45 * xs)
psi /= np.sqrt(np.sum(np.abs(psi) ** 2) * dx)
psiS = [psi]
for _ in range(int(round(t_endS / dtS))):
    psi = U @ psi
    psiS.append(psi)
psiS = np.array(psiS)
normS = np.sum(np.abs(psiS) ** 2, axis=1) * dx


# ---------------------------------------------------------------- Video
with writer.saving(fig, "noether.mp4", dpi=100):

    # ------------------------------------------------------------ Titel
    textkarte([
        ("Hommage an Emmy Noether", 0.70, 38, "bold", FG),
        ("Invariante Variationsprobleme  ·  Göttingen 1918", 0.58, 20, "normal", GRAU),
        ("Symmetrie   ⇔   Erhaltung", 0.40, 30, "bold", BLAU),
    ], 6.0)

    textkarte([
        ("Emmy Noether  (1882 Erlangen – 1935 Bryn Mawr)", 0.80, 24, "bold", FG),
        ("1915  von Hilbert und Klein nach Göttingen geholt –", 0.66, 18, "normal", FG),
        ("die beiden suchten nach dem Energiesatz der Allgemeinen Relativitätstheorie", 0.60, 18, "normal", FG),
        ("1918  „Invariante Variationsprobleme“: die Antwort, allgemeiner als gefragt", 0.50, 18, "normal", BLAU),
        ("1919  Habilitation – erst nachdem Frauen dazu zugelassen wurden", 0.40, 18, "normal", FG),
        ("danach: Mitbegründerin der modernen abstrakten Algebra", 0.30, 18, "normal", FG),
        ("1933  von den Nationalsozialisten entlassen, Emigration in die USA", 0.20, 18, "normal", GRAU),
    ], 11.0)

    # ------------------------------------------------------------ Teil 1: der Satz
    textkarte([
        ("Der Satz", 0.86, 30, "bold", FG),
        (r"Wirkung   $S = \int L(q,\dot q,t)\,dt$", 0.73, 21, "normal", FG),
        (r"Bleibt $L$ unter $q \to q + \varepsilon K(q)$ unverändert  ($\delta L = 0$),", 0.61, 20, "normal", FG),
        (r"dann ist   $Q = \frac{\partial L}{\partial \dot q}\,K$   auf jeder Bahn konstant.", 0.51, 22, "normal", BLAU),
        (r"Beweis:  $\frac{dQ}{dt} = \frac{d}{dt}\frac{\partial L}{\partial\dot q}\,K"
         r" + \frac{\partial L}{\partial\dot q}\,\dot K"
         r" = \frac{\partial L}{\partial q}K + \frac{\partial L}{\partial\dot q}\dot K"
         r" = \frac{\delta L}{\varepsilon} = 0$", 0.37, 18, "normal", FG),
        ("(im zweiten Schritt: Euler-Lagrange-Gleichung)", 0.29, 14, "normal", GRAU),
        (r"Zeittranslation, $\partial L/\partial t = 0$:   $E = \dot q\,\frac{\partial L}{\partial \dot q} - L$ ist erhalten",
         0.16, 18, "normal", ORANGE),
    ], 13.0)

    # ------------------------------------------------------------ Teil 2: Pendel -> Energie
    fig.clf()
    kopfzeile("Zeittranslation  →  Energie", "Teil 2 / 6")
    fig.text(0.03, 0.875, r"Pendel:  $L = \frac{1}{2}\dot\theta^2 + \cos\theta$  hängt nicht von $t$ ab"
             "  –  das Experiment heute verläuft wie morgen", fontsize=15, color=GRAU)
    axL = fig.add_axes([0.03, 0.10, 0.38, 0.72]); axL.axis("off"); axL.set_aspect("equal")
    axL.set_xlim(-1.35, 1.35); axL.set_ylim(-1.35, 1.35)
    axL.plot(1.0 * np.sin(np.linspace(-2.6, 2.6, 200)), -np.cos(np.linspace(-2.6, 2.6, 200)),
             color=HELL, lw=1.5, ls="--")
    axL.plot([0], [0], "o", color=FG, ms=6)
    stab, = axL.plot([], [], color=FG, lw=2.5)
    kugel, = axL.plot([], [], "o", color=BLAU, ms=22)
    axR = fig.add_axes([0.49, 0.22, 0.47, 0.58]); stil(axR)
    axR.set_xlim(0, tP[-1]); axR.set_ylim(0, 2.25)
    axR.set_xlabel("Zeit t"); axR.set_ylabel("Energie")
    lT, = axR.plot([], [], color=BLAU, lw=2, label="kinetisch  T")
    lV, = axR.plot([], [], color=ORANGE, lw=2, label="potentiell  V")
    lE, = axR.plot([], [], color=FG, lw=3, label="E = T + V")
    axR.legend(loc="upper right", frameon=False, ncol=3, fontsize=12)
    info = fig.text(0.49, 0.08, "", fontsize=15)
    n = n_frames(15)
    for i in range(n):
        k = int(i / (n - 1) * (len(tP) - 1))
        th = thP[k]
        stab.set_data([0, np.sin(th)], [0, -np.cos(th)]); kugel.set_data([np.sin(th)], [-np.cos(th)])
        for l, y in ((lT, TP), (lV, VP), (lE, EP)):
            l.set_data(tP[:k + 1:5], y[:k + 1:5])
        fehler = max_rel(EP[:k + 1]) if k > 0 else 0.0
        info.set_text(rf"T ⇄ V tauschen Energie, die Summe bleibt:  max $|\Delta E/E| = {wiss(fehler)}$")
        grab()
    halten(2.5)

    # ------------------------------------------------------------ Teil 3: Feder -> Impuls
    fig.clf()
    kopfzeile("Raumtranslation  →  Impuls", "Teil 3 / 6")
    fig.text(0.03, 0.875, r"$L = \frac{1}{2}m_1\dot x_1^2 + \frac{1}{2}m_2\dot x_2^2 - \frac{k}{2}(x_2 - x_1 - \ell_0)^2$"
             r"  hängt nur vom Abstand ab:  $x_i \to x_i + \varepsilon$  ändert nichts",
             fontsize=15, color=GRAU)
    axB = fig.add_axes([0.04, 0.55, 0.92, 0.27]); axB.axis("off")
    xmin, xmax = -0.8, xF[-1].max() + 0.8
    axB.set_xlim(xmin, xmax); axB.set_ylim(-1.0, 1.0)
    axB.plot([xmin, xmax], [-0.38, -0.38], color=HELL, lw=2)
    feder, = axB.plot([], [], color=GRAU, lw=1.8)
    k1, = axB.plot([], [], "o", color=BLAU, ms=18)
    k2, = axB.plot([], [], "o", color=ORANGE, ms=31)
    cm, = axB.plot([], [], "^", color=FG, ms=11)
    cmspur, = axB.plot([], [], color=FG, lw=1, ls=":")
    axB.text(xmin + 0.1, 0.75, r"$m_1 = 1$", color=BLAU, fontsize=14)
    axB.text(xmin + 1.3, 0.75, r"$m_2 = 3$", color=ORANGE, fontsize=14)
    axB.text(xmin + 2.5, 0.75, "▲ Schwerpunkt: gleichförmig", color=FG, fontsize=14)
    axP = fig.add_axes([0.08, 0.10, 0.88, 0.38]); stil(axP)
    axP.set_xlim(0, tF[-1]); axP.set_ylim(-1.6, 4.6)
    axP.set_xlabel("Zeit t"); axP.set_ylabel("Impuls")
    lp1, = axP.plot([], [], color=BLAU, lw=2, label=r"$p_1$")
    lp2, = axP.plot([], [], color=ORANGE, lw=2, label=r"$p_2$")
    lPP, = axP.plot([], [], color=FG, lw=3, label=r"$P = p_1 + p_2$")
    axP.legend(loc="upper right", frameon=False, ncol=3, fontsize=13)
    infoP = axP.text(0.01, 0.92, "", transform=axP.transAxes, fontsize=14)
    n = n_frames(14)
    for i in range(n):
        k = int(i / (n - 1) * (len(tF) - 1))
        a, b = xF[k]
        s = np.linspace(0, 1, 120)
        zz = 0.12 * np.sin(2 * np.pi * 9 * s) * (s > 0.08) * (s < 0.92)
        feder.set_data(a + (b - a) * s, zz)
        k1.set_data([a], [0]); k2.set_data([b], [0])
        cm.set_data([xcm[k]], [-0.55]); cmspur.set_data([xcm[k], xcm[k]], [-0.45, 0.45])
        for l, y in ((lp1, p1F), (lp2, p2F), (lPP, PF)):
            l.set_data(tF[:k + 1:5], y[:k + 1:5])
        infoP.set_text(rf"$P = {de(PF[k], 6)}$      max $|\Delta P/P| = {wiss(max_rel(PF[:k + 1]))}$")
        grab()
    halten(2.5)

    # ------------------------------------------------------------ Teil 4: Kepler -> Drehimpuls
    fig.clf()
    kopfzeile("Drehung  →  Drehimpuls", "Teil 4 / 6")
    fig.text(0.03, 0.875, r"$L = \frac{1}{2}|\dot{\mathbf{r}}|^2 + \frac{1}{|\mathbf{r}|}$"
             "  ist invariant unter Drehungen um die Sonne", fontsize=15, color=GRAU)
    axO = fig.add_axes([0.02, 0.05, 0.50, 0.80]); axO.axis("off"); axO.set_aspect("equal")
    lim_x = (rK[:, 0].min() - 0.3, rK[:, 0].max() + 0.3)
    axO.set_xlim(*lim_x); axO.set_ylim(rK[:, 1].min() - 0.3, rK[:, 1].max() + 0.3)
    axO.plot(rK[:, 0], rK[:, 1], color=HELL, lw=1.2, ls="--")
    axO.plot([0], [0], "o", color="#f2b705", ms=20)
    planet, = axO.plot([], [], "o", color=BLAU, ms=11)
    fahrstrahl, = axO.plot([], [], color=BLAU, lw=1)
    N_SEKT = 12
    grenzen = np.linspace(0, len(tK) - 1, N_SEKT + 1).astype(int)
    flaechen = []
    for j in range(N_SEKT):
        seg = rK[grenzen[j]:grenzen[j + 1] + 1]
        flaechen.append(0.5 * np.sum(seg[:-1, 0] * seg[1:, 1] - seg[1:, 0] * seg[:-1, 1]))
    sektoren = []
    axD = fig.add_axes([0.58, 0.40, 0.38, 0.40]); stil(axD)
    rr = np.linalg.norm(rK, axis=1)
    axD.set_xlim(0, tK[-1]); axD.set_ylim(0, rr.max() * 1.25)
    axD.set_xlabel("Zeit t")
    lr, = axD.plot([], [], color=GRAU, lw=2, label=r"Abstand $r$")
    lL, = axD.plot([], [], color=GRUEN, lw=3, label=r"$L_z = x\dot y - y\dot x$")
    axD.legend(loc="upper left", frameon=False, fontsize=12)
    infoK = fig.text(0.58, 0.27, "", fontsize=14)
    infoK2 = fig.text(0.58, 0.19, "", fontsize=14, color=GRAU)
    fig.text(0.58, 0.10, "Gleiche Zeiten – gleiche Flächen (Keplers 2. Gesetz)\nist Drehimpulserhaltung, "
             r"denn  $dA/dt = L_z/2$", fontsize=14, color=GRUEN)
    n = n_frames(15)
    rr = np.linalg.norm(rK, axis=1)
    for i in range(n):
        k = int(i / (n - 1) * (len(tK) - 1))
        x, y = rK[k]
        planet.set_data([x], [y]); fahrstrahl.set_data([0, x], [0, y])
        while len(sektoren) < N_SEKT and k >= grenzen[len(sektoren) + 1]:
            j = len(sektoren)
            seg = rK[grenzen[j]:grenzen[j + 1] + 1:20]
            p = Polygon(np.vstack([[0, 0], seg]), closed=True,
                        color=GRUEN if j % 2 == 0 else BLAU, alpha=0.28, lw=0)
            axO.add_patch(p); sektoren.append(p)
        lr.set_data(tK[:k + 1:20], rr[:k + 1:20]); lL.set_data(tK[:k + 1:20], LK[:k + 1:20])
        infoK.set_text(rf"$L_z = {de(LK[k], 6)}$     max $|\Delta L/L| = {wiss(max_rel(LK[:k + 1]))}$")
        if sektoren:
            fl = flaechen[:len(sektoren)]
            infoK2.set_text(f"{len(sektoren)} Sektoren, Fläche je  {de(min(fl), 4)} … {de(max(fl), 4)}")
        grab()
    halten(2.5)

    # ------------------------------------------------------------ Teil 5: gebrochene Symmetrie
    textkarte([
        ("Und wenn die Symmetrie fehlt?", 0.62, 30, "bold", FG),
        ("Wir stauchen das Potential in y-Richtung:  Drehungen ändern jetzt L,", 0.48, 19, "normal", FG),
        ("Zeitverschiebungen aber nicht.", 0.41, 19, "normal", FG),
    ], 5.0)

    fig.clf()
    kopfzeile("Symmetrie gebrochen  →  Erhaltung verloren", "Teil 5 / 6")
    fig.text(0.03, 0.875, r"$V = -\left(x^2 + y^2/q^2\right)^{-1/2}$,  $q = 0{,}78$:"
             "  zeitunabhängig, aber nicht mehr drehinvariant", fontsize=15, color=GRAU)
    axO = fig.add_axes([0.02, 0.05, 0.50, 0.80]); axO.axis("off"); axO.set_aspect("equal")
    m = np.abs(rA).max() + 0.3
    axO.set_xlim(-m, m); axO.set_ylim(-m, m)
    gx, gy = np.meshgrid(np.linspace(-m, m, 200), np.linspace(-m, m, 200))
    axO.contour(gx, gy, -(gx ** 2 + (gy / QA) ** 2) ** -0.5, levels=[-2, -1, -0.6, -0.4, -0.3],
                colors=HELL, linewidths=1)
    axO.plot(rK[:, 0], rK[:, 1], color=HELL, lw=1.2, ls="--")
    axO.plot([0], [0], "o", color="#f2b705", ms=20)
    spur, = axO.plot([], [], color=ROT, lw=1.4)
    planet, = axO.plot([], [], "o", color=ROT, ms=11)
    axD = fig.add_axes([0.58, 0.35, 0.38, 0.45]); stil(axD)
    axD.set_xlim(0, tA[-1]); axD.set_ylim(min(LA.min(), EA.min()) - 0.2, LA.max() + 0.35)
    axD.set_xlabel("Zeit t"); axD.axhline(0, color=HELL, lw=1)
    lL, = axD.plot([], [], color=ROT, lw=2.5, label=r"Drehimpuls $L_z$")
    lE, = axD.plot([], [], color=FG, lw=3, label=r"Energie $E$")
    axD.legend(loc="upper right", frameon=False, ncol=2, fontsize=12)
    infoA = fig.text(0.58, 0.22, "", fontsize=14)
    infoA2 = fig.text(0.58, 0.15, "", fontsize=14)
    n = n_frames(15)
    for i in range(n):
        k = int(i / (n - 1) * (len(tA) - 1))
        spur.set_data(rA[:k + 1:10, 0], rA[:k + 1:10, 1]); planet.set_data([rA[k, 0]], [rA[k, 1]])
        lL.set_data(tA[:k + 1:20], LA[:k + 1:20]); lE.set_data(tA[:k + 1:20], EA[:k + 1:20])
        infoA.set_text(rf"Energie:  max $|\Delta E/E| = {wiss(max_rel(EA[:k + 1]))}$   ✓")
        infoA2.set_text(rf"Drehimpuls:  $L_z$ zwischen ${de(LA[:k + 1].min(), 2)}$ und ${de(LA[:k + 1].max(), 2)}$   ✗")
        infoA2.set_color(ROT if k > 0 and np.ptp(LA[:k + 1]) > 0.05 else FG)
        grab()
    halten(3.0)

    # ------------------------------------------------------------ Teil 6: Phase -> Ladung
    textkarte([
        ("Eine Symmetrie ohne Raum und Zeit", 0.70, 30, "bold", FG),
        (r"Die Schrödinger-Gleichung ändert sich nicht unter  $\psi \to e^{i\alpha}\psi$", 0.55, 20, "normal", FG),
        (r"Noether-Strom:   $\rho = |\psi|^2$,   $j = \mathrm{Im}(\psi^*\partial_x\psi)$,"
         r"   $\partial_t\rho + \partial_x j = 0$", 0.43, 20, "normal", BLAU),
        ("Erhaltene Ladung: die Gesamtwahrscheinlichkeit – beim Elektron: die elektrische Ladung",
         0.30, 17, "normal", GRAU),
    ], 8.0)

    fig.clf()
    kopfzeile(r"Phase $\psi \to e^{i\alpha}\psi$  →  Ladung", "Teil 6 / 6")
    fig.text(0.03, 0.875, "Wellenpaket trifft einen Potentialwall: es teilt sich –"
             " doch die Summe der Teile bleibt exakt 1", fontsize=15, color=GRAU)
    axS = fig.add_axes([0.06, 0.20, 0.90, 0.60]); stil(axS)
    XS = 45
    axS.set_xlim(-XS, XS); rho_max = np.abs(psiS[0]).max() ** 2
    axS.set_ylim(-1.15 * np.abs(psiS[0]).max(), 1.25 * np.abs(psiS[0]).max())
    axS.set_xlabel("Ort x"); axS.set_yticks([])
    axS.add_patch(Rectangle((BX0, axS.get_ylim()[0]), BX1 - BX0, np.diff(axS.get_ylim())[0],
                            color=ORANGE, alpha=0.25, lw=0))
    axS.text(BX1 + 0.6, 0.85 * axS.get_ylim()[1], r"Wall  $V_0 > \langle E\rangle$", color=ORANGE, fontsize=13)
    lre, = axS.plot([], [], color=GRAU, lw=1, alpha=0.7, label=r"Re $\psi$")
    lrho, = axS.plot([], [], color=BLAU, lw=2.5, label=r"$\rho = |\psi|^2$  (skaliert)")
    fuell = [None]
    axS.legend(loc="upper left", frameon=False, fontsize=12)
    infoS = fig.text(0.06, 0.07, "", fontsize=17)
    skala = np.abs(psiS[0]).max() / rho_max
    sicht = np.abs(xs) <= XS
    n = n_frames(15)
    for i in range(n):
        k = int(i / (n - 1) * (len(psiS) - 1))
        ps = psiS[k]; rho = np.abs(ps) ** 2
        lre.set_data(xs[sicht], ps.real[sicht]); lrho.set_data(xs[sicht], skala * rho[sicht])
        if fuell[0] is not None:
            fuell[0].remove()
        fuell[0] = axS.fill_between(xs[sicht], 0, skala * rho[sicht], color=BLAU, alpha=0.2, lw=0)
        R = np.sum(rho[xs < BX0]) * dx; T = np.sum(rho[xs > BX1]) * dx
        infoS.set_text(rf"links ${de(R, 4)}$   +   rechts ${de(T, 4)}$   +   im Wall ${de(normS[k] - R - T, 4)}$"
                       rf"   =   $\int\rho\,dx = {de(normS[k], 8)}$")
        grab()
    halten(3.0)

    # ------------------------------------------------------------ Tafel
    textkarte([
        ("Symmetrie  →  Erhaltungsgröße", 0.88, 28, "bold", FG),
        ("Verschiebung in der Zeit   →   Energie", 0.75, 20, "normal", ORANGE),
        ("Verschiebung im Raum   →   Impuls", 0.67, 20, "normal", BLAU),
        ("Drehung   →   Drehimpuls", 0.59, 20, "normal", GRUEN),
        ("Galilei-Boost   →   gleichförmige Schwerpunktsbewegung", 0.51, 20, "normal", FG),
        (r"Phase  $\psi \to e^{i\alpha}\psi$   →   elektrische Ladung", 0.43, 20, "normal", LILA),
        ("Noethers zweiter Satz: lokale Symmetrien (Eichtheorien, Allgemeine Relativitätstheorie)",
         0.28, 16, "normal", GRAU),
        ("erzwingen Identitäten zwischen den Feldgleichungen – genau Hilberts Energierätsel",
         0.22, 16, "normal", GRAU),
    ], 12.0)

    textkarte([
        ("„… das bedeutendste kreative mathematische Genie,", 0.70, 22, "normal", FG),
        ("das seit Beginn der höheren Bildung für Frauen hervorgebracht worden ist.“", 0.62, 22, "normal", FG),
        ("Albert Einstein, Brief an die New York Times, Mai 1935", 0.52, 15, "normal", GRAU),
        ("Wo eine Symmetrie ist, ist eine Erhaltungsgröße.", 0.34, 26, "bold", BLAU),
        ("Danke, Emmy Noether.", 0.22, 22, "normal", FG),
    ], 10.0)

print("fertig: noether.mp4")
print(f"Pendel max|ΔE/E| = {max_rel(EP):.2e},  Feder max|ΔP/P| = {max_rel(PF):.2e},  "
      f"Kepler max|ΔL/L| = {max_rel(LK):.2e},  Norm-Drift = {abs(normS - 1).max():.2e}")
