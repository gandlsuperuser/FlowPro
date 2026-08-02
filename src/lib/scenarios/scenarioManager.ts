import { HydraulicConfig, PipelineCoordinate, Scenario } from '../types';
import { optimizePumpPlacement } from '../hydraulics/pumpOptimizer';

export function createDefaultScenarios(
  baseConfig: HydraulicConfig,
  coordinates: PipelineCoordinate[]
): Scenario[] {
  const isMetric = baseConfig.units === 'metric';
  const unitFlow = isMetric ? 'L/s' : 'GPM';

  // Scenario A: 12" Standard Pipeline Main
  const configA: HydraulicConfig = {
    ...baseConfig,
    pipeDiameterInches: isMetric ? 300 : 12,
  };
  const resultA = optimizePumpPlacement(coordinates, configA);

  // Scenario B: 16" Large Diameter Main (Upsized to 16" to reduce friction loss)
  const configB: HydraulicConfig = {
    ...baseConfig,
    pipeDiameterInches: isMetric ? 400 : 16,
  };
  const resultB = optimizePumpPlacement(coordinates, configB);

  // Scenario C: 16" High Capacity Flow Main
  const configC: HydraulicConfig = {
    ...baseConfig,
    pipeDiameterInches: isMetric ? 400 : 16,
    flowRateGPM: Math.round(baseConfig.flowRateGPM * 1.4),
  };
  const resultC = optimizePumpPlacement(coordinates, configC);

  return [
    {
      id: 'scenario-a',
      name: 'Scenario A (12" Standard Main)',
      description: `12" Standard Pipeline @ ${configA.flowRateGPM} ${unitFlow}`,
      config: configA,
      result: resultA,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'scenario-b',
      name: 'Scenario B (16" Heavy-Duty Main)',
      description: `16" Large Diameter Line @ ${configB.flowRateGPM} ${unitFlow} (Low Friction Loss)`,
      config: configB,
      result: resultB,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'scenario-c',
      name: 'Scenario C (16" High-Capacity Main)',
      description: `16" Heavy-Duty Line @ ${configC.flowRateGPM} ${unitFlow} (High Flow Capacity)`,
      config: configC,
      result: resultC,
      createdAt: new Date().toISOString(),
    },
  ];
}
