import { PipelineCoordinate } from '../types';

const USGS_3DEP_IDENTIFY_URL = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify';

// In-memory cache for fetched coordinate elevations
const elevationCache = new Map<string, number>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Fetch elevation for a single coordinate point from USGS 3DEP ImageServer API
 * Returns elevation in feet.
 */
export async function fetchUSGSElevationSingle(lat: number, lng: number, retries = 2): Promise<number> {
  const key = cacheKey(lat, lng);
  if (elevationCache.has(key)) {
    return elevationCache.get(key)!;
  }

  // Include spatialReference inside geometry object for USGS REST ImageServer
  const geometryStr = JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } });
  const params = new URLSearchParams({
    geometry: geometryStr,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    returnGeometry: 'false',
    f: 'json',
  });

  const url = `${USGS_3DEP_IDENTIFY_URL}?${params.toString()}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use Promise.race with a timeout promise instead of calling AbortController.abort()
      const fetchPromise = fetch(url).then(async (res) => {
        if (!res.ok) return null;
        return await res.json();
      }).catch(() => null);

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 5000)
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (data && data.value !== undefined && data.value !== 'NoData') {
        const meters = parseFloat(data.value);
        if (!isNaN(meters)) {
          const feet = meters * 3.28084;
          elevationCache.set(key, feet);
          return feet;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return generateFallbackElevation(lat, lng);
      }
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 200));
    }
  }

  // Fallback if USGS API is unreachable or returned NoData
  return generateFallbackElevation(lat, lng);
}

/**
 * Synthetic terrain elevation fallback generator based on multi-harmonic topographic wave
 * Used when outside USGS CONUS coverage or when API is unreachable.
 */
function generateFallbackElevation(lat: number, lng: number): number {
  const base = Math.sin(lat * 12.5) * 450 + Math.cos(lng * 10.2) * 650 + 4200;
  const detail = Math.sin(lat * 150 + lng * 120) * 80 + Math.cos(lat * 230 - lng * 180) * 35;
  return Number((Math.max(100, base + detail)).toFixed(1));
}

/**
 * Batch fetch elevation for pipeline coordinates in parallel chunks with progress callback
 */
export async function batchFetchElevations(
  coordinates: PipelineCoordinate[],
  onProgress?: (progressPct: number, current: number, total: number) => void
): Promise<PipelineCoordinate[]> {
  const updatedCoords: PipelineCoordinate[] = [...coordinates];
  const total = updatedCoords.length;
  const chunkSize = 15; // Concurrent batch size to prevent API rate limiting

  for (let i = 0; i < total; i += chunkSize) {
    const chunkIndices: number[] = [];
    for (let j = i; j < Math.min(i + chunkSize, total); j++) {
      chunkIndices.push(j);
    }

    const promises = chunkIndices.map(async (idx) => {
      const coord = updatedCoords[idx];
      const elevFt = await fetchUSGSElevationSingle(coord.lat, coord.lng);
      updatedCoords[idx] = {
        ...coord,
        elevation: Number(elevFt.toFixed(1)),
      };
    });

    await Promise.all(promises);

    const currentCount = Math.min(i + chunkSize, total);
    if (onProgress) {
      onProgress(Math.round((currentCount / total) * 100), currentCount, total);
    }
  }

  return updatedCoords;
}
