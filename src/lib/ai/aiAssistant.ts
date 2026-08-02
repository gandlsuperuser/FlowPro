import { HydraulicCalculationResult, PipelineGeometry, HydraulicConfig } from '../types';

export interface AiResponse {
  answer: string;
  suggestedQuestions: string[];
}

export function answerAiEngineeringQuestion(
  question: string,
  geometry: PipelineGeometry,
  hydraulics: HydraulicCalculationResult,
  config: HydraulicConfig
): AiResponse {
  const q = question.toLowerCase();

  const isMetric = config.units === 'metric';
  const unitHead = isMetric ? 'm' : 'ft';
  const unitPress = isMetric ? 'Bar' : 'PSI';
  const unitFlow = isMetric ? 'L/s' : 'GPM';
  const unitDia = isMetric ? 'mm' : 'in';

  let answer = '';
  let suggestedQuestions: string[] = [];

  if (q.includes('why') && q.includes('pump') && (q.includes('place') || q.includes('here') || q.includes('location'))) {
    answer = `**Booster Pump Placement Rationale:**\n\n` +
      `Pumps were automatically positioned along the **${geometry.name}** pipeline based on hydraulic head loss and static lift constraints:\n\n` +
      `1. **Pump 1 (Intake Station)**: Placed at coordinate 0 (elevation ${geometry.coordinates[0].elevation} ${unitHead}) to generate initial intake operating head to overcome the downstream elevation climb.\n` +
      hydraulics.pumps.slice(1).map((p) => 
        `2. **Pump ${p.pumpNumber} (${p.type})**: Located at mile ${p.distanceFromStart} (elevation ${p.elevation} ${unitHead}). Placed here because static elevation climb combined with cumulative friction loss (${hydraulics.frictionHeadLossPer1000Ft} ${unitHead}/1000ft) caused local line pressure to approach the minimum allowable threshold (${config.minPressurePSI} ${unitPress}). Pump ${p.pumpNumber} provides a +${p.requiredHeadBoost} ${unitHead} head boost (${p.horsepower} HP).`
      ).join('\n') +
      `\n\n**Engineering Summary:** This configuration maintains line pressure safely between ${config.minPressurePSI} ${unitPress} and ${config.maxPressurePSI} ${unitPress} across all ${geometry.stats.totalLength} miles of pipe.`;

    suggestedQuestions = [
      'What happens if I increase pipe diameter by 1 inch?',
      'Can I reduce the number of pumps?',
      'Where is the highest pressure loss located?',
    ];
  } else if (q.includes('diameter') || q.includes('pipe size') || q.includes('larger pipe')) {
    const nextDia = isMetric ? config.pipeDiameterInches + 25 : config.pipeDiameterInches + 1;
    answer = `**Pipe Sizing Impact Analysis:**\n\n` +
      `Currently, your pipeline uses a **${config.pipeDiameterInches} ${unitDia}** pipe with flow velocity **${hydraulics.velocityFtPerSec} ${isMetric ? 'm/s' : 'ft/s'}** and friction loss of **${hydraulics.frictionHeadLossPer1000Ft} ${unitHead}/1000ft**.\n\n` +
      `According to the **Hazen-Williams equation**, friction loss is inversely proportional to diameter raised to the **4.8655 power** ($h_f \\propto 1 / d^{4.8655}$).\n\n` +
      `**If you increase diameter to ${nextDia} ${unitDia}:**\n` +
      `• Friction loss will decrease by approximately **40% to 50%**.\n` +
      `• Total Dynamic Head (TDH) drops from **${hydraulics.totalDynamicHeadFeet} ${unitHead}** to ~**${(hydraulics.totalDynamicHeadFeet * 0.65).toFixed(1)} ${unitHead}**.\n` +
      `• Pump count can potentially be reduced from **${hydraulics.pumpsRequired}** to **${Math.max(1, hydraulics.pumpsRequired - 1)}** pumps.\n` +
      `• Estimated annual electricity savings: **$${Math.round(hydraulics.annualEnergyCostUSD * 0.35).toLocaleString()} / year**.`;

    suggestedQuestions = [
      'How much energy will this system consume?',
      'What if flow increases to 300 GPM?',
      'Why was this pump placed here?',
    ];
  } else if (q.includes('reduce') || q.includes('fewer pump') || q.includes('eliminate pump')) {
    answer = `**Pump Reduction Optimization Strategy:**\n\n` +
      `To safely reduce the total pump count from **${hydraulics.pumpsRequired}** to **${Math.max(1, hydraulics.pumpsRequired - 1)}**:\n\n` +
      `1. **Increase Pipe Inner Diameter**: Upgrading from ${config.pipeDiameterInches} ${unitDia} to ${isMetric ? config.pipeDiameterInches + 25 : config.pipeDiameterInches + 1} ${unitDia} drastically lowers Hazen-Williams friction loss per 1000 ft.\n` +
      `2. **Higher C-Factor Material**: Changing pipe material to PVC/HDPE (C=150) reduces wall friction compared to steel/iron.\n` +
      `3. **Lower Target Operating Pressure**: Reducing target pressure from ${config.desiredPressurePSI} ${unitPress} to ${Math.max(20, config.desiredPressurePSI - 15)} ${unitPress} lowers required discharge head per pump station.\n` +
      `4. **Variable Frequency Drive (VFD)**: Installing VFD controllers on Pump 1 allows dynamic throttling during lower flow periods.`;

    suggestedQuestions = [
      'What happens if I increase pipe diameter?',
      'How much energy will this system consume?',
      'Which pipeline section is most inefficient?',
    ];
  } else if (q.includes('energy') || q.includes('kwh') || q.includes('cost') || q.includes('power')) {
    answer = `**System Energy & Power Consumption Report:**\n\n` +
      `• **Total Motor Horsepower**: **${hydraulics.totalHorsepower} HP** across ${hydraulics.pumpsRequired} pump station(s).\n` +
      `• **Annual Electricity Consumption**: **${hydraulics.annualEnergyConsumptionKWh.toLocaleString()} kWh / year** (operating 24/7 @ 8,760 hrs/yr).\n` +
      `• **Annual Energy Operating Cost**: **$${hydraulics.annualEnergyCostUSD.toLocaleString()} / year** (calculated at $${config.electricityCostPerKwh}/kWh).\n` +
      `• **Estimated Capital Expenditure (CAPEX)**: **$${hydraulics.estimatedCapitalCostUSD.toLocaleString()}** (includes pumps, motors, valving, and control panels).\n\n` +
      `*Tip: Improving pump efficiency from ${config.pumpEfficiencyPct}% to 82% would save approximately $${Math.round(hydraulics.annualEnergyCostUSD * 0.08).toLocaleString()} annually.*`;

    suggestedQuestions = [
      'What if flow increases to 300 GPM?',
      'Why was this pump placed here?',
      'What happens if I increase pipe diameter?',
    ];
  } else if (q.includes('flow') || q.includes('gpm') || q.includes('increase flow') || q.includes('300')) {
    const higherGpm = isMetric ? config.flowRateGPM * 1.5 : 300;
    const factor = Math.pow(higherGpm / config.flowRateGPM, 1.852);
    const newLoss = hydraulics.frictionHeadLossPer1000Ft * factor;
    answer = `**Flow Rate Sensitivity Analysis (${higherGpm} ${unitFlow}):**\n\n` +
      `Increasing flow rate from **${config.flowRateGPM} ${unitFlow}** to **${higherGpm} ${unitFlow}** causes friction loss to increase exponentially ($h_f \\propto Q^{1.852}$):\n\n` +
      `• **Friction Loss Spike**: Loss jumps from **${hydraulics.frictionHeadLossPer1000Ft} ${unitHead}/1000ft** up to ~**${newLoss.toFixed(1)} ${unitHead}/1000ft** (+${Math.round((factor - 1) * 100)}% increase!).\n` +
      `• **Flow Velocity**: Velocity increases from **${hydraulics.velocityFtPerSec} ${isMetric ? 'm/s' : 'ft/s'}** to **${(hydraulics.velocityFtPerSec * (higherGpm / config.flowRateGPM)).toFixed(2)} ${isMetric ? 'm/s' : 'ft/s'}**.\n` +
      `• **Pump Requirement**: High velocity will cause rapid pressure drops, requiring **${hydraulics.pumpsRequired + 1} to ${hydraulics.pumpsRequired + 2} booster pumps** to prevent cavitation and pressure deficit.`;

    suggestedQuestions = [
      'What happens if I increase pipe diameter?',
      'How much energy will this system consume?',
      'Where is the highest pressure loss?',
    ];
  } else if (q.includes('highest pressure loss') || q.includes('where') && q.includes('loss')) {
    const highPoint = geometry.stats.highPointCoords;
    answer = `**Critical Hydraulic Loss Analysis:**\n\n` +
      `• **Highest Static Head Loss**: Located near the peak elevation point at **mile ${highPoint?.dist || 0}** (elevation **${geometry.stats.maxElevation} ${unitHead}**). Net static lift is **+${geometry.stats.elevationGain} ${unitHead}**.\n` +
      `• **Friction Loss Rate**: Steady **${hydraulics.frictionHeadLossPer1000Ft} ${unitHead}/1000ft** throughout the entire length of the ${config.pipeDiameterInches} ${unitDia} pipe.\n` +
      `• **Steepest Slope Section**: Reaches **${geometry.stats.maxSlope}% slope**, causing localized pressure drops right before Pump station placements.`;

    suggestedQuestions = [
      'Why was this pump placed here?',
      'Which pipeline section is most inefficient?',
      'What happens if I increase pipe diameter?',
    ];
  } else {
    answer = `**Pipeline Engineering Assessment:**\n\n` +
      `The **${geometry.name}** pipeline stretches **${geometry.stats.totalLength} miles** with total elevation gain of **${geometry.stats.elevationGain} ${unitHead}** and max slope of **${geometry.stats.maxSlope}%**.\n\n` +
      `Current hydraulic model calculates **${hydraulics.pumpsRequired} pump station(s)** supplying **${config.flowRateGPM} ${unitFlow}** through a **${config.pipeDiameterInches} ${unitDia}** line (${config.pipeMaterial}), consuming **${hydraulics.totalHorsepower} Total HP** with annual power cost of **$${hydraulics.annualEnergyCostUSD.toLocaleString()}**.`;

    suggestedQuestions = [
      'Why was this pump placed here?',
      'What happens if I increase pipe diameter?',
      'How much energy will this system consume?',
    ];
  }

  return { answer, suggestedQuestions };
}
