"""Learning video 3: Hilbert space vs. real space, dimension, Bloch sphere (English)."""
import os, subprocess, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
from matplotlib.patches import Circle, Rectangle, Ellipse, Arc
import render as R
from render import ax, fig, txt, title, caption, ramp, ease, reset
from render import BG, CHALK, DIM, GOLD, BLUE, RED, GREEN, FPS
from render2 import arrow, atom

OUT = os.path.dirname(os.path.abspath(__file__))
DARK = "#16302b"
ORANGE = "#f0a35e"


def vec(x0, y0, x1, y1, col, lw=4, alpha=1.0, ms=22):
    ax.annotate("", xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(arrowstyle="-|>", lw=lw, color=col, mutation_scale=ms, alpha=alpha,
                                shrinkA=0, shrinkB=0), zorder=6)


# ------------------------------------------------------------------ 1 two spaces
def s1(t):
    title("Two different spaces", "where the spins sit  vs.  where the states live")
    a = ramp(t, 0.5)
    txt(3.6, 6.6, "Real space", size=24, color=GOLD, alpha=a, ha="center", weight="bold")
    txt(3.6, 6.05, "3 dimensions:  x, y, z", size=17, color=DIM, alpha=a, ha="center")
    P = {1: (2.2, 2.6), 2: (3.6, 5.0), 3: (5.0, 2.6)}
    for (p, q) in ((1, 2), (2, 3), (1, 3)):
        ax.plot([P[p][0], P[q][0]], [P[p][1], P[q][1]], color=DIM, lw=2, alpha=0.55 * a, zorder=2)
    for i, z in zip((1, 2, 3), (1, 0, 1)):
        ax.add_patch(Circle(P[i], 0.6, fc=DARK, ec=DIM, lw=1.3, alpha=a, zorder=3))
        arrow(*P[i], 90 if z else -90, L=0.95, lw=4, alpha=a, ms=18)
    b = ramp(t, 2.6)
    txt(11.0, 6.6, "Hilbert space", size=24, color=BLUE, alpha=b, ha="center", weight="bold")
    txt(11.0, 6.05, r"$2^3 = 8$ dimensions:  one axis per basis state", size=17, color=DIM, alpha=b, ha="center")
    cx, cy = 9.9, 2.55
    for k in range(8):
        g = ramp(t, 3.2 + 0.25 * k, 0.4)
        ang = np.deg2rad(5 + 170 * k / 7)
        ex, ey = cx + 2.6 * np.cos(ang), cy + 2.6 * np.sin(ang)
        ax.plot([cx, ex], [cy, ey], color=BLUE, lw=2.2, alpha=g, zorder=3)
        z = [(k >> i) & 1 for i in range(3)]
        txt(cx + 3.05 * np.cos(ang), cy + 2.95 * np.sin(ang), R.ket(z), size=13, color=BLUE, alpha=g, ha="center")
    ax.plot([7.0, 7.0], [1.9, 6.4], color=DIM, lw=1, alpha=0.4, zorder=2)
    txt(14.0, 5.0, "in truth all 8 axes are\nmutually perpendicular:\nimpossible to draw", size=14, color=DIM, alpha=ramp(t, 5.0), ha="center")
    caption("The arrows we draw live in real space.  The state vector lives in an 8-dimensional space.", ramp(t, 5.4))


