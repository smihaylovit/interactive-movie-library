/**
 * favorites.js — FavoritesManager Module
 * ─────────────────────────────────────────────────────────────
 * Responsibility: All read/write operations for the favorites
 *   list, persisted in localStorage.
 * Pattern: Module pattern — factory function returning a
 *   frozen public interface. Also implements a lightweight
 *   Observer pattern so the UI can subscribe to changes
 *   without tight coupling.
 *
 * Public API:
 *   FavoritesManager()
 *     .getAll()            → Movie[]
 *     .add(movie)          → void
 *     .remove(imdbID)      → void
 *     .isFavorite(imdbID)  → boolean
 *     .subscribe(fn)       → unsubscribe function
 *
 * Storage format (localStorage key: 'cinevault_favorites'):
 *   JSON array of minimal movie objects:
 *   [{ imdbID, Title, Year, Poster, Type }, …]
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Factory function that creates a FavoritesManager instance.
 *
 * @returns {Object} Frozen manager with CRUD and subscribe methods
 */
function FavoritesManager() {

  /** localStorage key used to persist the favorites list */
  const STORAGE_KEY = 'cinevault_favorites';

  /**
   * Internal observer list.
   * Each entry is a callback: (favorites: Movie[]) => void
   * @type {Function[]}
   */
  let observers = [];

  /* ── Private helpers ─────────────────────────────────────── */

  /**
   * Load the favorites array from localStorage.
   * Returns an empty array if the key is missing or JSON is corrupt.
   *
   * @returns {Object[]} Array of stored movie objects
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      // Corrupted data — reset gracefully
      return [];
    }
  }

  /**
   * Persist the given favorites array to localStorage and
   * notify all subscribed observers with the new list.
   *
   * @param {Object[]} favorites - Array of movie objects to save
   */
  function save(favorites) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      // localStorage might be full or disabled (e.g. private mode)
      console.warn('FavoritesManager: could not write to localStorage.', e);
    }
    // Notify all subscribers (Observer pattern)
    observers.forEach(fn => fn([...favorites]));
  }

  /**
   * Extract only the fields we need to store for each movie.
   * Keeps localStorage footprint small.
   *
   * @param {Object} movie - Full or partial movie object from OMDb
   * @returns {Object} Minimal storable movie record
   */
  function toRecord(movie) {
    return {
      imdbID: movie.imdbID,
      Title:  movie.Title,
      Year:   movie.Year,
      Poster: movie.Poster,
      Type:   movie.Type || 'movie',
    };
  }

  /* ── Public methods ──────────────────────────────────────── */

  /**
   * Return a shallow copy of the current favorites list.
   *
   * @returns {Object[]} Array of stored movie records
   */
  function getAll() {
    return [...load()];
  }

  /**
   * Add a movie to favorites.
   * No-ops silently if the movie is already in the list.
   *
   * @param {Object} movie - Movie object (must have imdbID, Title, etc.)
   */
  function add(movie) {
    if (!movie || !movie.imdbID) {
      console.warn('FavoritesManager.add: invalid movie object.', movie);
      return;
    }
    const list = load();
    // Guard against duplicates
    if (list.some(m => m.imdbID === movie.imdbID)) return;
    list.push(toRecord(movie));
    save(list);
  }

  /**
   * Remove a movie from favorites by IMDb ID.
   * No-ops silently if the movie is not in the list.
   *
   * @param {string} imdbID - IMDb ID of the movie to remove
   */
  function remove(imdbID) {
    const list = load().filter(m => m.imdbID !== imdbID);
    save(list);
  }

  /**
   * Check whether a movie is currently in the favorites list.
   *
   * @param {string} imdbID - IMDb ID to check
   * @returns {boolean}
   */
  function isFavorite(imdbID) {
    return load().some(m => m.imdbID === imdbID);
  }

  /**
   * Subscribe to favorites changes.
   * The callback is invoked immediately with the current list,
   * and then again every time add() or remove() is called.
   *
   * @param {Function} fn - Callback: (favorites: Object[]) => void
   * @returns {Function} Unsubscribe function — call it to stop receiving updates
   */
  function subscribe(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('FavoritesManager.subscribe expects a function.');
    }
    observers.push(fn);
    // Emit current state immediately so subscriber can initialize
    fn([...load()]);

    // Return an unsubscribe handle
    return function unsubscribe() {
      observers = observers.filter(o => o !== fn);
    };
  }

  // Return a frozen public interface (Module pattern)
  return Object.freeze({
    getAll,
    add,
    remove,
    isFavorite,
    subscribe,
  });
}
