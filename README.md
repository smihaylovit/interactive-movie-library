# CineVault — Interactive Movie Library
Sirma Academy JS Foundation Exam

A browser-based JavaScript application that lets you search for movies via the OMDb REST API, view detailed information, and manage a personal favorites list stored in localStorage.

---

## Features

- **Search movies** by title with live results from OMDb
- **Paginated results** — navigate through all pages (up to 100)
- **Movie details modal** — poster, plot, genre, director, cast, ratings, box office
- **Favorites list** — add/remove movies, persisted in localStorage
- **Favorites tab** — renders all saved movies on page load
- **Toast notifications** — non-intrusive feedback on user actions
- **Error handling** — friendly messages for API failures and empty results
- **Responsive** — works on desktop, tablet, and mobile

---

## Project Structure

```
interactive-movie-library/
├── index.html          # Application shell — structure only
├── css/
│   └── styles.css      # All styles (cinematic dark editorial theme)
└── js/
    ├── api.js          # MovieService — OMDb API calls
    ├── favorites.js    # FavoritesManager — localStorage CRUD + Observer
    ├── ui.js           # UIController — DOM rendering and event handling
    └── app.js          # Entry point — wires all modules together
```

---

## Architecture & Design Patterns

### Module Pattern
Every JavaScript file exposes a **factory function** that returns a `Object.freeze()`-d public interface. Internal state and helper functions are private via closure — they cannot be accessed or mutated from outside.

```
MovieService(apiKey)      → { searchMovies, getMovieById, getPosterUrl }
FavoritesManager()        → { getAll, add, remove, isFavorite, subscribe }
UIController(svc, fav)    → { init }
```

### Observer Pattern (in FavoritesManager)
`FavoritesManager.subscribe(fn)` allows the UIController to react to favorites changes (add/remove) without FavoritesManager knowing anything about the DOM. The badge counter in the tab nav stays in sync automatically.

```
favoritesManager.subscribe(favorites => {
  favCount.textContent = favorites.length; // runs on every add/remove
});
```

### Lightweight MVC
| Role      | File(s)                          |
|-----------|----------------------------------|
| Model     | `favorites.js` + `api.js`        |
| View      | `index.html` + `styles.css`      |
| Presenter | `ui.js` (UIController)           |

---

## API Reference

| Endpoint | Description |
|----------|-------------|
| `https://www.omdbapi.com/?s=<title>&page=<n>&apikey=...` | Search movies by title |
| `https://www.omdbapi.com/?i=<imdbID>&apikey=...` | Get full movie details |
| `https://img.omdbapi.com/?i=<imdbID>&apikey=...` | Poster image (paid plan) |

API key used: `d070386d`, generated for a FREE account type and set in API_KEY global const in app.js file

---

## Git Branch Workflow

The source code is organized so that each logical feature can be committed to its own branch:

```
main
 └─ feature/project-scaffold     index.html, css/styles.css (skeleton)
 └─ feature/movie-service        js/api.js  — MovieService module
 └─ feature/favorites-manager    js/favorites.js — FavoritesManager module
 └─ feature/ui-controller        js/ui.js  — UIController module
 └─ feature/app-entry-point      js/app.js (final wiring)
```

### Executed commit flow

```bash
# 1 — Scaffold
git checkout -b feature/project-scaffold
git add index.html css/styles.css
git commit -m "feat: project scaffold — HTML shell and CSS theme"
git checkout main && git merge feature/project-scaffold
git push
git checkout feature/project-scaffold
git push --set-upstream origin feature/project-scaffold
git checkout main

# 2 — Movie Service
git checkout -b feature/movie-service
git add js/api.js
git commit -m "feat(api): MovieService module — searchMovies, getMovieById"
git push --set-upstream origin feature/movie-service
git checkout main
# Created and merged pull request in GitHub
git pull

# 3 — Favorites Manager
git checkout -b feature/favorites-manager
git add js/favorites.js
git commit -m "feat(favorites): FavoritesManager — localStorage CRUD + Observer"
git push --set-upstream origin feature/favorites-manager
git checkout main
# Created and merged pull request in GitHub
git pull

# 4 — UI Controller
git checkout -b feature/ui-controller
git add js/ui.js
git commit -m "feat(ui): UIController — DOM rendering, events, modal, pagination"
git push --set-upstream origin feature/ui-controller
git checkout main
# Created and merged pull request in GitHub
git pull

# 5 — App entry point
git checkout -b feature/app-entry-point
git add js/app.js
git commit -m "feat(app): entry point — wire modules, DOMContentLoaded bootstrap"
git push --set-upstream origin feature/app-entry-point
git checkout main
# Created and merged pull request in GitHub
git pull

# 6 — README.md
git add README.md
git commit -m "doc: add README.md"
git push
```

---

## How to Run

No build step is required. Open `index.html` directly in a browser, **or** serve it with any static HTTP server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code
# Install "Live Server" extension and click the Go Live button or → right-click index.html → Open with Live Server
```

Then visit `http://localhost:8080`.

---

## Usage

1. **Search** — Type a movie title in the search bar and press Enter or click Search.
2. **Browse** — Scroll the result grid; use pagination buttons to change pages.
3. **Details** — Click a card (or its Details button) to open the detail modal.
4. **Favorites** — Click **♡ Save** on any card or inside the modal to save a movie.
5. **Manage** — Switch to the **Favorites** tab to see your collection; click **Remove** to delete.
6. **Persist** — Favorites survive page reloads (stored in localStorage under the key `cinevault_favorites`).

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty search input | Inline validation error, no API call made |
| Input < 2 characters | Inline validation error |
| API returns no results | Error state panel with OMDb message |
| Network offline | Error state panel with friendly message |
| HTTP non-2xx response | Error state panel with status code |
| Poster image fails to load | Replaced with 🎬 placeholder |
| localStorage full/disabled | Console warning, UI continues normally |

---

## Technical Requirements Checklist

| Requirement | Implementation |
|-------------|----------------|
| DOM API (`createElement`, `appendChild`, etc.) | All rendering in `ui.js` — zero `innerHTML` for user data |
| Event handling | Search form, tab buttons, card clicks, modal close, keyboard Escape |
| `fetch()` with `async/await` | `api.js` → `fetchJSON()` → `searchMovies()` / `getMovieById()` |
| Error handling | `try/catch` around every `await`; user-visible error states |
| No frameworks | Vanilla HTML/CSS/JS only |
| localStorage | `favorites.js` — `getAll`, `add`, `remove` |
| Load favorites on page load | Observer subscription renders count immediately; tab renders on open |
| Design pattern | Module pattern (all 3 modules) + Observer (FavoritesManager) |
| Input validation | `validateSearch()` before any API call |
| Comments & documentation | JSDoc on every function; this README |
| Responsive Design | CSS Grid `auto-fill`, fluid typography, mobile breakpoints |

---

## Evaluation Criteria Mapping

| Criterion (20% each) | Files |
|----------------------|-------|
| DOM manipulation & dynamic rendering | `js/ui.js` — `createMovieCard`, `createModalContent`, `renderResults`, `renderFavorites` |
| Event handling & UI responsiveness | `js/ui.js` — `bindTabEvents`, `bindSearchEvents`, `bindModalEvents`, `createFavButton` |
| Async/await & API usage | `js/api.js` — `fetchJSON`, `searchMovies`, `getMovieById` |
| Code organization & design patterns | Module pattern throughout; Observer in `favorites.js`; MVC separation |
| Documentation, readability, maintainability | JSDoc on every function; `README.md`; semantic naming; git branch plan |
