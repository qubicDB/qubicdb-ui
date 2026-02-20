import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, Send, Brain, Zap, X, Filter } from 'lucide-react'
import { qubicdb, type Neuron } from '../api/client'

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

export default function Query() {
  const [indexId, setIndexId] = useState('')
  const [query, setQuery] = useState('')
  const [depth, setDepth] = useState(2)
  const [limit, setLimit] = useState(20)
  const [metadataRaw, setMetadataRaw] = useState('')
  const [strict, setStrict] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [results, setResults] = useState<Neuron[]>([])

  const searchMutation = useMutation({
    mutationFn: () => {
      const metadata = parseMetadataInput(metadataRaw)
      return qubicdb.search(indexId, query, depth, limit, metadata, strict)
    },
    onSuccess: (data) => setResults(data.results),
  })

  const contextMutation = useMutation({
    mutationFn: () => qubicdb.getContext(indexId, query),
  })

  const handleSearch = () => {
    if (indexId && query) {
      searchMutation.mutate()
    }
  }

  const handleContext = () => {
    if (indexId && query) {
      contextMutation.mutate()
    }
  }

  const parsedMeta = parseMetadataInput(metadataRaw)
  const metaCount = parsedMeta ? Object.keys(parsedMeta).length : 0

  return (
    <div className="space-y-6">
      {/* Query Form */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Query Brain</h3>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-sm text-slate-400 mb-2">Index ID</label>
            <input
              type="text"
              value={indexId}
              onChange={(e) => setIndexId(e.target.value)}
              placeholder="index_id"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Depth</label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value))}
              min={1}
              max={10}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              min={1}
              max={100}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
            />
          </div>
        </div>

        <div className="flex gap-4 mb-3">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search query..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm border transition-colors ${
              metaCount > 0
                ? 'bg-neuron-900/40 border-neuron-500 text-neuron-400'
                : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'
            }`}
            title="Metadata filter"
          >
            <Filter className="w-4 h-4" />
            {metaCount > 0 ? `${metaCount} filter${metaCount > 1 ? 's' : ''}` : 'Filter'}
          </button>
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !indexId || !query}
            className="px-6 py-3 bg-neuron-600 hover:bg-neuron-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button
            onClick={handleContext}
            disabled={contextMutation.isPending || !indexId || !query}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Context
          </button>
        </div>

        {/* Metadata filter panel */}
        {showMetadata && (
          <div className="mt-3 p-4 bg-slate-700/50 border border-slate-600 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 font-medium">Metadata Filter</span>
              <button onClick={() => setShowMetadata(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Key=value pairs, comma-separated
                <span className="ml-2 text-slate-500">e.g. thread_id=conv-1,role=user</span>
              </label>
              <input
                type="text"
                value={metadataRaw}
                onChange={(e) => setMetadataRaw(e.target.value)}
                placeholder="thread_id=conv-1,role=assistant"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-neuron-500"
              />
            </div>
            {parsedMeta && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(parsedMeta).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 bg-neuron-900/50 border border-neuron-700 rounded text-xs text-neuron-300 font-mono">
                    {k}={v}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStrict(!strict)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  strict ? 'bg-neuron-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${strict ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-300">
                {strict ? (
                  <><span className="text-neuron-400 font-medium">Strict</span> — only neurons matching ALL keys</>
                ) : (
                  <><span className="text-slate-400 font-medium">Soft boost</span> — matching neurons ranked higher</>
                )}
              </span>
            </div>
            {metadataRaw && (
              <button
                onClick={() => { setMetadataRaw(''); setStrict(false) }}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Context Result */}
      {contextMutation.data && (
        <div className="bg-slate-800 rounded-xl p-6 border border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">LLM Context Assembly</h3>
            <span className="text-sm text-slate-400">
              {contextMutation.data.neuronsUsed} neurons used
            </span>
          </div>
          <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-auto">
            {contextMutation.data.context}
          </pre>
        </div>
      )}

      {/* Search Results */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Search Results</h3>
          <span className="text-sm text-slate-400">{results.length} results</span>
        </div>
        <div className="divide-y divide-slate-700 max-h-96 overflow-auto">
          {results.map((neuron, index) => (
            <div key={neuron._id} className="p-4 hover:bg-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-neuron-600/20 flex items-center justify-center text-neuron-500 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white">{neuron.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {(neuron.energy * 100).toFixed(0)}%
                    </span>
                    <span>Depth: {neuron.depth}</span>
                    <span>Fires: {neuron.fireCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results yet. Enter a query and click Search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
