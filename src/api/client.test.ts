import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QubicDBClient } from './client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('QubicDBClient', () => {
  let client: QubicDBClient

  beforeEach(() => {
    client = new QubicDBClient('http://localhost:6060')
    mockFetch.mockClear()
  })

  describe('health', () => {
    it('should call health endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', activeIndexes: 5 }),
      })

      const result = await client.health()

      expect(mockFetch).toHaveBeenCalled()
      expect(result.status).toBe('ok')
      expect(result.activeIndexes).toBe(5)
    })

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Service Unavailable',
      })

      await expect(client.health()).rejects.toThrow()
    })
  })

  describe('getGlobalStats', () => {
    it('should fetch global stats', async () => {
      const mockStats = {
        pool: { active_workers: 10, total_ops: 1000 },
        lifecycle: { total_indexes: 50 },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      const result = await client.getGlobalStats()

      expect(mockFetch).toHaveBeenCalled()
      expect(result.pool.active_workers).toBe(10)
    })
  })

  describe('search', () => {
    it('should search neurons', async () => {
      const mockResults = {
        results: [
          { _id: '1', content: 'test', energy: 0.8 },
        ],
        count: 1,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      })

      const result = await client.search('user1', 'test query', 2, 10)

      expect(mockFetch).toHaveBeenCalled()
      expect(result.results).toHaveLength(1)
    })
  })

  describe('addNeuron', () => {
    it('should add a neuron', async () => {
      const mockNeuron = { _id: 'new-id', content: 'new content', energy: 1.0 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNeuron,
      })

      const result = await client.addNeuron('user1', 'new content')

      expect(mockFetch).toHaveBeenCalled()
      expect(result._id).toBe('new-id')
    })
  })

  describe('wakeIndex', () => {
    it('should wake an index brain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'active' }),
      })

      await client.wakeIndex('user1')

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('sleepIndex', () => {
    it('should put an index brain to sleep', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'sleeping' }),
      })

      await client.sleepIndex('user1')

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('getContext', () => {
    it('should assemble context for LLM', async () => {
      const mockContext = {
        context: 'assembled context',
        neuronsUsed: 5,
        estimatedTokens: 100,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContext,
      })

      const result = await client.getContext('user1', 'what is X?', 500)

      expect(mockFetch).toHaveBeenCalled()
      expect(result.neuronsUsed).toBe(5)
    })
  })
})
