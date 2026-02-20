import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth'

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      serverUrl: 'http://localhost:6060',
    })
  })

  it('should have initial state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.serverUrl).toBe('http://localhost:6060')
  })

  it('should update server URL', () => {
    const { setServerUrl } = useAuthStore.getState()
    setServerUrl('http://newserver:8080')
    
    const state = useAuthStore.getState()
    expect(state.serverUrl).toBe('http://newserver:8080')
  })

  it('should logout correctly', () => {
    // First set authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      user: 'admin',
    })

    const { logout } = useAuthStore.getState()
    logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('should persist server URL after logout', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: 'admin',
      serverUrl: 'http://custom:9090',
    })

    const { logout } = useAuthStore.getState()
    logout()

    const state = useAuthStore.getState()
    expect(state.serverUrl).toBe('http://custom:9090')
  })
})
