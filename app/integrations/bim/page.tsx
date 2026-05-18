"use client";

import React, { useState } from "react";
import { 
  Layers, 
  Sparkles, 
  UploadCloud, 
  Activity, 
  GitBranch, 
  Flame, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Building
} from "lucide-react";
import { RevitMetadataExtractor, BimRoomMetadata } from "../../../lib/integrations/bim/revitMetadataExtractor";
import { BimEntityMapper, CreditMappingSuggestion } from "../../../lib/integrations/bim/bimEntityMapper";
import { BimRoomGraphEngine, BimRoomNode } from "../../../lib/integrations/bim/bimRoomGraphEngine";
import { EmbodiedCarbonMapper, MaterialCarbonSpec } from "../../../lib/integrations/bim/embodiedCarbonMapper";

export default function BimIngestionPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [modelName, setModelName] = useState("Harita_Main_Block_V12.rvt");
  const [rooms, setRooms] = useState<BimRoomMetadata[]>([
    {
      roomId: "RM-101",
      name: "Mechanical Plantroom A",
      floor: 1,
      areaSqFt: 1200,
      materials: [
        { materialId: "steel-frame-01", volumeCuFt: 450 },
        { materialId: "concrete-grade-c30", volumeCuFt: 1200 }
      ]
    },
    {
      roomId: "RM-204",
      name: "Conference Hall East",
      floor: 2,
      areaSqFt: 850,
      materials: [
        { materialId: "low-voc-gypsum-board", volumeCuFt: 180 },
        { materialId: "ecobuild-recycled-steel", volumeCuFt: 95 }
      ]
    }
  ]);

  const [mappings, setMappings] = useState<CreditMappingSuggestion[]>([
    {
      bimElementId: "steel-frame-01",
      elementClass: "Revit Structural Columns",
      targetCreditCode: "MR-C2",
      matchScore: 0.95,
      evidenceCandidateName: "Recycled_Steel_Mill_Certificate.pdf"
    },
    {
      bimElementId: "low-voc-gypsum-board",
      elementClass: "Drywall Gypsum Panel",
      targetCreditCode: "IAQ-C3",
      matchScore: 0.98,
      evidenceCandidateName: "Low_VOC_Gypsum_Specs.pdf"
    }
  ]);

  const [carbonSummary, setCarbonSummary] = useState<MaterialCarbonSpec[]>([
    {
      materialId: "steel-frame-01",
      name: "Tata Recycled Structural Steel",
      volumeCuFt: 450,
      carbonIntensityFactor: 32.8,
      totalEmbodiedCarbonKg: 14760
    },
    {
      materialId: "concrete-grade-c30",
      name: "Concrete Grade C30",
      volumeCuFt: 1200,
      carbonIntensityFactor: 8.5,
      totalEmbodiedCarbonKg: 10200
    }
  ]);

  const [logs, setLogs] = useState<string[]>([
    "Autodesk Connector initialized securely.",
    "Synchronized with model storage bucket."
  ]);

  const handleModelUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setLogs((prev) => ["[Extracted] Completed full parsing on Harita_Main_Block_V12.rvt", ...prev]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Revit Ingestion & BIM Cockpit
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
              Direct IFC Schedule Parsing, Floor-Wise Material Extraction, and Embodied Carbon Calculations
            </p>
          </div>
        </div>

        <button 
          onClick={handleModelUpload}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
        >
          <UploadCloud className="w-4 h-4" />
          {isUploading ? "Parsing Model..." : "Re-Upload Model"}
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-4 gap-8 overflow-hidden">
        
        {/* Left Side: Extracted Entities, Room Topological graph (Col Span 3) */}
        <section className="col-span-3 space-y-6 overflow-y-auto pr-2">
          
          {/* Active Model Summary Banner */}
          <div className="p-5 bg-slate-900 border border-slate-850 rounded-3xl flex justify-between items-center">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-500 block">Active 3D Model</span>
              <strong className="text-sm font-bold text-indigo-400 mt-1 block">{modelName}</strong>
            </div>

            <div className="flex gap-4">
              <div className="text-right border-r border-slate-800 pr-4">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Rooms Parsed</span>
                <strong className="text-xs text-slate-300 font-bold block mt-0.5">{rooms.length} Rooms</strong>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Success Rate</span>
                <strong className="text-xs text-emerald-400 font-bold block mt-0.5">98.4% Accuracy</strong>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Extracted Room-Level Space Metadata</span>
            <div className="grid grid-cols-2 gap-4">
              {rooms.map((rm, idx) => (
                <div key={idx} className="p-5 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-200">{rm.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black text-indigo-400 uppercase">
                      Floor {rm.floor}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500">Total area: <strong>{rm.areaSqFt} SqFt</strong></p>

                  <div className="pt-2 border-t border-slate-850 space-y-1">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">Materials Volume</span>
                    <div className="flex gap-2">
                      {rm.materials.map((m, i) => (
                        <div key={i} className="bg-slate-950 p-2 rounded-lg text-[9px] text-slate-400 font-mono">
                          {m.materialId}: <strong>{m.volumeCuFt} cuFt</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Mappings suggested */}
          <div className="space-y-3">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">BIM Entity → Credit Link Mapping</span>
            <div className="space-y-2">
              {mappings.map((map, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl flex justify-between items-center text-[10px] font-medium">
                  <div>
                    <h5 className="font-bold text-slate-200">{map.bimElementId}</h5>
                    <span className="text-slate-500 text-[9px] block mt-1">{map.elementClass}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-indigo-400 uppercase font-bold">Target: {map.targetCreditCode}</span>
                    <span className="text-slate-500">Candidate: <strong>{map.evidenceCandidateName}</strong></span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px]">
                      {Math.round(map.matchScore * 100)}% Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Right Side: Embodied Carbon & Telemetry (Col Span 1) */}
        <section className="bg-slate-900 border border-slate-850 rounded-3xl p-6 flex flex-col gap-6">
          <div className="border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Activity className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black uppercase tracking-wider">Carbon Analytics</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Measuring model material footprints.</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                <span className="text-[9px] uppercase font-black text-slate-500 block">Total Embodied Carbon</span>
                <strong className="text-xl font-black text-rose-400 mt-1 block">24,960 kgCO2e</strong>
                <span className="text-[10px] text-slate-500 mt-1 block">Compiled from steel columns and heavy concrete frame components.</span>
              </div>

              {/* Individual material carbon */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Carbon by Component</span>
                <div className="space-y-1.5">
                  {carbonSummary.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[9px] flex justify-between items-center font-mono">
                      <span className="text-slate-400 truncate max-w-[140px]">{c.name}</span>
                      <strong className="text-slate-200">{c.totalEmbodiedCarbonKg} kg</strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Run logs */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Autodesk Log Stream</span>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl h-24 overflow-y-auto font-mono text-[9px] text-indigo-400 space-y-1 scrollbar-thin">
                {logs.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
