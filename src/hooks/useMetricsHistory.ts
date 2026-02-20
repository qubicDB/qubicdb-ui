import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { qubicdb } from '../api/client'

export interface MetricsPoint {
  time: number
  activeWorkers: number
  totalCreated: number
  totalEvicted: number
  opsPerInterval: number
  activeIndexes: number
  idleIndexes: number
  sleepingIndexes: number
  dormantIndexes: number
}

export function useMetricsHistory(maxPoints = 30, intervalMs = 3000) {
  const [history, setHistory] = useState<MetricsPoint[]>([])
  const prevCreated = useRef<number | null>(null)
  const tickRef = useRef(0)

  const { data: stats } = useQuery({
    queryKey: ['globalStats'],
    queryFn: () => qubicdb.getGlobalStats(),
    refetchInterval: intervalMs,
  })

  useEffect(() => {
    if (!stats) return

    const totalCreated = stats.pool?.total_created ?? 0
    const ops =
      prevCreated.current !== null
        ? Math.max(0, totalCreated - prevCreated.current)
        : 0
    prevCreated.current = totalCreated

    const point: MetricsPoint = {
      time: tickRef.current++,
      activeWorkers: stats.pool?.active_workers ?? 0,
      totalCreated,
      totalEvicted: stats.pool?.total_evicted ?? 0,
      opsPerInterval: ops,
      activeIndexes: stats.lifecycle?.state_distribution?.active ?? 0,
      idleIndexes: stats.lifecycle?.state_distribution?.idle ?? 0,
      sleepingIndexes: stats.lifecycle?.state_distribution?.sleeping ?? 0,
      dormantIndexes: stats.lifecycle?.state_distribution?.dormant ?? 0,
    }

    setHistory((prev) => {
      const next = [...prev, point]
      return next.length > maxPoints ? next.slice(-maxPoints) : next
    })
  }, [stats, maxPoints])

  return { history, latest: stats }
}
