import { useState, useEffect, useRef, useCallback } from 'react'
import { encode, parse } from './encode.js'
import { isBrowser, getSearch, setSearch, onPopState, onHashChange } from './internal/history.js'

/**
 * React hook that syncs state with URL query parameters.
 *
 * @param {Object} initialState - Initial state object
 * @param {Object} [options] - Configuration options
 * @param {'push' | 'replace'} [options.history='replace'] - History API mode
 * @param {'browser' | 'hash'} [options.routing='browser'] - Routing mode
 * @param {number} [options.debounceMs=0] - Debounce delay for URL updates
 * @param {boolean} [options.stripDefaults=false] - Omit keys equal to initialState
 * @param {'url-wins' | 'state-wins'} [options.syncOnInit='url-wins'] - Initial sync strategy
 * @param {Function} [options.serialize] - Custom serializer
 * @param {Function} [options.parse] - Custom parser
 * @param {Object} [options.transform] - Per-key transform functions
 * @param {string} [options.basePath] - Base path for browser routing
 * @returns {[Object, Function, Object]} [state, setState, api]
 */
export function useUrlState(initialState = {}, options = {}) {
  const {
    history: historyMode = 'replace',
    routing = 'browser',
    debounceMs = 0,
    stripDefaults = false,
    syncOnInit = 'url-wins',
    serialize = encode,
    parse: parseUrl = parse,
    transform = {},
    basePath = ''
  } = options

  // SSR safety: if not in browser, return noop
  if (!isBrowser()) {
    const noop = () => {}
    const api = {
      replace: noop,
      reset: noop,
      clear: noop,
      setKey: noop,
      getSearch: () => ''
    }
    return [initialState, noop, api]
  }

  // Parse initial URL and merge with initialState
  const getInitialState = () => {
    const urlParams = parseUrl(getSearch(routing))
    const transformed = applyTransforms(urlParams, transform, 'in')

    if (syncOnInit === 'state-wins') {
      return { ...transformed, ...initialState }
    }

    // url-wins: merge initialState with URL params (URL takes precedence)
    return { ...initialState, ...transformed }
  }

  const [state, setState] = useState(getInitialState)
  const debounceTimerRef = useRef(null)
  const initialStateRef = useRef(initialState)
  const managedKeysRef = useRef(Object.keys(initialState))

  // Update URL based on current state
  const updateUrl = useCallback((newState) => {
    // Extract only managed keys
    const managed = {}
    managedKeysRef.current.forEach(key => {
      if (key in newState) {
        managed[key] = newState[key]
      }
    })

    // Strip defaults if enabled
    let toEncode = managed
    if (stripDefaults) {
      toEncode = {}
      Object.keys(managed).forEach(key => {
        if (!deepEqual(managed[key], initialStateRef.current[key])) {
          toEncode[key] = managed[key]
        }
      })
    }

    // Apply outbound transforms
    const transformed = applyTransforms(toEncode, transform, 'out')

    // Serialize managed keys
    const managedSearch = serialize(transformed)

    // Preserve unmanaged query params
    const currentSearch = getSearch(routing)
    const currentParams = parseUrl(currentSearch)
    const unmanaged = {}

    Object.keys(currentParams).forEach(key => {
      if (!managedKeysRef.current.includes(key) && !key.split('.')[0].match(new RegExp(`^(${managedKeysRef.current.join('|')})$`))) {
        unmanaged[key] = currentParams[key]
      }
    })

    const unmanagedSearch = serialize(unmanaged)

    // Combine managed and unmanaged
    const combinedSearch = [managedSearch, unmanagedSearch]
      .filter(Boolean)
      .join('&')

    setSearch(combinedSearch, historyMode, routing, basePath)
  }, [historyMode, routing, stripDefaults, serialize, parseUrl, transform, basePath])

  // Debounced URL update
  const scheduleUrlUpdate = useCallback((newState) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (debounceMs > 0) {
      debounceTimerRef.current = setTimeout(() => {
        updateUrl(newState)
      }, debounceMs)
    } else {
      updateUrl(newState)
    }
  }, [debounceMs, updateUrl])

  // State setter (supports object merge or function)
  const setUrlState = useCallback((patchOrFn) => {
    setState(prevState => {
      const patch = typeof patchOrFn === 'function' ? patchOrFn(prevState) : patchOrFn
      const newState = { ...prevState, ...patch }

      // Avoid unnecessary updates
      if (!shallowEqual(prevState, newState)) {
        scheduleUrlUpdate(newState)
      }

      return newState
    })
  }, [scheduleUrlUpdate])

  // API methods
  const api = {
    replace: useCallback((patch) => {
      setState(prevState => {
        const newState = { ...prevState, ...patch }
        updateUrl(newState)
        return newState
      })
    }, [updateUrl]),

    reset: useCallback(() => {
      setState(initialStateRef.current)
      updateUrl(initialStateRef.current)
    }, [updateUrl]),

    clear: useCallback(() => {
      const cleared = {}
      managedKeysRef.current.forEach(key => {
        cleared[key] = undefined
      })
      setState(cleared)
      setSearch('', historyMode, routing, basePath)
    }, [historyMode, routing, basePath]),

    setKey: useCallback((key, value) => {
      setUrlState({ [key]: value })
    }, [setUrlState]),

    getSearch: useCallback(() => {
      const managed = {}
      managedKeysRef.current.forEach(key => {
        if (key in state) {
          managed[key] = state[key]
        }
      })
      const transformed = applyTransforms(managed, transform, 'out')
      return serialize(transformed)
    }, [state, serialize, transform])
  }

  // Listen to popstate/hashchange for back/forward navigation
  useEffect(() => {
    const handleNavigation = () => {
      const urlParams = parseUrl(getSearch(routing))
      const transformed = applyTransforms(urlParams, transform, 'in')

      setState(prevState => {
        const newState = { ...initialStateRef.current }

        // Merge only managed keys from URL
        managedKeysRef.current.forEach(key => {
          if (key in transformed) {
            newState[key] = transformed[key]
          }
        })

        return newState
      })
    }

    const cleanupPopState = onPopState(handleNavigation)
    const cleanupHashChange = routing === 'hash' ? onHashChange(handleNavigation) : () => {}

    return () => {
      cleanupPopState()
      cleanupHashChange()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [routing, parseUrl, transform])

  return [state, setUrlState, api]
}

/**
 * Apply transform functions to state values.
 *
 * @param {Object} obj - Object to transform
 * @param {Object} transform - Transform configuration
 * @param {'in' | 'out'} direction - Transform direction
 * @returns {Object} Transformed object
 */
function applyTransforms(obj, transform, direction) {
  if (!transform || Object.keys(transform).length === 0) {
    return obj
  }

  const result = { ...obj }

  Object.keys(transform).forEach(key => {
    if (key in result && transform[key][direction]) {
      result[key] = transform[key][direction](result[key])
    }
  })

  return result
}

/**
 * Shallow equality check for objects.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  return keysA.every(key => a[key] === b[key])
}

/**
 * Deep equality check for values (handles primitives, arrays, objects).
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true

  if (a == null || b == null) return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  if (typeof a === 'object' && typeof b === 'object' && a.constructor === Object && b.constructor === Object) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => deepEqual(a[key], b[key]))
  }

  return false
}
