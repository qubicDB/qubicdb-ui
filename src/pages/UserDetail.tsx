import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Brain, Moon, Sun, Trash2, RotateCcw, Network, AlertTriangle, X, Filter, PenLine, Tag, Send } from 'lucide-react'
import { qubicdb, type Neuron } from '../api/client'
import ActivityLog from '../components/ActivityLog'

type ConfirmAction = 'delete' | 'reset' | 'wake' | 'sleep' | null

function parseMetadataInput(raw: string): Record<string, string> | undefined {
  const pairs = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (pairs.length === 0) return undefined
  const out: Record<string, string> = {}
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx < 1) continue
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return Object.keys(out).length > 0 ? out : undefined
}

const ACTION_META: Record<string, { title: string; desc: string; color: string; requireType?: boolean }> = {
  delete: {
    title: 'Delete Index',
    desc: 'This will permanently delete the index and all its neurons, synapses, and brain state. This cannot be undone.',
    color: 'bg-red-600',
    requireType: true,
  },
  reset: {
    title: 'Reset Index',
    desc: 'This will wipe all neurons and synapses but keep the index registered. The brain starts from scratch.',
    color: 'bg-yellow-600',
  },
  wake: {
    title: 'Wake Index',
    desc: 'Force the brain to Active state. This starts background daemons (decay, consolidate, prune) for this index. Use when you need to reactivate a dormant/sleeping brain.',
    color: 'bg-green-600',
  },
  sleep: {
    title: 'Sleep Index',
    desc: 'Force the brain to Sleeping state. Background daemons will run a consolidation pass and then pause. The brain will reactivate on the next client operation.',
    color: 'bg-blue-600',
  },
}

