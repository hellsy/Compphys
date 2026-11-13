"""Referenzcode zu Blatt 4, Aufgabe 2 (Skript Kap. 2.2, S. 5-10).
Erst nach dem eigenen Versuch ansehen.

H = -sum_{ij alpha} J^alpha_ij S^alpha_i S^alpha_j,  Basislabel n = sum_i z_i 2^(i-1)
"""
import numpy as np


def hamilton_matrix(N, links):
    """links: Liste von (alpha, p, q, J), alpha in 'xyz', Plaetze p, q = 1..N."""
    dim = 2**N
    H = np.zeros((dim, dim))
    for n in range(dim):                                   # Schleife ueber Basiszustaende
        z = [(n >> (i - 1)) & 1 for i in range(1, N + 1)]  # z[i-1] = z_i
        for alpha, p, q, J in links:                       # Schleife ueber Links
            zp, zq = z[p - 1], z[q - 1]
            if alpha in 'xy':
                l = n + (1 - 2 * zp) * 2**(p - 1) + (1 - 2 * zq) * 2**(q - 1)  # Gl. (*), S. 7
                s = 1 if alpha == 'x' else -(2 * zp - 1) * (2 * zq - 1)         # Vorzeichen, S. 8
                H[l, n] += -0.25 * J * s                   # Minus aus H = -sum ...
            else:                                          # z-Link: diagonal
                H[n, n] += -0.25 * J * (2 * zp - 1) * (2 * zq - 1)
    return H


def heisenberg_links(pairs, J=1.0):
    """isotropes Heisenberg-Modell: je Paar ein x-, y- und z-Link"""
    return [(a, p, q, J) for p, q in pairs for a in 'xyz']


# ---- Kronecker-Test: Basis pro Platz Index 0 = |down> (z=0), Index 1 = |up> (z=1)
Sz = np.diag([-0.5, 0.5])
Sx = np.array([[0, 0.5], [0.5, 0]])
Sy = np.array([[0, 0.5j], [-0.5j, 0]])


def op(S, i, N):
    """S auf Platz i; Platz 1 ist das niedrigste Bit und steht ganz rechts im kron"""
    M = np.array([[1.0]])
    for k in range(N, 0, -1):
        M = np.kron(M, S if k == i else np.eye(2))
    return M


def H_kron(N, links):
    S = {'x': Sx, 'y': Sy, 'z': Sz}
    return -sum(J * op(S[a], p, N) @ op(S[a], q, N) for a, p, q, J in links)


if __name__ == '__main__':
    # Pruefwert N = 2: Singulett 3J/4, Triplett -J/4
    print('N=2:', np.round(np.linalg.eigvalsh(hamilton_matrix(2, heisenberg_links([(1, 2)]))), 4))

    tri = [(1, 2), (2, 3), (3, 1)]
    models = {
        'Ising': [('z', p, q, 1.0) for p, q in tri],
        'Heisenberg': heisenberg_links(tri),
        'Modell d': [('x', 1, 2, 1.0), ('y', 2, 3, 1.0), ('z', 3, 1, 1.0)],
    }
    for name, links in models.items():
        H = hamilton_matrix(3, links)
        print(name, 'kron ok:', np.allclose(H, H_kron(3, links)),
              np.round(np.linalg.eigvalsh(H), 4))

    rng = np.random.default_rng(0)
    L = [(a, p, q, rng.normal()) for a in 'xyz' for p in range(1, 5) for q in range(p + 1, 5)]
    print('zufaellige Kopplungen N=4, kron ok:', np.allclose(hamilton_matrix(4, L), H_kron(4, L)))
