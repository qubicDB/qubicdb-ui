import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, RefreshCw, Save, CheckCircle, XCircle, ChevronDown, ChevronRight, AlertTriangle, Info } from 'lucide-react'
import { qubicdb, type ConfigSetResponse } from '../api/client'

interface FieldDef {
  key: string
  label: string
  type: 'duration' | 'bool' | 'int' | 'float' | 'string'
  hint?: string
  defaultValue: string
  description: string
  warning?: string
}

interface SectionMeta {
  description: string
  warning?: string
  fields: FieldDef[]
}

const SECTION_META: Record<string, SectionMeta> = {
  lifecycle: {
    description: 'Brain state transition thresholds. Must satisfy: idleThreshold < sleepThreshold < dormantThreshold.',
    fields: [
      { key: 'idleThreshold', label: 'Idle Threshold', type: 'duration', hint: 'e.g. 30s, 5m', defaultValue: '30s', description: 'Time after last activity before brain enters Idle state.' },
      { key: 'sleepThreshold', label: 'Sleep Threshold', type: 'duration', hint: 'e.g. 30m, 1h', defaultValue: '5m', description: 'Time in Idle before brain enters Sleeping state (triggers consolidation).' },
      { key: 'dormantThreshold', label: 'Dormant Threshold', type: 'duration', hint: 'e.g. 24h', defaultValue: '30m', description: 'Time in Sleeping before brain enters Dormant state (evicted from memory).' },
    ],
  },
  daemons: {
    description: 'Background daemon cycle intervals. These run per-brain for active/idle indexes.',
    warning: 'Intervals below 5s are very aggressive and will increase CPU/IO load. Proceed only if you know what you are doing.',
    fields: [
      { key: 'decayInterval', label: 'Decay Interval', type: 'duration', hint: 'e.g. 1m, 5m', defaultValue: '1m', description: 'How often neuron energy decays. Lower = memories fade faster.' },
      { key: 'consolidateInterval', label: 'Consolidate Interval', type: 'duration', hint: 'e.g. 5m', defaultValue: '5m', description: 'How often high-energy neurons consolidate to deeper layers.' },
      { key: 'pruneInterval', label: 'Prune Interval', type: 'duration', hint: 'e.g. 10m', defaultValue: '10m', description: 'How often dead neurons/synapses are removed.' },
      { key: 'persistInterval', label: 'Persist Interval', type: 'duration', hint: 'e.g. 2m', defaultValue: '1m', description: 'How often in-memory state is flushed to disk (.nrdb files).' },
      { key: 'reorgInterval', label: 'Reorg Interval', type: 'duration', hint: 'e.g. 15m', defaultValue: '15m', description: 'How often the spatial matrix is reorganised for better locality.' },
    ],
  },
  worker: {
    description: 'Worker pool settings for per-index brain goroutines.',
    fields: [
      { key: 'maxIdleTime', label: 'Max Idle Time', type: 'duration', hint: 'e.g. 30m, 1h', defaultValue: '30m', description: 'How long an idle worker stays in memory before eviction.' },
    ],
  },
  registry: {
    description: 'UUID registry guard. When enabled, only pre-registered UUIDs can access brain operations.',
    fields: [
      { key: 'enabled', label: 'Enabled', type: 'bool', defaultValue: 'false', description: 'When true, clients must register their UUID via /v1/registry before using other endpoints.' },
    ],
  },
  matrix: {
    description: 'Organic memory matrix bounds per brain instance.',
    fields: [
      { key: 'maxNeurons', label: 'Max Neurons', type: 'int', hint: 'e.g. 100000', defaultValue: '1000000', description: 'Hard cap on neurons per brain.', warning: 'Values > 10,000,000 will consume significant memory. Proceed only if you know what you are doing.' },
    ],
  },
  security: {
    description: 'Network security, CORS, and request limits.',
    fields: [
      { key: 'allowedOrigins', label: 'Allowed Origins', type: 'string', hint: 'e.g. http://localhost:6060 or https://example.com', defaultValue: 'http://localhost:6060', description: "CORS allowed origins. '*' is blocked when admin mode is enabled." },
      { key: 'maxRequestBody', label: 'Max Request Body (bytes)', type: 'int', hint: 'e.g. 1048576 (1MB)', defaultValue: '1048576', description: 'Maximum request body size in bytes. 0 = unlimited.' },
    ],
  },
  vector: {
    description: 'Embedding layer for hybrid semantic + lexical search. Requires libllama_go shared library.',
    fields: [
      { key: 'alpha', label: 'Alpha (vector weight)', type: 'float', hint: '0.0 – 1.0', defaultValue: '0.6', description: 'Weight of vector score in hybrid search. 0.0 = pure lexical, 1.0 = pure semantic.', warning: 'Only effective when vector layer is enabled and model is loaded.' },
    ],
  },
}

// Read-only sections (no editable fields)
const READONLY_SECTIONS = ['server', 'admin', 'storage']