export default function UserDetail() {
  const { indexId } = useParams<{ indexId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMetaRaw, setSearchMetaRaw] = useState('')
  const [searchStrict, setSearchStrict] = useState(false)
  const [showSearchMeta, setShowSearchMeta] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [showWrite, setShowWrite] = useState(false)
  const [writeContent, setWriteContent] = useState('')
  const [writeMetaRaw, setWriteMetaRaw] = useState('')
  const [writeError, setWriteError] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['userStats', indexId],
    queryFn: () => qubicdb.getIndexStats(indexId!),
    enabled: !!indexId,
    refetchInterval: 3000,
  })

  const { data: brainState } = useQuery({
    queryKey: ['brainState', indexId],
    queryFn: () => qubicdb.getBrainState(indexId!),
    enabled: !!indexId,
    refetchInterval: 3000,
  })

  const { data: neurons } = useQuery({
    queryKey: ['neurons', indexId],
    queryFn: () => qubicdb.listNeurons(indexId!, 100),
    enabled: !!indexId,
    refetchInterval: 5000,
  })

  const searchMeta = parseMetadataInput(searchMetaRaw)

  const { data: searchResults } = useQuery({
    queryKey: ['search', indexId, searchQuery, searchMetaRaw, searchStrict],
    queryFn: () => qubicdb.search(indexId!, searchQuery, 2, 20, searchMeta, searchStrict),
    enabled: !!indexId && searchQuery.length > 2,
  })

  const writeMutation = useMutation({
    mutationFn: () => {
      const meta = parseMetadataInput(writeMetaRaw)
      return qubicdb.addNeuron(indexId!, writeContent, undefined, meta)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neurons', indexId] })
      queryClient.invalidateQueries({ queryKey: ['userStats', indexId] })
      setWriteContent('')
      setWriteMetaRaw('')
      setWriteError('')
      setShowWrite(false)
    },
    onError: (e: Error) => setWriteError(e.message),
  })

  const { data: _graphData } = useQuery({
    queryKey: ['graphData', indexId],
    queryFn: () => qubicdb.getGraphData(indexId!),
    enabled: !!indexId,
    refetchInterval: 5000,
  })

  const [showGraph, setShowGraph] = useState(true)

  const wakeMutation = useMutation({
    mutationFn: () => qubicdb.wakeIndex(indexId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainState', indexId] })
      setConfirmAction(null)
    },
  })

  const sleepMutation = useMutation({
    mutationFn: () => qubicdb.sleepIndex(indexId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainState', indexId] })
      setConfirmAction(null)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => qubicdb.adminResetIndex(indexId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats', indexId] })
      queryClient.invalidateQueries({ queryKey: ['neurons', indexId] })
      setConfirmAction(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => qubicdb.adminDeleteIndex(indexId!),
    onSuccess: () => navigate('/users'),
  })

  const executeConfirmedAction = () => {
    if (!confirmAction) return
    if (confirmAction === 'delete') deleteMutation.mutate()
    else if (confirmAction === 'reset') resetMutation.mutate()
    else if (confirmAction === 'wake') wakeMutation.mutate()
    else if (confirmAction === 'sleep') sleepMutation.mutate()
  }

  const displayNeurons = searchQuery.length > 2 ? searchResults?.results : neurons?.neurons
  const meta = confirmAction ? ACTION_META[confirmAction] : null
  const parsedSearchMeta = parseMetadataInput(searchMetaRaw)

  return (
    <div className="space-y-6">
      {/* Confirm modal */}
      {confirmAction && meta && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-white">{meta.title}</h3>
              <button onClick={() => { setConfirmAction(null); setConfirmInput('') }} className="ml-auto text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-4">{meta.desc}</p>
            <p className="text-xs text-slate-500 mb-1">Index: <span className="font-mono text-slate-400">{indexId}</span></p>
            {meta.requireType && (
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Type <span className="font-mono text-red-400">DELETE</span> to confirm:</p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  autoFocus
                />
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setConfirmAction(null); setConfirmInput('') }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={meta.requireType ? confirmInput !== 'DELETE' : false}
                className={`px-4 py-2 ${meta.color} hover:opacity-90 disabled:opacity-30 text-white rounded-lg text-sm`}
              >
                Confirm {meta.title}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin warning banner */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-400">
          <strong>Admin view:</strong> Browsing this page triggers brain activity (search, recall, brain state checks go through the worker).
          In a future release, admin reads will use read-only endpoints that do not affect the brain&rsquo;s organic state.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white">{indexId}</h2>
          <p className="text-sm text-slate-400">Brain Inspector</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmAction('wake')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
            title="Force brain to Active state — restarts background daemons"
          >
            <Sun className="w-4 h-4" />
            Wake
          </button>
          <button
            onClick={() => setConfirmAction('sleep')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
            title="Force brain to Sleeping state — triggers consolidation"
          >
            <Moon className="w-4 h-4" />
            Sleep
          </button>
          <button
            onClick={() => setConfirmAction('reset')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2 text-sm"
            title="Wipe all neurons and synapses"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => { setConfirmAction('delete'); setConfirmInput('') }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm"
            title="Permanently delete index and all data"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Neurons</p>
          <p className="text-2xl font-bold text-white">{stats?.neuron_count ?? 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Synapses</p>
          <p className="text-2xl font-bold text-white">{stats?.synapse_count ?? 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Avg Energy</p>
          <p className="text-2xl font-bold text-white">{(stats?.average_energy ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">State</p>
          <p className="text-2xl font-bold text-white capitalize">{brainState?.state ?? 'dormant'}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Invocations</p>
          <p className="text-2xl font-bold text-white">{brainState?.invokeCount ?? 0}</p>
        </div>
      </div>

      {/* Neural Graph Visualization */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-neuron-500" />
            <h3 className="text-lg font-semibold text-white">Neural Network Graph</h3>
          </div>
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="text-sm text-slate-400 hover:text-white"
          >
            {showGraph ? 'Hide' : 'Show'}
          </button>
        </div>
        {showGraph && (
          <div className="p-4">
            <ActivityLog indexId={indexId!} />
          </div>
        )}
      </div>

      {/* Write neuron */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <button
          onClick={() => setShowWrite(!showWrite)}
          className="w-full p-4 flex items-center gap-2 text-left text-slate-300 hover:text-white transition-colors"
        >
          <PenLine className="w-4 h-4 text-neuron-500" />
          <span className="font-medium">Write Memory</span>
          <span className="ml-auto text-xs text-slate-500">{showWrite ? 'collapse' : 'expand'}</span>
        </button>
        {showWrite && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-4">
            <textarea
              value={writeContent}
              onChange={(e) => setWriteContent(e.target.value)}
              placeholder="Memory content..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-neuron-500 resize-none"
            />
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                <Tag className="w-3 h-3 inline mr-1" />
                Metadata <span className="text-slate-500">(key=value, comma-separated — e.g. thread_id=conv-1,role=user)</span>
              </label>
              <input
                type="text"
                value={writeMetaRaw}
                onChange={(e) => setWriteMetaRaw(e.target.value)}
                placeholder="thread_id=conv-1,role=user"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-neuron-500"
              />
              {parseMetadataInput(writeMetaRaw) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(parseMetadataInput(writeMetaRaw)!).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 bg-neuron-900/50 border border-neuron-700 rounded text-xs text-neuron-300 font-mono">{k}={v}</span>
                  ))}
                </div>
              )}
            </div>
            {writeError && <p className="text-xs text-red-400">{writeError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowWrite(false); setWriteContent(''); setWriteMetaRaw(''); setWriteError('') }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => writeMutation.mutate()}
                disabled={!writeContent.trim() || writeMutation.isPending}
                className="px-4 py-2 bg-neuron-600 hover:bg-neuron-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <Send className="w-3 h-3" />
                {writeMutation.isPending ? 'Writing...' : 'Write'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search neurons... (min 3 chars)"
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
          />
          <button
            onClick={() => setShowSearchMeta(!showSearchMeta)}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${
              parsedSearchMeta
                ? 'bg-neuron-900/40 border-neuron-500 text-neuron-400'
                : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
            }`}
            title="Metadata filter"
          >
            <Filter className="w-4 h-4" />
            {parsedSearchMeta ? `${Object.keys(parsedSearchMeta).length} filter${Object.keys(parsedSearchMeta).length > 1 ? 's' : ''}` : 'Filter'}
          </button>
        </div>
        {showSearchMeta && (
          <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Metadata Filter</span>
              <button onClick={() => setShowSearchMeta(false)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            <input
              type="text"
              value={searchMetaRaw}
              onChange={(e) => setSearchMetaRaw(e.target.value)}
              placeholder="thread_id=conv-1,role=assistant"
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-neuron-500"
            />
            {parsedSearchMeta && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(parsedSearchMeta).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 bg-neuron-900/50 border border-neuron-700 rounded text-xs text-neuron-300 font-mono">{k}={v}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchStrict(!searchStrict)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                  searchStrict ? 'bg-neuron-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${searchStrict ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-400">
                {searchStrict ? <span className="text-neuron-400">Strict</span> : 'Soft boost'}
              </span>
              {searchMetaRaw && (
                <button onClick={() => { setSearchMetaRaw(''); setSearchStrict(false) }} className="ml-auto text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Neurons List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {searchQuery.length > 2 ? 'Search Results' : 'All Neurons'}
          </h3>
        </div>
        <div className="divide-y divide-slate-700 max-h-96 overflow-auto">
          {displayNeurons?.map((neuron: Neuron) => {
            const metaEntries = neuron.metadata ? Object.entries(neuron.metadata as Record<string, string>) : []
            return (
              <div key={neuron._id} className="p-4 hover:bg-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white">{neuron.content}</p>
                    {metaEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {metaEntries.map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-neuron-900/50 border border-neuron-800 rounded text-xs text-neuron-300 font-mono">
                            {k}=<span className="text-neuron-200">{v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>ID: {neuron._id.slice(0, 8)}...</span>
                      <span>Depth: {neuron.depth}</span>
                      <span>Access: {neuron.accessCount ?? 0}</span>
                      {neuron.sentimentLabel && neuron.sentimentLabel !== 'neutral' && (
                        <span className="text-slate-500">😶 {neuron.sentimentLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neuron-500"
                        style={{ width: `${neuron.energy * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right">
                      {(neuron.energy * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          {(!displayNeurons || displayNeurons.length === 0) && (
            <div className="p-8 text-center text-slate-400">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No neurons found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
