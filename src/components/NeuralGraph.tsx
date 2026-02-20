import { useCallback, useRef, useMemo, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { type GraphNode, type GraphEdge } from '../api/client'

interface NeuralGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
}

interface ForceGraphNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface ForceGraphLink {
  source: string | ForceGraphNode
  target: string | ForceGraphNode
  weight: number
  coFireCount: number
}

export default function NeuralGraph({ 
  nodes, 
  edges, 
  onNodeClick 
}: NeuralGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })

  // Auto-resize based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(400, rect.width - 32),
          height: 400
        })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Center graph when data changes
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50)
      }, 500)
    }
  }, [nodes.length])

  const graphData = useMemo(() => ({
    nodes: nodes.map(n => ({
      ...n,
      val: Math.max(5, n.energy * 20), // Node size based on energy
    })),
    links: edges.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      coFireCount: e.coFireCount,
    })),
  }), [nodes, edges])

  const nodeColor = useCallback((node: ForceGraphNode) => {
    const energy = node.energy ?? 0.5
    const depth = node.depth ?? 0
    
    // Color based on energy and depth
    if (depth === 0) {
      // Root neurons - green gradient based on energy
      const g = Math.floor(150 + energy * 105)
      return `rgb(34, ${g}, 85)`
    } else if (depth === 1) {
      // First-level connections - blue
      const b = Math.floor(150 + energy * 105)
      return `rgb(59, 130, ${b})`
    } else {
      // Deeper neurons - purple
      const r = Math.floor(100 + energy * 55)
      return `rgb(${r}, 80, 200)`
    }
  }, [])

  const linkColor = useCallback((link: ForceGraphLink) => {
    const weight = link.weight ?? 0.5
    // Link color based on synapse weight (stronger = brighter)
    const alpha = 0.3 + weight * 0.7
    return `rgba(100, 200, 255, ${alpha})`
  }, [])

  const linkWidth = useCallback((link: ForceGraphLink) => {
    // Link width based on weight and co-fire count
    const base = 1 + (link.weight ?? 0.5) * 3
    const boost = Math.min(link.coFireCount ?? 0, 10) * 0.2
    return base + boost
  }, [])

  const nodeLabel = useCallback((node: ForceGraphNode) => {
    const content = node.content ?? ''
    const truncated = content.length > 50 ? content.slice(0, 50) + '...' : content
    return `${truncated}\n\nEnergy: ${(node.energy * 100).toFixed(0)}%\nAccess: ${node.accessCount}\nDepth: ${node.depth}`
  }, [])

  const handleNodeClick = useCallback((node: ForceGraphNode) => {
    if (onNodeClick) {
      onNodeClick(node)
    }
    // Center on node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(2, 1000)
    }
  }, [onNodeClick])

  const nodeCanvasObject = useCallback((node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.content?.slice(0, 15) ?? ''
    const fontSize = 10 / globalScale
    const nodeSize = Math.max(4, (node.energy ?? 0.5) * 12)
    
    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI)
    ctx.fillStyle = nodeColor(node)
    ctx.fill()
    
    // Draw glow for high-energy nodes
    if ((node.energy ?? 0) > 0.8) {
      ctx.shadowColor = nodeColor(node)
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1 / globalScale
    ctx.stroke()
    
    // Draw label if zoomed in enough
    if (globalScale > 0.8) {
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'white'
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + nodeSize + fontSize)
    }
  }, [nodeColor])

  if (nodes.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700"
        style={{ width: '100%', height: 400 }}
      >
        <div className="text-center text-slate-400">
          <p>No neural connections yet</p>
          <p className="text-sm mt-2">Search or add neurons to see the graph</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0f172a"
        nodeLabel={nodeLabel}
        nodeColor={nodeColor}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.2}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
      <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
        {nodes.length} neurons • {edges.length} synapses
      </div>
    </div>
  )
}
