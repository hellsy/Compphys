"""Learning video 2: the physical picture behind the Heisenberg model (English)."""
import os, subprocess, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
from matplotlib.patches import Circle, Rectangle, FancyBboxPatch
import render as R
from render import ax, fig, txt, title, caption, ramp, ease, fade, reset, ket
from render import BG, CHALK, DIM, GOLD, BLUE, RED, GREEN, FPS, W, H

OUT = os.path.dirname(os.path.abspath(__file__))
DARK = "#16302b"


def arrow(x, y, deg, L=1.0, lw=5, col=None, alpha=1.0, ms=24):
    """Spin arrow, deg = 90 up, -90 down."""
    th = np.deg2rad(deg)
    ux, uy = np.cos(th), np.sin(th)
    if col is None:
        s = min(1, max(0, (np.sin(th) + 1) / 2))
        col = R.mix(BLUE, GOLD, s)
    ax.annotate("", xy=(x + ux * L / 2, y + uy * L / 2), xytext=(x - ux * L / 2, y - uy * L / 2),
                arrowprops=dict(arrowstyle="-|>", lw=lw, color=col, mutation_scale=ms, alpha=alpha,
                                shrinkA=0, shrinkB=0), zorder=6)


def atom(x, y, r=0.42, alpha=1.0):
    ax.add_patch(Circle((x, y), r, fc="#2c4f48", ec=DIM, lw=1.3, alpha=alpha, zorder=3))


# ------------------------------------------------------------------ 1 metal vs insulator
def s1(t):
    title("Metal or magnetic insulator?", "Where the Heisenberg model lives")
    rng = np.random.default_rng(3)
    for side, x0 in (("metal", 1.3), ("ins", 9.2)):
        a = ramp(t, 0.5 if side == "metal" else 3.2)
        pts = [(x0 + 1.5 * i, 2.4 + 1.4 * j) for i in range(4) for j in range(3)]
        for (x, y) in pts:
            atom(x, y, alpha=a)
        if side == "metal":
            txt(x0 + 2.25, 6.6, "Metal", size=26, color=BLUE, alpha=a, ha="center", weight="bold")
            for k in range(8):
                vx = 0.9 + 0.5 * rng.random(); ph = 6 * rng.random(); yy = 1.9 + 3.8 * rng.random()
                xx = x0 - 0.6 + ((vx * t + ph) % 5.7)
                ax.add_patch(Circle((xx, yy + 0.25 * np.sin(2.3 * t + ph)), 0.11, color=BLUE, alpha=a, zorder=7))
            txt(x0 + 2.25, 1.65, "electrons travel through the crystal", size=16, color=DIM, alpha=a, ha="center")
        else:
            txt(x0 + 2.25, 6.6, "Magnetic insulator", size=26, color=GOLD, alpha=a, ha="center", weight="bold")
            for k, (x, y) in enumerate(pts):
                ph = 6 * rng.random(); w = 0.5 + 0.5 * rng.random()
                arrow(x, y, 90 + 70 * np.sin(w * t + ph) + 180 * (k % 3 == 0), L=0.95, lw=4, alpha=a, ms=18)
            txt(x0 + 2.25, 1.65, "one electron fixed on each atom", size=16, color=DIM, alpha=a, ha="center")
    caption("Heisenberg model:  the electrons stay put.  Only their spins are free.", ramp(t, 5.5))


# ------------------------------------------------------------------ 2 origin of J
def hop(t, t0, d=1.1):
    """0 -> 1 -> 0 between t0 and t0 + 2d"""
    return ease((t - t0) / d) - ease((t - t0 - d) / d)


