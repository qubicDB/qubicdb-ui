import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  user: string | null
  password: string | null
  serverUrl: string
  login: (user: string, password: string, serverUrl: string) => Promise<boolean>
  logout: () => void
  setServerUrl: (url: string) => void
  getBasicAuthHeader: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (partial: Partial<AuthState>) => void, get: () => AuthState) => ({
      isAuthenticated: false,
      user: null as string | null,
      password: null as string | null,
      serverUrl: 'http://localhost:6060',

      login: async (user: string, password: string, serverUrl: string) => {
        try {
          const response = await fetch(`${serverUrl}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, password }),
          })

          if (response.ok) {
            set({ isAuthenticated: true, user, password, serverUrl })
            return true
          }

          return false
        } catch {
          return false
        }
      },

      logout: () => {
        set({ isAuthenticated: false, user: null, password: null })
      },

      setServerUrl: (url: string) => {
        set({ serverUrl: url })
      },

      getBasicAuthHeader: (): string | null => {
        const { user, password } = get()
        if (user && password) {
          return 'Basic ' + btoa(`${user}:${password}`)
        }
        return null
      },
    }),
    {
      name: 'qubicdb-auth',
      partialize: (state: AuthState) => ({
        serverUrl: state.serverUrl,
      }),
    }
  )
)
