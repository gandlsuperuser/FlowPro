import { PipelineGeometry } from '../lib/types';
import { processCoordinatesIntoPipeline } from '../lib/gis/kmlParser';

// Generate realistic synthetic benchmark pipeline coordinates for instant interactive testing
function createMountainPassPipeline(): PipelineGeometry {
  const points: { lat: number; lng: number; elevation: number }[] = [];
  const startLat = 39.7392;
  const startLng = -104.9903; // Denver foothills

  let lat = startLat;
  let lng = startLng;

  for (let i = 0; i < 180; i++) {
    lat += 0.0018 + Math.sin(i / 15) * 0.0005;
    lng += 0.0025 + Math.cos(i / 20) * 0.0004;

    // Mountain pass elevation profile: climb from 5280 ft up to 8450 ft, then descend into valley
    const progress = i / 180;
    let elev = 5280;
    if (progress < 0.6) {
      elev += progress * 5280 + Math.sin(i / 5) * 140; // Steep climb
    } else {
      elev += 0.6 * 5280 - (progress - 0.6) * 3200 + Math.cos(i / 6) * 110; // Valley descent
    }

    points.push({ lat, lng, elevation: Number(elev.toFixed(1)) });
  }

  return processCoordinatesIntoPipeline(
    points,
    'Mountain Pass Water Transmission Line',
    '12.4 mile high-head municipal water supply pipeline traversing rugged mountain terrain with sharp elevation gain.'
  );
}

function createValleyAgriculturalPipeline(): PipelineGeometry {
  const points: { lat: number; lng: number; elevation: number }[] = [];
  const startLat = 36.7783;
  const startLng = -119.4179; // Central Valley CA

  let lat = startLat;
  let lng = startLng;

  for (let i = 0; i < 140; i++) {
    lat += 0.0015;
    lng += 0.0022;
    // Rolling agricultural terrain elevation
    const elev = 350 + Math.sin(i / 8) * 85 + Math.cos(i / 14) * 45;
    points.push({ lat, lng, elevation: Number(elev.toFixed(1)) });
  }

  return processCoordinatesIntoPipeline(
    points,
    'Valley Agricultural Irrigation Main',
    '8.6 mile multi-ranch irrigation pipeline featuring rolling topography and high flow rate requirements.'
  );
}

function createDesertRidgeAqueduct(): PipelineGeometry {
  const points: { lat: number; lng: number; elevation: number }[] = [];
  const startLat = 33.4484;
  const startLng = -112.074; // Phoenix / Desert Ridge

  let lat = startLat;
  let lng = startLng;

  for (let i = 0; i < 210; i++) {
    lat += 0.0021;
    lng += 0.0031;
    const elev = 1150 + Math.sin(i / 12) * 160 + (i / 210) * 850;
    points.push({ lat, lng, elevation: Number(elev.toFixed(1)) });
  }

  return processCoordinatesIntoPipeline(
    points,
    'Desert Ridge High-Pressure Aqueduct',
    '15.2 mile municipal raw water aqueduct connecting reservoir intake to water treatment plant.'
  );
}

export const SAMPLE_PIPELINES: PipelineGeometry[] = [
  createMountainPassPipeline(),
  createValleyAgriculturalPipeline(),
  createDesertRidgeAqueduct(),
];
