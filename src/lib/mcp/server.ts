import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import { addGeometry, getGeometry } from '../../lib/mcp/store';
import { optimizePumpPlacement } from '../../lib/hydraulics/pumpOptimizer';
import { generateReport } from '../../lib/export/reportGenerator';
import type { HydraulicConfig } from '../../lib/types';

export function createMcpServer() {
  const server = new Server(
    {
      name: 'hydroelevation-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'upload_pipeline_geometry',
          description: 'Upload pipeline geometry (KML/KMZ parsed data) into MCP store',
          inputSchema: {
            type: 'object',
            properties: {
              geometry: {
                type: 'object',
                description: 'Parsed PipelineGeometry object',
              },
            },
            required: ['geometry'],
          },
        },
        {
          name: 'calculate_hydraulics',
          description: 'Run hydraulic calculation and pump optimization for a given pipeline ID and configuration',
          inputSchema: {
            type: 'object',
            properties: {
              pipelineId: { type: 'string', description: 'Pipeline ID returned from upload tool' },
              config: {
                type: 'object',
                description: 'Hydraulic configuration options (flowRateGPM, pipeDiameterInches, etc.)',
              },
            },
            required: ['pipelineId', 'config'],
          },
        },
        {
          name: 'generate_engineering_report',
          description: 'Generate engineering PDF report for a given pipeline ID',
          inputSchema: {
            type: 'object',
            properties: {
              pipelineId: { type: 'string', description: 'Pipeline ID returned from upload tool' },
              options: { type: 'object', description: 'Report formatting options' },
            },
            required: ['pipelineId'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'upload_pipeline_geometry') {
      const geometry = (args as any)?.geometry;
      if (!geometry) {
        throw new Error('Missing geometry object');
      }
      const pipelineId = uuidv4();
      addGeometry(pipelineId, geometry);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pipelineId, geometry }, null, 2),
          },
        ],
      };
    }

    if (name === 'calculate_hydraulics') {
      const pipelineId = (args as any)?.pipelineId;
      const config = (args as any)?.config as HydraulicConfig;
      if (!pipelineId || !config) {
        throw new Error('Missing pipelineId or config');
      }
      const geometry = getGeometry(pipelineId);
      if (!geometry) {
        throw new Error(`Pipeline geometry not found for ID: ${pipelineId}`);
      }
      const result = await optimizePumpPlacement(geometry.coordinates, config);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'generate_engineering_report') {
      const pipelineId = (args as any)?.pipelineId;
      const options = (args as any)?.options || {};
      if (!pipelineId) {
        throw new Error('Missing pipelineId');
      }
      const geometry = getGeometry(pipelineId);
      if (!geometry) {
        throw new Error(`Pipeline geometry not found for ID: ${pipelineId}`);
      }
      const reportPath = await generateReport(geometry, options);
      const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/reports/${reportPath}`;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ downloadUrl }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}
