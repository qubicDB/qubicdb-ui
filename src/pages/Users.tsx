import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Brain, ChevronRight, Activity, Moon, Sun, Zap, Plus, Trash2, Search, AlertTriangle, X, ChevronLeft } from 'lucide-react'
import { qubicdb, type RegistryEntry } from '../api/client'

const PAGE_SIZE = 10

const stateIcons: Record<string, React.ElementType> = {
  active: Activity,
  idle: Sun,
  sleeping: Moon,
  dormant: Zap,
}

const stateColors: Record<string, string> = {
  active: 'text-green-500',
  idle: 'text-yellow-500',
  sleeping: 'text-blue-500',
  dormant: 'text-slate-500',
}

export default function Users() {
  const queryClient = useQueryClient()
  const [newUUID, setNewUUID] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: registry, isLoading } = useQuery({
    queryKey: ['registry'],
    queryFn: () => qubicdb.listRegistryEntries(),
    refetchInterval: 5000,
  })

  const createMutation = useMutation({
    mutationFn: (uuid: string) => qubicdb.createRegistryEntry(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registry'] })
      setNewUUID('')
      setShowCreate(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => qubicdb.deleteRegistryEntry(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registry'] })
      setDeleteTarget(null)
    },
  })

  const allEntries = registry?.entries ?? []

  const filtered = useMemo(() => {
    if (!filterText.trim()) return allEntries
    const q = filterText.toLowerCase()
    return allEntries.filter((e) => e.uuid.toLowerCase().includes(q))
  }, [allEntries, filterText])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-neuron-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-white">Remove from Registry</h3>
              <button onClick={() => setDeleteTarget(null)} className="ml-auto text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              This will unregister the index UUID from the registry. The brain data on disk is not deleted.
            </p>
            <p className="text-xs font-mono text-slate-400 bg-slate-700 rounded p-2 mb-4">{deleteTarget}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Registered Indexes</h2>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">{allEntries.length} indexes</span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 bg-neuron-600 hover:bg-neuron-700 text-white rounded-lg flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Register
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-slate-800 rounded-xl p-4 border border-neuron-500/50">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (newUUID.trim()) createMutation.mutate(newUUID.trim())
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={newUUID}
              onChange={(e) => setNewUUID(e.target.value)}
              placeholder="Enter UUID to register..."
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newUUID.trim() || createMutation.isPending}
              className="px-6 py-2 bg-neuron-600 hover:bg-neuron-700 disabled:opacity-50 text-white rounded-lg"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
          {createMutation.isError && (
            <p className="mt-2 text-sm text-red-400">
              {(createMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Search / filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => { setFilterText(e.target.value); setPage(0) }}
          placeholder="Filter indexes by UUID..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-neuron-500"
        />
      </div>

      <div className="grid gap-4">
        {paged.map((entry) => (
          <UserCard
            key={entry.uuid}
            entry={entry}
            onDelete={() => setDeleteTarget(entry.uuid)}
            isDeleting={deleteMutation.isPending && deleteTarget === entry.uuid}
          />
        ))}
        {filtered.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
            <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{filterText ? 'No indexes match filter' : 'No registered indexes'}</p>
            <p className="text-sm text-slate-500 mt-2">
              {filterText ? 'Try a different search term' : 'Click "Register" above to add a new index UUID'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-400">
            Page {safePage + 1} of {totalPages} ({filtered.length} indexes)
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

function UserCard({
  entry,
  onDelete,
  isDeleting,
}: {
  entry: RegistryEntry
  onDelete: () => void
  isDeleting: boolean
}) {
  const { data: stats } = useQuery({
    queryKey: ['userStats', entry.uuid],
    queryFn: () => qubicdb.getIndexStats(entry.uuid),
    refetchInterval: 5000,
  })

  const { data: brainState } = useQuery({
    queryKey: ['brainState', entry.uuid],
    queryFn: () => qubicdb.getBrainState(entry.uuid),
    refetchInterval: 3000,
  })

  const StateIcon = stateIcons[brainState?.state ?? 'dormant'] ?? Zap
  const stateColor = stateColors[brainState?.state ?? 'dormant']

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-neuron-500 transition-colors group">
      <div className="flex items-center justify-between">
        <Link to={`/users/${entry.uuid}`} className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
            <Brain className="w-6 h-6 text-neuron-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white group-hover:text-neuron-400 transition-colors">
              {entry.uuid}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <StateIcon className={`w-4 h-4 ${stateColor}`} />
                <span className="text-sm text-slate-400 capitalize">
                  {brainState?.state ?? 'dormant'}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                registered {new Date(entry.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{stats?.neuron_count ?? '-'}</p>
            <p className="text-xs text-slate-400">Neurons</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{stats?.synapse_count ?? '-'}</p>
            <p className="text-xs text-slate-400">Synapses</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              onDelete()
            }}
            disabled={isDeleting}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remove from registry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link to={`/users/${entry.uuid}`}>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-neuron-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
