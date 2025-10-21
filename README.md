# react-url-state-hook

> Tiny, dependency-free React hook that syncs state with URL query params

[![npm version](https://img.shields.io/npm/v/react-url-state-hook.svg)](https://www.npmjs.com/package/react-url-state-hook)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-url-state-hook.svg)](https://bundlephobia.com/package/react-url-state-hook)
[![license](https://img.shields.io/npm/l/react-url-state-hook.svg)](https://github.com/lp03256/use-url-state/blob/main/LICENSE)

## Features

- **Tiny**: <1 KB gzipped
- **Zero dependencies**: No external runtime dependencies
- **SSR-safe**: Works with server-side rendering
- **Type-coercion**: Automatically parses numbers and booleans
- **Nested objects & arrays**: Full support with dot notation
- **Debouncing**: Built-in debounce support
- **History modes**: Push or replace state
- **Hash routing**: Optional hash-based routing
- **Tree-shakeable**: ESM-first with CJS fallback

## Installation

```bash
npm install react-url-state-hook
```

## Usage

### Basic Example

```jsx
import { useUrlState } from 'react-url-state-hook'

function SearchPage() {
  const [filters, setFilters] = useUrlState({
    query: '',
    page: 1,
    sort: 'asc'
  })

  return (
    <div>
      <input
        value={filters.query}
        onChange={(e) => setFilters({ query: e.target.value })}
      />
      <button onClick={() => setFilters({ page: filters.page + 1 })}>
        Next Page
      </button>
      <span>Current page: {filters.page}</span>
    </div>
  )
}
```

The URL automatically syncs: `/?query=react&page=2&sort=asc`

### Nested Objects & Arrays

```jsx
const [state, setState] = useUrlState({
  user: { name: '', age: 0 },
  tags: []
})

setState({
  user: { name: 'Alice', age: 30 },
  tags: ['react', 'hooks']
})
// URL: /?user.name=Alice&user.age=30&tags=react&tags=hooks
```

### Strip Default Values

Omit keys that match the initial state:

```jsx
const [state, setState] = useUrlState(
  { page: 1, sort: 'asc' },
  { stripDefaults: true }
)

setState({ page: 1, sort: 'desc' })
// URL: /?sort=desc (page=1 is omitted)
```

### Push vs Replace History

```jsx
// Replace mode (default): doesn't add history entries
const [state, setState] = useUrlState({ page: 1 })

// Push mode: adds history entries (back button works)
const [state, setState] = useUrlState(
  { page: 1 },
  { history: 'push' }
)
```

### Debounce URL Updates

Useful for search inputs to avoid URL thrashing:

```jsx
const [filters, setFilters] = useUrlState(
  { search: '' },
  { debounceMs: 300 }
)

// URL updates 300ms after the last setState call
```

### Hash Routing

For hash-based routing (e.g., `#/page?query=foo`):

```jsx
const [state, setState] = useUrlState(
  { query: '' },
  { routing: 'hash' }
)
```

### API Methods

The hook returns a triple: `[state, setState, api]`

```jsx
const [state, setState, api] = useUrlState({ page: 1, sort: 'asc' })

// Merge state (like setState)
setState({ page: 2 })

// Replace entire state
api.replace({ page: 3, sort: 'desc' })

// Reset to initial state
api.reset()

// Clear all managed params from URL
api.clear()

// Set a single key
api.setKey('page', 5)

// Get current search string
const search = api.getSearch() // "page=5&sort=asc"
```

### Initial Sync Strategy

Control how URL and state merge on mount:

```jsx
// URL wins (default): URL params override initialState
const [state] = useUrlState(
  { page: 1 },
  { syncOnInit: 'url-wins' }
)
// URL: /?page=5 → state.page = 5

// State wins: initialState overrides URL
const [state] = useUrlState(
  { page: 1 },
  { syncOnInit: 'state-wins' }
)
// URL: /?page=5 → state.page = 1
```

### Transform Functions

Apply custom serialization/deserialization per key:

```jsx
const [state, setState] = useUrlState(
  { date: new Date() },
  {
    transform: {
      date: {
        in: (val) => new Date(val),      // Parse from URL
        out: (val) => val.toISOString()  // Serialize to URL
      }
    }
  }
)
```

### SSR (Server-Side Rendering)

The hook safely returns initial state on the server:

```jsx
// On server (window is undefined)
const [state, setState, api] = useUrlState({ page: 1 })
// Returns: [{ page: 1 }, noop, apiNoop]
```

## Options

All options are optional:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `history` | `'push' \| 'replace'` | `'replace'` | History API mode |
| `routing` | `'browser' \| 'hash'` | `'browser'` | Routing mode |
| `debounceMs` | `number` | `0` | Debounce delay for URL updates |
| `stripDefaults` | `boolean` | `false` | Omit keys equal to initialState |
| `syncOnInit` | `'url-wins' \| 'state-wins'` | `'url-wins'` | Initial sync strategy |
| `serialize` | `(obj) => string` | built-in | Custom serializer |
| `parse` | `(qs) => object` | built-in | Custom parser |
| `transform` | `object` | `{}` | Per-key transform functions |
| `basePath` | `string` | `''` | Base path for browser routing |

## Browser Support

Requires the History API (all modern browsers). For legacy browsers, consider polyfills.

## Size

- **ESM**: ~2.5 KB minified, **~800 bytes gzipped**
- **CJS**: ~2.6 KB minified, **~850 bytes gzipped**

## How It Works

1. On mount, parses the current URL and merges with `initialState`
2. On state changes, serializes managed keys and updates the URL
3. Listens to `popstate` events to sync state on back/forward navigation
4. Preserves unmanaged query params (e.g., UTM parameters)
5. SSR-safe: no-ops when `window` is undefined

## Works With

- Plain React apps
- React Router v6+
- Next.js (client components)
- Remix
- Any routing library (doesn't rely on routing APIs)

## License

MIT

## Contributing

Issues and PRs welcome! Please ensure tests pass before submitting.

---

Made with by [Lalit Patil](https://github.com/lp03256)