# ------------------------------------------------------------------ 2 one spin: angle halves
def s2(t):
    title("One spin: opposite in space, orthogonal as states", r"$\theta$ in real space  $\rightarrow$  $\theta/2$ in Hilbert space")
    th = np.pi * ease((t - 1.5) / 5.0)
    # real space
    cx, cy, L = 3.6, 4.1, 1.7
    ax.add_patch(Circle((cx, cy), L, fc="none", ec=DIM, lw=1.2, ls=(0, (4, 4)), zorder=2))
    vec(cx, cy, cx + L * np.sin(th), cy + L * np.cos(th), R.mix(GOLD, BLUE, th / np.pi), lw=5)
    ax.plot([cx, cx], [cy, cy + L], color=DIM, lw=1, zorder=2)
    if th > 0.05:
        ax.add_patch(Arc((cx, cy), 1.3, 1.3, theta1=90 - np.degrees(th), theta2=90, color=ORANGE, lw=2, zorder=4))
    txt(cx, 1.65, rf"real space:  $\theta = {np.degrees(th):.0f}^\circ$", size=20, color=ORANGE, ha="center")
    txt(cx, cy + L + 0.35, r"$\uparrow$", size=20, color=GOLD, ha="center")
    txt(cx, cy - L - 0.35, r"$\downarrow$", size=20, color=BLUE, ha="center")
    # Hilbert space
    hx, hy, HL = 9.3, 2.6, 3.0
    vec(hx - 0.2, hy, hx + HL + 0.4, hy, DIM, lw=1.5, ms=14)
    vec(hx, hy - 0.2, hx, hy + HL + 0.4, DIM, lw=1.5, ms=14)
    txt(hx + HL + 0.55, hy, r"$|\!\uparrow\rangle$", size=20, color=GOLD, va="center")
    txt(hx, hy + HL + 0.65, r"$|\!\downarrow\rangle$", size=20, color=BLUE, ha="center")
    c, s = np.cos(th / 2), np.sin(th / 2)
    vec(hx, hy, hx + HL * c, hy + HL * s, R.mix(GOLD, BLUE, th / np.pi), lw=5)
    ax.plot([hx + HL * c, hx + HL * c], [hy, hy + HL * s], color=DIM, lw=1, ls=(0, (3, 3)), zorder=3)
    ax.plot([hx, hx + HL * c], [hy + HL * s, hy + HL * s], color=DIM, lw=1, ls=(0, (3, 3)), zorder=3)
    if th > 0.05:
        ax.add_patch(Arc((hx, hy), 1.6, 1.6, theta1=0, theta2=np.degrees(th / 2), color=ORANGE, lw=2, zorder=4))
    txt(hx + 1.5, 1.65, rf"Hilbert space:  $\theta/2 = {np.degrees(th / 2):.0f}^\circ$", size=20, color=ORANGE, ha="center")
    txt(13.0, 5.5, rf"$\cos\frac{{\theta}}{{2}} = {c:.2f}$", size=19, color=GOLD)
    txt(13.0, 4.8, rf"$\sin\frac{{\theta}}{{2}} = {s:.2f}$", size=19, color=BLUE)
    caption("Up and down point in opposite directions in space, but as states they are perpendicular.", ramp(t, 6.8))


# ------------------------------------------------------------------ 3 Bloch sphere
def proj(v, az=np.deg2rad(32), el=np.deg2rad(18)):
    x, y, z = v
    sx = -x * np.sin(az) + y * np.cos(az)
    sy = z * np.cos(el) - (x * np.cos(az) + y * np.sin(az)) * np.sin(el)
    return sx, sy


