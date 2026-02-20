import { Activity, Cpu, Users, Trash } from 'lucide-react'
import { useMetricsHistory } from '../hooks/useMetricsHistory'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Metrics() {
  const { history, latest: stats } = useMetricsHistory(30, 2000)

  const totalCreated = stats?.pool?.total_created ?? 0
  const totalEvicted = stats?.pool?.total_evicted ?? 0
  const activeWorkers = stats?.pool?.active_workers ?? 0
  const totalLifecycle = stats?.lifecycle?.total_indexes ?? 0

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-neuron-500" />
            <span className="text-slate-400">Total Workers Created</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalCreated}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-blue-500" />
            <span className="text-slate-400">Active Workers</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeWorkers}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-slate-400">Lifecycle Indexes</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalLifecycle}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Trash className="w-5 h-5 text-yellow-500" />
            <span className="text-slate-400">Total Evicted</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalEvicted}</p>
        </div>
      </div>

      {history.length < 2 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center text-slate-500">
          Collecting metrics... ({history.length}/2 data points needed)
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Active Workers over time */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Active Workers</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelFormatter={(v) => `Poll #${v}`}
                  />
                  <Area type="monotone" dataKey="activeWorkers" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} name="Active Workers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lifecycle States over time */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Lifecycle States</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelFormatter={(v) => `Poll #${v}`}
                  />
                  <Area type="monotone" dataKey="activeIndexes" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} stackId="1" name="Active" />
                  <Area type="monotone" dataKey="idleIndexes" stroke="#eab308" fill="#eab30820" strokeWidth={2} stackId="1" name="Idle" />
                  <Area type="monotone" dataKey="sleepingIndexes" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} stackId="1" name="Sleeping" />
                  <Area type="monotone" dataKey="dormantIndexes" stroke="#64748b" fill="#64748b20" strokeWidth={2} stackId="1" name="Dormant" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operations per polling interval */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">New Workers Created Per Interval</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelFormatter={(v) => `Poll #${v}`}
                  />
                  <Line type="monotone" dataKey="opsPerInterval" stroke="#a855f7" strokeWidth={2} dot={false} name="Ops" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
