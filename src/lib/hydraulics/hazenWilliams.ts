import { HydraulicConfig, HydraulicCalculationResult, PipelineCoordinate, PumpRecommendation } from '../types';

/**
 * Pipe material specs with default C coefficients
 */
export const PIPE_MATERIALS = [
  { name: 'PVC / HDPE (Smooth Plastic)', cFactor: 150, description: 'Very smooth, highly corrosion resistant' },
  { name: 'Ductile Iron (Cement Lined)', cFactor: 140, description: 'Standard municipal water main' },
  { name: 'New Welded Steel', cFactor: 130, description: 'High strength, medium smoothness' },
  { name: 'Old Cast Iron / Steel', cFactor: 100, description: 'Corroded or aged piping' },
  { name: 'Concrete Pipe', cFactor: 120, description: 'Large diameter transmission' },
];

/**
 * Calculate friction head loss per 1,000 feet of pipe using Hazen-Williams
 */
export function calculateFrictionHeadLossPer1000Ft(
  flowRateGPM: number,
  pipeDiameterInches: number,
  cFactor: number
): number {
  if (pipeDiameterInches <= 0 || cFactor <= 0 || flowRateGPM <= 0) return 0;
  // Formula: hf_1000 = 2.083 * (100 / C)^1.852 * (Q^1.852) / (d^4.8655)
  const cTerm = Math.pow(100 / cFactor, 1.852);
  const qTerm = Math.pow(flowRateGPM, 1.852);
  const dTerm = Math.pow(pipeDiameterInches, 4.8655);
  return 2.083 * cTerm * (qTerm / dTerm);
}

/**
 * Calculate water flow velocity in feet per second
 */
export function calculateVelocityFtPerSec(flowRateGPM: number, pipeDiameterInches: number): number {
  if (pipeDiameterInches <= 0) return 0;
  return (0.4085 * flowRateGPM) / Math.pow(pipeDiameterInches, 2);
}

/**
 * Convert feet of water head to PSI
 */
export function feetToPsi(feet: number): number {
  return feet / 2.31;
}

/**
 * Convert PSI to feet of water head
 */
export function psiToFeet(psi: number): number {
  return psi * 2.31;
}

/**
 * Perform full hydraulic evaluation along pipeline coordinates using Hazen-Williams
 */
