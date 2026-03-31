/**
 * app.js — Application Entry Point
 * ─────────────────────────────────────────────────────────────
 * Responsibility: Wire the three modules together and kick off
 *   the application once the DOM is fully parsed.
 *
 * Architecture overview:
 * ┌─────────────────────────────────────────────────────────┐
 * │  MovieService (api.js)                                  │
 * │    • searchMovies(title, page) → Promise                │
 * │    • getMovieById(imdbID)      → Promise                │
 * ├─────────────────────────────────────────────────────────┤
 * │  FavoritesManager (favorites.js)                        │
 * │    • getAll / add / remove / isFavorite                 │
 * │    • subscribe(fn)  ← Observer pattern                  │
 * ├─────────────────────────────────────────────────────────┤
 * │  UIController (ui.js)                                   │
 * │    • Renders all DOM; delegates data work to above      │
 * │    • init()  ← single entry point                       │
 * └─────────────────────────────────────────────────────────┘
 *
 * All three modules use the Module pattern (factory functions
 * returning frozen objects) for encapsulation and loose coupling.
 *
 * Usage / git branch guidance:
 *   feature/project-scaffold   → index.html, css/styles.css (skeleton)
 *   feature/movie-service      → js/api.js
 *   feature/favorites-manager  → js/favorites.js
 *   feature/ui-controller      → js/ui.js
 *   feature/app-entry-point    → js/app.js (this file, final wiring)
 * ─────────────────────────────────────────────────────────────
 */

/** OMDb public API key (generated for a FREE account type) */
const API_KEY = 'd070386d';

/**
 * Bootstrap the application.
 *
 * 1. Instantiate MovieService with the API key.
 * 2. Instantiate FavoritesManager (reads localStorage on construction).
 * 3. Instantiate UIController, injecting both dependencies.
 * 4. Call ui.init() to bind all events and render initial state.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Step 1 — API service (talks to OMDb)
  const movieService = MovieService(API_KEY);

  // Step 2 — Favorites manager (reads/writes localStorage)
  const favoritesManager = FavoritesManager();

  // Step 3 — UI controller (owns all DOM manipulation)
  const ui = UIController(movieService, favoritesManager);

  // Step 4 — Start the app
  ui.init();

  // Development helper: expose modules on window for debugging
  // Remove or guard behind an env flag before deploying to production.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window._debug = { movieService, favoritesManager };
  }
});
