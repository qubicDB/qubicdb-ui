import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Save, Play, Pause, RotateCcw, Database, Cog } from 'lucide-react'
import { qubicdb } from '../api/client'
import { useAuthStore } from '../stores/auth'

export default function Settings() {
  const { serverUrl, setServerUrl } = useAuthStore()
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl)

  const gcMutation = useMutation({
    mutationFn: () => qubicdb.adminForceGC(),
  })

  const persistMutation = useMutation({
    mutationFn: () => qubicdb.adminForcePersist(),
  })

  const pauseMutation = useMutation({
    mutationFn: () => qubicdb.adminPauseDaemons(),
  })

  const resumeMutation = useMutation({
    mutationFn: () => qubicdb.adminResumeDaemons(),
  })

  const handleSaveServerUrl = () => {
    setServerUrl(localServerUrl)
  }

  return (
    <div className="space-y-6">
      {/* Server Connection */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-neuron-500" />
          <h3 className="text-lg font-semibold text-white">Server Connection</h3>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            value={localServerUrl}
            onChange={(e) => setLocalServerUrl(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neuron-500"
            placeholder="http://localhost:6060"
          />
          <button
            onClick={handleSaveServerUrl}
            className="px-6 py-2 bg-neuron-600 hover:bg-neuron-700 text-white rounded-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Daemon Control */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Cog className="w-5 h-5 text-neuron-500" />
          <h3 className="text-lg font-semibold text-white">Daemon Control</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => pauseMutation.mutate()}
            disabled={pauseMutation.isPending}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause Daemons
          </button>
          <button
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Resume Daemons
          </button>
        </div>

        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Daemon Status</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">Decay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">Consolidate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">Prune</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">Reorg</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Actions</h3>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => gcMutation.mutate()}
            disabled={gcMutation.isPending}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Force Garbage Collection
          </button>
          <button
            onClick={() => persistMutation.mutate()}
            disabled={persistMutation.isPending}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            Force Persist All
          </button>
        </div>

        {(gcMutation.isSuccess || persistMutation.isSuccess) && (
          <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
            Operation completed successfully
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">About</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p><strong>QubicDB Console</strong> v1.0.0</p>
          <p>A brain-like memory database for LLMs</p>
          <p className="text-slate-500">
            Designed for persistent, personalized, and dynamically evolving memory.
          </p>
        </div>
      </div>
    </div>
  )
}
