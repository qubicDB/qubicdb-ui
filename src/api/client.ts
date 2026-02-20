import { useAuthStore } from '../stores/auth'

// ---------------------------------------------------------------------------
// Standardised API error envelope returned by all QubicDB endpoints.
// Clients should branch on `code` for programmatic handling.
// ---------------------------------------------------------------------------

export interface ApiError {
  ok: false
  error: string
  code: string
  status: number
}

export class QubicDBError extends Error {
  code: string
  status: number

  constructor(response: ApiError) {
    super(response.error)
    this.name = 'QubicDBError'
    this.code = response.code
    this.status = response.status
  }
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Neuron {
  _id: string
  content: string
  energy: number
  depth: number
  birth?: string
  createdAt?: string
  lastFire?: string
  lastFiredAt?: string
  fireCount?: number
  accessCount?: number
  position: number[]
  tags?: string[]
  metadata?: Record<string, string>
  sentimentLabel?: string
  sentimentScore?: number
}

export interface UserStats {
  neuron_count: number
  synapse_count: number
  average_energy: number
  depth_distribution: Record<number, number>
  total_writes: number
  total_reads: number
}

export interface BrainState {
  state: string
  lastInvoke: string
  invokeCount: number
}

export interface RegistryEntry {
  uuid: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ConfigSetResponse {
  ok: boolean
  changed: string[]
  count: number
  rejected?: string[]
}

export interface GlobalStats {
  pool: {
    active_workers: number
    total_created: number
    total_evicted: number
    max_idle_time: string
    worker_details: Record<string, {
      index_id: string
      ops_processed: number
      last_op: string
      queue_length: number
      queue_capacity: number
    }>
  }
  lifecycle: {
    total_indexes: number
    idle_threshold: string
    sleep_threshold: string
    dormant_threshold: string
    state_distribution: {
      active: number
      idle: number
      sleeping: number
      dormant: number
    }
  }
}

export class QubicDBClient {
  constructor(private overrideBaseUrl?: string) {}
  
  private getBaseUrl(): string {
    return this.overrideBaseUrl || useAuthStore.getState().serverUrl
  }

  private getAdminHeaders(): Record<string, string> {
    const authHeader = useAuthStore.getState().getBasicAuthHeader()
    return authHeader ? { Authorization: authHeader } : {}
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let body: ApiError | null = null
      try {
        body = await response.json()
      } catch {
        // response may not be JSON
      }
      if (body && body.code) {
        throw new QubicDBError(body)
      }
      throw new Error(`HTTP ${response.status}: ${body?.error ?? 'unknown error'}`)
    }

    return response.json()
  }

  // Health
  async health() {
    return this.request<{ status: string; timestamp: string; activeIndexes: number }>('/health')
  }

  // Global stats
  async getGlobalStats(): Promise<GlobalStats> {
    return this.request('/v1/stats')
  }

  // ---------------------------------------------------------------------------
  // Registry operations (user CRUD)
  // ---------------------------------------------------------------------------

  async listRegistryEntries(): Promise<{ entries: RegistryEntry[]; count: number }> {
    return this.request('/v1/registry')
  }

  async getRegistryEntry(uuid: string): Promise<RegistryEntry> {
    return this.request(`/v1/registry/${uuid}`)
  }

  async createRegistryEntry(uuid: string, metadata?: Record<string, unknown>): Promise<RegistryEntry> {
    return this.request('/v1/registry', {
      method: 'POST',
      body: JSON.stringify({ uuid, metadata }),
    })
  }

  async deleteRegistryEntry(uuid: string): Promise<void> {
    await this.request(`/v1/registry/${uuid}`, { method: 'DELETE' })
  }

  async findOrCreateRegistryEntry(
    uuid: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ uuid: string; created: boolean }> {
    return this.request('/v1/registry/find-or-create', {
      method: 'POST',
      body: JSON.stringify({ uuid, metadata }),
    })
  }

  // Index operations — backed by registry
  async listIndexes(): Promise<string[]> {
    const { entries } = await this.listRegistryEntries()
    return entries.map((e) => e.uuid)
  }

  async getIndexStats(indexId: string): Promise<UserStats> {
    return this.request(`/v1/brain/stats`, {
      headers: { 'X-Index-ID': indexId },
    })
  }

  async getBrainState(indexId: string): Promise<BrainState> {
    return this.request(`/v1/brain/state`, {
      headers: { 'X-Index-ID': indexId },
    })
  }

  async wakeIndex(indexId: string): Promise<void> {
    await this.request(`/v1/brain/wake`, {
      method: 'POST',
      headers: { 'X-Index-ID': indexId },
    })
  }

  async sleepIndex(indexId: string): Promise<void> {
    await this.request(`/v1/brain/sleep`, {
      method: 'POST',
      headers: { 'X-Index-ID': indexId },
    })
  }

  // ---------------------------------------------------------------------------
  // Brain-like memory operations
  // ---------------------------------------------------------------------------

