import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'
import { useAuthStore } from '../stores/auth'

// Mock auth store
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>

describe('Layout', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: 'testuser',
      logout: vi.fn(),
    })
  })

  it('should render sidebar with navigation items', () => {
    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    expect(getByText('QubicDB')).toBeInTheDocument()
    expect(getByText('Console')).toBeInTheDocument()
    // Overview appears in both nav and header, so use getAllByText
    expect(getAllByText('Overview').length).toBeGreaterThan(0)
    expect(getByText('Indexes')).toBeInTheDocument()
    expect(getByText('Query')).toBeInTheDocument()
    expect(getByText('Metrics')).toBeInTheDocument()
    expect(getByText('Settings')).toBeInTheDocument()
  })

  it('should display user initial in avatar', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    expect(getByText('T')).toBeInTheDocument() // First letter of 'testuser'
  })

  it('should display username', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    expect(getByText('testuser')).toBeInTheDocument()
  })

  it('should show connected status', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    expect(getByText('Connected')).toBeInTheDocument()
  })

  it('should have navigation links with correct paths', () => {
    const { getAllByRole } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    // Get all links and check they exist
    const links = getAllByRole('link')
    const hrefs = links.map((l: HTMLElement) => l.getAttribute('href'))
    
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/users')
    expect(hrefs).toContain('/query')
    expect(hrefs).toContain('/metrics')
    expect(hrefs).toContain('/settings')
  })
})
