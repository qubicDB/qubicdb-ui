import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { type GraphNode, type GraphEdge } from '../api/client'

interface BrainVizProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
}

interface SimNode extends d3.SimulationNodeDatum, GraphNode {
  x: number
  y: number
  vx?: number
  vy?: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string
  target: SimNode | string
  weight: number
  coFireCount: number
}

export default function BrainViz({ nodes, edges, onNodeClick }: BrainVizProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)

  // Resize handler
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: 500 })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Color scales
  const energyColor = useCallback((energy: number) => {
    // Green (high energy) to red (low energy)
    return d3.interpolateRgb('#22c55e', '#ef4444')(1 - energy)
  }, [])

  const linkColor = useCallback((weight: number) => {
    const alpha = 0.2 + weight * 0.6
    return `rgba(100, 200, 255, ${alpha})`
  }, [])

  // Main D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    // Clear previous
    svg.selectAll('*').remove()

    // Defs for gradients and filters
    const defs = svg.append('defs')

    // Glow filter for high-energy neurons
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur')
    
    const glowMerge = glowFilter.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Pulse glow for selected
    const pulseFilter = defs.append('filter')
      .attr('id', 'pulse-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')
    
    pulseFilter.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur')
    
    const pulseMerge = pulseFilter.append('feMerge')
    pulseMerge.append('feMergeNode').attr('in', 'coloredBlur')
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create gradient for each link based on weight
    edges.forEach((edge, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `link-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', linkColor(edge.weight))
      
      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', `rgba(100, 255, 200, ${0.3 + edge.weight * 0.5})`)
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', linkColor(edge.weight))
    })

    // Main container with zoom
    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Prepare data
    const simNodes: SimNode[] = nodes.map(n => ({
      ...n,
      x: width / 2 + (n.position?.[0] ?? 0) * 200,
      y: height / 2 + (n.position?.[1] ?? 0) * 200,
    }))

    const simLinks: SimLink[] = edges.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      coFireCount: e.coFireCount,
    }))

    // Force simulation
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(d => 80 - d.weight * 30)
        .strength(d => 0.3 + d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => 15 + (d.accessCount ?? 0) * 2))

    simulationRef.current = simulation

    // Links (synapses)
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', (_d, i) => `url(#link-gradient-${i})`)
      .attr('stroke-width', d => 1 + d.weight * 4)
      .attr('stroke-opacity', d => 0.3 + d.weight * 0.5)

    // Animated particles along links (synapse firing)
    const particleGroup = g.append('g').attr('class', 'particles')

    simLinks.forEach((linkData, i) => {
      const numParticles = Math.min(Math.ceil(linkData.coFireCount / 2), 5)
      
      for (let p = 0; p < numParticles; p++) {
        const particle = particleGroup.append('circle')
          .attr('r', 2)
          .attr('fill', '#22c55e')
          .attr('opacity', 0.8)
          .datum({ linkIndex: i, offset: p / numParticles, linkData })

        // Animate particle along link
        const animateParticle = () => {
          const source = linkData.source as SimNode
          const target = linkData.target as SimNode
          
          if (!source.x || !target.x) return

          particle
            .attr('cx', source.x)
            .attr('cy', source.y)
            .transition()
            .duration(2000 + Math.random() * 1000)
            .delay(p * 400)
            .ease(d3.easeLinear)
            .attr('cx', target.x)
            .attr('cy', target.y)
            .on('end', () => {
              // Return journey
              particle
                .transition()
                .duration(2000 + Math.random() * 1000)
                .ease(d3.easeLinear)
                .attr('cx', source.x)
                .attr('cy', source.y)
                .on('end', animateParticle)
            })
        }

        // Start animation after simulation settles
        setTimeout(animateParticle, 1000 + p * 200)
      }
    })

    // Node outer glow (for high energy)
    const nodeGlow = g.append('g')
      .attr('class', 'node-glows')
      .selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', d => 12 + (d.accessCount ?? 0) * 1.5 + 8)
      .attr('fill', d => energyColor(d.energy ?? 0.5))
      .attr('opacity', d => (d.energy ?? 0.5) * 0.3)
      .attr('filter', 'url(#glow)')

    // Nodes (neurons)
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', d => 8 + (d.accessCount ?? 0) * 1.5)
      .attr('fill', d => energyColor(d.energy ?? 0.5))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('filter', d => (d.energy ?? 0) > 0.8 ? 'url(#glow)' : null)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(prev => prev === d.id ? null : d.id)
        if (onNodeClick) onNodeClick(d)
      })
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 12 + (d.accessCount ?? 0) * 1.5)
          .attr('filter', 'url(#pulse-glow)')
      })
      .on('mouseout', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 8 + (d.accessCount ?? 0) * 1.5)
          .attr('filter', (d.energy ?? 0) > 0.8 ? 'url(#glow)' : null)
      })

    // Labels
    const label = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(simNodes)
      .join('text')
      .text(d => d.content?.slice(0, 20) + '...')
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .attr('dy', d => 20 + (d.accessCount ?? 0) * 1.5)

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag as any)

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x)
        .attr('y1', d => (d.source as SimNode).y)
        .attr('x2', d => (d.target as SimNode).x)
        .attr('y2', d => (d.target as SimNode).y)

      // Update gradients
      edges.forEach((edge, i) => {
        const source = simNodes.find(n => n.id === edge.source)
        const target = simNodes.find(n => n.id === edge.target)
        if (source && target) {
          svg.select(`#link-gradient-${i}`)
            .attr('x1', source.x)
            .attr('y1', source.y)
            .attr('x2', target.x)
            .attr('y2', target.y)
        }
      })

      nodeGlow
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y)
    })

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox()
      if (bounds) {
        const fullWidth = bounds.width
        const fullHeight = bounds.height
        const midX = bounds.x + fullWidth / 2
        const midY = bounds.y + fullHeight / 2
        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height)
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY]
        
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
      }
    }, 1500)

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, dimensions, energyColor, linkColor, onNodeClick])

  // Update selected node styling
  useEffect(() => {
    if (!svgRef.current) return
    
    d3.select(svgRef.current)
      .selectAll('.nodes circle')
      .attr('stroke', (d: any) => d.id === selectedNode ? '#22c55e' : '#fff')
      .attr('stroke-width', (d: any) => d.id === selectedNode ? 4 : 2)
  }, [selectedNode])

  if (nodes.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700 h-[500px]">
        <div className="text-center text-slate-400">
          <p className="text-lg">No neural connections</p>
          <p className="text-sm mt-2">Add neurons and search to see the brain form</p>
        </div>
      </div>
    )
  }

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div ref={containerRef} className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-gradient-to-b from-slate-900 to-slate-950"
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="text-slate-400 font-medium mb-2">Neuron Energy</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-300">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-slate-300">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-300">Low</span>
          </div>
        </div>
        <div className="text-slate-400 font-medium mt-3 mb-1">Synapse Strength</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-gradient-to-r from-cyan-400/30 to-cyan-400"></div>
          <span className="text-slate-300">Weak → Strong</span>
        </div>
        <div className="text-slate-400 font-medium mt-3 mb-1">Particles</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-slate-300">Signal flow (coFire count)</span>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 rounded-lg px-3 py-2 text-xs text-slate-400">
        {nodes.length} neurons • {edges.length} synapses
      </div>

      {/* Selected node panel */}
      {selectedNodeData && (
        <div className="absolute top-4 left-4 bg-slate-800/95 rounded-lg p-4 max-w-sm border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neuron-400 font-medium text-sm">Selected Neuron</span>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-white text-sm mb-3">{selectedNodeData.content}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/50 rounded p-2">
              <span className="text-slate-400">Energy</span>
              <div className="text-white font-mono">{((selectedNodeData.energy ?? 0) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <span className="text-slate-400">Access</span>
              <div className="text-white font-mono">{selectedNodeData.accessCount ?? 0}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <span className="text-slate-400">Depth</span>
              <div className="text-white font-mono">{selectedNodeData.depth ?? 0}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <span className="text-slate-400">Connections</span>
              <div className="text-white font-mono">
                {edges.filter(e => e.source === selectedNode || e.target === selectedNode).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => {
            if (svgRef.current) {
              d3.select(svgRef.current)
                .transition()
                .duration(750)
                .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity)
            }
          }}
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          Reset View
        </button>
      </div>
    </div>
  )
}
