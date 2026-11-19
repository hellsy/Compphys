"""Learning video (motion graphic): Noether's theorem in field theory.

A homage to Emmy Noether, "Invariante Variationsprobleme" (Göttingen, 1918).

Part 1: From particles to fields - the Noether current  ∂_μ j^μ = 0
Part 2: Global U(1) phase  ->  charge     (complex scalar field in 2D, particle + antiparticle)
        Local conservation: charge in a box changes only by what flows through its walls
Part 3: Spacetime translations  ->  energy & momentum  (sine-Gordon kink-antikink, spacetime diagram)
Part 4: A lattice breaks translations  ->  momentum is lost, energy is not (Peierls-Nabarro pinning)
Part 5: Local phase  ->  gauge field  (why  ∂  must become  D = ∂ − iA;  Noether's second theorem)

Everything is computed, nothing is drawn by hand:
    2D field:   φ_tt = ∇²φ − m²φ − 2λ|φ|²φ, spectral Laplacian (FFT), Störmer-Verlet
    1D field:   φ_tt = φ_xx − sin φ, finite differences, Störmer-Verlet
    Verlet conserves the U(1) charge exactly (up to rounding), since the force is phase-equivariant.

Usage:  python3 noether_field_video.py   ->  noether_field.mp4
        VORSCHAU=1 python3 noether_field_video.py   ->  quick preview at 10 fps
Requires: numpy, matplotlib, ffmpeg
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
from matplotlib.colors import hsv_to_rgb, LinearSegmentedColormap, to_rgb
from matplotlib.patches import Rectangle

# ---------------------------------------------------------------- Style
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
BG_RGB = np.array(to_rgb(BG))
CMAP_RHO = LinearSegmentedColormap.from_list("rho", [BLAU, BG, ROT])
CMAP_E = LinearSegmentedColormap.from_list("energy", [BG, "#f7c99a", ORANGE, "#7a2400"])
CMAP_E.set_bad(BG)


def n_frames(seconds):
    return max(1, int(round(seconds * FPS)))


def smooth(u):
    """Soft ease 0 -> 1 (smoothstep)."""
    u = np.clip(u, 0, 1)
    return u * u * (3 - 2 * u)


def grab():
    writer.grab_frame(facecolor=BG)


def hold(seconds):
    for _ in range(n_frames(seconds)):
        grab()


def card(lines, seconds):
    """Text card, faded in and out; lines appear one after another."""
    fig.clf()
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off")
    objs = [ax.text(0.5, y, s, ha="center", va="center", fontsize=fs,
                    weight=w, color=c, transform=ax.transAxes)
            for s, y, fs, w, c in lines]
    n = n_frames(seconds)
    ramp = max(1, n_frames(0.4))
    for i in range(n):
        out = min(1, (n - 1 - i) / ramp)
        for k, o in enumerate(objs):
            o.set_alpha(min(out, smooth((i - k * n_frames(0.35)) / ramp)))
        grab()


def header(title, part, subtitle=None):
    fig.text(0.03, 0.935, title, fontsize=21, weight="bold")
    fig.text(0.97, 0.935, part, fontsize=13, color=GRAU, ha="right")
    if subtitle:
        fig.text(0.03, 0.88, subtitle, fontsize=15, color=GRAU)


def tidy(ax):
    ax.set_facecolor(BG)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def sci(x):
    """Small number as  a·10^b  (mathtext)."""
    if x == 0:
        return "0"
    b = int(np.floor(np.log10(abs(x))))
    return rf"{x / 10 ** b:.1f}\cdot 10^{{{b}}}"


def max_rel(x):
    return np.max(np.abs(x - x[0])) / abs(x[0])


def domain_colour(f, amax):
    """Complex field -> RGB: hue = phase, colour strength = |f|; fades into the background."""
    h = (np.angle(f) / (2 * np.pi)) % 1.0
    rgb = hsv_to_rgb(np.dstack([h, np.full_like(h, 0.85), np.full_like(h, 0.92)]))
    s = np.clip(np.abs(f) / amax, 0, 1)[..., None] ** 0.8
    return BG_RGB * (1 - s) + rgb * s


def phase_wheel(rect):
    """Small legend: hue = phase of φ."""
    ax = fig.add_axes(rect); ax.axis("off"); ax.set_aspect("equal")
    u = np.linspace(-1, 1, 160); U, V = np.meshgrid(u, u)
    z = U + 1j * V
    img = domain_colour(z, 0.55)
    img[np.abs(z) > 1] = BG_RGB; img[np.abs(z) < 0.45] = BG_RGB
    ax.imshow(img, origin="lower", extent=(-1, 1, -1, 1))
    ax.text(0, 0, "phase", ha="center", va="center", fontsize=10, color=GRAU)
    return ax


# ================================================================ Numerics
# ---------------------------------------------------------------- Part 2: complex scalar field in 2D
#   L = |∂_t φ|² − |∇φ|² − m²|φ|² − λ|φ|⁴     invariant under  φ -> e^{iα} φ
#   ρ = Im(φ ∂_t φ*),  j = Im(φ* ∇φ),  ∂_t ρ + ∇·j = 0
N2, L2 = 192, 60.0
x2 = (np.arange(N2) - N2 // 2) * L2 / N2; dx2 = L2 / N2
X2, Y2 = np.meshgrid(x2, x2, indexing="xy")
kv = 2 * np.pi * np.fft.fftfreq(N2, dx2); KX, KY = np.meshgrid(kv, kv, indexing="xy"); K2 = KX ** 2 + KY ** 2
M2, LAM, KK, SIG = 1.0, 1.5, 1.2, 4.0
OM = np.sqrt(M2 ** 2 + KK ** 2)
g1 = 0.8 * np.exp(-((X2 + 12) ** 2 + (Y2 + 2) ** 2) / (2 * SIG ** 2))     # particle, moving right
g2 = 0.6 * np.exp(-((X2 - 12) ** 2 + (Y2 - 2) ** 2) / (2 * SIG ** 2))     # antiparticle, moving left
phi = (g1 + g2) * np.exp(1j * KK * X2)
pi_ = (-1j * OM * g1 + 1j * OM * g2) * np.exp(1j * KK * X2)


def lap2(f):
    return np.fft.ifft2(-K2 * np.fft.fft2(f))


def grad2(f):
    F = np.fft.fft2(f)
    return np.fft.ifft2(1j * KX * F), np.fft.ifft2(1j * KY * F)


def acc2(f):
    return lap2(f) - M2 ** 2 * f - 2 * LAM * np.abs(f) ** 2 * f


def energy2(f, p):
    gx, gy = grad2(f)
    return dx2 ** 2 * np.sum(np.abs(p) ** 2 + np.abs(gx) ** 2 + np.abs(gy) ** 2
                             + M2 ** 2 * np.abs(f) ** 2 + LAM * np.abs(f) ** 4)


BOX = (-3.0, 9.0, -10.0, 2.0)                      # x0, x1, y0, y1
bi0, bi1 = np.searchsorted(x2, BOX[0]), np.searchsorted(x2, BOX[1])
bj0, bj1 = np.searchsorted(x2, BOX[2]), np.searchsorted(x2, BOX[3])
BOXE = (x2[bi0] - dx2 / 2, x2[bi1] - dx2 / 2, x2[bj0] - dx2 / 2, x2[bj1] - dx2 / 2)


def outflow(f):
    """Flux of j out of the box (edges between grid cells, j averaged onto the edge)."""
    gx, gy = grad2(f)
    jx = np.imag(np.conj(f) * gx); jy = np.imag(np.conj(f) * gy)
    sx, sy = slice(bi0, bi1), slice(bj0, bj1)
    ex = lambda i: 0.5 * (jx[sy, i - 1] + jx[sy, i])
    ey = lambda j: 0.5 * (jy[j - 1, sx] + jy[j, sx])
    return dx2 * (ex(bi1).sum() - ex(bi0).sum() + ey(bj1).sum() - ey(bj0).sum())


DT2, T2 = 0.04, 40.0
n_steps2 = int(round(T2 / DT2))
N_F2 = n_frames(18)
frame_steps2 = np.round(np.linspace(0, n_steps2, N_F2)).astype(int)
t2 = np.arange(n_steps2 + 1) * DT2
Q2, Qp2, Qm2, Qbox2, Fout2, E2 = (np.zeros(n_steps2 + 1) for _ in range(6))
phi_frames = np.zeros((N_F2, N2, N2), np.complex64)
rho_frames = np.zeros((N_F2, N2, N2), np.float32)
a = acc2(phi); fi = 0
for n in range(n_steps2 + 1):
    rho = np.imag(phi * np.conj(pi_))
    Q2[n] = rho.sum() * dx2 ** 2
    Qp2[n] = rho[rho > 0].sum() * dx2 ** 2; Qm2[n] = rho[rho < 0].sum() * dx2 ** 2
    Qbox2[n] = rho[bj0:bj1, bi0:bi1].sum() * dx2 ** 2
    Fout2[n] = outflow(phi)
    if n % 25 == 0 or n == n_steps2:
        E2[n] = energy2(phi, pi_)
    while fi < N_F2 and frame_steps2[fi] == n:
        phi_frames[fi] = phi; rho_frames[fi] = rho; fi += 1
    if n < n_steps2:
        vh = pi_ + 0.5 * DT2 * a
        phi = phi + DT2 * vh
        a = acc2(phi)
        pi_ = vh + 0.5 * DT2 * a
E_idx2 = np.r_[np.arange(0, n_steps2 + 1, 25), n_steps2] if n_steps2 % 25 else np.arange(0, n_steps2 + 1, 25)
inflow2 = -np.concatenate([[0.0], np.cumsum(0.5 * (Fout2[1:] + Fout2[:-1])) * DT2])


# ---------------------------------------------------------------- Part 3/4: sine-Gordon in 1D
#   L = ½φ_t² − ½φ_x² − (1 − cos φ)
def sine_gordon(h, init, T, dt, n_out, right=0.0):
    x = np.arange(-40, 40 + 1e-9, h)
    ph, pt = init(x)

    def acc(p):
        pp = np.concatenate([[0.0], p, [right]])
        return (pp[2:] - 2 * p + pp[:-2]) / h ** 2 - np.sin(p)

    def diag(p, q):
        pp = np.concatenate([[0.0], p, [right]])
        dens = 0.5 * q * q + 0.25 * (((pp[1:-1] - pp[:-2]) / h) ** 2 + ((pp[2:] - pp[1:-1]) / h) ** 2) + 1 - np.cos(p)
        E = h * np.sum(0.5 * q * q + 1 - np.cos(p)) + h * np.sum(0.5 * ((pp[1:] - pp[:-1]) / h) ** 2)
        P = -h * np.sum(q * (pp[2:] - pp[:-2]) / (2 * h))
        return dens, E, P

    n = int(round(T / dt)); outs = np.round(np.linspace(0, n, n_out)).astype(int)
    fields, dens, E, P = [], [], [], []
    a = acc(ph); k = 0
    for i in range(n + 1):
        while k < n_out and outs[k] == i:
            d, e, p = diag(ph, pt)
            fields.append(ph.copy()); dens.append(d); E.append(e); P.append(p); k += 1
        if i < n:
            vh = pt + 0.5 * dt * a; ph = ph + dt * vh; a = acc(ph); pt = vh + 0.5 * dt * a
    return x, outs * dt, np.array(fields), np.array(dens), np.array(E), np.array(P)


def kink(x, x0, v, sign=1):
    g = 1 / np.sqrt(1 - v * v); s = g * (x - x0)
    return sign * 4 * np.arctan(np.exp(s)), -sign * 2 * g * v / np.cosh(s)


def kink_antikink(x):
    a1, b1 = kink(x, -14.0, 0.6, +1)
    a2, b2 = kink(x, 12.0, -0.3, -1)
    return a1 + a2, b1 + b2


N_F3 = n_frames(16)
xS, tS, fS, dS, ES, PS = sine_gordon(0.1, kink_antikink, 55.0, 0.02, N_F3)

N_F4 = n_frames(15)
single = lambda x: kink(x, -10.0, 0.25)
xF, tF, fF, _, EF, PF = sine_gordon(0.1, single, 60.0, 0.01, N_F4, right=2 * np.pi)
xC, tC, fC, _, EC, PC = sine_gordon(1.5, single, 60.0, 0.01, N_F4, right=2 * np.pi)


def centre(x, f):
    i = np.argmax(f > np.pi)
    return x[i - 1] + (np.pi - f[i - 1]) / (f[i] - f[i - 1]) * (x[i] - x[i - 1])


cF = np.array([centre(xF, f) for f in fF]); cC = np.array([centre(xC, f) for f in fC])


# ---------------------------------------------------------------- Part 5: local phase
N5 = 241
x5 = np.linspace(-5, 5, N5); h5 = x5[1] - x5[0]
X5, Y5 = np.meshgrid(x5, x5, indexing="xy"); Z5 = X5 + 1j * Y5
PHI5 = 0.55 * (Z5 + 1.8 - 0.4j) * np.conj(Z5 - 1.8 - 0.4j) * np.exp(-np.abs(Z5) ** 2 / 7)
SHAPE5 = 3.0 * np.sin(0.9 * X5) * np.cos(0.7 * Y5)


def grad_energy(f, A=None):
    gy, gx = np.gradient(f, h5)
    if A is not None:
        gx = gx - 1j * A[0] * f; gy = gy - 1j * A[1] * f
    return np.abs(gx) ** 2 + np.abs(gy) ** 2


GE0 = grad_energy(PHI5)
GE_MAX = np.percentile(GE0, 99.5)


# ================================================================ Video
with writer.saving(fig, "noether_field.mp4", dpi=100):

    # ------------------------------------------------------------ Title
    card([
        ("Noether's Theorem in Field Theory", 0.68, 36, "bold", FG),
        ("A homage to Emmy Noether (1882 – 1935)", 0.57, 20, "normal", GRAU),
        ("Symmetry   ⇔   conserved current", 0.40, 30, "bold", BLAU),
        ("Invariante Variationsprobleme  ·  Göttingen 1918", 0.27, 15, "normal", GRAU),
    ], 6.0)

    # ------------------------------------------------------------ Part 1: the theorem for fields
    card([
        ("From particles to fields", 0.88, 30, "bold", FG),
        (r"Action   $S = \int \mathcal{L}(\phi, \partial_\mu \phi)\; d^4x$", 0.77, 21, "normal", FG),
        (r"If  $\phi \to \phi + \varepsilon\,\Delta\phi$  changes $\mathcal{L}$ at most by a divergence"
         r"  $\varepsilon\,\partial_\mu K^\mu$,", 0.66, 19, "normal", FG),
        (r"then   $j^\mu = \frac{\partial \mathcal{L}}{\partial(\partial_\mu\phi)}\,\Delta\phi - K^\mu$"
         r"   satisfies   $\partial_\mu j^\mu = 0$", 0.55, 23, "normal", BLAU),
        (r"Integrate over space:   $\frac{d}{dt}\int_V \rho\; d^3x = -\oint_{\partial V} \mathbf{j}\cdot d\mathbf{A}$",
         0.42, 20, "normal", FG),
        ("A charge can never vanish here and reappear there – it has to flow.", 0.33, 18, "bold", FG),
        (r"Spacetime translations give four currents at once:  "
         r"$T^\mu{}_\nu = \frac{\partial\mathcal{L}}{\partial(\partial_\mu\phi)}\partial_\nu\phi - \delta^\mu_\nu\mathcal{L}$,"
         r"  $\partial_\mu T^\mu{}_\nu = 0$", 0.19, 17, "normal", ORANGE),
    ], 14.0)

    # ------------------------------------------------------------ Part 2: U(1) -> charge
    card([
        ("Part 2:  a phase you can't observe", 0.72, 30, "bold", FG),
        (r"$\mathcal{L} = |\partial_t\phi|^2 - |\nabla\phi|^2 - m^2|\phi|^2 - \lambda|\phi|^4$"
         r"   is unchanged by   $\phi \to e^{i\alpha}\phi$", 0.57, 20, "normal", FG),
        (r"Noether current:   $\rho = \mathrm{Im}(\phi\,\partial_t\phi^*)$,"
         r"   $\mathbf{j} = \mathrm{Im}(\phi^*\nabla\phi)$", 0.46, 20, "normal", BLAU),
        ("Colour shows the phase of the field, red / blue the sign of the charge.", 0.32, 17, "normal", GRAU),
        ("A particle (+) and an antiparticle (−) fly into each other.", 0.25, 17, "normal", GRAU),
    ], 7.5)

    fig.clf()
    header(r"Global phase  $\phi \to e^{i\alpha}\phi$   →   charge", "Part 2 / 5",
           r"Complex scalar field in 2D,  $\phi_{tt} = \nabla^2\phi - m^2\phi - 2\lambda|\phi|^2\phi$"
           "  (spectral, Störmer–Verlet)")
    CROP = (np.abs(x2) <= 24)
    ext = (x2[CROP][0], x2[CROP][-1], x2[CROP][0], x2[CROP][-1])
    axF = fig.add_axes([0.02, 0.22, 0.33, 0.59]); axF.set_xticks([]); axF.set_yticks([])
    axR = fig.add_axes([0.37, 0.22, 0.33, 0.59]); axR.set_xticks([]); axR.set_yticks([])
    for ax_ in (axF, axR):
        for s in ax_.spines.values():
            s.set_color(HELL)
    imF = axF.imshow(domain_colour(phi_frames[0][np.ix_(CROP, CROP)], 0.8), origin="lower", extent=ext)
    imR = axR.imshow(rho_frames[0][np.ix_(CROP, CROP)], origin="lower", extent=ext,
                     cmap=CMAP_RHO, vmin=-0.6, vmax=0.6)
    box_patch = Rectangle((BOXE[0], BOXE[2]), BOXE[1] - BOXE[0], BOXE[3] - BOXE[2],
                          fill=False, ec=FG, lw=1.6, ls="--", alpha=0)
    axR.add_patch(box_patch)
    fig.text(0.185, 0.17, r"field $\phi$:  hue = phase,  strength = $|\phi|$", ha="center", fontsize=13)
    fig.text(0.535, 0.17, r"charge density $\rho$:  red > 0,  blue < 0", ha="center", fontsize=13)
    phase_wheel([0.005, 0.07, 0.08, 0.08])
    tlabel = fig.text(0.37, 0.07, "", fontsize=13, color=GRAU)

    axQ = fig.add_axes([0.765, 0.60, 0.21, 0.21]); tidy(axQ)
    axQ.set_xlim(0, T2); qlim = max(Qp2.max(), -Qm2.min()) * 1.15
    axQ.set_ylim(-qlim, qlim * 1.45); axQ.axhline(0, color=HELL, lw=1)
    axQ.set_title("total charge", fontsize=13, loc="left")
    lQp, = axQ.plot([], [], color=ROT, lw=1.8, label=r"$Q_+$")
    lQm, = axQ.plot([], [], color=BLAU, lw=1.8, label=r"$Q_-$")
    lQ, = axQ.plot([], [], color=FG, lw=3, label=r"$Q$")
    axQ.legend(loc="upper left", frameon=False, ncol=3, fontsize=11, handlelength=1.2)
    infoQ = fig.text(0.765, 0.48, "", fontsize=12)

    axB = fig.add_axes([0.765, 0.17, 0.21, 0.20]); tidy(axB)
    axB.set_xlim(0, T2); blim = (min(Qbox2.min() - Qbox2[0], inflow2.min()), max(Qbox2.max() - Qbox2[0], inflow2.max()))
    axB.set_ylim(blim[0] - 1.5, blim[1] * 1.45 + 1); axB.axhline(0, color=HELL, lw=1)
    axB.set_title("inside the dashed box", fontsize=13, loc="left")
    lBox, = axB.plot([], [], color=GRUEN, lw=4, alpha=0.5, label=r"$\Delta Q_{box}$")
    lIn, = axB.plot([], [], color=FG, lw=1.5, ls="--", label=r"$-\int\oint\mathbf{j}\cdot d\mathbf{A}\,dt$")
    axB.legend(loc="upper left", frameon=False, fontsize=10, handlelength=1.6)
    infoB = fig.text(0.765, 0.055, "", fontsize=12)
    axB.set_alpha(0); [o.set_alpha(0) for o in (lBox, lIn)]

    for i in range(N_F2):
        n = frame_steps2[i]
        imF.set_data(domain_colour(phi_frames[i][np.ix_(CROP, CROP)], 0.8))
        imR.set_data(rho_frames[i][np.ix_(CROP, CROP)])
        sl = slice(0, n + 1, 3)
        lQp.set_data(t2[sl], Qp2[sl]); lQm.set_data(t2[sl], Qm2[sl]); lQ.set_data(t2[sl], Q2[sl])
        infoQ.set_text(rf"$Q = {Q2[n]:.6f}$" "\n" rf"max $|\Delta Q/Q| = {sci(max_rel(Q2[:n + 1]))}$")
        fade = smooth((i - 0.12 * N_F2) / (0.08 * N_F2))
        box_patch.set_alpha(fade); lBox.set_alpha(0.5 * fade); lIn.set_alpha(fade)
        lBox.set_data(t2[sl], Qbox2[sl] - Qbox2[0]); lIn.set_data(t2[sl], inflow2[sl])
        if fade > 0.5:
            infoB.set_text(rf"box charge = inflow via walls" "\n"
                           rf"(mismatch {100 * np.abs(Qbox2[:n + 1] - Qbox2[0] - inflow2[:n + 1]).max() / np.ptp(Qbox2):.2f} % of swing)")
        tlabel.set_text(f"t = {t2[n]:5.1f}")
        grab()
    hold(3.0)

    # ------------------------------------------------------------ Part 3: spacetime translations
    card([
        ("Part 3:  shift space and time", 0.70, 30, "bold", FG),
        (r"$\mathcal{L} = \frac{1}{2}\phi_t^2 - \frac{1}{2}\phi_x^2 - (1 - \cos\phi)$"
         "   has no preferred place and no preferred moment", 0.56, 20, "normal", FG),
        (r"Noether:   energy  $E = \int T^{00} dx$   and momentum   $P = -\int \phi_t\,\phi_x\, dx$",
         0.45, 20, "normal", ORANGE),
        ("Sine-Gordon: a kink and an antikink – lumps of energy that travel like particles.", 0.32, 17, "normal", GRAU),
        ("The picture builds up a spacetime diagram, one moment at a time.", 0.25, 17, "normal", GRAU),
    ], 7.5)

    fig.clf()
    header("Spacetime translations   →   energy & momentum", "Part 3 / 5",
           r"$\phi_{tt} = \phi_{xx} - \sin\phi$,  kink ($v = 0.6$) meets antikink ($v = -0.3$)")
    XV = 30
    vis = np.abs(xS) <= XV
    axST = fig.add_axes([0.06, 0.11, 0.48, 0.70]); tidy(axST)
    axST.set_xlabel("space x"); axST.set_ylabel("time t")
    st_img = np.full((N_F3, vis.sum()), np.nan)
    imST = axST.imshow(st_img, origin="lower", aspect="auto", cmap=CMAP_E, vmin=0, vmax=3.5,
                       extent=(-XV, XV, 0, tS[-1]), interpolation="bilinear")
    nowline = axST.axhline(0, color=FG, lw=1, alpha=0.6)
    fig.text(0.06, 0.035, "colour = energy density  $T^{00}$", fontsize=13, color=GRAU)

    axPh = fig.add_axes([0.62, 0.60, 0.35, 0.20]); tidy(axPh)
    axPh.set_xlim(-XV, XV); axPh.set_ylim(-0.5, 2 * np.pi + 0.8)
    axPh.set_yticks([0, np.pi, 2 * np.pi]); axPh.set_yticklabels(["0", "π", "2π"])
    axPh.set_title(r"field $\phi(x)$ now", fontsize=13, loc="left")
    lPh, = axPh.plot([], [], color=LILA, lw=2.5)
    fillE = [None]

    axEP = fig.add_axes([0.62, 0.20, 0.35, 0.28]); tidy(axEP)
    axEP.set_xlim(0, tS[-1]); axEP.set_ylim(0, ES.max() * 1.35)
    axEP.set_xlabel("time t")
    lE3, = axEP.plot([], [], color=ORANGE, lw=3, label="energy E")
    lP3, = axEP.plot([], [], color=BLAU, lw=3, label="momentum P")
    axEP.legend(loc="upper right", frameon=False, ncol=2, fontsize=12)
    info3 = fig.text(0.62, 0.06, "", fontsize=13)
    for i in range(N_F3):
        st_img[i] = dS[i][vis]
        imST.set_data(np.ma.masked_invalid(st_img)); nowline.set_ydata([tS[i], tS[i]])
        lPh.set_data(xS[vis], fS[i][vis])
        if fillE[0] is not None:
            fillE[0].remove()
        fillE[0] = axPh.fill_between(xS[vis], -0.5, -0.5 + 0.35 * dS[i][vis], color=ORANGE, alpha=0.35, lw=0)
        lE3.set_data(tS[:i + 1], ES[:i + 1]); lP3.set_data(tS[:i + 1], PS[:i + 1])
        info3.set_text(rf"max $|\Delta E/E| = {sci(max_rel(ES[:i + 1]))}$" "      "
                       rf"max $|\Delta P/P| = {sci(max_rel(PS[:i + 1]))}$")
        grab()
    hold(3.0)

    # ------------------------------------------------------------ Part 4: lattice breaks translations
    card([
        ("Part 4:  break the symmetry", 0.66, 30, "bold", FG),
        ("Put the same field on a coarse lattice:  shifting by less than a lattice step", 0.52, 19, "normal", FG),
        ("is no longer a symmetry – but shifting in time still is.", 0.45, 19, "normal", FG),
        ("Noether predicts:  momentum is lost,  energy is not.", 0.31, 21, "bold", BLAU),
    ], 6.5)

    fig.clf()
    header("Lattice breaks translations   →   momentum is not conserved", "Part 4 / 5",
           r"One kink, $v = 0.25$:  fine grid $h = 0.1$  vs.  coarse lattice $h = 1.5$  (same equation)")
    XW = (-22, 14)
    axK1 = fig.add_axes([0.06, 0.66, 0.90, 0.15]); tidy(axK1)
    axK2 = fig.add_axes([0.06, 0.47, 0.90, 0.15]); tidy(axK2)
    for ax_, lab, col in ((axK1, "fine  h = 0.1", GRUEN), (axK2, "coarse  h = 1.5", ROT)):
        ax_.set_xlim(*XW); ax_.set_ylim(-0.6, 2 * np.pi + 0.6); ax_.set_yticks([])
        ax_.text(XW[0] + 0.3, 2 * np.pi - 0.2, lab, color=col, fontsize=13, va="top")
    axK1.set_xticklabels([])
    lK1, = axK1.plot([], [], color=GRUEN, lw=2.5)
    mK1, = axK1.plot([], [], "v", color=GRUEN, ms=10)
    lK2, = axK2.plot([], [], color=ROT, lw=1, alpha=0.5)
    dK2, = axK2.plot([], [], "o", color=ROT, ms=7)
    mK2, = axK2.plot([], [], "v", color=ROT, ms=10)
    for xx in xC[(xC >= XW[0]) & (xC <= XW[1])]:
        axK2.axvline(xx, color=HELL, lw=0.6, zorder=0)

    axX = fig.add_axes([0.06, 0.11, 0.26, 0.26]); tidy(axX)
    axX.set_xlim(0, tF[-1]); axX.set_ylim(-12, 8); axX.set_xlabel("time t")
    axX.set_title("kink position", fontsize=13, loc="left")
    lX1, = axX.plot([], [], color=GRUEN, lw=2.5); lX2, = axX.plot([], [], color=ROT, lw=2.5)
    axPm = fig.add_axes([0.39, 0.11, 0.26, 0.26]); tidy(axPm)
    axPm.set_xlim(0, tF[-1]); axPm.set_ylim(min(PC.min(), 0) - 0.3, PF.max() * 1.4); axPm.set_xlabel("time t")
    axPm.axhline(0, color=HELL, lw=1)
    axPm.set_title("momentum P", fontsize=13, loc="left")
    lP1, = axPm.plot([], [], color=GRUEN, lw=2.5); lP2, = axPm.plot([], [], color=ROT, lw=2)
    axE4 = fig.add_axes([0.72, 0.11, 0.25, 0.26]); tidy(axE4)
    axE4.set_xlim(0, tF[-1]); axE4.set_ylim(0, EF.max() * 1.5); axE4.set_xlabel("time t")
    axE4.set_title("energy E", fontsize=13, loc="left")
    lE1, = axE4.plot([], [], color=GRUEN, lw=4); lE2, = axE4.plot([], [], color=ROT, lw=2, ls="--")
    info4 = axE4.text(0.03, 0.08, "", fontsize=12, transform=axE4.transAxes)
    for i in range(N_F4):
        lK1.set_data(xF, fF[i]); mK1.set_data([cF[i]], [2 * np.pi + 0.35])
        lK2.set_data(xC, fC[i]); dK2.set_data(xC, fC[i]); mK2.set_data([cC[i]], [2 * np.pi + 0.35])
        lX1.set_data(tF[:i + 1], cF[:i + 1]); lX2.set_data(tC[:i + 1], cC[:i + 1])
        lP1.set_data(tF[:i + 1], PF[:i + 1]); lP2.set_data(tC[:i + 1], PC[:i + 1])
        lE1.set_data(tF[:i + 1], EF[:i + 1]); lE2.set_data(tC[:i + 1], EC[:i + 1])
        info4.set_text(rf"coarse: max $|\Delta E/E| = {sci(max_rel(EC[:i + 1]))}$  ✓")
        grab()
    axK2.text(XW[1] - 0.3, 0.2, "pinned (Peierls–Nabarro): its momentum leaks into lattice waves",
              fontsize=13, color=ROT, ha="right", va="bottom")
    hold(4.0)

    # ------------------------------------------------------------ Part 5: local phase -> gauge field
    card([
        ("Part 5:  what if the phase may differ from place to place?", 0.68, 26, "bold", FG),
        (r"Global:  $\phi \to e^{i\alpha}\phi$   –   Local:  $\phi \to e^{i\alpha(x)}\phi$", 0.54, 21, "normal", FG),
        (r"Local rotations spoil $|\nabla\phi|^2$ – unless a new field $\mathbf{A}$ compensates:"
         r"   $\mathbf{D} = \nabla - i\mathbf{A}$,  $\mathbf{A} \to \mathbf{A} + \nabla\alpha$",
         0.42, 18, "normal", LILA),
        ("Watch the gradient energy below each field.", 0.29, 17, "normal", GRAU),
    ], 7.5)

    fig.clf()
    header("Local phase   →   gauge field", "Part 5 / 5",
           "Top: the field (hue = phase).   Bottom: its gradient energy density.")
    ext5 = (x5[0], x5[-1], x5[0], x5[-1])
    cols = [0.05, 0.37, 0.69]; w5 = 0.27
    tops, bots, caps = [], [], []
    for k, c in enumerate(cols):
        at = fig.add_axes([c, 0.47, w5, 0.36]); at.set_xticks([]); at.set_yticks([])
        ab = fig.add_axes([c, 0.07, w5, 0.36]); ab.set_xticks([]); ab.set_yticks([])
        for ax_ in (at, ab):
            for s in ax_.spines.values():
                s.set_color(HELL)
        tops.append(at.imshow(domain_colour(PHI5, 1.2), origin="lower", extent=ext5))
        bots.append(ab.imshow(GE0, origin="lower", extent=ext5, cmap=CMAP_E, vmin=0, vmax=GE_MAX))
        caps.append(fig.text(c + w5 / 2, 0.435, "", ha="center", va="center", fontsize=12,
                             bbox=dict(fc=BG, ec="none", alpha=0.85)))
    titles = [fig.text(cols[0] + w5 / 2, 0.845, r"original  $\phi$", ha="center", fontsize=14),
              fig.text(cols[1] + w5 / 2, 0.845, "", ha="center", fontsize=14, color=BLAU),
              fig.text(cols[2] + w5 / 2, 0.845, "", ha="center", fontsize=14, color=ROT)]
    caps[0].set_text(r"$|\nabla\phi|^2$")

    def gauge_frame(s, covariant):
        ag = 2 * np.pi * s
        al = 2 * np.pi * s + s * SHAPE5
        fg = np.exp(1j * ag) * PHI5
        fl = np.exp(1j * al) * PHI5
        tops[1].set_data(domain_colour(fg, 1.2)); tops[2].set_data(domain_colour(fl, 1.2))
        eg = grad_energy(fg)
        if covariant:
            Ay, Ax = np.gradient(al, h5)
            el = grad_energy(fl, (Ax, Ay))
        else:
            el = grad_energy(fl)
        bots[1].set_data(eg); bots[2].set_data(el)
        dg = np.abs(eg - GE0).max() / GE0.max(); dl = np.abs(el - GE0).max() / GE0.max()
        titles[1].set_text(rf"global  $e^{{i\alpha}}\phi$,  $\alpha = {ag:.2f}$")
        titles[2].set_text(r"local  $e^{i\alpha(x)}\phi$")
        caps[1].set_text(rf"$|\nabla\phi'|^2$:  change ${sci(dg) if dg > 0 else '0'}$  ✓")
        if covariant:
            caps[2].set_text(rf"$|\mathbf{{D}}\phi'|^2$:  change ${sci(dl)}$  ✓")
            caps[2].set_color(GRUEN)
        else:
            caps[2].set_text(rf"$|\nabla\phi'|^2$:  change ${100 * dl:.0f}\,\%$  ✗")
            caps[2].set_color(ROT)

    n = n_frames(7)
    for i in range(n):
        gauge_frame(smooth(i / (n - 1)), covariant=False); grab()
    hold(1.5)
    note = fig.text(0.5, 0.015, r"Now with the gauge field  $\mathbf{A} = \nabla\alpha$:  "
                    r"$\mathbf{D}\phi' = e^{i\alpha}\nabla\phi$", ha="center", fontsize=14, color=GRUEN)
    for i in range(n):
        gauge_frame(1 - 0.5 * np.sin(np.pi * i / (n - 1)), covariant=True); grab()
    hold(2.5)

    card([
        ("Noether's second theorem", 0.82, 30, "bold", FG),
        ("For a symmetry that may vary from point to point, Noether found identities", 0.69, 19, "normal", FG),
        ("between the field equations themselves, rather than a new conserved charge.", 0.62, 19, "normal", FG),
        (r"Electromagnetism:   $\partial_\mu F^{\mu\nu} = j^\nu$   and   $F^{\mu\nu} = -F^{\nu\mu}$"
         r"   ⇒   $\partial_\nu j^\nu = 0$  automatically", 0.48, 19, "normal", LILA),
        ("General relativity: the same identities (Bianchi) were the puzzle about energy", 0.34, 17, "normal", GRAU),
        ("that Hilbert and Klein brought to Noether in Göttingen.", 0.28, 17, "normal", GRAU),
    ], 11.0)

    # ------------------------------------------------------------ Summary
    card([
        ("Symmetry   →   conserved current", 0.88, 28, "bold", FG),
        (r"time translation   →   energy density  $T^{00}$", 0.76, 19, "normal", ORANGE),
        (r"space translation   →   momentum density  $T^{0i}$", 0.69, 19, "normal", BLAU),
        (r"rotations & boosts   →   angular momentum,  centre of energy  $M^{\mu\nu\lambda}$", 0.62, 19, "normal", GRUEN),
        (r"global phase  $e^{i\alpha}$   →   electric charge  $j^\mu$", 0.55, 19, "normal", FG),
        (r"local phase  $e^{i\alpha(x)}$   →   gauge field $A_\mu$, Maxwell's equations", 0.48, 19, "normal", LILA),
        ("Every simulation above conserved what its symmetry promised –", 0.32, 17, "normal", GRAU),
        ("and lost exactly what its broken symmetry no longer protected.", 0.26, 17, "normal", GRAU),
    ], 11.0)

    card([
        ("“In the judgment of the most competent living mathematicians,", 0.74, 20, "normal", FG),
        ("Fräulein Noether was the most significant creative mathematical genius", 0.67, 20, "normal", FG),
        ("thus far produced since the higher education of women began.”", 0.60, 20, "normal", FG),
        ("Albert Einstein, letter to The New York Times, May 1935", 0.51, 15, "normal", GRAU),
        ("Where there is a symmetry, there is a conservation law.", 0.33, 25, "bold", BLAU),
        ("Thank you, Emmy Noether.", 0.21, 22, "normal", FG),
    ], 10.0)

print("done: noether_field.mp4")
print(f"U(1) max|ΔQ/Q| = {max_rel(Q2):.2e},  E2 drift = {max_rel(E2[E_idx2]):.2e},  "
      f"box mismatch = {np.abs(Qbox2 - Qbox2[0] - inflow2).max():.2e} of swing {np.ptp(Qbox2):.2f}")
print(f"SG max|ΔE/E| = {max_rel(ES):.2e}, max|ΔP/P| = {max_rel(PS):.2e};  "
      f"lattice: E fine {max_rel(EF):.2e}, coarse {max_rel(EC):.2e};  P coarse range {PC.min():.2f}..{PC.max():.2f}")
