// Server-side KML/KMZ parser using linkedom for DOM parsing (no browser DOMParser)
import JSZip from 'jszip';
import { parseHTML } from 'linkedom';
import { PipelineGeometry } from '../types';
import { processCoordinatesIntoPipeline } from './kmlParser';

/**
 * Extract KML text from a KMZ (zip) buffer, or return raw KML text.
 */
export async function extractKmlFromBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.kmz')) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(buffer);
    const kmlFile = Object.keys(contents.files).find((f) => f.toLowerCase().endsWith('.kml'));
    if (!kmlFile) {
      throw new Error('No .kml file found inside the KMZ archive.');
    }
    return await contents.files[kmlFile].async('string');
  }
  // Assume raw KML/XML text
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Parse KML text into PipelineGeometry[] using linkedom (server-safe DOM).
 */
export function parseKmlToPipelinesServer(
  kmlText: string,
  defaultName = 'Uploaded Pipeline'
): PipelineGeometry[] {
  const { document: xmlDoc } = parseHTML(kmlText);

  const placemarks = Array.from(xmlDoc.querySelectorAll('Placemark'));
  const pipelines: PipelineGeometry[] = [];
  let count = 0;

  for (const placemark of placemarks) {
    const nameEl = placemark.querySelector('name');
    const name = nameEl?.textContent?.trim() || `Pipeline Segment ${++count}`;
    const descEl = placemark.querySelector('description');
    const description = descEl?.textContent?.trim() || '';

    const lineStrings = Array.from(placemark.querySelectorAll('LineString'));
    for (const lineString of lineStrings) {
      const coordEl = lineString.querySelector('coordinates');
      if (!coordEl?.textContent) continue;

      const rawPoints = parseCoordinateText(coordEl.textContent);
      if (rawPoints.length >= 2) {
        pipelines.push(processCoordinatesIntoPipeline(rawPoints, name, description));
      }
    }
  }

  // Fallback: look for bare <coordinates> nodes
  if (pipelines.length === 0) {
    const allCoords = Array.from(xmlDoc.querySelectorAll('coordinates'));
    for (const coordEl of allCoords) {
      if (!coordEl.textContent) continue;
      const rawPoints = parseCoordinateText(coordEl.textContent);
      if (rawPoints.length >= 2) {
        pipelines.push(processCoordinatesIntoPipeline(rawPoints, defaultName, 'Extracted pipeline geometry'));
      }
    }
  }

  if (pipelines.length === 0) {
    throw new Error('No valid coordinate paths (LineStrings) found in the KML/KMZ file.');
  }

  return pipelines;
}

function parseCoordinateText(text: string): { lat: number; lng: number; elevation: number }[] {
  const rawPoints = text.trim().split(/\s+/);
  const parsed: { lat: number; lng: number; elevation: number }[] = [];

  for (const ptStr of rawPoints) {
    const parts = ptStr.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const elevation = parts[2] ? parseFloat(parts[2]) : 0;
      if (!isNaN(lat) && !isNaN(lng)) {
        parsed.push({ lat, lng, elevation });
      }
    }
  }

  return parsed;
}
