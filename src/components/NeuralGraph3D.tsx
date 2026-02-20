import { useCallback, useRef, useEffect, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { type GraphNode, type GraphEdge } from '../api/client'
import * as THREE from 'three'

interface NeuralGraph3DProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
}

interface ForceGraphNode extends GraphNode {
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
  __threeObj?: THREE.Mesh
}

export default function NeuralGraph3D({ 
  nodes, 
  edges, 
  onNodeClick 
}: NeuralGraph3DProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)

  // Auto-resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(400, rect.width),
          height: 500
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Auto-rotate camera
  useEffect(() => {
    if (!fgRef.current || !autoRotate) return
    
    let angle = 0
    const distance = 300
    const interval = setInterval(() => {
      angle += 0.005
      const x = distance * Math.sin(angle)
      const z = distance * Math.cos(angle)
      fgRef.current?.cameraPosition({ x, y: 100, z })
    }, 50)
    
    return () => clearInterval(interval)
  }, [autoRotate])

  // Center on data change
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50)
      }, 1000)
    }
  }, [nodes.length])

  const graphData = {
    nodes: nodes.map(n => ({
      ...n,
      // Use actual 3D positions from backend
      fx: n.position?.[0] ? n.position[0] * 100 : undefined,
      fy: n.position?.[1] ? n.position[1] * 100 : undefined,
      fz: n.position?.[2] ? n.position[2] * 100 : undefined,
    })),
    links: edges.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      coFireCount: e.coFireCount,
    })),
  }

  // Node color based on energy and depth
  const getNodeColor = useCallback((node: ForceGraphNode) => {
    const energy = node.energy ?? 0.5
    const depth = node.depth ?? 0
    const isSelected = selectedNode === node.id
    
    if (isSelected) return '#ffffff'
    
    // Energy affects brightness, depth affects hue
    if (depth === 0) {
      // Surface neurons - green to yellow based on energy
      const r = Math.floor(50 + (1 - energy) * 200)
      const g = Math.floor(200 + energy * 55)
      return `rgb(${r}, ${g}, 80)`
    } else if (depth === 1) {
      // Consolidated - blue
      const b = Math.floor(150 + energy * 105)
      return `rgb(80, 150, ${b})`
    } else {
      // Deep memory - purple
      const r = Math.floor(120 + energy * 80)
      return `rgb(${r}, 80, 200)`
    }
  }, [selectedNode])

  // Node size based on access count and energy
  const getNodeSize = useCallback((node: ForceGraphNode) => {
    const baseSize = 4
    const accessBonus = Math.min((node.accessCount ?? 0) / 5, 3)
    const energyBonus = (node.energy ?? 0.5) * 2
    return baseSize + accessBonus + energyBonus
  }, [])

  // Link color based on weight
  const getLinkColor = useCallback((link: { weight?: number; coFireCount?: number }) => {
    const weight = link.weight ?? 0.5
    // Strong connections are cyan, weak are dim
    const alpha = 0.3 + weight * 0.7
    const brightness = Math.floor(100 + weight * 155)
    return `rgba(${brightness}, 220, 255, ${alpha})`
  }, [])

  // Link width based on weight and co-fire count
  const getLinkWidth = useCallback((link: { weight?: number; coFireCount?: number }) => {
    const weight = link.weight ?? 0.5
    const coFire = Math.min(link.coFireCount ?? 1, 15)
    return 0.5 + weight * 2 + coFire * 0.1
  }, [])

  // Animated link particles (data flow visualization)
  const getLinkParticles = useCallback((link: { weight?: number; coFireCount?: number }) => {
    const coFire = link.coFireCount ?? 0
    return Math.min(Math.floor(coFire / 3) + 1, 5)
  }, [])

  const handleNodeClick = useCallback((node: ForceGraphNode) => {
    setSelectedNode(prev => prev === node.id ? null : node.id)
    setAutoRotate(false)
    
    if (onNodeClick) {
      onNodeClick(node)
    }
    
    // Focus on node
    if (fgRef.current) {
      const distance = 100
      const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0)
      fgRef.current.cameraPosition(
        { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio },
        node,
        1000
      )
    }
  }, [onNodeClick])

  // Custom node object with glow
  const nodeThreeObject = useCallback((node: ForceGraphNode) => {
    const size = getNodeSize(node)
    const color = getNodeColor(node)
    
    // Main sphere
    const geometry = new THREE.SphereGeometry(size, 16, 16)
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    })
    const sphere = new THREE.Mesh(geometry, material)
    
    // Outer glow for high-energy nodes
    if ((node.energy ?? 0) > 0.8) {
      const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2,
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      sphere.add(glow)
    }
    
    return sphere
  }, [getNodeColor, getNodeSize])

  // Node label
  const nodeLabel = useCallback((node: ForceGraphNode) => {
    const content = node.content ?? ''
    const truncated = content.length > 60 ? content.slice(0, 60) + '...' : content
    return `
      <div style="background: rgba(15,23,42,0.95); padding: 12px; border-radius: 8px; border: 1px solid #334155; max-width: 300px;">
        <div style="color: #22c55e; font-weight: bold; margin-bottom: 8px;">${truncated}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
          <span style="color: #94a3b8;">Energy:</span>
          <span style="color: #fff;">${((node.energy ?? 0) * 100).toFixed(1)}%</span>
          <span style="color: #94a3b8;">Access:</span>
          <span style="color: #fff;">${node.accessCount ?? 0}</span>
          <span style="color: #94a3b8;">Depth:</span>
          <span style="color: #fff;">${node.depth ?? 0}</span>
        </div>
      </div>
    `
  }, [])

  if (nodes.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700"
        style={{ width: '100%', height: 500 }}
      >
        <div className="text-center text-slate-400">
          <p className="text-lg">No neural connections yet</p>
          <p className="text-sm mt-2">Add neurons and search to see the brain form</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            autoRotate ? 'bg-neuron-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {autoRotate ? '⟳ Rotating' : '⟳ Rotate'}
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showLabels ? 'bg-neuron-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Labels
        </button>
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          ⊡ Fit
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="text-slate-400 font-medium mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-slate-300">High Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-slate-300">Decaying</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 bg-cyan-400"></div>
            <span className="text-slate-300">Strong Synapse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 bg-cyan-400/30"></div>
            <span className="text-slate-300">Weak Synapse</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 z-10 bg-slate-800/90 rounded-lg px-3 py-2 text-xs text-slate-400">
        {nodes.length} neurons • {edges.length} synapses
      </div>

      {/* 3D Graph */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0f172a"
        showNavInfo={false}
        nodeLabel={showLabels ? nodeLabel : undefined}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkOpacity={0.8}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#22c55e'}
        linkCurvature={0.1}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        controlType="orbit"
      />

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute top-4 left-4 z-10 bg-slate-800/95 rounded-lg p-4 max-w-sm border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neuron-400 font-medium text-sm">Selected Neuron</span>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          {(() => {
            const node = nodes.find(n => n.id === selectedNode)
            if (!node) return null
            return (
              <div>
                <p className="text-white text-sm mb-3">{node.content}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-700/50 rounded p-2">
                    <span className="text-slate-400">Energy</span>
                    <div className="text-white font-mono">{((node.energy ?? 0) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <span className="text-slate-400">Access</span>
                    <div className="text-white font-mono">{node.accessCount ?? 0}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <span className="text-slate-400">Depth</span>
                    <div className="text-white font-mono">{node.depth ?? 0}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <span className="text-slate-400">Synapses</span>
                    <div className="text-white font-mono">
                      {edges.filter(e => e.source === selectedNode || e.target === selectedNode).length}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
