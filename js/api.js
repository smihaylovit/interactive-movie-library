/**
 * api.js — MovieService Module
 * ─────────────────────────────────────────────────────────────
 * Responsibility: All communication with the OMDb REST API.
 * Pattern: Module pattern — exposes a factory function that
 *          returns a frozen public interface. Internal state
 *          (apiKey, base URLs) is private via closure.
 *
 * Public API:
 *   MovieService(apiKey)
 *     .searchMovies(title, page)  → Promise<SearchResult>
 *     .getMovieById(imdbID)       → Promise<MovieDetail>
 *
 * Usage:
 *   const svc = MovieService('d070386d');
 *   const results = await svc.searchMovies('inception', 1);
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Factory function that creates a MovieService instance.
 *
 * @param {string} apiKey - OMDb API key
 * @returns {Object} Frozen service object with search/detail methods
 */
function MovieService(apiKey) {

  /** Base URL for metadata requests (search + detail) */
  const BASE_META = 'https://www.omdbapi.com/';

  /** Base URL for poster image requests */
  const BASE_IMG  = 'https://img.omdbapi.com/';

  /* ── Private helpers ─────────────────────────────────────── */

  /**
   * Builds a URL string from a base and a params object.
   * Automatically appends the API key.
   *
   * @param {string} base   - Base URL
   * @param {Object} params - Query parameters (excluding apikey)
   * @returns {string} Full URL with query string
   */
  function buildUrl(base, params) {
    const url = new URL(base);
    url.searchParams.set('apikey', apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  /**
   * Wrapper around fetch() that handles network errors and
   * parses JSON. Throws a descriptive Error on failure so
   * callers can catch and display user-friendly messages.
   *
   * @param {string} url - Full URL to fetch
   * @returns {Promise<Object>} Parsed JSON response
   * @throws {Error} On network failure or non-OK HTTP status
   */
  async function fetchJSON(url) {
    let response;
    try {
      response = await fetch(url);
    } catch (networkErr) {
      // fetch() itself threw — typically offline or CORS
      throw new Error('Network error: please check your connection.');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // OMDb signals logical errors via Response: "False"
    if (data.Response === 'False') {
      throw new Error(data.Error || 'No results found.');
    }

    return data;
  }

  /* ── Public methods ──────────────────────────────────────── */

  /**
   * Search for movies by title.
   * Maps to: GET https://www.omdbapi.com/?s=<title>&page=<page>&apikey=...
   *
   * @param {string} title     - Movie title to search for
   * @param {number} [page=1]  - Pagination page (1–100)
   * @returns {Promise<{movies: Array, totalResults: number, page: number}>}
   * @throws {Error} If the request fails or OMDb returns an error
   */
  async function searchMovies(title, page = 1) {
    if (!title || !title.trim()) {
      throw new Error('Please enter a movie title to search.');
    }

    const url = buildUrl(BASE_META, { s: title.trim(), page, type: '' });
    const data = await fetchJSON(url);

    return {
      movies:       data.Search || [],
      totalResults: parseInt(data.totalResults, 10) || 0,
      page:         page,
    };
  }

  /**
   * Fetch detailed information for a single movie by IMDb ID.
   * Maps to: GET https://www.omdbapi.com/?i=<imdbID>&apikey=...
   *
   * @param {string} imdbID - A valid IMDb ID (e.g. "tt2015381")
   * @returns {Promise<Object>} Full movie detail object from OMDb
   * @throws {Error} If the request fails or the ID is not found
   */
  async function getMovieById(imdbID) {
    if (!imdbID) {
      throw new Error('Invalid IMDb ID.');
    }

    const url = buildUrl(BASE_META, { i: imdbID, plot: 'short' });
    return fetchJSON(url);
  }

  /**
   * Build the poster image URL for a given IMDb ID.
   * Note: The img.omdbapi.com endpoint requires a paid plan;
   * we return the standard poster URL from the metadata API
   * as a reliable fallback that works with the free key.
   *
   * @param {string} imdbID - A valid IMDb ID
   * @returns {string} Poster image URL
   */
  function getPosterUrl(imdbID) {
    // img.omdbapi.com requires paid plan; documented for reference:
    // return buildUrl(BASE_IMG, { i: imdbID });
    // We rely on the Poster field returned in the metadata instead.
    return buildUrl(BASE_IMG, { i: imdbID });
  }

  // Return a frozen public interface (Module pattern)
  return Object.freeze({
    searchMovies,
    getMovieById,
    getPosterUrl,
  });
}