def s3(t):
    title("The Bloch sphere", r"$|\psi\rangle = \cos\frac{\theta}{2}\,|\!\uparrow\rangle + e^{i\varphi}\sin\frac{\theta}{2}\,|\!\downarrow\rangle$")
    cx, cy, Rr = 4.3, 4.0, 2.3
    el = np.deg2rad(18)
    ax.add_patch(Circle((cx, cy), Rr, fc=DARK, ec=CHALK, lw=1.8, alpha=0.95, zorder=2))
    ax.add_patch(Ellipse((cx, cy), 2 * Rr, 2 * Rr * np.sin(el), fc="none", ec=DIM, lw=1.2, ls=(0, (4, 4)), zorder=3))
    for v, lab, col in (((0, 0, 1), r"$|\!\uparrow\rangle$", GOLD), ((0, 0, -1), r"$|\!\downarrow\rangle$", BLUE)):
        px, py = proj(v)
        ax.add_patch(Circle((cx + Rr * px, cy + Rr * py), 0.07, color=col, zorder=7))
        txt(cx + Rr * px + 0.3, cy + Rr * py + (0.25 if v[2] > 0 else 0.05), lab, size=20, color=col)
    px, py = proj((1, 0, 0))
    ax.add_patch(Circle((cx + Rr * px, cy + Rr * py), 0.07, color=GREEN, zorder=7, alpha=ramp(t, 5.0)))
    txt(cx + Rr * px - 0.25, cy + Rr * py - 0.45, r"$+x$", size=17, color=GREEN, alpha=ramp(t, 5.0), ha="right")
    # path: theta 0 -> pi/2 (t 1.5..4.5), then phi rotation (4.5..8.5), then theta -> pi (8.5..10.5)
    th = np.pi / 2 * ease((t - 1.5) / 3.0) + np.pi / 2 * ease((t - 8.6) / 1.8)
    ph = 2 * np.pi * ease((t - 4.6) / 3.8)
    v = (np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th))
    px, py = proj(v)
    vec(cx, cy, cx + Rr * px, cy + Rr * py, ORANGE, lw=5)
    # coefficients
    c, s = np.cos(th / 2), np.sin(th / 2)
    txt(8.6, 6.1, rf"$\theta = {np.degrees(th):.0f}^\circ,\quad \varphi = {np.degrees(ph) % 360:.0f}^\circ$", size=22, color=ORANGE)
    txt(8.6, 5.1, rf"$\cos\frac{{\theta}}{{2}} = {c:.2f}$   (amplitude of $|\!\uparrow\rangle$)", size=19, color=GOLD)
    txt(8.6, 4.4, rf"$\sin\frac{{\theta}}{{2}} = {s:.2f}$   (amplitude of $|\!\downarrow\rangle$)", size=19, color=BLUE)
    txt(8.6, 3.3, "north pole:  up      south pole:  down", size=18, color=CHALK, alpha=ramp(t, 1.0))
    txt(8.6, 2.6, r"equator:  equal superposition", size=18, color=GREEN, alpha=ramp(t, 4.4))
    txt(8.6, 1.95, r"$\varphi$:  relative phase, turns the arrow around $z$", size=18, color=DIM, alpha=ramp(t, 5.4))
    caption("Every state of ONE spin is a point on this sphere.  Opposite points are orthogonal states.", ramp(t, 1.0) * (1 - ramp(t, 9.0)))
    caption("Not real space:  a map of all states in \u2102\u00b2.  The arrow direction shows \u27e8S\u27e9.", ramp(t, 9.0))


# ------------------------------------------------------------------ 4 dimension doubles
def s4(t):
    title("Every spin doubles the dimension", r"$\dim\mathcal{H} = 2^N$")
    for N in (1, 2, 3):
        a = ramp(t, 0.6 + 1.6 * (N - 1))
        y = 6.0 - 1.35 * (N - 1)
        txt(0.9, y, rf"$N={N}$", size=24, color=CHALK, alpha=a)
        for k in range(2 ** N):
            g = ramp(t, 0.8 + 1.6 * (N - 1) + 0.12 * k, 0.3)
            x = 3.0 + 1.25 * k
            ax.add_patch(Rectangle((x - 0.55, y - 0.36), 1.1, 0.72, fc=DARK, ec=BLUE, lw=1.6, alpha=g, zorder=3))
            z = [(k >> i) & 1 for i in range(N)]
            txt(x, y, R.ket(z), size=13 if N == 3 else 15, color=BLUE, alpha=g, ha="center")
        txt(13.4, y, rf"$= {2 ** N}$", size=24, color=GOLD, alpha=ramp(t, 1.5 + 1.6 * (N - 1)))
    g = ramp(t, 6.0, 3.5)
    N = int(round(3 + 37 * g))
    txt(0.9, 2.05, rf"$N = {N}$:", size=24, color=CHALK, alpha=ramp(t, 5.6))
    e = int(np.floor(np.log10(2.0 ** N))); m = 2.0 ** N / 10 ** e
    num = rf"{2 ** N}" if N < 10 else rf"{m:.1f}\times 10^{{{e}}}"
    txt(3.0, 2.05, rf"$2^{{{N}}} \approx {num}$", size=24, color=RED if N > 30 else GOLD, alpha=ramp(t, 5.6))
    caption("The spins need no more room in space.  But the number of configurations explodes.", ramp(t, 5.6))


