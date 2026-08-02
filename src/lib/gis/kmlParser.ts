import JSZip from 'jszip';
import { PipelineCoordinate, PipelineGeometry } from '../types';

// Calculate distance between two coordinates using Haversine formula (in feet)
export function haversineDistanceFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 20902231; // Radius of Earth in feet
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing between two points in degrees (0..360)
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export async function extractKmlTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.kmz')) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    // Find doc.kml or any .kml file inside zip
    const kmlFile = Object.keys(contents.files).find((filename) =>
      filename.toLowerCase().endsWith('.kml')
    );
    if (!kmlFile) {
      throw new Error('No .kml file found inside the KMZ archive.');
    }
    return await contents.files[kmlFile].async('string');
  } else if (fileName.endsWith('.kml') || fileName.endsWith('.xml')) {
    return await file.text();
  } else {
    throw new Error('Unsupported file format. Please upload a .kml or .kmz file.');
  }
}

export function parseKmlToPipelines(kmlText: string, defaultName = 'Uploaded Pipeline'): PipelineGeometry[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  const parseErrors = xmlDoc.getElementsByTagName('parsererror');
  if (parseErrors.length > 0) {
    throw new Error('Invalid XML/KML content. Unable to parse file.');
  }

  const placemarks = Array.from(xmlDoc.getElementsByTagName('Placemark'));
  const pipelines: PipelineGeometry[] = [];

  let count = 0;

  // Process placemarks with LineStrings
  for (const placemark of placemarks) {
    const nameEl = placemark.getElementsByTagName('name')[0];
    const name = nameEl?.textContent?.trim() || `Pipeline Segment ${++count}`;
    const descEl = placemark.getElementsByTagName('description')[0];
    const description = descEl?.textContent?.trim() || '';

    const lineStrings = Array.from(placemark.getElementsByTagName('LineString'));
    for (const lineString of lineStrings) {
      const coordEl = lineString.getElementsByTagName('coordinates')[0];
      if (!coordEl || !coordEl.textContent) continue;

      const rawCoordsText = coordEl.textContent.trim();
      const rawPoints = rawCoordsText.split(/\s+/);
      const parsedPoints: { lat: number; lng: number; elevation: number }[] = [];

      for (const ptStr of rawPoints) {
        const parts = ptStr.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const elevation = parts[2] ? parseFloat(parts[2]) : 0; // if 0 or missing, USGS API will populate

          if (!isNaN(lat) && !isNaN(lng)) {
            parsedPoints.push({ lat, lng, elevation });
          }
        }
      }

      if (parsedPoints.length >= 2) {
        const processedPipeline = processCoordinatesIntoPipeline(
          parsedPoints,
          name,
          description
        );
        pipelines.push(processedPipeline);
      }
    }
  }

  // Fallback: If no LineString placemarks were found, look for direct <coordinates> nodes
  if (pipelines.length === 0) {
    const allCoordinates = Array.from(xmlDoc.getElementsByTagName('coordinates'));
    for (const coordEl of allCoordinates) {
      if (!coordEl.textContent) continue;
      const rawPoints = coordEl.textContent.trim().split(/\s+/);
      const parsedPoints: { lat: number; lng: number; elevation: number }[] = [];

      for (const ptStr of rawPoints) {
        const parts = ptStr.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const elevation = parts[2] ? parseFloat(parts[2]) : 0;

          if (!isNaN(lat) && !isNaN(lng)) {
            parsedPoints.push({ lat, lng, elevation });
          }
        }
      }

      if (parsedPoints.length >= 2) {
        pipelines.push(
          processCoordinatesIntoPipeline(parsedPoints, defaultName, 'Extracted pipeline geometry')
        );
      }
    }
  }

  if (pipelines.length === 0) {
    throw new Error('No valid coordinate paths (LineStrings) found in the KML/KMZ file.');
  }

  return pipelines;
}