  // Memory scanning — returns all memories for an index.
  async listNeurons(indexId: string, _limit = 100): Promise<{ neurons: Neuron[]; count: number }> {
    const data = await this.request<{ memories: Neuron[]; count: number }>('/v1/recall', {
      headers: { 'X-Index-ID': indexId },
    })
    return { neurons: data.memories, count: data.count }
  }

  // Memory retrieval by ID.
  async getNeuron(indexId: string, neuronId: string): Promise<Neuron> {
    return this.request(`/v1/read/${neuronId}`, {
      headers: { 'X-Index-ID': indexId },
    })
  }

  // Memory formation — creates a new neuron.
  async addNeuron(
    indexId: string,
    content: string,
    parentId?: string,
    metadata?: Record<string, string>,
  ): Promise<Neuron> {
    return this.request('/v1/write', {
      method: 'POST',
      headers: { 'X-Index-ID': indexId },
      body: JSON.stringify({ content, parent_id: parentId, metadata }),
    })
  }

  // Search
  async search(
    indexId: string,
    query: string,
    depth = 2,
    limit = 20,
    metadata?: Record<string, string>,
    strict = false,
  ): Promise<{ results: Neuron[]; count: number }> {
    return this.request('/v1/search', {
      method: 'POST',
      headers: { 'X-Index-ID': indexId },
      body: JSON.stringify({ query, depth, limit, metadata, strict: strict || undefined }),
    })
  }

  // Context assembly
  async getContext(indexId: string, cue: string, maxTokens = 2000): Promise<{ context: string; neuronsUsed: number }> {
    return this.request('/v1/context', {
      method: 'POST',
      headers: { 'X-Index-ID': indexId },
      body: JSON.stringify({ cue, maxTokens }),
    })
  }

  // ---------------------------------------------------------------------------
  // Config operations
  // ---------------------------------------------------------------------------

  async getConfig(): Promise<Record<string, unknown>> {
    return this.request('/v1/config', {
      headers: this.getAdminHeaders(),
    })
  }

  async getConfigSection(section: string): Promise<unknown> {
    const full = await this.getConfig()
    return full[section]
  }

  async setConfig(patch: Record<string, unknown>): Promise<ConfigSetResponse> {
    return this.request('/v1/config', {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(patch),
    })
  }

  // ---------------------------------------------------------------------------
  // Admin operations (all require Basic Auth)
  // ---------------------------------------------------------------------------

  async adminGetIndexDetail(indexId: string): Promise<{ stats: unknown; state: unknown }> {
    return this.request(`/admin/indexes/${indexId}`, {
      headers: this.getAdminHeaders(),
    })
  }

  async adminResetIndex(indexId: string): Promise<void> {
    await this.request(`/admin/indexes/${indexId}/reset`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
    })
  }

  async adminDeleteIndex(indexId: string): Promise<void> {
    await this.request(`/admin/indexes/${indexId}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    })
  }

  async adminExportIndex(indexId: string): Promise<Blob> {
    const response = await fetch(`${this.getBaseUrl()}/admin/indexes/${indexId}/export`, {
      headers: this.getAdminHeaders(),
    })
    return response.blob()
  }

  async adminGetDaemonStatus(): Promise<Record<string, unknown>> {
    return this.request('/admin/daemons', {
      headers: this.getAdminHeaders(),
    })
  }

  async adminPauseDaemons(): Promise<void> {
    await this.request('/admin/daemons/pause', {
      method: 'POST',
      headers: this.getAdminHeaders(),
    })
  }

  async adminResumeDaemons(): Promise<void> {
    await this.request('/admin/daemons/resume', {
      method: 'POST',
      headers: this.getAdminHeaders(),
    })
  }

  async adminForceGC(): Promise<void> {
    await this.request('/admin/gc', {
      method: 'POST',
      headers: this.getAdminHeaders(),
    })
  }

  async adminForcePersist(): Promise<void> {
    await this.request('/admin/persist', {
      method: 'POST',
      headers: this.getAdminHeaders(),
    })
  }

  // Graph data for visualization
  async getGraphData(indexId: string): Promise<GraphData> {
    return this.request('/v1/graph', {
      headers: { 'X-Index-ID': indexId },
    })
  }

  // Synapses
  async getSynapses(indexId: string): Promise<{ synapses: SynapseData[]; count: number }> {
    return this.request('/v1/synapses', {
      headers: { 'X-Index-ID': indexId },
    })
  }

  // Activity log
  async getActivity(indexId: string): Promise<ActivityData> {
    return this.request('/v1/activity', {
      headers: { 'X-Index-ID': indexId },
    })
  }
}

export interface ActivityEvent {
  timestamp: string
  type: string
  action: string
  details: string
}

export interface ActivityData {
  events: ActivityEvent[]
  count: number
}

export interface GraphNode {
  id: string
  content: string
  energy: number
  depth: number
  accessCount: number
  position: number[]
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  coFireCount: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface SynapseData {
  id: string
  from_id: string
  to_id: string
  weight: number
  co_fire_count: number
}

export const qubicdb = new QubicDBClient()
