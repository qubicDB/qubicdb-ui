import { useEffect, useRef, useState } from 'react'
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape'
import { type GraphNode, type GraphEdge } from '../api/client'

interface NeoGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
}

export default function NeoGraph({ nodes, edges, onNodeClick }: NeoGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    // Convert data to Cytoscape format
    const elements = [
      ...nodes.map(n => ({
        data: {
          id: n.id,
          label: n.content?.slice(0, 25) + (n.content && n.content.length > 25 ? '...' : ''),
          fullContent: n.content,
          energy: n.energy ?? 1,
          accessCount: n.accessCount ?? 0,
          depth: n.depth ?? 0,
        }
      })),
      ...edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          weight: e.weight,
          coFireCount: e.coFireCount,
        }
      }))
    ]

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // Node style - Neo4j like
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => {
              const energy = ele.data('energy') as number
              // Green (high) to orange (low)
              if (energy > 0.8) return '#22c55e'
              if (energy > 0.5) return '#84cc16'
              if (energy > 0.3) return '#eab308'
              return '#f97316'
            },
            'width': (ele: NodeSingular) => 40 + (ele.data('accessCount') as number) * 3,
            'height': (ele: NodeSingular) => 40 + (ele.data('accessCount') as number) * 3,
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '10px',
            'color': '#94a3b8',
            'text-margin-y': 8,
            'border-width': 3,
            'border-color': '#1e293b',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
          }
        },
        // Selected node
        {
          selector: 'node:selected',
          style: {
            'border-color': '#3b82f6',
            'border-width': 4,
            'background-color': '#3b82f6',
          }
        },
        // Hover
        {
          selector: 'node:active',
          style: {
            'overlay-color': '#3b82f6',
            'overlay-padding': 10,
            'overlay-opacity': 0.2,
          }
        },
        // Edge style - Neo4j like arrows
        {
          selector: 'edge',
          style: {
            'width': (ele: EdgeSingular) => 1 + (ele.data('weight') as number) * 4,
            'line-color': (ele: EdgeSingular) => {
              const weight = ele.data('weight') as number
              if (weight > 0.7) return '#22d3ee'
              if (weight > 0.4) return '#67e8f9'
              return '#a5f3fc'
            },
            'opacity': (ele: EdgeSingular) => 0.4 + (ele.data('weight') as number) * 0.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': (ele: EdgeSingular) => {
              const weight = ele.data('weight') as number
              if (weight > 0.7) return '#22d3ee'
              if (weight > 0.4) return '#67e8f9'
              return '#a5f3fc'
            },
            'arrow-scale': 0.8,
          }
        },
        // Selected edge
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#f472b6',
            'target-arrow-color': '#f472b6',
            'width': 4,
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
        edgeElasticity: () => 100,
        gravity: 0.25,
        numIter: 1000,
        padding: 50,
      },
      // Interaction
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const nodeData = nodes.find(n => n.id === node.id())
      if (nodeData) {
        setSelectedNode(nodeData)
        if (onNodeClick) onNodeClick(nodeData)
      }
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null)
      }
    })

    // Fit to viewport
    cy.fit(undefined, 50)

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [nodes, edges, onNodeClick])

  // Control functions
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)
  const handleFit = () => cyRef.current?.fit(undefined, 50)
  const handleCenter = () => cyRef.current?.center()

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700 h-[500px]">
        <div className="text-center text-slate-400">
          <p className="text-lg">No neurons yet</p>
          <p className="text-sm mt-2">Add neurons and search to build connections</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Graph container */}
      <div ref={containerRef} className="w-full h-[500px]" />

      {/* Controls - Neo4j style */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 bg-slate-800 rounded-lg p-1 border border-slate-600">
        <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded" title="Zoom In">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
          </svg>
        </button>
        <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded" title="Zoom Out">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" />
          </svg>
        </button>
        <div className="border-t border-slate-600 my-1" />
        <button onClick={handleFit} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded" title="Fit to View">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
        <button onClick={handleCenter} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded" title="Center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 rounded px-3 py-1.5 text-xs text-slate-400 border border-slate-600">
        {nodes.length} nodes • {edges.length} relationships
      </div>

      {/* Selected node panel - Neo4j style */}
      {selectedNode && (
        <div className="absolute top-4 left-4 bg-slate-800 rounded-lg border border-slate-600 w-72 shadow-xl">
          <div className="px-4 py-3 border-b border-slate-600 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Neuron</span>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
          </div>
          <div className="p-4">
            <p className="text-white text-sm mb-4 leading-relaxed">{selectedNode.content}</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">energy</span>
                <span className="text-cyan-400 font-mono">{((selectedNode.energy ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">accessCount</span>
                <span className="text-cyan-400 font-mono">{selectedNode.accessCount ?? 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">depth</span>
                <span className="text-cyan-400 font-mono">{selectedNode.depth ?? 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">connections</span>
                <span className="text-cyan-400 font-mono">
                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
