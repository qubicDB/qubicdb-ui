import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { qubicdb, type ActivityEvent } from '../api/client'

interface ActivityLogProps {
  indexId: string
}

const typeColors: Record<string, string> = {
  neuron: 'text-green-400',
  synapse: 'text-cyan-400',
  search: 'text-yellow-400',
  decay: 'text-orange-400',
  consolidate: 'text-purple-400',
  system: 'text-slate-400',
}

const typeIcons: Record<string, string> = {
  neuron: '◉',
  synapse: '⟷',
  search: '⌕',
  decay: '↓',
  consolidate: '⇄',
  system: '●',
}

export default function ActivityLog({ indexId }: ActivityLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logs, setLogs] = useState<ActivityEvent[]>([])

  // Fetch activity log
  const { data: activity } = useQuery({
    queryKey: ['activity', indexId],
    queryFn: () => qubicdb.getActivity(indexId),
    refetchInterval: 1000,
  })

  // Update logs when activity changes
  useEffect(() => {
    if (activity?.events) {
      setLogs(activity.events)
    }
  }, [activity])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Handle scroll - disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-700 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-slate-400 text-xs ml-2">brain-activity ~ {indexId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${autoScroll ? 'text-green-400' : 'text-slate-500'}`}>
            {autoScroll ? '● live' : '○ paused'}
          </span>
          <button
            onClick={() => setAutoScroll(true)}
            className={`text-xs px-2 py-0.5 rounded ${autoScroll ? 'bg-slate-700 text-slate-500' : 'bg-green-600 text-white'}`}
            disabled={autoScroll}
          >
            Resume
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-auto p-4 space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500">
            <p>$ waiting for brain activity...</p>
            <p className="animate-pulse">_</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 hover:bg-slate-800/50 px-1 -mx-1 rounded">
              <span className="text-slate-600 shrink-0">{formatTime(log.timestamp)}</span>
              <span className={`shrink-0 ${typeColors[log.type] ?? 'text-slate-400'}`}>
                {typeIcons[log.type] ?? '●'}
              </span>
              <span className={`shrink-0 ${typeColors[log.type] ?? 'text-slate-400'}`}>
                [{log.type.toUpperCase().padEnd(10)}]
              </span>
              <span className="text-slate-300">{log.action}</span>
              {log.details && (
                <span className="text-slate-500 truncate">{log.details}</span>
              )}
            </div>
          ))
        )}
        {autoScroll && logs.length > 0 && (
          <div className="text-green-400 animate-pulse">_</div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-slate-700 bg-slate-900 flex justify-between text-xs text-slate-500">
        <span>{logs.length} events</span>
        <span>scroll up to pause • scroll down to resume</span>
      </div>
    </div>
  )
}
