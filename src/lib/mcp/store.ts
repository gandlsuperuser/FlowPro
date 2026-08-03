// Simple in‑memory store for MCP geometry objects
import { PipelineGeometry } from '../types';

export const geometryStore = new Map<string, PipelineGeometry>();

export const addGeometry = (id: string, geometry: PipelineGeometry) => {
  geometryStore.set(id, geometry);
};

export const getGeometry = (id: string): PipelineGeometry | undefined => {
  return geometryStore.get(id);
};

export const deleteGeometry = (id: string) => {
  geometryStore.delete(id);
};
