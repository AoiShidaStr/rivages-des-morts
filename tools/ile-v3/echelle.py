"""Agrandissements pixel art (Scale2x / Scale3x, famille EPX/AdvMAME) en numpy."""
import numpy as np


def _eq(a, b):
    return np.all(a == b, axis=-1)


def scale2x(img, wrap=True):
    p = np.pad(img, ((1, 1), (1, 1), (0, 0)), mode='wrap' if wrap else 'edge')
    E = p[1:-1, 1:-1]
    B, D, F, H = p[:-2, 1:-1], p[1:-1, :-2], p[1:-1, 2:], p[2:, 1:-1]
    c = ~_eq(B, H) & ~_eq(D, F)
    o = np.repeat(np.repeat(E, 2, 0), 2, 1)
    e0 = np.where((c & _eq(D, B))[..., None], D, E)
    e1 = np.where((c & _eq(B, F))[..., None], F, E)
    e2 = np.where((c & _eq(D, H))[..., None], D, E)
    e3 = np.where((c & _eq(H, F))[..., None], F, E)
    o[0::2, 0::2], o[0::2, 1::2], o[1::2, 0::2], o[1::2, 1::2] = e0, e1, e2, e3
    return o


def scale3x(img, wrap=True):
    p = np.pad(img, ((1, 1), (1, 1), (0, 0)), mode='wrap' if wrap else 'edge')
    E = p[1:-1, 1:-1]
    A, B, C = p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:]
    D, F = p[1:-1, :-2], p[1:-1, 2:]
    G, H, I = p[2:, :-2], p[2:, 1:-1], p[2:, 2:]
    c = (~_eq(B, H) & ~_eq(D, F))[..., None]
    w = lambda cond, X: np.where(c & cond[..., None], X, E)
    e = [None] * 9
    e[0] = w(_eq(D, B), D)
    e[1] = w((_eq(D, B) & ~_eq(E, C)) | (_eq(B, F) & ~_eq(E, A)), B)
    e[2] = w(_eq(B, F), F)
    e[3] = w((_eq(D, B) & ~_eq(E, G)) | (_eq(D, H) & ~_eq(E, A)), D)
    e[4] = E
    e[5] = w((_eq(B, F) & ~_eq(E, I)) | (_eq(H, F) & ~_eq(E, C)), F)
    e[6] = w(_eq(D, H), D)
    e[7] = w((_eq(D, H) & ~_eq(E, I)) | (_eq(H, F) & ~_eq(E, G)), H)
    e[8] = w(_eq(H, F), F)
    h, wd = E.shape[:2]
    o = np.zeros((h * 3, wd * 3, img.shape[2]), img.dtype)
    for k in range(9):
        o[k // 3::3, k % 3::3] = e[k]
    return o


def nn(img, k):
    return np.repeat(np.repeat(img, k, 0), k, 1)
