import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useUrlState } from '../src/use-url-state.js'

describe('useUrlState', () => {
  let initialLocation

  beforeEach(() => {
    if (typeof window !== 'undefined') {
      initialLocation = window.location.href
      window.history.replaceState(null, '', '/')
    }
  })

  afterEach(() => {
    if (typeof window !== 'undefined' && initialLocation) {
      window.history.replaceState(null, '', initialLocation)
    }
  })

  it('should initialize with url-wins strategy', () => {
    window.history.replaceState(null, '', '/?page=3')

    function TestComponent() {
      const [state] = useUrlState({ page: 1 })
      return <div data-testid="page">{state.page}</div>
    }

    render(<TestComponent />)
    expect(screen.getByTestId('page').textContent).toBe('3')
  })

  it('should initialize with state-wins strategy', () => {
    window.history.replaceState(null, '', '/?page=3')

    function TestComponent() {
      const [state] = useUrlState({ page: 1 }, { syncOnInit: 'state-wins' })
      return <div data-testid="page">{state.page}</div>
    }

    render(<TestComponent />)
    expect(screen.getByTestId('page').textContent).toBe('1')
  })

  it('should update state and URL', async () => {
    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1 })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('2')
      expect(window.location.search).toBe('?page=2')
    })
  })

  it('should use replace mode by default', async () => {
    const initialLength = window.history.length

    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1 })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('2')
    })

    expect(window.history.length).toBe(initialLength)
  })

  it('should use push mode when specified', async () => {
    const initialLength = window.history.length

    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1 }, { history: 'push' })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('2')
    })

    expect(window.history.length).toBeGreaterThan(initialLength)
  })

  it('should handle back button navigation', async () => {
    window.history.replaceState(null, '', '/?page=1')

    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1 }, { history: 'push' })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Next</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)

    // Go to page 2
    getByText('Next').click()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('2')
    })

    // Go back
    window.history.back()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('1')
    })
  })

  it('should support debounceMs option', async () => {
    // Note: Full debounce testing is complex due to async React updates
    // This test just verifies the option is accepted and doesn't break functionality
    function TestComponent() {
      const [state, setState] = useUrlState({ count: 0 }, { debounceMs: 100 })
      return (
        <>
          <div data-testid="count">{state.count}</div>
          <button onClick={() => setState({ count: 1 })}>Inc</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Inc').click()

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1')
    })
  })

  it('should strip default values when enabled', async () => {
    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1, sort: 'asc' }, { stripDefaults: true })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(window.location.search).toBe('?page=2')
    })
  })

  it('should handle nested objects', async () => {
    function TestComponent() {
      const [state, setState] = useUrlState({ user: { name: 'alice' } })
      return (
        <>
          <div data-testid="name">{state.user?.name}</div>
          <button onClick={() => setState({ user: { name: 'bob' } })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('bob')
      expect(window.location.search).toContain('user.name=bob')
    })
  })

  it('should handle arrays', async () => {
    function TestComponent() {
      const [state, setState] = useUrlState({ tags: ['react'] })
      return (
        <>
          <div data-testid="tags">{state.tags?.join(',')}</div>
          <button onClick={() => setState({ tags: ['vue', 'vite'] })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(screen.getByTestId('tags').textContent).toBe('vue,vite')
      expect(window.location.search).toContain('tags=vue')
      expect(window.location.search).toContain('tags=vite')
    })
  })

  it('should parse nested objects and arrays from URL', () => {
    window.history.replaceState(null, '', '/?user.name=alice&tags=react&tags=hooks')

    function TestComponent() {
      const [state] = useUrlState({ user: {}, tags: [] })
      return (
        <>
          <div data-testid="name">{state.user?.name}</div>
          <div data-testid="tags">{state.tags?.join(',')}</div>
        </>
      )
    }

    render(<TestComponent />)
    expect(screen.getByTestId('name').textContent).toBe('alice')
    expect(screen.getByTestId('tags').textContent).toBe('react,hooks')
  })

  it('should preserve unmanaged query params', async () => {
    window.history.replaceState(null, '', '/?page=1&utm_source=google')

    function TestComponent() {
      const [state, setState] = useUrlState({ page: 1 })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => setState({ page: 2 })}>Update</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Update').click()

    await waitFor(() => {
      expect(window.location.search).toContain('page=2')
      expect(window.location.search).toContain('utm_source=google')
    })
  })

  it('should support api.reset()', async () => {
    window.history.replaceState(null, '', '/?page=5')

    function TestComponent() {
      const [state, , api] = useUrlState({ page: 1 })
      return (
        <>
          <div data-testid="page">{state.page}</div>
          <button onClick={() => api.reset()}>Reset</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    expect(screen.getByTestId('page').textContent).toBe('5')

    getByText('Reset').click()

    await waitFor(() => {
      expect(screen.getByTestId('page').textContent).toBe('1')
      expect(window.location.search).toBe('?page=1')
    })
  })

  it('should support api.clear()', async () => {
    window.history.replaceState(null, '', '/?page=5')

    function TestComponent() {
      const [state, , api] = useUrlState({ page: 1 })
      return (
        <>
          <div data-testid="page">{state.page ?? 'undefined'}</div>
          <button onClick={() => api.clear()}>Clear</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('Clear').click()

    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
  })

  it('should support api.setKey()', async () => {
    function TestComponent() {
      const [state, , api] = useUrlState({ page: 1, sort: 'asc' })
      return (
        <>
          <div data-testid="sort">{state.sort}</div>
          <button onClick={() => api.setKey('sort', 'desc')}>SetSort</button>
        </>
      )
    }

    const { getByText } = render(<TestComponent />)
    getByText('SetSort').click()

    await waitFor(() => {
      expect(screen.getByTestId('sort').textContent).toBe('desc')
      expect(window.location.search).toContain('sort=desc')
    })
  })

  it('should support transform functions', () => {
    const transform = {
      date: {
        in: (val) => new Date(val),
        out: (val) => val.toISOString()
      }
    }

    window.history.replaceState(null, '', '/?date=2024-01-15T00:00:00.000Z')

    function TestComponent() {
      const [state] = useUrlState({ date: new Date() }, { transform })
      return <div data-testid="date">{state.date instanceof Date ? 'valid' : 'invalid'}</div>
    }

    render(<TestComponent />)
    expect(screen.getByTestId('date').textContent).toBe('valid')
  })
})

describe('useUrlState SSR', () => {
  it('should handle SSR (no window)', () => {
    const originalWindow = global.window
    const originalDocument = global.document

    delete global.window
    delete global.document

    let hookResult
    function TestComponent() {
      hookResult = useUrlState({ page: 1 })
      const [state] = hookResult
      return state.page
    }

    expect(() => {
      TestComponent()
    }).not.toThrow()

    expect(hookResult[0]).toEqual({ page: 1 })
    expect(typeof hookResult[1]).toBe('function')
    expect(typeof hookResult[2].reset).toBe('function')
    expect(typeof hookResult[2].clear).toBe('function')
    expect(typeof hookResult[2].setKey).toBe('function')
    expect(hookResult[2].getSearch()).toBe('')

    global.window = originalWindow
    global.document = originalDocument
  })
})