# ------------------------------------------------------------------ 5 basis vectors and a state
def s5(t):
    title("A state is a list of 8 numbers", r"$|\psi\rangle = \sum_n \psi_n\,|n\rangle$")
    # unit vectors
    x0, y0, c = 1.0, 2.0, 0.40
    for k in range(8):
        a = ramp(t, 0.5 + 0.2 * k, 0.35)
        for r in range(8):
            on = r == k
            ax.add_patch(Rectangle((x0 + 0.62 * k, y0 + c * (7 - r)), 0.5, c - 0.05, fc=GOLD if on else DARK,
                                   ec=DIM, lw=0.5, alpha=a, zorder=3))
        txt(x0 + 0.62 * k + 0.25, y0 - 0.35, rf"$|{k}\rangle$", size=14, color=DIM, alpha=a, ha="center")
    txt(x0 + 2.4, 6.25, r"basis vectors = unit vectors in $\mathbb{C}^8$", size=18, color=CHALK, alpha=ramp(t, 0.5), ha="center")
    txt(x0 + 2.4, 5.75, "they live in Hilbert space, not in real space", size=16, color=DIM, alpha=ramp(t, 2.2), ha="center")
    # example state: W state on n = 1, 2, 4
    b = ramp(t, 3.6)
    txt(10.6, 6.0, r"example:  $\frac{1}{\sqrt{3}}(|\!\uparrow\downarrow\downarrow\rangle + |\!\downarrow\uparrow\downarrow\rangle + |\!\downarrow\downarrow\uparrow\rangle)$",
        size=17, color=CHALK, alpha=b, ha="center")
    psi = np.zeros(8); psi[[1, 2, 4]] = 1 / np.sqrt(3)
    bx = 7.6
    ax.plot([bx - 0.2, bx + 0.75 * 8], [2.0, 2.0], color=DIM, lw=1.2, alpha=b, zorder=2)
    for k in range(8):
        g = ramp(t, 4.2 + 0.15 * k, 0.6)
        h = 3.0 * psi[k] ** 2 * g
        ax.add_patch(Rectangle((bx + 0.75 * k, 2.0), 0.55, h, color=GOLD, alpha=0.9 * b, zorder=3))
        txt(bx + 0.75 * k + 0.27, 1.7, str(k), size=14, color=DIM, alpha=b, ha="center")
        if psi[k] > 0:
            txt(bx + 0.75 * k + 0.27, 2.0 + h + 0.3, r"$\frac{1}{3}$", size=15, color=GOLD, alpha=g, ha="center")
    txt(bx + 3.0, 5.25, r"probabilities $|\psi_n|^2$", size=17, color=DIM, alpha=b, ha="center")
    caption("Three of eight numbers are nonzero:  no single arrow per spin describes this state.", ramp(t, 6.2))


# ------------------------------------------------------------------ 6 summary
def s6(t):
    title("Summary", "Real space and Hilbert space")
    rows = [("Real space:  3 dimensions.  The spins sit there; we draw arrows there.", CHALK),
            (r"Hilbert space:  $2^N$ dimensions, one axis per basis state.", GOLD),
            ("Dimension = number of basis states = number of coefficients.", CHALK),
            (r"Opposite in space $\Rightarrow$ orthogonal in Hilbert space:  the angle halves.", GOLD),
            ("Bloch sphere:  all states of ONE spin.  Many spins:  only the vector.", CHALK)]
    for k, (r, col) in enumerate(rows):
        txt(1.0, 6.3 - 0.95 * k, r, size=21, color=col, alpha=ramp(t, 0.5 + 0.7 * k))


SCENES = [("c1", s1, 8.5), ("c2", s2, 9.5), ("c3", s3, 13.0), ("c4", s4, 11.0), ("c5", s5, 9.5), ("c6", s6, 7.5)]


def render(name, fn, dur):
    tmp, final = f"{OUT}/{name}.tmp.mp4", f"{OUT}/{name}.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1280x720",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
                          "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for k in range(int(dur * FPS)):
        p.stdin.write(R.frame(fn, k / FPS, dur))
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
