/**
 * SSR-safe utilities for reading and writing URL state.
 */

/**
 * Check if we're in a browser environment.
 *
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined'
}

/**
 * Get the current search string based on routing mode.
 *
 * @param {'browser' | 'hash'} routing
 * @returns {string} The search string (without leading '?')
 */
export function getSearch(routing = 'browser') {
  if (!isBrowser()) return ''

  if (routing === 'hash') {
    const hash = globalThis.window.location.hash
    const qIndex = hash.indexOf('?')
    return qIndex >= 0 ? hash.slice(qIndex + 1) : ''
  }

  return globalThis.window.location.search.slice(1)
}

/**
 * Write a new search string to the URL.
 *
 * @param {string} search - New search string (without leading '?')
 * @param {'push' | 'replace'} history - History mode
 * @param {'browser' | 'hash'} routing - Routing mode
 * @param {string} [basePath] - Optional base path for browser routing
 */
export function setSearch(search, history = 'replace', routing = 'browser', basePath = '') {
  if (!isBrowser()) return

  const prefix = search ? '?' : ''

  if (routing === 'hash') {
    const currentHash = globalThis.window.location.hash
    const hashPath = currentHash.split('?')[0] || '#/'
    const newHash = search ? `${hashPath}?${search}` : hashPath

    if (history === 'push') {
      globalThis.window.location.hash = newHash
    } else {
      // Replace hash without adding history entry
      const url = new URL(globalThis.window.location.href)
      url.hash = newHash
      globalThis.window.history.replaceState(null, '', url.toString())
    }
  } else {
    const currentPath = globalThis.window.location.pathname
    const path = basePath || currentPath
    const newUrl = search ? `${path}?${search}` : path

    if (history === 'push') {
      globalThis.window.history.pushState(null, '', newUrl)
    } else {
      globalThis.window.history.replaceState(null, '', newUrl)
    }
  }
}

/**
 * Add a listener for popstate events (back/forward navigation).
 *
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export function onPopState(callback) {
  if (!isBrowser()) return () => {}

  globalThis.window.addEventListener('popstate', callback)
  return () => globalThis.window.removeEventListener('popstate', callback)
}

/**
 * Add a listener for hashchange events (for hash routing).
 *
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export function onHashChange(callback) {
  if (!isBrowser()) return () => {}

  globalThis.window.addEventListener('hashchange', callback)
  return () => globalThis.window.removeEventListener('hashchange', callback)
}
