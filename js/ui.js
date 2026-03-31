/**
 * ui.js — UIController Module
 * ─────────────────────────────────────────────────────────────
 * Responsibility: All DOM manipulation, dynamic element
 *   creation, and user-interaction event handling.
 *   Depends on MovieService (api.js) and FavoritesManager
 *   (favorites.js), both injected via constructor parameters
 *   for loose coupling and testability.
 *
 * Pattern: Module pattern (factory function). The UIController
 *   acts as the Presenter in a lightweight MVC arrangement:
 *     Model  → FavoritesManager (data) + MovieService (API)
 *     View   → index.html (structure) + styles.css (style)
 *     Presenter → UIController (glue)
 *
 * Sections:
 *   1. DOM element cache
 *   2. State management helpers
 *   3. Tab navigation
 *   4. Search & pagination
 *   5. Movie card rendering
 *   6. Modal (movie detail)
 *   7. Favorites rendering
 *   8. Toast notifications
 *   9. Public init()
 * ─────────────────────────────────────────────────────────────
 *
 * @param {Object} movieService      - Instance of MovieService
 * @param {Object} favoritesManager  - Instance of FavoritesManager
 * @returns {Object} Frozen controller with a single init() entry point
 */
function UIController(movieService, favoritesManager) {

  /* ════════════════════════════════════════════════════════════
     1. DOM ELEMENT CACHE
     Caching elements once avoids repeated querySelector calls.
  ════════════════════════════════════════════════════════════ */

  const el = {
    // Header
    tabBtns:       document.querySelectorAll('.tab-btn'),
    favCount:      document.getElementById('favCount'),

    // Search tab
    searchForm:    document.getElementById('searchForm'),
    searchInput:   document.getElementById('searchInput'),
    searchError:   document.getElementById('searchError'),

    // Result states
    stateIdle:     document.getElementById('stateIdle'),
    stateLoading:  document.getElementById('stateLoading'),
    stateError:    document.getElementById('stateError'),
    stateErrorMsg: document.getElementById('stateErrorMsg'),
    stateResults:  document.getElementById('stateResults'),
    resultsMeta:   document.getElementById('resultsMeta'),
    movieGrid:     document.getElementById('movieGrid'),
    pagination:    document.getElementById('pagination'),

    // Favorites tab
    tabSearch:     document.getElementById('tab-search'),
    tabFavorites:  document.getElementById('tab-favorites'),
    favEmpty:      document.getElementById('favEmpty'),
    favoritesGrid: document.getElementById('favoritesGrid'),

    // Modal
    modalOverlay:  document.getElementById('modalOverlay'),
    modalClose:    document.getElementById('modalClose'),
    modalBody:     document.getElementById('modalBody'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),
  };

  /* ════════════════════════════════════════════════════════════
     2. INTERNAL STATE
  ════════════════════════════════════════════════════════════ */

  /** Tracks the last search query and pagination position */
  const state = {
    query:        '',
    currentPage:  1,
    totalResults: 0,
    activeTab:    'search',
  };

  /** Number of results per page (OMDb always returns ≤10) */
  const PAGE_SIZE = 10;

  /* ════════════════════════════════════════════════════════════
     3. SEARCH STATE HELPERS
     Mutually exclusive visibility of the four result states.
  ════════════════════════════════════════════════════════════ */

  /**
   * Show exactly one search result state panel, hiding all others.
   * @param {'idle'|'loading'|'error'|'results'} name
   */
  function showState(name) {
    el.stateIdle.classList.add('hidden');
    el.stateLoading.classList.add('hidden');
    el.stateError.classList.add('hidden');
    el.stateResults.classList.add('hidden');

    const map = {
      idle:    el.stateIdle,
      loading: el.stateLoading,
      error:   el.stateError,
      results: el.stateResults,
    };
    if (map[name]) map[name].classList.remove('hidden');
  }

  /**
   * Display a user-friendly error message in the error state.
   * @param {string} message - Human-readable error description
   */
  function showError(message) {
    el.stateErrorMsg.textContent = message;
    showState('error');
  }

  /* ════════════════════════════════════════════════════════════
     4. TAB NAVIGATION
  ════════════════════════════════════════════════════════════ */

  /**
   * Switch the visible tab panel and update button active states.
   * @param {'search'|'favorites'} tabName
   */
  function switchTab(tabName) {
    state.activeTab = tabName;

    // Update button styles
    el.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Show/hide panels
    el.tabSearch.classList.toggle('hidden', tabName !== 'search');
    el.tabFavorites.classList.toggle('hidden', tabName !== 'favorites');

    // Re-render favorites whenever the tab is opened
    if (tabName === 'favorites') renderFavorites();
  }

  /**
   * Bind click handlers to all tab buttons.
   */
  function bindTabEvents() {
    el.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  /* ════════════════════════════════════════════════════════════
     5. SEARCH & PAGINATION
  ════════════════════════════════════════════════════════════ */

  /**
   * Validate the search input field.
   * Shows inline error and returns false if invalid.
   *
   * @returns {boolean} True if input is valid
   */
  function validateSearch() {
    const value = el.searchInput.value.trim();
    if (!value) {
      el.searchError.textContent = 'Please enter a movie title.';
      el.searchError.classList.remove('hidden');
      el.searchInput.focus();
      return false;
    }
    if (value.length < 2) {
      el.searchError.textContent = 'Title must be at least 2 characters.';
      el.searchError.classList.remove('hidden');
      return false;
    }
    el.searchError.classList.add('hidden');
    return true;
  }

  /**
   * Perform a movie search: validate → loading state → API call
   * → render results or error.
   *
   * @param {string} [query]    - Override query (defaults to input value)
   * @param {number} [page=1]   - Page number to fetch
   */
  async function performSearch(query, page = 1) {
    const q = (query || el.searchInput.value).trim();
    if (!q) return;

    state.query = q;
    state.currentPage = page;

    showState('loading');

    try {
      const result = await movieService.searchMovies(q, page);

      state.totalResults = result.totalResults;
      renderResults(result.movies, result.totalResults, page);
      showState('results');
    } catch (err) {
      showError(err.message || 'An unexpected error occurred.');
    }
  }

  /**
   * Bind the search form submit event.
   */
  function bindSearchEvents() {
    el.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (validateSearch()) {
        performSearch(el.searchInput.value.trim(), 1);
      }
    });

    // Clear inline error as user types
    el.searchInput.addEventListener('input', () => {
      if (el.searchInput.value.trim()) {
        el.searchError.classList.add('hidden');
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     6. RESULTS & MOVIE CARD RENDERING
  ════════════════════════════════════════════════════════════ */

  /**
   * Render the movie grid and pagination for a set of results.
   *
   * @param {Object[]} movies       - Array of movie summary objects from OMDb
   * @param {number}   totalResults - Total number of results from OMDb
   * @param {number}   page         - Current page number
   */
  function renderResults(movies, totalResults, page) {
    // Update meta line e.g. "Showing 1–10 of 295 results for "guardians""
    const start = (page - 1) * PAGE_SIZE + 1;
    const end   = Math.min(page * PAGE_SIZE, totalResults);
    el.resultsMeta.textContent =
      `Showing ${start}–${end} of ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${state.query}"`;

    // Render cards
    el.movieGrid.innerHTML = '';
    movies.forEach(movie => {
      el.movieGrid.appendChild(createMovieCard(movie));
    });

    // Render pagination
    renderPagination(totalResults, page);
  }

  /**
   * Create a movie card DOM element.
   * Uses document.createElement for all construction (no innerHTML
   * for user-supplied data to avoid XSS).
   *
   * @param {Object}  movie    - OMDb search result item
   * @param {boolean} [isFavView=false] - If true, show Remove button
   * @returns {HTMLElement} The constructed card element
   */
  function createMovieCard(movie, isFavView = false) {
    const isFav = favoritesManager.isFavorite(movie.imdbID);

    // ── Outer card ──────────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.imdbid = movie.imdbID;

    // ── Poster wrapper ───────────────────────────────────────
    const posterWrap = document.createElement('div');
    posterWrap.className = 'card-poster-wrap';

    if (movie.Poster && movie.Poster !== 'N/A') {
      const img = document.createElement('img');
      img.className = 'card-poster';
      img.src = movie.Poster;
      img.alt = `${movie.Title} poster`;
      img.loading = 'lazy';
      // Fallback if image fails to load
      img.onerror = () => {
        img.replaceWith(createPosterPlaceholder());
      };
      posterWrap.appendChild(img);
    } else {
      posterWrap.appendChild(createPosterPlaceholder());
    }

    // Favorite badge on poster (visual indicator)
    if (isFav) {
      const badge = document.createElement('span');
      badge.className = 'card-fav-badge';
      badge.textContent = '♥';
      badge.title = 'In your favorites';
      posterWrap.appendChild(badge);
    }

    // Type badge (movie / series / episode)
    if (movie.Type) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'card-type-badge';
      typeBadge.textContent = movie.Type;
      posterWrap.appendChild(typeBadge);
    }

    card.appendChild(posterWrap);

    // ── Card info ────────────────────────────────────────────
    const info = document.createElement('div');
    info.className = 'card-info';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = movie.Title;

    const year = document.createElement('p');
    year.className = 'card-year';
    year.textContent = movie.Year || '—';

    info.appendChild(title);
    info.appendChild(year);
    card.appendChild(info);

    // ── Card actions ─────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    // Details button
    const btnDetails = document.createElement('button');
    btnDetails.className = 'btn btn-details';
    btnDetails.textContent = 'Details';
    btnDetails.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(movie.imdbID);
    });
    actions.appendChild(btnDetails);

    if (isFavView) {
      // Remove button (shown in Favorites tab)
      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn btn-remove';
      btnRemove.textContent = 'Remove';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFavorite(movie.imdbID, card);
      });
      actions.appendChild(btnRemove);
    } else {
      // Add/Remove favorite button (shown in Search tab)
      const btnFav = createFavButton(movie, isFav);
      actions.appendChild(btnFav);
    }

    card.appendChild(actions);

    // Clicking the card itself opens details
    card.addEventListener('click', () => openModal(movie.imdbID));

    return card;
  }

  /**
   * Create a poster placeholder div for movies with no image.
   *
   * @returns {HTMLElement}
   */
  function createPosterPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'card-poster-placeholder';
    ph.textContent = '🎬';
    return ph;
  }

  /**
   * Create a togglable Favorite button for a movie card.
   * The button updates its own appearance on click without a
   * full page re-render.
   *
   * @param {Object}  movie  - The movie object
   * @param {boolean} isFav  - Current favorite state
   * @returns {HTMLButtonElement}
   */
  function createFavButton(movie, isFav) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-fav' + (isFav ? ' is-fav' : '');
    btn.textContent = isFav ? '♥ Saved' : '♡ Save';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowFav = favoritesManager.isFavorite(movie.imdbID);

      if (nowFav) {
        favoritesManager.remove(movie.imdbID);
        btn.classList.remove('is-fav');
        btn.textContent = '♡ Save';
        // Remove fav badge from poster if present
        const card = btn.closest('.movie-card');
        card?.querySelector('.card-fav-badge')?.remove();
        showToast(`"${movie.Title}" removed from favorites.`, 'info');
      } else {
        favoritesManager.add(movie);
        btn.classList.add('is-fav');
        btn.textContent = '♥ Saved';
        // Add fav badge to poster
        const posterWrap = btn.closest('.movie-card')?.querySelector('.card-poster-wrap');
        if (posterWrap && !posterWrap.querySelector('.card-fav-badge')) {
          const badge = document.createElement('span');
          badge.className = 'card-fav-badge';
          badge.textContent = '♥';
          badge.title = 'In your favorites';
          posterWrap.appendChild(badge);
        }
        showToast(`"${movie.Title}" added to favorites!`, 'success');
      }
    });

    return btn;
  }

  /* ════════════════════════════════════════════════════════════
     7. PAGINATION
  ════════════════════════════════════════════════════════════ */

  /**
   * Render numeric pagination buttons.
   * Shows up to 5 page numbers around the current page with
   * ellipsis for large page sets.
   *
   * @param {number} totalResults - Total results from OMDb
   * @param {number} currentPage  - Active page number
   */
  function renderPagination(totalResults, currentPage) {
    el.pagination.innerHTML = '';

    const totalPages = Math.min(Math.ceil(totalResults / PAGE_SIZE), 100);
    if (totalPages <= 1) return;

    /**
     * Create a single page button.
     * @param {string|number} label   - Button text
     * @param {number|null}   pageNum - Page to navigate to (null = disabled)
     * @param {boolean}       active  - Whether this is the current page
     * @param {boolean}       disabled
     * @returns {HTMLButtonElement}
     */
    function makeBtn(label, pageNum, active = false, disabled = false) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '');
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled && !active && pageNum !== null) {
        btn.addEventListener('click', () => {
          performSearch(state.query, pageNum);
          // Scroll results into view smoothly
          el.stateResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return btn;
    }

    // Previous arrow
    el.pagination.appendChild(
      makeBtn('‹ Prev', currentPage - 1, false, currentPage === 1)
    );

    // Compute page number window [start, end]
    const WINDOW = 2; // pages each side of current
    let start = Math.max(1, currentPage - WINDOW);
    let end   = Math.min(totalPages, currentPage + WINDOW);

    // Pad the window if near start/end
    if (currentPage <= WINDOW + 1)         end   = Math.min(totalPages, 5);
    if (currentPage >= totalPages - WINDOW) start = Math.max(1, totalPages - 4);

    if (start > 1) {
      el.pagination.appendChild(makeBtn(1, 1));
      if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'page-ellipsis';
        dots.textContent = '…';
        el.pagination.appendChild(dots);
      }
    }

    for (let p = start; p <= end; p++) {
      el.pagination.appendChild(makeBtn(p, p, p === currentPage));
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'page-ellipsis';
        dots.textContent = '…';
        el.pagination.appendChild(dots);
      }
      el.pagination.appendChild(makeBtn(totalPages, totalPages));
    }

    // Next arrow
    el.pagination.appendChild(
      makeBtn('Next ›', currentPage + 1, false, currentPage === totalPages)
    );
  }

  /* ════════════════════════════════════════════════════════════
     8. MODAL (MOVIE DETAIL VIEW)
  ════════════════════════════════════════════════════════════ */

  /**
   * Open the detail modal for a movie by its IMDb ID.
   * Shows a loading skeleton while the API request is in flight.
   *
   * @param {string} imdbID - IMDb ID of the movie to display
   */
  async function openModal(imdbID) {
    el.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent background scroll

    // Show skeleton loader
    el.modalBody.innerHTML = '';
    el.modalBody.appendChild(createModalSkeleton());

    try {
      const movie = await movieService.getMovieById(imdbID);
      el.modalBody.innerHTML = '';
      el.modalBody.appendChild(createModalContent(movie));
    } catch (err) {
      el.modalBody.innerHTML = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'state-error';
      errDiv.style.padding = '48px 0';

      const icon = document.createElement('div');
      icon.className = 'error-icon';
      icon.textContent = '✕';

      const msg = document.createElement('p');
      msg.textContent = err.message || 'Failed to load movie details.';

      errDiv.appendChild(icon);
      errDiv.appendChild(msg);
      el.modalBody.appendChild(errDiv);
    }
  }

  /**
   * Close the detail modal and restore body scroll.
   */
  function closeModal() {
    el.modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    el.modalBody.innerHTML = '';
  }

  /**
   * Bind modal close interactions:
   *   - Close button click
   *   - Overlay backdrop click
   *   - Escape key
   */
  function bindModalEvents() {
    el.modalClose.addEventListener('click', closeModal);

    el.modalOverlay.addEventListener('click', (e) => {
      if (e.target === el.modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.modalOverlay.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  /**
   * Build and return a loading skeleton DOM element for the modal.
   *
   * @returns {HTMLElement}
   */
  function createModalSkeleton() {
    const wrap = document.createElement('div');
    wrap.className = 'modal-loading';

    const poster = document.createElement('div');
    poster.className = 'skeleton skeleton-poster';

    const lines = document.createElement('div');
    lines.className = 'skeleton-lines';

    [60, 40, 100, 80, 100, 70].forEach(w => {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton-line';
      line.style.width = w + '%';
      lines.appendChild(line);
    });

    wrap.appendChild(poster);
    wrap.appendChild(lines);
    return wrap;
  }

  /**
   * Build the full modal content DOM element from a movie detail object.
   *
   * @param {Object} movie - Full movie detail from OMDb
   * @returns {HTMLElement}
   */
  function createModalContent(movie) {
    const isFav = favoritesManager.isFavorite(movie.imdbID);

    const inner = document.createElement('div');
    inner.className = 'modal-inner';

    // ── Poster column ────────────────────────────────────────
    const posterWrap = document.createElement('div');
    posterWrap.className = 'modal-poster-wrap';

    if (movie.Poster && movie.Poster !== 'N/A') {
      const img = document.createElement('img');
      img.className = 'modal-poster';
      img.src = movie.Poster;
      img.alt = `${movie.Title} poster`;
      img.onerror = () => img.replaceWith(createModalPosterPlaceholder());
      posterWrap.appendChild(img);
    } else {
      posterWrap.appendChild(createModalPosterPlaceholder());
    }

    inner.appendChild(posterWrap);

    // ── Details column ───────────────────────────────────────
    const details = document.createElement('div');
    details.className = 'modal-details';

    // Title
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.id = 'modalTitle';
    titleEl.textContent = movie.Title;
    details.appendChild(titleEl);

    // Rated badge
    if (movie.Rated && movie.Rated !== 'N/A') {
      const rated = document.createElement('span');
      rated.className = 'modal-rated';
      rated.textContent = movie.Rated;
      details.appendChild(rated);
    }

    // Meta chips (Year, Runtime, Genre)
    const meta = document.createElement('div');
    meta.className = 'modal-meta';

    [
      movie.Year,
      movie.Released !== 'N/A' ? movie.Released : null,
      movie.Runtime,
      ...(movie.Genre ? movie.Genre.split(',') : []),
    ]
      .filter(Boolean)
      .forEach(text => {
        const chip = document.createElement('span');
        chip.className = 'meta-chip';
        chip.textContent = text.trim();
        meta.appendChild(chip);
      });

    details.appendChild(meta);

    // Plot
    if (movie.Plot && movie.Plot !== 'N/A') {
      const plot = document.createElement('p');
      plot.className = 'modal-plot';
      plot.textContent = movie.Plot;
      details.appendChild(plot);
    }

    // Director
    appendModalSection(details, 'Director', movie.Director);
    // Cast
    appendModalSection(details, 'Cast', movie.Actors);
    // Awards
    if (movie.Awards && movie.Awards !== 'N/A') {
      appendModalSection(details, 'Awards', movie.Awards);
    }
    // Box office
    if (movie.BoxOffice && movie.BoxOffice !== 'N/A') {
      appendModalSection(details, 'Box Office', movie.BoxOffice);
    }

    // Ratings
    if (movie.Ratings && movie.Ratings.length > 0) {
      const ratingSec = document.createElement('div');
      ratingSec.className = 'modal-section';

      const rLabel = document.createElement('p');
      rLabel.className = 'modal-section-label';
      rLabel.textContent = 'Ratings';
      ratingSec.appendChild(rLabel);

      const rList = document.createElement('div');
      rList.className = 'ratings-list';

      movie.Ratings.forEach(r => {
        const row = document.createElement('div');
        row.className = 'rating-row';

        const src = document.createElement('span');
        src.className = 'rating-source';
        src.textContent = r.Source;

        const val = document.createElement('span');
        val.className = 'rating-value';
        val.textContent = r.Value;

        row.appendChild(src);
        row.appendChild(val);
        rList.appendChild(row);
      });

      ratingSec.appendChild(rList);
      details.appendChild(ratingSec);
    }

    // Action buttons
    const modalActions = document.createElement('div');
    modalActions.className = 'modal-actions';

    // Favorite toggle button in modal
    const favBtn = document.createElement('button');
    favBtn.className = 'btn btn-fav' + (isFav ? ' is-fav' : '');
    favBtn.textContent = isFav ? '♥ Saved' : '♡ Save';

    favBtn.addEventListener('click', () => {
      const nowFav = favoritesManager.isFavorite(movie.imdbID);
      if (nowFav) {
        favoritesManager.remove(movie.imdbID);
        favBtn.classList.remove('is-fav');
        favBtn.textContent = '♡ Save';
        showToast(`"${movie.Title}" removed from favorites.`, 'info');
      } else {
        favoritesManager.add(movie);
        favBtn.classList.add('is-fav');
        favBtn.textContent = '♥ Saved';
        showToast(`"${movie.Title}" added to favorites!`, 'success');
      }
      // Keep search grid in sync
      syncCardFavButton(movie.imdbID, !nowFav, movie);
    });

    modalActions.appendChild(favBtn);
    details.appendChild(modalActions);
    inner.appendChild(details);

    return inner;
  }

  /**
   * Append a labeled section row to the modal details column.
   *
   * @param {HTMLElement} parent - Parent element to append to
   * @param {string}      label  - Section label text
   * @param {string}      value  - Section value text
   */
  function appendModalSection(parent, label, value) {
    if (!value || value === 'N/A') return;

    const sec = document.createElement('div');
    sec.className = 'modal-section';

    const lbl = document.createElement('p');
    lbl.className = 'modal-section-label';
    lbl.textContent = label;

    const val = document.createElement('p');
    val.className = 'modal-section-value';
    val.textContent = value;

    sec.appendChild(lbl);
    sec.appendChild(val);
    parent.appendChild(sec);
  }

  /**
   * Create a placeholder element for when a modal poster fails.
   *
   * @returns {HTMLElement}
   */
  function createModalPosterPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'modal-poster-placeholder';
    ph.textContent = '🎬';
    return ph;
  }

  /**
   * Sync the favorite button on any visible search result card
   * when the state changes from the modal.
   *
   * @param {string}  imdbID  - Movie IMDb ID
   * @param {boolean} isFav   - New favorite state
   * @param {Object}  movie   - Movie object (used to rebuild button)
   */
  function syncCardFavButton(imdbID, isFav, movie) {
    const card = el.movieGrid.querySelector(`[data-imdbid="${imdbID}"]`);
    if (!card) return;

    const existingBtn = card.querySelector('.btn-fav');
    if (!existingBtn) return;

    const newBtn = createFavButton(movie, isFav);
    existingBtn.replaceWith(newBtn);

    // Sync badge on poster
    const posterWrap = card.querySelector('.card-poster-wrap');
    const badge      = posterWrap?.querySelector('.card-fav-badge');
    if (isFav && !badge) {
      const newBadge = document.createElement('span');
      newBadge.className = 'card-fav-badge';
      newBadge.textContent = '♥';
      posterWrap?.appendChild(newBadge);
    } else if (!isFav && badge) {
      badge.remove();
    }
  }

  /* ════════════════════════════════════════════════════════════
     9. FAVORITES RENDERING
  ════════════════════════════════════════════════════════════ */

  /**
   * Render all saved favorites in the Favorites tab.
   * Called whenever the tab is switched to or favorites change.
   */
  function renderFavorites() {
    const favorites = favoritesManager.getAll();

    el.favoritesGrid.innerHTML = '';

    if (favorites.length === 0) {
      el.favEmpty.classList.remove('hidden');
      el.favoritesGrid.classList.add('hidden');
      return;
    }

    el.favEmpty.classList.add('hidden');
    el.favoritesGrid.classList.remove('hidden');

    favorites.forEach(movie => {
      el.favoritesGrid.appendChild(createMovieCard(movie, true));
    });
  }

  /**
   * Remove a movie from favorites, animate the card out,
   * then update the grid.
   *
   * @param {string}      imdbID - IMDb ID to remove
   * @param {HTMLElement} card   - The card DOM element to animate out
   */
  function removeFavorite(imdbID, card) {
    // Animate the card fading out before removing
    card.style.transition = 'opacity .25s, transform .25s';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(.95)';

    setTimeout(() => {
      // Get the movie data before removing it
      const movie = favoritesManager.getAll().find(m => m.imdbID === imdbID);
      favoritesManager.remove(imdbID);
      // Sync the search grid card if it's visible
      if (movie) syncCardFavButton(imdbID, false, movie);
      renderFavorites();
      showToast('Removed from favorites.', 'info');
    }, 250);
  }

  /* ════════════════════════════════════════════════════════════
     10. TOAST NOTIFICATIONS
  ════════════════════════════════════════════════════════════ */

  /**
   * Display a temporary toast notification.
   *
   * @param {string} message               - Notification text
   * @param {'success'|'error'|'info'} type - Visual style variant
   * @param {number} [duration=3000]        - Auto-dismiss delay in ms
   */
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon
    const icon = document.createElement('span');
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : '♥';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    el.toastContainer.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  /* ════════════════════════════════════════════════════════════
     11. FAVORITES COUNT BADGE (Observer subscription)
  ════════════════════════════════════════════════════════════ */

  /**
   * Update the favorites count badge in the header tab button.
   * Subscribed to FavoritesManager so it updates automatically.
   *
   * @param {Object[]} favorites - Current favorites list
   */
  function updateFavCount(favorites) {
    el.favCount.textContent = favorites.length;
  }

  /* ════════════════════════════════════════════════════════════
     12. PUBLIC INIT
  ════════════════════════════════════════════════════════════ */

  /**
   * Initialize the UIController.
   * Binds all events and performs any on-load setup.
   * Call once after DOMContentLoaded.
   */
  function init() {
    bindTabEvents();
    bindSearchEvents();
    bindModalEvents();

    // Subscribe to favorites changes to keep badge count in sync
    favoritesManager.subscribe(updateFavCount);

    // The Favorites tab renders on demand when switched to,
    // so no extra call needed here.
  }

  // Return only the public API
  return Object.freeze({ init });
}