export function processCoordinatesIntoPipeline(
  rawPoints: { lat: number; lng: number; elevation: number }[],
  name: string,
  description?: string
): PipelineGeometry {
  // Handle downsampling if points exceed 10,000 for high performance while retaining profile geometry
  let sampledPoints = rawPoints;
  if (rawPoints.length > 5000) {
    const step = Math.ceil(rawPoints.length / 5000);
    sampledPoints = rawPoints.filter((_, idx) => idx % step === 0 || idx === rawPoints.length - 1);
  }

  let cumulativeDistanceFt = 0;
  let elevationGainFt = 0;
  let elevationLossFt = 0;

  let maxElev = -Infinity;
  let minElev = Infinity;
  let maxSlope = -Infinity;
  let minSlope = Infinity;

  let highPointNode = { lat: sampledPoints[0].lat, lng: sampledPoints[0].lng, dist: 0, elev: sampledPoints[0].elevation };
  let lowPointNode = { lat: sampledPoints[0].lat, lng: sampledPoints[0].lng, dist: 0, elev: sampledPoints[0].elevation };

  const processedCoordinates: PipelineCoordinate[] = [];

  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    let segmentLengthFt = 0;
    let bearing = 0;
    let slope = 0;

    if (i > 0) {
      const prev = sampledPoints[i - 1];
      segmentLengthFt = haversineDistanceFeet(prev.lat, prev.lng, pt.lat, pt.lng);
      bearing = calculateBearing(prev.lat, prev.lng, pt.lat, pt.lng);
      cumulativeDistanceFt += segmentLengthFt;

      const elevDiff = pt.elevation - prev.elevation;
      if (elevDiff > 0) elevationGainFt += elevDiff;
      if (elevDiff < 0) elevationLossFt += Math.abs(elevDiff);

      slope = segmentLengthFt > 0 ? (elevDiff / segmentLengthFt) * 100 : 0;
    }

    if (pt.elevation > maxElev) {
      maxElev = pt.elevation;
      highPointNode = { lat: pt.lat, lng: pt.lng, dist: cumulativeDistanceFt / 5280, elev: pt.elevation };
    }
    if (pt.elevation < minElev) {
      minElev = pt.elevation;
      lowPointNode = { lat: pt.lat, lng: pt.lng, dist: cumulativeDistanceFt / 5280, elev: pt.elevation };
    }

    if (slope > maxSlope) maxSlope = slope;
    if (slope < minSlope) minSlope = slope;

    processedCoordinates.push({
      id: `coord-${i}`,
      lat: pt.lat,
      lng: pt.lng,
      elevation: pt.elevation,
      distanceFromStart: Number((cumulativeDistanceFt / 5280).toFixed(3)), // Miles
      segmentLength: Number(segmentLengthFt.toFixed(1)), // Feet
      bearing: Number(bearing.toFixed(1)),
      slope: Number(slope.toFixed(2)),
    });
  }

  const totalLengthMiles = cumulativeDistanceFt / 5280;
  const avgElev = sampledPoints.reduce((acc, curr) => acc + curr.elevation, 0) / sampledPoints.length;
  const avgSlope = (elevationGainFt - elevationLossFt) / (cumulativeDistanceFt || 1) * 100;

  return {
    id: `pipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    description,
    coordinates: processedCoordinates,
    stats: {
      totalLength: Number(totalLengthMiles.toFixed(2)),
      totalLengthFeetOrMeters: Number(cumulativeDistanceFt.toFixed(0)),
      elevationGain: Number(elevationGainFt.toFixed(1)),
      elevationLoss: Number(elevationLossFt.toFixed(1)),
      maxElevation: Number(maxElev.toFixed(1)),
      minElevation: Number(minElev.toFixed(1)),
      avgElevation: Number(avgElev.toFixed(1)),
      maxSlope: Number(maxSlope.toFixed(2)),
      minSlope: Number(minSlope.toFixed(2)),
      avgSlope: Number(avgSlope.toFixed(2)),
      highPointCoords: highPointNode,
      lowPointCoords: lowPointNode,
    },
  };
}

export function recalculatePipelineStats(pipeline: PipelineGeometry): PipelineGeometry {
  const points = pipeline.coordinates;
  if (!points || points.length === 0) return pipeline;

  let cumulativeDistanceFt = 0;
  let elevationGainFt = 0;
  let elevationLossFt = 0;

  let maxElev = -Infinity;
  let minElev = Infinity;
  let maxSlope = -Infinity;
  let minSlope = Infinity;

  let highPointNode = { lat: points[0].lat, lng: points[0].lng, dist: 0, elev: points[0].elevation };
  let lowPointNode = { lat: points[0].lat, lng: points[0].lng, dist: 0, elev: points[0].elevation };

  const updatedCoordinates: PipelineCoordinate[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    let segmentLengthFt = 0;
    let bearing = 0;
    let slope = 0;

    if (i > 0) {
      const prev = points[i - 1];
      segmentLengthFt = haversineDistanceFeet(prev.lat, prev.lng, pt.lat, pt.lng);
      bearing = calculateBearing(prev.lat, prev.lng, pt.lat, pt.lng);
      cumulativeDistanceFt += segmentLengthFt;

      const elevDiff = pt.elevation - prev.elevation;
      if (elevDiff > 0) elevationGainFt += elevDiff;
      if (elevDiff < 0) elevationLossFt += Math.abs(elevDiff);

      slope = segmentLengthFt > 0 ? (elevDiff / segmentLengthFt) * 100 : 0;
    }

    if (pt.elevation > maxElev) {
      maxElev = pt.elevation;
      highPointNode = { lat: pt.lat, lng: pt.lng, dist: cumulativeDistanceFt / 5280, elev: pt.elevation };
    }
    if (pt.elevation < minElev) {
      minElev = pt.elevation;
      lowPointNode = { lat: pt.lat, lng: pt.lng, dist: cumulativeDistanceFt / 5280, elev: pt.elevation };
    }

    if (slope > maxSlope) maxSlope = slope;
    if (slope < minSlope) minSlope = slope;

    updatedCoordinates.push({
      ...pt,
      distanceFromStart: Number((cumulativeDistanceFt / 5280).toFixed(3)),
      segmentLength: Number(segmentLengthFt.toFixed(1)),
      bearing: Number(bearing.toFixed(1)),
      slope: Number(slope.toFixed(2)),
    });
  }

  const totalLengthMiles = cumulativeDistanceFt / 5280;
  const avgElev = points.reduce((acc, curr) => acc + curr.elevation, 0) / points.length;
  const avgSlope = (elevationGainFt - elevationLossFt) / (cumulativeDistanceFt || 1) * 100;

  return {
    ...pipeline,
    coordinates: updatedCoordinates,
    stats: {
      totalLength: Number(totalLengthMiles.toFixed(2)),
      totalLengthFeetOrMeters: Number(cumulativeDistanceFt.toFixed(0)),
      elevationGain: Number(elevationGainFt.toFixed(1)),
      elevationLoss: Number(elevationLossFt.toFixed(1)),
      maxElevation: Number(maxElev.toFixed(1)),
      minElevation: Number(minElev.toFixed(1)),
      avgElevation: Number(avgElev.toFixed(1)),
      maxSlope: Number(maxSlope.toFixed(2)),
      minSlope: Number(minSlope.toFixed(2)),
      avgSlope: Number(avgSlope.toFixed(2)),
      highPointCoords: highPointNode,
      lowPointCoords: lowPointNode,
    },
  };
}
