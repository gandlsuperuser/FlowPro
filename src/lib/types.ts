export type UnitSystem = 'imperial' | 'metric';

export interface PipelineCoordinate {
  id: string;
  lat: number;
  lng: number;
  elevation: number; // in ft (imperial) or m (metric)
  distanceFromStart: number; // in miles (imperial) or km (metric)
  segmentLength: number; // in feet or meters
  bearing: number; // in degrees
  slope: number; // percentage
  // Hydraulic calculated fields
  pressure?: number; // PSI or Bar
  headLoss?: number; // ft or m
  velocity?: number; // ft/s or m/s
  staticHead?: number; // ft or m
  totalHead?: number; // ft or m
}

export interface GISMetadata {
  name: string;
  description?: string;
  folders?: string[];
  totalPoints: number;
}

export interface PipelineGeometry {
  id: string;
  name: string;
  description?: string;
  coordinates: PipelineCoordinate[];
  stats: {
    totalLength: number; // miles or km
    totalLengthFeetOrMeters: number; // feet or meters
    elevationGain: number; // ft or m
    elevationLoss: number; // ft or m
    maxElevation: number;
    minElevation: number;
    avgElevation: number;
    maxSlope: number; // %
    minSlope: number; // %
    avgSlope: number; // %
    highPointCoords?: { lat: number; lng: number; dist: number; elev: number };
    lowPointCoords?: { lat: number; lng: number; dist: number; elev: number };
  };
}

export interface PipeMaterialSpec {
  name: string;
  cFactor: number;
  availableDiameters: number[]; // inches
}

export interface HydraulicConfig {
  units: UnitSystem;
  flowRateGPM: number; // GPM (imperial) or L/s (metric)
  pipeDiameterInches: number; // inches or mm
  pipeMaterial: string;
  cFactor: number;
  desiredPressurePSI: number; // PSI or Bar
  minPressurePSI: number;
  maxPressurePSI: number;
  pumpEfficiencyPct: number; // e.g. 75%
  safetyFactor: number; // e.g. 1.15
  electricityCostPerKwh: number; // $ e.g. 0.12
}

export interface PumpRecommendation {
  id: string;
  pumpNumber: number;
  coordinateIndex: number;
  lat: number;
  lng: number;
  distanceFromStart: number; // miles or km
  elevation: number; // ft or m
  suctionPressure: number; // PSI or Bar
  dischargePressure: number; // PSI or Bar
  requiredHeadBoost: number; // ft or m of head
  horsepower: number; // HP or kW
  spacingFromPrevious: number; // miles or km
  type: 'Intake Station' | 'Booster Pump';
  estimatedCost: number; // $
}

export interface HydraulicCalculationResult {
  pipeDiameterInches: number;
  cFactor: number;
  flowRateGPM: number;
  velocityFtPerSec: number;
  frictionHeadLossPer1000Ft: number;
  totalFrictionHeadLossFeet: number;
  totalStaticHeadFeet: number;
  totalDynamicHeadFeet: number;
  inletPressurePSI: number;
  outletPressurePSI: number;
  maxPressurePSI: number;
  minPressurePSI: number;
  pumpsRequired: number;
  pumps: PumpRecommendation[];
  totalHorsepower: number;
  annualEnergyConsumptionKWh: number;
  annualEnergyCostUSD: number;
  estimatedCapitalCostUSD: number;
  coordinates: PipelineCoordinate[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  config: HydraulicConfig;
  result?: HydraulicCalculationResult;
  createdAt: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedQuestions?: string[];
}
