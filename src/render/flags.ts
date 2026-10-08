/**
 * Le jeu est en carte peinte. Les scènes en 3D (île, arènes) restent dans le code, pour comparer : `?3d` dans
 * l'adresse les affiche.
 */
const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);

export const SCENES_3D = params.has('3d');