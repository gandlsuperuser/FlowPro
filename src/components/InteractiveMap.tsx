'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PipelineGeometry, HydraulicCalculationResult, PipelineCoordinate } from '../lib/types';
import { Layers, MapPin } from 'lucide-react';

interface InteractiveMapProps {
  geometry: PipelineGeometry;
  hydraulics: HydraulicCalculationResult;
  selectedCoordinate?: PipelineCoordinate | null;
  onSelectCoordinate: (coord: PipelineCoordinate) => void;
}

// Standalone raster tile styles
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const STREETS_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  geometry,
  hydraulics,
  selectedCoordinate,
  onSelectCoordinate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mapLoadedRef = useRef<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'dark' | 'streets'>('satellite');
  const [colorCodeMode, setColorCodeMode] = useState<'elevation' | 'pressure'>('elevation');

  const rawCoords = hydraulics?.coordinates || geometry?.coordinates || [];
  const lastPumpIdx = hydraulics?.pumps && hydraulics.pumps.length > 0
    ? hydraulics.pumps[hydraulics.pumps.length - 1].coordinateIndex
    : undefined;

  // Cleanly terminate pipeline route line at final pump station / destination to eliminate trailing extra line segments
  const activeCoords =
    lastPumpIdx !== undefined && lastPumpIdx > 0 && lastPumpIdx < rawCoords.length
      ? rawCoords.slice(0, lastPumpIdx + 1)
      : rawCoords;

  // Function to render pipeline route line on overlay canvas synchronized with map projection
  const renderOverlayPipeline = useCallback(() => {
    if (!mapRef.current || !overlayCanvasRef.current) return;
    const map = mapRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    const coords = activeCoords;
    if (!coords || coords.length < 2) return;

    // Project lat/lng to screen x/y
    const screenPts = coords.map((c) => {
      const pt = map.project([c.lng, c.lat]);
      return { x: pt.x, y: pt.y };
    });

    const glowColor = colorCodeMode === 'elevation' ? 'rgba(6, 182, 212, 0.75)' : 'rgba(16, 185, 129, 0.75)';
    const coreColor = colorCodeMode === 'elevation' ? '#00f0ff' : '#00ff88';

    // 1. Draw wide pipeline glow line
    ctx.beginPath();
    ctx.lineWidth = 18;
    ctx.strokeStyle = glowColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    screenPts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 2. Draw core bright pipeline line
    ctx.beginPath();
    ctx.lineWidth = 7;
    ctx.strokeStyle = coreColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    screenPts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 3. Draw glowing white node points along route
    screenPts.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [activeCoords, colorCodeMode]);

  // Update DOM Booster Pump Station Markers
  const updatePumpMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (hydraulics && hydraulics.pumps && activeCoords.length > 0) {
      hydraulics.pumps.forEach((pump) => {
        const el = document.createElement('div');
        el.className = 'relative flex items-center justify-center cursor-pointer group z-20';
        el.innerHTML = `
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 border-2 border-white text-white font-bold text-[11px] flex items-center justify-center shadow-lg shadow-amber-500/60 hover:scale-125 transition-transform">
            P${pump.pumpNumber}
          </div>
        `;

        el.addEventListener('click', () => {
          const coord = activeCoords[pump.coordinateIndex];
          if (coord) onSelectCoordinate(coord);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pump.lng, pump.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [hydraulics, activeCoords, onSelectCoordinate]);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || activeCoords.length === 0) return;

    const lineCoords: [number, number][] = activeCoords.map((c) => [c.lng, c.lat]);
    const centerLng = activeCoords[Math.floor(activeCoords.length / 2)].lng;
    const centerLat = activeCoords[Math.floor(activeCoords.length / 2)].lat;

    const selectedStyle =
      mapStyle === 'satellite'
        ? SATELLITE_STYLE
        : mapStyle === 'streets'
        ? STREETS_STYLE
        : DARK_STYLE;

    try {
      mapLoadedRef.current = false;
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: selectedStyle,
        center: [centerLng, centerLat],
        zoom: 11,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current = map;

      const onMapRender = () => {
        renderOverlayPipeline();
      };

      map.on('move', onMapRender);
      map.on('zoom', onMapRender);
      map.on('render', onMapRender);
      map.on('resize', onMapRender);

      map.on('load', () => {
        mapLoadedRef.current = true;
        // Always use raw geometry coords (available immediately after KMZ parse)
        const geoCoords: [number, number][] = geometry.coordinates.map((c) => [c.lng, c.lat]);
        if (geoCoords.length > 1) {
          const bounds = geoCoords.reduce(
            (b, coord) => b.extend(coord as [number, number]),
            new maplibregl.LngLatBounds(geoCoords[0], geoCoords[0])
          );
          map.fitBounds(bounds, { padding: 60, duration: 1800, essential: true });
        }
        updatePumpMarkers();
        renderOverlayPipeline();
      });

      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        mapLoadedRef.current = false;
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('MapLibre GL initialization error:', err);
    }
  }, [geometry.id, mapStyle]);

  // Fly to pipeline whenever geometry changes (handles first upload + pipeline switch)
  // Uses geometry.coordinates directly — always available right after KMZ parse
  useEffect(() => {
    if (!geometry?.coordinates || geometry.coordinates.length < 2) return;
    const geoCoords: [number, number][] = geometry.coordinates.map((c) => [c.lng, c.lat]);
    const bounds = geoCoords.reduce(
      (b, coord) => b.extend(coord as [number, number]),
      new maplibregl.LngLatBounds(geoCoords[0], geoCoords[0])
    );
    if (mapRef.current && mapLoadedRef.current) {
      // Map already ready — animate immediately
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 1800, essential: true });
    } else if (mapRef.current) {
      // Map initializing — fire once it finishes loading
      const onLoad = () => {
        mapRef.current?.fitBounds(bounds, { padding: 60, duration: 1800, essential: true });
      };
      mapRef.current.once('load', onLoad);
    }
  }, [geometry.id, geometry.coordinates]);

  // Smoothly fly camera to selected coordinate node when clicked
  useEffect(() => {
    if (mapRef.current && selectedCoordinate) {
      mapRef.current.flyTo({
        center: [selectedCoordinate.lng, selectedCoordinate.lat],
        zoom: 14,
        duration: 1400,
        essential: true,
      });
    }
  }, [selectedCoordinate]);

  // Re-render overlay pipeline & markers when hydraulics, activeCoords, or colorCodeMode change
  useEffect(() => {
    updatePumpMarkers();
    renderOverlayPipeline();
  }, [hydraulics, colorCodeMode, activeCoords, renderOverlayPipeline, updatePumpMarkers]);

  const inspectNode = selectedCoordinate || activeCoords[0];

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* MapLibre WebGL Base Map */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Synchronized Pipeline Route Line Overlay Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Top Map Layer Control Overlay */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
        {/* Style Selector */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 flex items-center text-xs text-white shadow-lg">
          <Layers className="w-3.5 h-3.5 text-cyan-400 mr-1.5 ml-1" />
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2 py-0.5 rounded font-medium ${
              mapStyle === 'dark' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dark Topo
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-0.5 rounded font-medium ${
              mapStyle === 'satellite' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2 py-0.5 rounded font-medium ${
              mapStyle === 'streets' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Streets
          </button>
        </div>

        {/* Color Code Mode */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 flex items-center text-xs text-white shadow-lg">
          <span className="text-slate-400 mr-1.5 ml-1 font-medium">Line Color:</span>
          <button
            onClick={() => setColorCodeMode('elevation')}
            className={`px-2 py-0.5 rounded font-medium ${
              colorCodeMode === 'elevation' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Elevation
          </button>
          <button
            onClick={() => setColorCodeMode('pressure')}
            className={`px-2 py-0.5 rounded font-medium ${
              colorCodeMode === 'pressure' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pressure
          </button>
        </div>
      </div>

      {/* Legend overlay */}
      <div className="absolute top-3 right-12 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-2 text-xs text-white shadow-lg flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
          <span className="text-slate-300 font-semibold">Pipeline Route Line</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
            P
          </div>
          <span className="text-slate-300">Booster Pump ({hydraulics?.pumpsRequired || 0})</span>
        </div>
      </div>

      {/* Coordinate Node Inspector Card Overlay */}
      {inspectNode && (
        <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-96 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-xl p-3.5 shadow-2xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-300">Pipeline Coordinate Inspector</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Mile {inspectNode.distanceFromStart}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <p className="text-[10px] text-slate-400">Coordinates</p>
              <p className="font-mono text-cyan-300 font-medium">
                {inspectNode.lat.toFixed(4)}, {inspectNode.lng.toFixed(4)}
              </p>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <p className="text-[10px] text-slate-400">Terrain Elevation</p>
              <p className="font-semibold text-white">{inspectNode.elevation} ft</p>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <p className="text-[10px] text-slate-400">Line Pressure</p>
              <p className="font-semibold text-emerald-400">{inspectNode.pressure ?? 0} PSI</p>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <p className="text-[10px] text-slate-400">Flow Velocity</p>
              <p className="font-semibold text-amber-300">{inspectNode.velocity ?? 0} ft/s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
