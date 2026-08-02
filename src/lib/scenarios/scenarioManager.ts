import { HydraulicConfig, PipelineCoordinate, Scenario } from '../types';
import { optimizePumpPlacement } from '../hydraulics/pumpOptimizer';

export function createDefaultScenarios(
  baseConfig: HydraulicConfig,
  coordinates: PipelineCoordinate[]
): Scenario[] {
  // Scenario A: Standard Base Design
  const configA: HydraulicConfig = { ...baseConfig };
  const resultA = optimizePumpPlacement(coordinates, configA);

  // Scenario B: Upsized Pipe Diameter (+1 or +2 inches) to reduce friction loss
  const configB: HydraulicConfig = {
    ...baseConfig,
    pipeDiameterInches: baseConfig.units === 'metric' ? baseConfig.pipeDiameterInches + 25 : baseConfig.pipeDiameterInches + 1,
  };
  const resultB = optimizePumpPlacement(coordinates, configB);

  // Scenario C: High Pressure / Increased Flow
  const configC: HydraulicConfig = {
    ...baseConfig,
    flowRateGPM: Math.round(baseConfig.flowRateGPM * 1.3),
  };
  const resultC = optimizePumpPlacement(coordinates, configC);

  return [
    {
      id: 'scenario-a',
      name: 'Scenario A (Baseline Design)',
      description: `${configA.pipeDiameterInches}" Pipe @ ${configA.flowRateGPM} ${configA.units === 'metric' ? 'L/s' : 'GPM'}`,
      config: configA,
      result: resultA,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'scenario-b',
      name: 'Scenario B (Upsized Diameter)',
      description: `${configB.pipeDiameterInches}" Pipe @ ${configB.flowRateGPM} ${configB.units === 'metric' ? 'L/s' : 'GPM'} (Low Friction Loss)`,
      config: configB,
      result: resultB,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'scenario-c',
      name: 'Scenario C (High Capacity Flow)',
      description: `${configC.pipeDiameterInches}" Pipe @ ${configC.flowRateGPM} ${configC.units === 'metric' ? 'L/s' : 'GPM'} (High Capacity)`,
      config: configC,
      result: resultC,
      createdAt: new Date().toISOString(),
    },
  ];
}
