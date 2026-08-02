import { HydraulicConfig, PipelineCoordinate, PumpRecommendation, HydraulicCalculationResult } from '../types';
import { calculateFrictionHeadLossPer1000Ft, psiToFeet, feetToPsi, calculatePipelineHydraulics } from './hazenWilliams';

export function optimizePumpPlacement(
  coordinates: PipelineCoordinate[],
  config: HydraulicConfig
): HydraulicCalculationResult {
  if (!coordinates || coordinates.length < 2) {
    throw new Error('Pipeline must contain at least 2 coordinate points for pump optimization.');
  }

  const isMetric = config.units === 'metric';

  // Standardize values to Imperial for internal solver
  const flowGPM = isMetric ? config.flowRateGPM * 15.8503 : config.flowRateGPM;
  const diaInches = isMetric ? config.pipeDiameterInches / 25.4 : config.pipeDiameterInches;
  const targetPsi = isMetric ? config.desiredPressurePSI * 14.5038 : config.desiredPressurePSI;
  const minPsi = isMetric ? config.minPressurePSI * 14.5038 : config.minPressurePSI;
  const maxPsi = isMetric ? config.maxPressurePSI * 14.5038 : config.maxPressurePSI;

  const hf1000Ft = calculateFrictionHeadLossPer1000Ft(flowGPM, diaInches, config.cFactor);
  const targetHeadFt = psiToFeet(targetPsi);
  const minHeadFt = psiToFeet(minPsi);
  const maxHeadFt = psiToFeet(maxPsi);

  const pumps: PumpRecommendation[] = [];

  // Pump #1: Intake Pump Station at coordinate index 0
  const intakeHeadBoost = Math.max(targetHeadFt, psiToFeet(35));
  const intakeHp = (flowGPM * intakeHeadBoost) / (3960 * (config.pumpEfficiencyPct / 100) * config.safetyFactor);

  pumps.push({
    id: 'pump-1',
    pumpNumber: 1,
    coordinateIndex: 0,
    lat: coordinates[0].lat,
    lng: coordinates[0].lng,
    distanceFromStart: 0,
    elevation: coordinates[0].elevation,
    suctionPressure: 0,
    dischargePressure: Number((isMetric ? feetToPsi(intakeHeadBoost) / 14.5038 : feetToPsi(intakeHeadBoost)).toFixed(1)),
    requiredHeadBoost: Number((isMetric ? intakeHeadBoost * 0.3048 : intakeHeadBoost).toFixed(1)),
    horsepower: Number(intakeHp.toFixed(1)),
    spacingFromPrevious: 0,
    type: 'Intake Station',
    estimatedCost: Math.round(45000 + intakeHp * 280),
  });

  const startElevFt = coordinates[0].elevation;
  let currentSystemHeadFt = intakeHeadBoost;
  let accumulatedFrictionLossFt = 0;
  let lastPumpCoordIdx = 0;
  let lastPumpDistMiles = 0;

  // Min spacing constraint: at least 0.4 miles (2112 ft) or 8 coordinate nodes between booster pumps
  const MIN_PUMP_SPACING_MILES = 0.4;
  const MIN_PUMP_SPACING_NODES = 8;

  for (let i = 1; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const segLenFt = coord.segmentLength;
    const segLoss = (hf1000Ft / 1000) * segLenFt;
    accumulatedFrictionLossFt += segLoss;

    const staticDiffFt = coord.elevation - startElevFt;
    // Line pressure head at node i before pump boost
    const currentLineHeadFt = currentSystemHeadFt - staticDiffFt - accumulatedFrictionLossFt;

    const distFromLastPump = coord.distanceFromStart - lastPumpDistMiles;
    const nodesFromLastPump = i - lastPumpCoordIdx;

    // Trigger a booster pump ONLY when line pressure drops to or near min allowable pressure
    // AND minimum spacing constraint is met
    if (
      currentLineHeadFt <= minHeadFt + psiToFeet(5) &&
      distFromLastPump >= MIN_PUMP_SPACING_MILES &&
      nodesFromLastPump >= MIN_PUMP_SPACING_NODES
    ) {
      const pumpNodeIdx = i;
      const pumpCoord = coordinates[pumpNodeIdx];

      const suctionHeadFt = Math.max(0, currentLineHeadFt);
      const suctionPsi = feetToPsi(suctionHeadFt);

      // Boost head back up to target operating pressure + friction buffer
      const targetDischargeHeadFt = (pumpCoord.elevation - startElevFt) + accumulatedFrictionLossFt + targetHeadFt;
      const requiredBoostFt = Math.min(maxHeadFt, Math.max(psiToFeet(40), targetDischargeHeadFt - currentSystemHeadFt));

      const boosterHp = (flowGPM * requiredBoostFt) / (3960 * (config.pumpEfficiencyPct / 100) * config.safetyFactor);

      currentSystemHeadFt += requiredBoostFt;
      lastPumpCoordIdx = pumpNodeIdx;
      lastPumpDistMiles = pumpCoord.distanceFromStart;

      const pumpNum = pumps.length + 1;
      pumps.push({
        id: `pump-${pumpNum}`,
        pumpNumber: pumpNum,
        coordinateIndex: pumpNodeIdx,
        lat: pumpCoord.lat,
        lng: pumpCoord.lng,
        distanceFromStart: pumpCoord.distanceFromStart,
        elevation: pumpCoord.elevation,
        suctionPressure: Number((isMetric ? suctionPsi / 14.5038 : suctionPsi).toFixed(1)),
        dischargePressure: Number((isMetric ? feetToPsi(suctionHeadFt + requiredBoostFt) / 14.5038 : feetToPsi(suctionHeadFt + requiredBoostFt)).toFixed(1)),
        requiredHeadBoost: Number((isMetric ? requiredBoostFt * 0.3048 : requiredBoostFt).toFixed(1)),
        horsepower: Number(boosterHp.toFixed(1)),
        spacingFromPrevious: Number(distFromLastPump.toFixed(2)),
        type: 'Booster Pump',
        estimatedCost: Math.round(35000 + boosterHp * 250),
      });
    }
  }

  // Recalculate full pipeline hydraulics with optimized pump placements
  return calculatePipelineHydraulics(coordinates, config, pumps);
}
