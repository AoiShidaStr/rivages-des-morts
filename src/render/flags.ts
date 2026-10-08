/** Scènes en 3D (île, arènes) : par défaut. `?2d` dans l'adresse rend l'ancien sol peint, pour comparer. */
export const SCENES_3D = typeof location === 'undefined' || !new URLSearchParams(location.search).has('2d');
