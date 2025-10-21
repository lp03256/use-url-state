/**
 * Encodes a nested object into a URL query string.
 * Arrays are repeated (e.g., tags=a&tags=b).
 * Nested objects use dot notation (e.g., user.name=alice).
 *
 * @param {Object} obj - The object to encode
 * @returns {string} URL query string (without leading '?')
 */
export function encode(obj) {
  const params = new URLSearchParams()

  function addParam(key, value) {
    if (value === null || value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        params.append(key, String(item))
      })
    } else if (typeof value === 'object' && value.constructor === Object) {
      Object.keys(value).forEach(nestedKey => {
        addParam(`${key}.${nestedKey}`, value[nestedKey])
      })
    } else {
      params.append(key, String(value))
    }
  }

  Object.keys(obj).forEach(key => {
    addParam(key, obj[key])
  })

  return params.toString()
}

/**
 * Parses a URL query string into a nested object.
 * Handles arrays (repeated keys) and dot notation for nested objects.
 *
 * @param {string} search - URL query string (with or without leading '?')
 * @returns {Object} Parsed object
 */
export function parse(search) {
  const result = {}
  const cleanSearch = search.startsWith('?') ? search.slice(1) : search

  if (!cleanSearch) {
    return result
  }

  const params = new URLSearchParams(cleanSearch)

  params.forEach((value, key) => {
    // Handle dot notation (e.g., "user.name")
    if (key.includes('.')) {
      const parts = key.split('.')
      let current = result

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
          current[part] = {}
        }
        current = current[part]
      }

      const lastPart = parts[parts.length - 1]

      // Handle repeated keys (arrays) in nested context
      if (current[lastPart] !== undefined) {
        if (Array.isArray(current[lastPart])) {
          current[lastPart].push(coerceValue(value))
        } else {
          current[lastPart] = [current[lastPart], coerceValue(value)]
        }
      } else {
        current[lastPart] = coerceValue(value)
      }
    } else {
      // Handle top-level keys
      if (result[key] !== undefined) {
        // Repeated key = array
        if (Array.isArray(result[key])) {
          result[key].push(coerceValue(value))
        } else {
          result[key] = [result[key], coerceValue(value)]
        }
      } else {
        result[key] = coerceValue(value)
      }
    }
  })

  return result
}

/**
 * Coerce string values to their likely type (number, boolean, or string).
 *
 * @param {string} value - The value to coerce
 * @returns {string|number|boolean} Coerced value
 */
function coerceValue(value) {
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value)
    if (!isNaN(num)) {
      return num
    }
  }

  // Try boolean
  if (value === 'true') return true
  if (value === 'false') return false

  return value
}
