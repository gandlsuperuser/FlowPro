import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { HydraulicCalculationResult, PipelineGeometry, HydraulicConfig } from '../types';

export function exportToCSV(geometry: PipelineGeometry, hydraulics: HydraulicCalculationResult): void {
  const data = hydraulics.coordinates.map((c) => ({
    'Point ID': c.id,
    'Latitude': c.lat,
    'Longitude': c.lng,
    'Elevation': c.elevation,
    'Distance From Start': c.distanceFromStart,
    'Segment Length': c.segmentLength,
    'Bearing (deg)': c.bearing,
    'Slope (%)': c.slope,
    'Pressure': c.pressure ?? '',
    'Head Loss': c.headLoss ?? '',
    'Velocity': c.velocity ?? '',
    'Static Head': c.staticHead ?? '',
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${geometry.name.replace(/\s+/g, '_')}_hydraulic_data.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(geometry: PipelineGeometry, hydraulics: HydraulicCalculationResult, config: HydraulicConfig): void {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Project Parameter', 'Value'],
    ['Pipeline Name', geometry.name],
    ['Total Length', `${geometry.stats.totalLength} miles`],
    ['Elevation Gain', `${geometry.stats.elevationGain} ft`],
    ['Elevation Loss', `${geometry.stats.elevationLoss} ft`],
    ['Max Elevation', `${geometry.stats.maxElevation} ft`],
    ['Min Elevation', `${geometry.stats.minElevation} ft`],
    ['Flow Rate', `${config.flowRateGPM} ${config.units === 'metric' ? 'L/s' : 'GPM'}`],
    ['Pipe Diameter', `${config.pipeDiameterInches} ${config.units === 'metric' ? 'mm' : 'inches'}`],
    ['Pipe Material', config.pipeMaterial],
    ['Hazen-Williams C Factor', config.cFactor],
    ['Total Dynamic Head (TDH)', `${hydraulics.totalDynamicHeadFeet} ft`],
    ['Total Friction Loss', `${hydraulics.totalFrictionHeadLossFeet} ft`],
    ['Required Pumps', hydraulics.pumpsRequired],
    ['Total Motor Horsepower', `${hydraulics.totalHorsepower} HP`],
    ['Annual Energy Consumption', `${hydraulics.annualEnergyConsumptionKWh.toLocaleString()} kWh`],
    ['Annual Energy Cost', `$${hydraulics.annualEnergyCostUSD.toLocaleString()}`],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Project Summary');

  // Pumps Sheet
  const pumpsData = hydraulics.pumps.map((p) => ({
    'Pump #': p.pumpNumber,
    'Type': p.type,
    'Distance (miles)': p.distanceFromStart,
    'Elevation (ft)': p.elevation,
    'Suction Pressure': p.suctionPressure,
    'Discharge Pressure': p.dischargePressure,
    'Required Boost (ft)': p.requiredHeadBoost,
    'Horsepower (HP)': p.horsepower,
    'Estimated Cost ($)': p.estimatedCost,
  }));
  const pumpsSheet = XLSX.utils.json_to_sheet(pumpsData);
  XLSX.utils.book_append_sheet(workbook, pumpsSheet, 'Pumps Schedule');

  // Coordinates Sheet
  const coordsData = hydraulics.coordinates.map((c) => ({
    'Lat': c.lat,
    'Lng': c.lng,
    'Elevation': c.elevation,
    'Distance': c.distanceFromStart,
    'Pressure': c.pressure,
    'Head Loss': c.headLoss,
    'Velocity': c.velocity,
    'Static Head': c.staticHead,
  }));
  const coordsSheet = XLSX.utils.json_to_sheet(coordsData);
  XLSX.utils.book_append_sheet(workbook, coordsSheet, 'Pipeline Profile Data');

  XLSX.writeFile(workbook, `${geometry.name.replace(/\s+/g, '_')}_Engineering_Report.xlsx`);
}

export function exportToGeoJSON(geometry: PipelineGeometry, hydraulics: HydraulicCalculationResult): void {
  const lineStringCoords = geometry.coordinates.map((c) => [c.lng, c.lat, c.elevation]);
  
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineStringCoords,
        },
        properties: {
          name: geometry.name,
          totalLengthMiles: geometry.stats.totalLength,
          elevationGainFt: geometry.stats.elevationGain,
          totalPumps: hydraulics.pumpsRequired,
          totalHP: hydraulics.totalHorsepower,
        },
      },
      ...hydraulics.pumps.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat, p.elevation],
        },
        properties: {
          pumpNumber: p.pumpNumber,
          type: p.type,
          horsepower: p.horsepower,
          dischargePressure: p.dischargePressure,
          distanceFromStart: p.distanceFromStart,
        },
      })),
    ],
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${geometry.name.replace(/\s+/g, '_')}.geojson`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToKML(geometry: PipelineGeometry, hydraulics: HydraulicCalculationResult): void {
  const coordsStr = geometry.coordinates.map((c) => `${c.lng},${c.lat},${c.elevation}`).join(' ');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${geometry.name}</name>
    <description>Optimized Water Pipeline Geometry &amp; Pump Stations</description>
    <Placemark>
      <name>${geometry.name} Path</name>
      <LineString>
        <coordinates>${coordsStr}</coordinates>
      </LineString>
    </Placemark>
    ${hydraulics.pumps
      .map(
        (p) => `
    <Placemark>
      <name>Pump Station #${p.pumpNumber} (${p.type})</name>
      <description>HP: ${p.horsepower} HP | Discharge: ${p.dischargePressure} PSI</description>
      <Point>
        <coordinates>${p.lng},${p.lat},${p.elevation}</coordinates>
      </Point>
    </Placemark>`
      )
      .join('')}
  </Document>
</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${geometry.name.replace(/\s+/g, '_')}_optimized.kml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDFReport(geometry: PipelineGeometry, hydraulics: HydraulicCalculationResult, config: HydraulicConfig): void {
  const doc = new jsPDF();
  const unitHead = config.units === 'metric' ? 'm' : 'ft';
  const unitPress = config.units === 'metric' ? 'Bar' : 'PSI';

  // Title Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('AI-POWERED ELEVATION & HYDRAULIC OPTIMIZATION REPORT', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Project: ${geometry.name}`, 14, 26);

  // Section 1: Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Project Summary', 14, 44);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Pipeline Distance: ${geometry.stats.totalLength} miles (${geometry.stats.totalLengthFeetOrMeters} ${unitHead})`, 14, 52);
  doc.text(`Elevation Gain / Loss: +${geometry.stats.elevationGain} ${unitHead} / -${geometry.stats.elevationLoss} ${unitHead}`, 14, 58);
  doc.text(`Max / Min Elevation: ${geometry.stats.maxElevation} ${unitHead} / ${geometry.stats.minElevation} ${unitHead}`, 14, 64);
  doc.text(`Max Slope: ${geometry.stats.maxSlope}%`, 14, 70);

  // Section 2: Hydraulic Configuration & Hazen-Williams
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Hydraulic Design & Loss Parameters', 14, 82);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Flow Rate: ${config.flowRateGPM} ${config.units === 'metric' ? 'L/s' : 'GPM'}`, 14, 90);
  doc.text(`Pipe Inner Diameter: ${config.pipeDiameterInches} ${config.units === 'metric' ? 'mm' : 'in'} (${config.pipeMaterial})`, 14, 96);
  doc.text(`Hazen-Williams C Coefficient: ${config.cFactor}`, 14, 102);
  doc.text(`Flow Velocity: ${hydraulics.velocityFtPerSec} ${config.units === 'metric' ? 'm/s' : 'ft/s'}`, 14, 108);
  doc.text(`Friction Head Loss Rate: ${hydraulics.frictionHeadLossPer1000Ft} ${unitHead} per 1,000 ft`, 14, 114);
  doc.text(`Total Dynamic Head (TDH): ${hydraulics.totalDynamicHeadFeet} ${unitHead}`, 14, 120);

  // Section 3: Recommended Booster Pumps Schedule
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Optimized Booster Pump Schedule', 14, 134);

  let y = 144;
  doc.setFontSize(9);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setTextColor(15, 23, 42);
  doc.text('Pump #  Type            Mile    Elev(ft)  Suction(PSI) Discharge(PSI) Head Boost(ft) Power(HP)', 16, y);

  y += 8;
  doc.setTextColor(51, 65, 85);
  hydraulics.pumps.forEach((p) => {
    const line = `#${p.pumpNumber}      ${p.type.padEnd(16)} ${p.distanceFromStart.toFixed(1).padEnd(7)} ${p.elevation.toString().padEnd(9)} ${p.suctionPressure.toString().padEnd(13)} ${p.dischargePressure.toString().padEnd(14)} ${p.requiredHeadBoost.toString().padEnd(14)} ${p.horsepower} HP`;
    doc.text(line, 16, y);
    y += 7;
  });

  // Section 4: Power & Energy Economics
  y += 8;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Energy & Operational Expenditure', 14, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Installed Motor Horsepower: ${hydraulics.totalHorsepower} HP`, 14, y);
  doc.text(`Estimated Annual Power Consumption: ${hydraulics.annualEnergyConsumptionKWh.toLocaleString()} kWh/yr`, 14, y + 6);
  doc.text(`Estimated Annual Electricity Cost: $${hydraulics.annualEnergyCostUSD.toLocaleString()} / year`, 14, y + 12);
  doc.text(`Estimated Total Capital Expense (CAPEX): $${hydraulics.estimatedCapitalCostUSD.toLocaleString()}`, 14, y + 18);

  doc.save(`${geometry.name.replace(/\s+/g, '_')}_Engineering_Report.pdf`);
}