def s2(t):
    title("Where does J come from?", "kinetic exchange  ·  beyond the lecture notes")
    xl, xr = 2.6, 5.6
    # top: antiparallel
    y = 5.6
    for x in (xl, xr):
        ax.add_patch(Circle((x, y), 0.85, fc=DARK, ec=DIM, lw=1.5, zorder=3))
    h = max(hop(t, 1.8), hop(t, 6.6))
    arrow(xl + (xr - xl - 0.38) * h, y, 90, L=1.1)
    arrow(xr + 0.38 * h, y, -90, L=1.1)
    txt(4.1, 6.8, "hop", size=17, color=GOLD, alpha=h, ha="center")
    txt(8.0, 6.0, "antiparallel:  the hop is allowed", size=22, color=GREEN, alpha=ramp(t, 2.6))
    txt(8.0, 5.3, r"energy is lowered by  $\sim t^2/U$", size=22, alpha=ramp(t, 3.4))
    # bottom: parallel
    y = 3.5
    for x in (xl, xr):
        ax.add_patch(Circle((x, y), 0.85, fc=DARK, ec=DIM, lw=1.5, zorder=3))
    b = 0.45 * hop(t, 4.4, 0.45) + 0.45 * hop(t, 8.6, 0.45)
    arrow(xl + (xr - xl - 0.38) * b, y, 90, L=1.1)
    arrow(xr, y, 90, L=1.1)
    xa = max(ramp(t, 4.8, 0.3) - ramp(t, 5.6, 0.4), ramp(t, 9.0, 0.3))
    txt(4.1, y, "✕", size=44, color=RED, alpha=xa, ha="center")
    txt(8.0, 3.9, "parallel:  the hop is forbidden", size=22, color=RED, alpha=ramp(t, 5.0))
    txt(8.0, 3.2, "Pauli principle:  no energy gain", size=22, alpha=ramp(t, 5.6))
    txt(8.0, 2.15, r"$\Rightarrow$  antiparallel is lower:  $J<0$", size=24, color=GOLD, alpha=ramp(t, 10.0))
    caption("J is not a magnetic force.  It comes from Coulomb repulsion plus the Pauli principle.", ramp(t, 1.0))


# ------------------------------------------------------------------ 3 FM vs AFM
def s3(t):
    title("The sign of J decides", r"$H=-J\sum_{\langle ij\rangle}\vec S_i\cdot\vec S_j$")
    rng = np.random.default_rng(5)
    N = 9
    xs = [3.7 + 1.25 * i for i in range(N)]
    for row, (y, t0) in enumerate(((5.5, 1.0), (3.1, 4.2))):
        g = ramp(t, t0, 2.0)
        for i, x in enumerate(xs):
            start = 360 * rng.random()
            target = 90 if row == 0 else (90 if i % 2 == 0 else -90)
            # shortest rotation
            d = ((target - start + 180) % 360) - 180
            deg = start + d * g + 12 * (1 - g) * np.sin(3 * t + i)
            atom(x, y, r=0.5)
            arrow(x, y, deg, L=1.15)
    txt(0.7, 5.85, r"$J>0$", size=28, color=GOLD)
    txt(0.7, 5.2, "ferromagnet", size=15, color=CHALK)
    txt(0.7, 3.45, r"$J<0$", size=28, color=BLUE)
    txt(0.7, 2.8, "antiferromagnet", size=15, color=CHALK)
    txt(14.9, 6.45, "all parallel, as in iron", size=16, color=DIM, alpha=ramp(t, 3.0), ha="right")
    txt(14.9, 2.15, "neighbours opposite, as in many copper oxides  (classical picture)", size=16, color=DIM, alpha=ramp(t, 6.2), ha="right")
    caption("Parallel neighbours for J > 0,  alternating neighbours for J < 0.", ramp(t, 1.0))


# ------------------------------------------------------------------ 4 magnon
def s4(t):
    title("The exchange term in a crystal", r"a flipped spin travels:  spin wave  =  magnon")
    N = 10
    xs = [2.0 + 1.33 * i for i in range(N)]
    y = 4.7
    hops = [(2.0, 2), (3.2, 3), (4.4, 4), (5.6, 5)]      # (start time, from index)
    down = np.zeros(N); down[2] = 1.0
    cur = None
    for (t0, i) in hops:
        g = ramp(t, t0, 0.9)
        down[i] -= g; down[i + 1] += g
        if t0 <= t < t0 + 1.1:
            cur = i
    wave = ramp(t, 7.4, 1.0)
    for i, x in enumerate(xs):
        atom(x, y, r=0.52)
        d = down[i] * (1 - wave)
        deg = 90 - 180 * d + 38 * wave * np.sin(2 * np.pi * i / 5 - 3.2 * (t - 7.4))
        arrow(x, y, deg, L=1.25)
    if cur is not None:
        xm = (xs[cur] + xs[cur + 1]) / 2
        ax.plot([xs[cur], xs[cur + 1]], [y - 0.95, y - 0.95], color=GOLD, lw=5, solid_capstyle="round", zorder=5)
        txt(xm, y + 1.35, r"$S^+_i\,S^-_{i+1}$", size=26, color=GOLD, ha="center")
    txt(8.0, 6.75, "one spin flipped in a row of parallel spins", size=20, alpha=ramp(t, 0.6) * (1 - wave), ha="center")
    txt(8.0, 6.75, "eigenstate:  all sites share the flip as a wave", size=20, color=GOLD, alpha=wave, ha="center")
    txt(8.0, 2.75, "the exchange term pushes the flip from site to site", size=20, color=DIM, alpha=ramp(t, 2.2) * (1 - wave), ha="center")
    txt(8.0, 2.75, r"spin wave (magnon):  total $S^z$ lowered by exactly 1", size=20, color=DIM, alpha=wave, ha="center")
    caption("This is the same exchange term you sorted out in Exercise 1a.", ramp(t, 1.0))


