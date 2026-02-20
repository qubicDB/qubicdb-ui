import { useQuery } from '@tanstack/react-query'
import { Brain, Users, Zap, Network, Activity, Clock } from 'lucide-react'
import { qubicdb } from '../api/client'
import { useMetricsHistory } from '../hooks/useMetricsHistory'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ icon: Icon, label, value, color }: { 
  icon: any
  label: string
  value: string | number
  color: string 
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => qubicdb.health(),
    refetchInterval: 5000,
  })

  const { history, latest: stats } = useMetricsHistory(20, 3000)

  const { data: daemonStatus } = useQuery({
    queryKey: ['daemonStatus'],
    queryFn: () => qubicdb.adminGetDaemonStatus(),
    refetchInterval: 5000,
  })

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Indexes"
          value={health?.activeIndexes ?? '-'}
          color="bg-blue-600"
        />
        <StatCard
          icon={Brain}
          label="Total Workers"
          value={stats?.pool?.active_workers ?? '-'}
          color="bg-neuron-600"
        />
        <StatCard
          icon={Zap}
          label="Total Created"
          value={stats?.pool?.total_created ?? '-'}
          color="bg-yellow-600"
        />
        <StatCard
          icon={Network}
          label="Lifecycle Indexes"
          value={stats?.lifecycle?.total_indexes ?? '-'}
          color="bg-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Activity</h3>
            <Activity className="w-5 h-5 text-neuron-500" />
          </div>
          {history.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              Collecting data... ({history.length}/2 points)
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(v) => `Poll #${v}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeWorkers"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Active Workers"
                  />
                  <Line
                    type="monotone"
                    dataKey="opsPerInterval"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Ops / interval"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Index States */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Index States</h3>
            <Clock className="w-5 h-5 text-neuron-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${(stats?.lifecycle?.state_distribution?.active ?? 0) * 10}%` }}
                  />
                </div>
                <span className="text-white font-mono w-8">{stats?.lifecycle?.state_distribution?.active ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Idle</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500" 
                    style={{ width: `${(stats?.lifecycle?.state_distribution?.idle ?? 0) * 10}%` }}
                  />
                </div>
                <span className="text-white font-mono w-8">{stats?.lifecycle?.state_distribution?.idle ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sleeping</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${(stats?.lifecycle?.state_distribution?.sleeping ?? 0) * 10}%` }}
                  />
                </div>
                <span className="text-white font-mono w-8">{stats?.lifecycle?.state_distribution?.sleeping ?? 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dormant</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-500" 
                    style={{ width: `${(stats?.lifecycle?.state_distribution?.dormant ?? 0) * 10}%` }}
                  />
                </div>
                <span className="text-white font-mono w-8">{stats?.lifecycle?.state_distribution?.dormant ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
            <p className="text-sm text-slate-400">API Server</p>
            <p className="text-white font-medium">{health?.status ?? 'Unknown'}</p>
          </div>
          {['decay', 'consolidate', 'prune', 'reorg'].map((d) => {
            const status = (daemonStatus as Record<string, unknown>)?.daemons as Record<string, string> | undefined
            const st = status?.[d] ?? 'unknown'
            return (
              <div key={d} className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${st === 'running' ? 'bg-green-500' : st === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'}`} />
                <p className="text-sm text-slate-400 capitalize">{d}</p>
                <p className="text-white font-medium capitalize">{st}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