export default function Config() {
  const queryClient = useQueryClient()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['lifecycle', 'daemons']))
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [lastResult, setLastResult] = useState<ConfigSetResponse | null>(null)

  const { data: config, isLoading, isError } = useQuery({
    queryKey: ['config'],
    queryFn: () => qubicdb.getConfig(),
    refetchInterval: 10000,
  })

  const setMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => qubicdb.setConfig(patch),
    onSuccess: (data) => {
      setLastResult(data)
      setEditValues({})
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    onError: () => {
      setLastResult(null)
    },
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleFieldChange = (section: string, field: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [`${section}.${field}`]: value }))
  }

  const handleSaveField = (section: string, field: string, fieldType: string) => {
    const key = `${section}.${field}`
    const rawValue = editValues[key]
    if (rawValue === undefined || rawValue === '') return

    let value: unknown = rawValue
    if (fieldType === 'bool') value = rawValue === 'true'
    else if (fieldType === 'int') value = parseInt(rawValue, 10)
    else if (fieldType === 'float') value = parseFloat(rawValue)

    const patch = { [section]: { [field]: value } }
    setMutation.mutate(patch)
  }

  const handleSaveAll = () => {
    const patch: Record<string, Record<string, unknown>> = {}
    for (const [compositeKey, rawValue] of Object.entries(editValues)) {
      if (rawValue === '') continue
      const [section, field] = compositeKey.split('.')
      if (!patch[section]) patch[section] = {}
      const fieldDef = SECTION_META[section]?.fields.find((f: FieldDef) => f.key === field)
      if (!fieldDef) continue
      let value: unknown = rawValue
      if (fieldDef.type === 'bool') value = rawValue === 'true'
      else if (fieldDef.type === 'int') value = parseInt(rawValue, 10)
      else if (fieldDef.type === 'float') value = parseFloat(rawValue)
      patch[section][field] = value
    }
    if (Object.keys(patch).length > 0) {
      setMutation.mutate(patch)
    }
  }

  const hasEdits = Object.values(editValues).some((v) => v !== '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-neuron-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError || !config) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300">
        Failed to load configuration
      </div>
    )
  }

  const sections = Object.keys(config)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-neuron-500" />
          <h2 className="text-xl font-semibold text-white">Runtime Configuration</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['config'] })}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {hasEdits && (
            <button
              onClick={handleSaveAll}
              disabled={setMutation.isPending}
              className="px-4 py-2 bg-neuron-600 hover:bg-neuron-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {setMutation.isPending ? 'Saving...' : 'Save All Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Result banner */}
      {lastResult && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          lastResult.ok
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          {lastResult.ok ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <XCircle className="w-5 h-5 mt-0.5" />}
          <div>
            <p className="font-medium">
              {lastResult.ok ? `${lastResult.count} parameter(s) updated` : 'Update failed'}
            </p>
            {lastResult.changed && (
              <p className="text-sm mt-1 opacity-80">{lastResult.changed.join(', ')}</p>
            )}
            {lastResult.rejected && lastResult.rejected.length > 0 && (
              <p className="text-sm mt-1 text-yellow-400">Rejected: {lastResult.rejected.join(', ')}</p>
            )}
          </div>
          <button onClick={() => setLastResult(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Config sections */}
      {sections.map((section) => {
        const sectionData = config[section] as Record<string, unknown>
        const isExpanded = expandedSections.has(section)
        const isEditable = !READONLY_SECTIONS.includes(section)
        const meta = SECTION_META[section]
        const editableFields = meta?.fields ?? []

        return (
          <div key={section} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection(section)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <h3 className="text-lg font-semibold text-white capitalize">{section}</h3>
                {!isEditable && (
                  <span className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded">read-only</span>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-700 p-4 space-y-4">
                {/* Section description */}
                {meta && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">{meta.description}</p>
                    {meta.warning && (
                      <div className="flex items-start gap-2 p-2 bg-yellow-900/20 border border-yellow-700/40 rounded text-xs text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{meta.warning}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4">
                  {Object.entries(sectionData ?? {}).map(([key, value]) => {
                    const fieldDef = editableFields.find((f: FieldDef) => f.key === key)
                    const compositeKey = `${section}.${key}`
                    const editValue = editValues[compositeKey]
                    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-4">
                          <label className="w-48 text-sm text-slate-400 font-mono shrink-0">{key}</label>
                          {fieldDef ? (
                            <div className="flex items-center gap-2 flex-1">
                              {fieldDef.type === 'bool' ? (
                                <select
                                  value={editValue ?? displayValue}
                                  onChange={(e) => handleFieldChange(section, key, e.target.value)}
                                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-neuron-500 focus:outline-none"
                                >
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={fieldDef.hint ?? displayValue}
                                  value={editValue ?? ''}
                                  onChange={(e) => handleFieldChange(section, key, e.target.value)}
                                  className="flex-1 max-w-xs px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-neuron-500 focus:outline-none"
                                />
                              )}
                              <span className="text-xs text-slate-500 shrink-0">
                                current: <span className="text-slate-300">{displayValue}</span>
                              </span>
                              <span className="text-xs text-slate-600 shrink-0">
                                default: {fieldDef.defaultValue}
                              </span>
                              {editValue && editValue !== '' && (
                                <button
                                  onClick={() => handleSaveField(section, key, fieldDef.type)}
                                  disabled={setMutation.isPending}
                                  className="px-2 py-1 bg-neuron-600 hover:bg-neuron-700 text-white rounded text-xs disabled:opacity-50 shrink-0"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-white">{displayValue}</span>
                          )}
                        </div>
                        {/* Field description + warning */}
                        {fieldDef && (
                          <div className="ml-52 space-y-1">
                            <p className="text-xs text-slate-500 flex items-start gap-1">
                              <Info className="w-3 h-3 mt-0.5 shrink-0" />
                              {fieldDef.description}
                            </p>
                            {fieldDef.warning && (
                              <p className="text-xs text-yellow-500/80 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                {fieldDef.warning}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