# ------------------------------------------------------------------ 5 state graph
SECT = [(-1.5, [(0, 0, 0)], BLUE), (-0.5, [(1, 0, 0), (0, 1, 0), (0, 0, 1)], GREEN),
        (0.5, [(1, 1, 0), (1, 0, 1), (0, 1, 1)], GOLD), (1.5, [(1, 1, 1)], RED)]
LAB = {-1.5: r"-\frac{3}{2}", -0.5: r"-\frac{1}{2}", 0.5: r"+\frac{1}{2}", 1.5: r"+\frac{3}{2}"}


def node(x, y, z, col, alpha=1.0):
    ax.add_patch(FancyBboxPatch((x - 0.62, y - 0.3), 1.24, 0.6, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=DARK, ec=col, lw=2, alpha=alpha, zorder=4))
    txt(x, y, ket(z), size=17, color=col, alpha=alpha, ha="center")


def s5(t):
    title("The state graph falls apart into islands", r"basis states as dots,  $H$ draws the lines")
    cx = [1.2, 3.5, 7.0, 9.3]
    for k, (sz, states, col) in enumerate(SECT):
        a = ramp(t, 0.5 + 0.5 * k)
        if len(states) == 1:
            pos = [(cx[k], 4.4)]
        else:
            pos = [(cx[k], 5.55), (cx[k] - 0.85, 3.6), (cx[k] + 0.85, 3.6)]
            for i in range(3):
                g = ramp(t, 3.2 + 0.5 * i + 1.6 * (k - 1), 0.6)
                (x1, y1), (x2, y2) = pos[i], pos[(i + 1) % 3]
                ax.plot([x1, x1 + (x2 - x1) * g], [y1, y1 + (y2 - y1) * g], color=col, lw=3.5, alpha=0.9, zorder=3)
        for p, z in zip(pos, states):
            node(*p, z, col, a)
        txt(cx[k], 2.55, rf"$S^z_{{\rm tot}}={LAB[sz]}$", size=16, color=col, alpha=a, ha="center")
    # block matrix
    x0, y0, c = 10.9, 2.55, 0.5
    am = ramp(t, 7.0)
    for n in range(8):
        for m in range(8):
            ax.add_patch(Rectangle((x0 + c * n, y0 + c * (7 - m)), c, c, fc=DARK, ec=DIM, lw=0.5, alpha=0.9 * am, zorder=2))
    start = 0
    for k, (sz, states, col) in enumerate(SECT):
        g = ramp(t, 7.6 + 0.5 * k)
        d = len(states)
        ax.add_patch(Rectangle((x0 + c * start + 0.04, y0 + c * (8 - start - d) + 0.04), c * d - 0.08, c * d - 0.08,
                               color=col, alpha=0.85 * g, zorder=3))
        start += d
    txt(x0 + 2.0, 6.9, r"blocks  $1+3+3+1$", size=20, alpha=ramp(t, 9.2), ha="center")
    caption("H connects only states with equal magnetization:  each island is one block of the matrix.", ramp(t, 3.0))


