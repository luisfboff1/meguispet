'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'

interface MarkerClusterGroupProps {
  children: React.ReactNode
  chunkedLoading?: boolean
  showCoverageOnHover?: boolean
  maxClusterRadius?: number
}

export default function MarkerClusterGroup({
  children,
  maxClusterRadius = 80,
}: MarkerClusterGroupProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    if (!map) return

    // Create cluster group if it doesn't exist
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      })
      map.addLayer(clusterGroupRef.current)
    }

    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current)
        clusterGroupRef.current = null
      }
    }
  }, [map, maxClusterRadius])

  // This component doesn't render markers itself
  // It provides a layer for React Leaflet Markers to be added to
  return <>{children}</>
}
