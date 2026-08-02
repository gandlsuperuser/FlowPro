'use client';

import React, { useState } from 'react';
import { UploadCloud, FileCheck, AlertCircle, Loader2, Compass, Route } from 'lucide-react';
import { extractKmlTextFromFile, parseKmlToPipelines, recalculatePipelineStats } from '../lib/gis/kmlParser';
import { batchFetchElevations } from '../lib/gis/usgsElevation';
import { PipelineGeometry } from '../lib/types';

interface FileUploaderProps {
  onPipelineParsed: (pipelines: PipelineGeometry[]) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onPipelineParsed,
  isProcessing,
  setIsProcessing,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setProgressMsg('Unpacking KMZ/KML structure...');
    setParsedFileName(file.name);

    try {
      const kmlText = await extractKmlTextFromFile(file);
      setProgressMsg('Extracting geometry, LineStrings & coordinate vectors...');

      const pipelines = parseKmlToPipelines(kmlText, file.name.replace(/\.[^/.]+$/, ''));

      setProgressMsg('Querying USGS 3DEP Elevation REST API for terrain data...');

      // Fetch elevations for the primary pipeline path
      for (let i = 0; i < pipelines.length; i++) {
        const pipe = pipelines[i];
        const updatedCoords = await batchFetchElevations(
          pipe.coordinates,
          (pct, curr, total) => {
            setProgressMsg(`Fetching USGS 3DEP Elevation (${pct}%) - ${curr}/${total} points`);
          }
        );
        pipelines[i] = recalculatePipelineStats({
          ...pipe,
          coordinates: updatedCoords,
        });
      }

      onPipelineParsed(pipelines);
      setProgressMsg('Processing complete!');
    } catch (err: any) {
      setError(err.message || 'Error processing GIS file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <UploadCloud className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-200">Import GIS File (KMZ / KML)</h2>
        </div>
        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          USGS 3DEP API Sync
        </span>
      </div>

      {/* Upload Dropzone */}
      <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all group">
        <div className="flex flex-col items-center justify-center pt-3 pb-4">
          <Route className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 mb-1 transition-colors" />
          <p className="text-xs text-slate-300 font-medium">
            <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Supports KMZ and KML files (LineStrings, Placemarks, Folders)</p>
        </div>
        <input
          type="file"
          accept=".kml,.kmz,.xml"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isProcessing}
        />
      </label>

      {/* Loading Progress Bar */}
      {isProcessing && (
        <div className="mt-3 bg-slate-950 border border-cyan-900/60 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-xs text-cyan-300 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{progressMsg}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-lg p-3 flex items-start space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Parsing Failure</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Active File Banner */}
      {parsedFileName && !isProcessing && !error && (
        <div className="mt-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold truncate max-w-[200px]">{parsedFileName}</span>
          </div>
          <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded font-mono">
            Active Dataset
          </span>
        </div>
      )}
    </div>
  );
};