# ------------------------------------------------------------------ 5 (new) singlet / triplet as energy levels
def s5(t):
    title("Two spins: singlet and triplet", r"energy levels of  $H=-J\,\vec S_1\cdot\vec S_2$")
    J = 1.0 - 2.0 * ease((t - 5.5) / 4.0)
    # the two spins
    for x in (1.6, 3.5):
        ax.add_patch(Circle((x, 4.6), 0.8, fc=DARK, ec=DIM, lw=1.5, zorder=3))
    ax.plot([2.4, 2.7], [4.6, 4.6], color=DIM, lw=2.5, zorder=2)
    arrow(1.6, 4.6, 90, L=1.2)
    arrow(3.5, 4.6, 90 - 180 * ease((0.35 - J) / 0.7), L=1.2)
    txt(2.55, 3.1, rf"$J = {J:+.2f}$", size=26, color=GOLD if J > 0 else BLUE, ha="center")
    txt(2.55, 2.35, "ferromagnetic" if J > 0 else "antiferromagnetic", size=17, color=DIM, ha="center")
    # energy axis
    y0, sc = 4.35, 2.6
    ax.annotate("", xy=(5.6, 6.95), xytext=(5.6, 1.75), arrowprops=dict(arrowstyle="-|>", lw=2, color=DIM), zorder=3)
    txt(5.25, 6.8, r"$E$", size=22, color=DIM, ha="center")
    ax.plot([5.45, 11.2], [y0, y0], color=DIM, lw=1, ls=(0, (4, 4)), alpha=0.6, zorder=2)
    txt(5.3, y0, "0", size=15, color=DIM, ha="center")
    yT, yS = y0 - sc * J / 4, y0 + sc * 3 * J / 4
    aT, aS = ramp(t, 1.0), ramp(t, 2.6)
    gT, gS = (yT < yS - 0.02), (yS < yT - 0.02)
    for k, lab in enumerate((r"$|\!\uparrow\uparrow\rangle$", r"$\frac{1}{\sqrt{2}}(|\!\uparrow\downarrow\rangle+|\!\downarrow\uparrow\rangle)$", r"$|\!\downarrow\downarrow\rangle$")):
        x1 = 6.1 + 1.75 * k
        ax.plot([x1, x1 + 1.45], [yT, yT], color=GOLD, lw=7 if gT else 4, alpha=aT, solid_capstyle="round", zorder=4)
        txt(x1 + 0.72, yT - 0.38, lab, size=14, color=GOLD, alpha=aT, ha="center")
    ax.plot([7.85, 9.3], [yS, yS], color=BLUE, lw=7 if gS else 4, alpha=aS, solid_capstyle="round", zorder=4)
    txt(8.57, yS + 0.4, r"$\frac{1}{\sqrt{2}}(|\!\uparrow\downarrow\rangle-|\!\downarrow\uparrow\rangle)$", size=14, color=BLUE, alpha=aS, ha="center")
    txt(11.55, yT, r"triplet  $E=-\frac{J}{4}$  (3 states)", size=19, color=GOLD, alpha=aT)
    txt(11.55, yS, r"singlet  $E=+\frac{3J}{4}$", size=19, color=BLUE, alpha=aS)
    if t > 3.6 and abs(J) > 0.15:
        yg = min(yT, yS)
        txt(11.55, yg - 0.55, "ground state", size=15, color=GREEN, alpha=ramp(t, 3.6))
    caption("Triplet at −J/4, singlet at +3J/4:  the sign of J decides which one is the ground state.", ramp(t, 3.0))


# ------------------------------------------------------------------ 6 summary
def s6(t):
    title("Summary", "The picture behind the Heisenberg model")
    rows = ["Magnetic insulator:  electrons fixed, spins free.",
            "J  comes from Coulomb repulsion and the Pauli principle.",
            "J > 0:  ferromagnet.     J < 0:  antiferromagnet.",
            "Exchange term:  a flipped spin travels as a spin wave (magnon).",
            r"Two spins:  triplet at $-J/4$, singlet at $+3J/4$."]
    cols = [CHALK, GOLD, CHALK, GOLD, CHALK]
    for k, (r, col) in enumerate(zip(rows, cols)):
        txt(1.2, 6.4 - 0.95 * k, r, size=22, color=col, alpha=ramp(t, 0.5 + 0.7 * k))


SCENES = [("b1", s1, 10.0), ("b2", s2, 12.5), ("b3", s3, 9.5), ("b4", s4, 12.0), ("b5", s5, 12.5), ("b6", s6, 7.5)]


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