export function calculatePipelineHydraulics(
  coordinates: PipelineCoordinate[],
  config: HydraulicConfig,
  pumpsOverride?: PumpRecommendation[]
): HydraulicCalculationResult {
  if (!coordinates || coordinates.length === 0) {
    throw new Error('No coordinates provided for hydraulic analysis.');
  }

  const isMetric = config.units === 'metric';

  // Standardize inputs to Imperial for calculation engine, then convert output if metric
  const flowGPM = isMetric ? config.flowRateGPM * 15.8503 : config.flowRateGPM;
  const diaInches = isMetric ? config.pipeDiameterInches / 25.4 : config.pipeDiameterInches;
  const desiredPsi = isMetric ? config.desiredPressurePSI * 14.5038 : config.desiredPressurePSI;
  const minPsi = isMetric ? config.minPressurePSI * 14.5038 : config.minPressurePSI;
  const maxPsi = isMetric ? config.maxPressurePSI * 14.5038 : config.maxPressurePSI;

  const hf1000Ft = calculateFrictionHeadLossPer1000Ft(flowGPM, diaInches, config.cFactor);
  const velocityFtSec = calculateVelocityFtPerSec(flowGPM, diaInches);

  const startElevFt = coordinates[0].elevation;
  let accumulatedFrictionLossFt = 0;

  let maxPressure = -Infinity;
  let minPressure = Infinity;

  // Build pump map indexed by coordinate id if provided
  const pumpMap = new Map<number, PumpRecommendation>();
  if (pumpsOverride) {
    pumpsOverride.forEach((p) => pumpMap.set(p.coordinateIndex, p));
  }

  let currentAddHeadFt = psiToFeet(desiredPsi);

  const updatedCoords: PipelineCoordinate[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];

    if (i > 0) {
      const segLenFt = coord.segmentLength; // in feet
      const segLoss = (hf1000Ft / 1000) * segLenFt;
      accumulatedFrictionLossFt += segLoss;
    }

    // Check if pump is located at this node
    if (pumpMap.has(i)) {
      const pump = pumpMap.get(i)!;
      currentAddHeadFt += pump.requiredHeadBoost;
    }

    const staticHeadFt = coord.elevation - startElevFt;
    // Pressure Head (ft) = Total added pump head - elevation difference - accumulated friction loss
    const totalHeadFt = currentAddHeadFt - staticHeadFt - accumulatedFrictionLossFt;
    const currentPressurePsi = feetToPsi(totalHeadFt);

    if (currentPressurePsi > maxPressure) maxPressure = currentPressurePsi;
    if (currentPressurePsi < minPressure) minPressure = currentPressurePsi;

    updatedCoords.push({
      ...coord,
      pressure: Number(
        (isMetric ? currentPressurePsi / 14.5038 : currentPressurePsi).toFixed(1)
      ),
      headLoss: Number(
        (isMetric ? accumulatedFrictionLossFt * 0.3048 : accumulatedFrictionLossFt).toFixed(1)
      ),
      velocity: Number(
        (isMetric ? velocityFtSec * 0.3048 : velocityFtSec).toFixed(2)
      ),
      staticHead: Number(
        (isMetric ? staticHeadFt * 0.3048 : staticHeadFt).toFixed(1)
      ),
      totalHead: Number(
        (isMetric ? totalHeadFt * 0.3048 : totalHeadFt).toFixed(1)
      ),
    });
  }

  const endElevFt = coordinates[coordinates.length - 1].elevation;
  const totalStaticHeadFt = endElevFt - startElevFt;
  const totalFrictionLossFt = accumulatedFrictionLossFt;
  const totalTDHFt = Math.max(0, totalStaticHeadFt) + totalFrictionLossFt + psiToFeet(desiredPsi);

  // Motor HP calculation: HP = (Q * TDH) / (3960 * efficiency * safetyFactor)
  const eff = config.pumpEfficiencyPct / 100;
  const sf = config.safetyFactor;
  const totalHP = (flowGPM * totalTDHFt) / (3960 * eff * sf);

  // Annual kWh estimation: kW = HP * 0.7457, running 24/7 (8760 hours/yr)
  const annualKWh = totalHP * 0.7457 * 8760;
  const annualCostUSD = annualKWh * config.electricityCostPerKwh;

  return {
    pipeDiameterInches: config.pipeDiameterInches,
    cFactor: config.cFactor,
    flowRateGPM: config.flowRateGPM,
    velocityFtPerSec: Number(
      (isMetric ? velocityFtSec * 0.3048 : velocityFtSec).toFixed(2)
    ),
    frictionHeadLossPer1000Ft: Number(
      (isMetric ? hf1000Ft * 0.3048 : hf1000Ft).toFixed(2)
    ),
    totalFrictionHeadLossFeet: Number(
      (isMetric ? totalFrictionLossFt * 0.3048 : totalFrictionLossFt).toFixed(1)
    ),
    totalStaticHeadFeet: Number(
      (isMetric ? totalStaticHeadFt * 0.3048 : totalStaticHeadFt).toFixed(1)
    ),
    totalDynamicHeadFeet: Number(
      (isMetric ? totalTDHFt * 0.3048 : totalTDHFt).toFixed(1)
    ),
    inletPressurePSI: updatedCoords[0].pressure || 0,
    outletPressurePSI: updatedCoords[updatedCoords.length - 1].pressure || 0,
    maxPressurePSI: Number(
      (isMetric ? maxPressure / 14.5038 : maxPressure).toFixed(1)
    ),
    minPressurePSI: Number(
      (isMetric ? minPressure / 14.5038 : minPressure).toFixed(1)
    ),
    pumpsRequired: pumpsOverride ? pumpsOverride.length : 1,
    pumps: pumpsOverride || [],
    totalHorsepower: Number(totalHP.toFixed(1)),
    annualEnergyConsumptionKWh: Math.round(annualKWh),
    annualEnergyCostUSD: Math.round(annualCostUSD),
    estimatedCapitalCostUSD: Math.round((pumpsOverride?.length || 1) * 35000 + totalHP * 250),
    coordinates: updatedCoords,
  };
}
