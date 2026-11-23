"""Lernvideo: Was die Operatoren mit den Spins machen (Blatt 4, Aufgabe 1).
Rendert jede Szene als eigene MP4 (gleiche Encoder-Einstellungen), danach concat."""
import os, subprocess, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, FancyBboxPatch

FPS, W, H = 30, 16.0, 9.0
BG, CHALK, DIM, GOLD, BLUE, RED, GREEN = "#1f3a35", "#eef3ea", "#a9bfb3", "#e3c26a", "#8fc7e8", "#ef8d80", "#7cc58f"
plt.rcParams.update({"font.family": "DejaVu Sans", "mathtext.fontset": "cm"})
OUT = os.path.dirname(os.path.abspath(__file__))

fig = plt.figure(figsize=(12.8, 7.2), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def ramp(t, t0, d=0.5):
    return ease((t - t0) / d)


def mix(c1, c2, s):
    a, b = np.array(matplotlib.colors.to_rgb(c1)), np.array(matplotlib.colors.to_rgb(c2))
    return tuple(a + (b - a) * s)


def reset():
    ax.clear()
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    ax.add_patch(Rectangle((0, 0), W, H, color=BG, zorder=0))


def txt(x, y, s, size=22, color=CHALK, alpha=1.0, ha="left", va="center", weight="normal"):
    if alpha <= 0.01:
        return
    ax.text(x, y, s, fontsize=size, color=color, alpha=min(1, alpha), ha=ha, va=va, weight=weight, zorder=5)


def title(s, sub=None):
    txt(0.7, 8.25, s, size=30, color=CHALK, weight="bold")
    if sub:
        txt(0.72, 7.6, sub, size=17, color=DIM)
    ax.plot([0.7, 15.3], [7.2, 7.2], color=DIM, lw=1, alpha=0.5, zorder=2)


def caption(s, alpha=1.0):
    if alpha <= 0.01:
        return
    ax.add_patch(FancyBboxPatch((0.7, 0.35), 14.6, 1.0, boxstyle="round,pad=0.02,rounding_size=0.15",
                                fc="#16302b", ec=DIM, lw=1, alpha=0.9 * alpha, zorder=4))
    txt(8.0, 0.85, s, size=17.5, color=CHALK, alpha=alpha, ha="center")


def spin(x, y, s, L=1.5, lw=6, shake=0.0, alpha=1.0):
    """s = 0: down, s = 1: up; dazwischen Drehung."""
    th = np.deg2rad(-90 + 180 * s)
    ux, uy = np.cos(th), np.sin(th)
    col = mix(BLUE, GOLD, s)
    x = x + shake
    ax.annotate("", xy=(x + ux * L / 2, y + uy * L / 2), xytext=(x - ux * L / 2, y - uy * L / 2),
                arrowprops=dict(arrowstyle="-|>", lw=lw, color=col, mutation_scale=30, alpha=alpha,
                                shrinkA=0, shrinkB=0), zorder=6)


P = {1: (3.0, 2.75), 2: (5.0, 5.6), 3: (7.0, 2.75)}
BONDS = [(1, 2), (2, 3), (1, 3)]


def triangle(hl=None, hl_alpha=1.0, alpha=1.0):
    for (a, b) in BONDS:
        on = hl == (a, b)
        ax.plot([P[a][0], P[b][0]], [P[a][1], P[b][1]], color=GOLD if on else DIM,
                lw=7 if on else 2.5, alpha=(hl_alpha if on else 0.55) * alpha, zorder=2, solid_capstyle="round")
    for i, (x, y) in P.items():
        ax.add_patch(Circle((x, y), 0.95, fc="#16302b", ec=DIM, lw=1.5, alpha=alpha, zorder=3))
        dx, dy = {1: (-1.25, -0.75), 2: (1.3, 0.55), 3: (1.25, -0.75)}[i]
        txt(x + dx, y + dy, str(i), size=20, color=DIM, alpha=alpha, ha="center")


def ket(z):
    return r"$|" + "".join(r"\uparrow" if v else r"\downarrow" for v in z) + r"\rangle$"


def fade(t, dur, d=0.4):
    a = 1 - min(ramp(t, 0, d), 1 - ramp(t, dur - d, d))
    if a > 0.01:
        ax.add_patch(Rectangle((0, 0), W, H, color=BG, alpha=a, zorder=20))


# ------------------------------------------------------------------ Szenen
def s1(t):
    title("Drei Spins auf einem Dreieck", "three-site cluster  ·  Blatt 4, Aufgabe 1")
    triangle()
    z = (1, 0, 1)
    for i in (1, 2, 3):
        a = ramp(t, 0.6 + 0.5 * (i - 1))
        spin(*P[i], z[i - 1], alpha=a)
    txt(9.2, 6.2, "Zustand:  " + ket(z), size=30, alpha=ramp(t, 2.2))
    txt(9.2, 5.0, r"$z_1\,z_2\,z_3 \;=\; 1\;\,0\;\,1$", size=27, alpha=ramp(t, 3.0))
    txt(9.2, 3.9, r"$n=\sum_i z_i\,2^{\,i-1}$", size=27, color=DIM, alpha=ramp(t, 3.8))
    txt(9.2, 2.8, r"$n = 1\!\cdot\!1 + 0\!\cdot\!2 + 1\!\cdot\!4 = 5$", size=27, color=GOLD, alpha=ramp(t, 4.6))
    caption("Jeder Zustand ist eine Binärzahl:  ↑ = 1,  ↓ = 0.  Platz 1 ist das niedrigste Bit.", ramp(t, 3.0))


def s2(t):
    title("Leiteroperatoren", r"ladder operators   $S^\pm = S^x \pm i\,S^y$")
    s = ramp(t, 1.6, 1.3)
    sh = 0.12 * np.sin(2 * np.pi * 7 * (t - 4.8)) * (1 if 4.8 < t < 5.6 else 0)
    ax.add_patch(Circle((4.2, 4.3), 1.5, fc="#16302b", ec=DIM, lw=1.5, zorder=3))
    spin(4.2, 4.3, s, L=2.2, lw=8, shake=sh)
    a1 = ramp(t, 1.0) * (1 - ramp(t, 3.4))
    txt(4.2, 6.5, r"$S^+$", size=40, color=GOLD, alpha=a1, ha="center")
    a2 = ramp(t, 4.3) * (1 - ramp(t, 6.4))
    txt(4.2, 6.5, r"$S^+$  noch einmal", size=32, color=RED, alpha=a2, ha="center")
    txt(9.0, 5.6, r"$S^+|\!\downarrow\rangle = |\!\uparrow\rangle$", size=36, alpha=ramp(t, 2.9))
    txt(9.0, 4.2, r"$S^+|\!\uparrow\rangle = 0$", size=36, color=RED, alpha=ramp(t, 5.6))
    txt(9.0, 2.8, r"$S^-|\!\uparrow\rangle = |\!\downarrow\rangle,\quad S^-|\!\downarrow\rangle = 0$", size=26, color=DIM, alpha=ramp(t, 6.4))
    caption("S⁺ hebt an, S⁻ senkt ab.  Was schon oben ist, kann nicht höher:  das Ergebnis ist null.", ramp(t, 1.0))


def flip_scene(t, z0, op, pq, coef, head, sub, cap, sz0, sz1, stay):
    title(head, sub)
    p, q = pq
    hl = ramp(t, 1.2)
    triangle(hl=tuple(sorted(pq)), hl_alpha=hl)
    s = ramp(t, 2.8, 1.5)
    z = list(z0)
    for i in (1, 2, 3):
        v = z0[i - 1]
        if i in pq:
            v = v + (1 - 2 * v) * s
        spin(*P[i], v)
    z1 = list(z0)
    for i in pq:
        z1[i - 1] = 1 - z1[i - 1]
    n0 = sum(v << k for k, v in enumerate(z0)); n1 = sum(v << k for k, v in enumerate(z1))
    txt(2.35, 4.75, op, size=30, color=GOLD, alpha=hl, ha="center")
    done = ramp(t, 4.3)
    txt(9.0, 6.3, ket(z0) + r"$\;\longrightarrow\;$", size=32, alpha=ramp(t, 0.6))
    txt(12.55, 6.3, ket(z1), size=32, color=GOLD, alpha=done)
    txt(9.0, 5.2, rf"$n = {n0}$" + r"$\;\longrightarrow\;$", size=26, color=DIM, alpha=ramp(t, 0.6))
    txt(11.75, 5.2, rf"$l = {n1}$", size=26, color=GOLD, alpha=done)
    txt(9.0, 4.1, rf"$S^z_{{\rm tot}}:\ {sz0}$" + r"$\;\longrightarrow\;$" + rf"${sz1}$", size=26, alpha=ramp(t, 5.0))
    txt(9.0, 3.35, stay, size=19, color=GREEN if "bleibt" in stay else RED, alpha=ramp(t, 5.6))
    txt(9.0, 2.55, "Vorfaktor:  " + coef, size=27, color=CHALK, alpha=ramp(t, 6.4))
    caption(cap, ramp(t, 1.2))


def s3(t):
    flip_scene(t, (1, 0, 1), r"$S^-_1\,S^+_2$", (1, 2), r"$\frac{1}{4}\,(J^x_{12}+J^y_{12})$",
               "Gemischte Operatoren: Tausch", r"spin exchange   $S^+_iS^-_j$,  $S^-_iS^+_j$",
               "Ein Spin runter, der andere hoch: die beiden tauschen.  Die Magnetisierung bleibt gleich.",
               r"+\frac{1}{2}", r"+\frac{1}{2}", "bleibt erhalten")


def s4(t):
    flip_scene(t, (0, 0, 1), r"$S^+_1\,S^+_2$", (1, 2), r"$\frac{1}{4}\,(J^x_{12}-J^y_{12})$",
               "Gleiche Operatoren: Doppel-Flip", r"$S^+_iS^+_j$,  $S^-_iS^-_j$",
               "Beide Spins kippen in dieselbe Richtung.  Im Heisenberg-Modell ist der Vorfaktor null.",
               r"-\frac{1}{2}", r"+\frac{3}{2}", "ändert sich um 2")
    a = ramp(t, 7.6)
    txt(9.0, 1.8, r"Heisenberg:  $J^x = J^y \;\Rightarrow\; 0$", size=24, color=RED, alpha=a)


def bars(x0, vals, t, t0, label, total):
    """zwei Balken (x-Link, y-Link) und ihre Summe"""
    base = 3.9
    for k, (v, name, col) in enumerate(zip(vals, (r"$x$-Link", r"$y$-Link"), (BLUE, GREEN))):
        g = ramp(t, t0 + 0.7 * k, 0.8)
        hgt = 1.0 * v * g
        ax.add_patch(Rectangle((x0 + 1.5 * k, base), 1.0, hgt, color=col, alpha=0.9, zorder=3))
        txt(x0 + 0.5 + 1.5 * k, base + (hgt + 0.35 * np.sign(v)), (r"$+\frac{1}{4}J$" if v > 0 else r"$-\frac{1}{4}J$"),
            size=20, color=col, alpha=g, ha="center")
        txt(x0 + 0.5 + 1.5 * k, 1.9, name, size=16, color=DIM, alpha=g, ha="center")
    ax.plot([x0 - 0.3, x0 + 4.9], [base, base], color=DIM, lw=1.5, zorder=2)
    g = ramp(t, t0 + 2.0, 0.8)
    tot = sum(vals)
    ax.add_patch(Rectangle((x0 + 3.4, base), 1.0, 1.0 * tot * g, color=GOLD, alpha=0.95, zorder=3))
    txt(x0 + 3.9, base + 1.0 * tot + 0.4, total, size=22, color=GOLD, alpha=g, ha="center")
    txt(x0 + 3.9, 1.9, "Summe", size=16, color=GOLD, alpha=g, ha="center")
    txt(x0 + 1.2, 6.8, label, size=22, alpha=ramp(t, t0 - 0.4), ha="center")


def s5(t):
    title("Warum fällt der Doppel-Flip weg?", r"$J^x = J^y = J$:   $x$-Link und $y$-Link landen beim selben Zustand")
    bars(1.6, (1, 1), t, 1.0, r"antiparallel  $|\!\uparrow\downarrow\rangle$", r"$\frac{1}{2}J$")
    bars(9.6, (1, -1), t, 4.2, r"parallel  $|\!\uparrow\uparrow\rangle$", r"$0$")
    caption("Antiparallel addieren sich die Beiträge.  Parallel heben sie sich auf  (Vorzeichen s im Skript).", ramp(t, 1.0))


def s6(t):
    title("Ising-Modell: nur die z-Kopplung", r"$H = -J\,(S^z_1S^z_2 + S^z_1S^z_3 + S^z_2S^z_3)$")
    z = (1, 0, 1)
    vals = {(1, 2): -1, (2, 3): -1, (1, 3): +1}
    lab = {(1, 2): (3.1, 4.5), (2, 3): (6.9, 4.5), (1, 3): (5.0, 2.2)}
    cur = None
    for k, b in enumerate(BONDS):
        if 1.5 + 1.5 * k <= t < 3.0 + 1.5 * k:
            cur = b
    triangle(hl=cur, hl_alpha=1.0)
    for i in (1, 2, 3):
        pulse = 1.0
        spin(*P[i], z[i - 1], L=1.5 * pulse)
    for k, b in enumerate(BONDS):
        a = ramp(t, 1.9 + 1.5 * k)
        v = vals[b]
        txt(*lab[b], r"$+\frac{1}{4}$" if v > 0 else r"$-\frac{1}{4}$", size=26, color=GOLD if v > 0 else RED, alpha=a, ha="center")
    txt(9.2, 6.2, r"$S^z$ kippt nichts, es misst nur.", size=25, alpha=ramp(t, 0.6))
    txt(9.2, 5.2, r"parallel:  $(\pm\frac{1}{2})(\pm\frac{1}{2}) = +\frac{1}{4}$", size=23, color=GOLD, alpha=ramp(t, 1.9))
    txt(9.2, 4.4, r"antiparallel:  $(+\frac{1}{2})(-\frac{1}{2}) = -\frac{1}{4}$", size=23, color=RED, alpha=ramp(t, 1.9))
    txt(9.2, 3.3, r"Summe:  $-\frac{1}{4}-\frac{1}{4}+\frac{1}{4} = -\frac{1}{4}$", size=24, alpha=ramp(t, 6.4))
    txt(9.2, 2.3, r"$E = -J\cdot(-\frac{1}{4}) = +\frac{J}{4}$", size=28, color=GOLD, alpha=ramp(t, 7.4))
    caption("Der Zustand bleibt, wie er ist:  es entstehen nur Diagonalelemente der Matrix.", ramp(t, 6.4))


def hmat(links):
    Hm = np.zeros((8, 8))
    for n in range(8):
        z = [(n >> i) & 1 for i in range(3)]
        for al, p, q, J in links:
            zp, zq = z[p - 1], z[q - 1]
            if al in "xy":
                l = n + (1 - 2 * zp) * 2 ** (p - 1) + (1 - 2 * zq) * 2 ** (q - 1)
                s = 1 if al == "x" else -(2 * zp - 1) * (2 * zq - 1)
                Hm[l, n] += -0.25 * J * s
            else:
                Hm[n, n] += -0.25 * J * (2 * zp - 1) * (2 * zq - 1)
    return Hm


HEIS = hmat([(a, p, q, 1.0) for (p, q) in [(1, 2), (2, 3), (3, 1)] for a in "xyz"])
OFF = [(r, c) for c in range(8) for r in range(8) if r != c and abs(HEIS[r, c]) > 1e-9]


def s7(t):
    title("So füllt sich die Hamilton-Matrix", r"$8\times 8$,  Zeile $l$, Spalte $n$")
    x0, y0, c = 1.6, 1.75, 0.62
    for n in range(8):
        txt(x0 + c * (n + 0.5), y0 + 8 * c + 0.3, str(n), size=13, color=DIM, ha="center")
        txt(x0 - 0.3, y0 + c * (7 - n + 0.5), str(n), size=13, color=DIM, ha="center")
        for m in range(8):
            ax.add_patch(Rectangle((x0 + c * n, y0 + c * (7 - m)), c, c, fc="#16302b", ec=DIM, lw=0.6, alpha=0.9, zorder=2))
    for n in range(8):
        a = ramp(t, 1.0 + 0.22 * n, 0.4)
        ax.add_patch(Rectangle((x0 + c * n + 0.05, y0 + c * (7 - n) + 0.05), c - 0.1, c - 0.1, color=GOLD, alpha=a, zorder=3))
    for k, (r, cc) in enumerate(OFF):
        a = ramp(t, 4.6 + 0.2 * k, 0.4)
        ax.add_patch(Rectangle((x0 + c * cc + 0.05, y0 + c * (7 - r) + 0.05), c - 0.1, c - 0.1, color=BLUE, alpha=a, zorder=3))
    txt(8.2, 6.2, "Ising", size=26, color=GOLD, alpha=ramp(t, 1.0), weight="bold")
    txt(8.2, 5.5, r"nur $S^zS^z$  $\Rightarrow$  nur die Diagonale", size=22, alpha=ramp(t, 1.4))
    txt(8.2, 4.3, "Heisenberg", size=26, color=BLUE, alpha=ramp(t, 4.4), weight="bold")
    txt(8.2, 3.6, r"Tausch-Terme koppeln Zustände", size=22, alpha=ramp(t, 4.8))
    txt(8.2, 3.0, r"mit gleichem $S^z_{\rm tot}$", size=22, alpha=ramp(t, 4.8))
    txt(8.2, 2.0, r"$8 + 12 = 20$ von $64$ Elementen $\neq 0$", size=22, color=DIM, alpha=ramp(t, 7.4))
    caption("Fast alle Einträge sind null:  die Matrix ist dünn besetzt (sparse matrix).", ramp(t, 7.0))


def s8(t):
    title("Zusammenfassung", "Was die drei Bausteine von H tun")
    rows = [(r"$S^+_iS^-_j,\ S^-_iS^+_j$", "Tausch", r"$\frac{1}{4}(J^x+J^y)$", GOLD),
            (r"$S^+_iS^+_j,\ S^-_iS^-_j$", "Doppel-Flip", r"$\frac{1}{4}(J^x-J^y)$", RED),
            (r"$S^z_iS^z_j$", "kein Flip, Diagonale", r"$\pm\frac{1}{4}\,J^z$", BLUE)]
    for k, (op, what, coef, col) in enumerate(rows):
        a = ramp(t, 0.6 + 0.9 * k)
        y = 6.1 - 1.25 * k
        txt(1.2, y, op, size=28, color=col, alpha=a)
        txt(6.6, y, what, size=24, alpha=a)
        txt(11.6, y, coef, size=28, color=col, alpha=a)
    txt(1.2, 2.3, r"Nächster Schritt:  $\langle 0|H|0\rangle$  für  $|0\rangle = |\!\downarrow\downarrow\downarrow\rangle$  selbst rechnen.", size=23, color=CHALK, alpha=ramp(t, 3.6))


SCENES = [("s1", s1, 7.5), ("s2", s2, 8.5), ("s3", s3, 9.0), ("s4", s4, 10.5), ("s5", s5, 9.5),
          ("s6", s6, 10.5), ("s7", s7, 10.0), ("s8", s8, 7.5)]


def frame(fn, t, dur):
    reset(); fn(t); fade(t, dur)
    fig.canvas.draw()
    return np.asarray(fig.canvas.buffer_rgba())[:, :, :3].tobytes()


def render(name, fn, dur):
    tmp, final = f"{OUT}/{name}.tmp.mp4", f"{OUT}/{name}.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1280x720",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
                          "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for k in range(int(dur * FPS)):
        p.stdin.write(frame(fn, k / FPS, dur))
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, final)
    else:
        sys.exit(f"ffmpeg failed for {name}")


if __name__ == "__main__":
    if sys.argv[1] == "still":
        for name, fn, dur in SCENES:
            for tt in sys.argv[2:]:
                if tt.startswith(name + ":"):
                    reset(); fn(float(tt.split(":")[1])); fig.savefig(f"{OUT}/still_{name}.png", dpi=100)
    else:
        for name, fn, dur in SCENES:
            if name in sys.argv[1:]:
                render(name, fn, dur)
