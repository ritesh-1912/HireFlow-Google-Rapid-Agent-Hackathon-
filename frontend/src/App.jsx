import React, { useState, useEffect } from "react";
import UploadPanel from "./components/UploadPanel";
import PipelineProgress from "./components/PipelineProgress";
import KanbanBoard from "./components/KanbanBoard";
import { Layers, Database, Sparkles, RefreshCw, ArrowLeft } from "lucide-react";

export default function App() {
  const [view, setView] = useState("upload"); // upload, pipeline, results
  const [jobId, setJobId] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(true);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleUploadSuccess = (newJobId) => {
    setJobId(newJobId);
    setView("pipeline");
  };

  const handlePipelineComplete = () => {
    setView("results");
  };

  const handleReset = () => {
    setJobId(null);
    setView("upload");
  };

  // Check active job and recover session on startup
  useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const response = await fetch(`${BASE_URL}/active-job`);
        if (response.ok) {
          const data = await response.json();
          const currentJobId = data.job_id;
          
          if (currentJobId && currentJobId !== "default_job_id") {
            setJobId(currentJobId);
            
            // Check status of the active job
            const statusRes = await fetch(`${BASE_URL}/pipeline-status?job_id=${currentJobId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === "completed") {
                setView("results");
              } else if (statusData.status === "running") {
                setView("pipeline");
              } else {
                setView("upload");
              }
            }
          }
        }
      } catch (err) {
        setIsDbConnected(false);
        console.error("Backend server unreachable on startup:", err);
      }
    };
    checkActiveJob();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-zinc-800 selection:text-white flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-[#2e2e2e] bg-[#0f0f0f] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black text-sm shadow">
            HF
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight m-0">HireFlow</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">AI Agent pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#161616] border border-[#2e2e2e] px-3 py-1.5 rounded-lg text-[10px] font-semibold">
            <Database className={`w-3.5 h-3.5 ${isDbConnected ? "text-emerald-500" : "text-rose-500"}`} />
            <span className="text-zinc-500">Atlas DB:</span>
            <span className={isDbConnected ? "text-zinc-350" : "text-rose-550"}>
              {isDbConnected ? "Connected" : "Offline"}
            </span>
          </div>

          {view === "results" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] border border-[#2e2e2e] hover:border-zinc-500 rounded-lg text-[10px] font-semibold text-zinc-350 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              New Campaign
            </button>
          )}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col justify-start">
        
        {/* Conditional View Rendering */}
        {view === "upload" && (
          <div className="max-w-xl mx-auto w-full py-8">
            <UploadPanel onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {view === "pipeline" && (
          <div className="max-w-md mx-auto w-full py-12">
            <PipelineProgress jobId={jobId} onComplete={handlePipelineComplete} />
          </div>
        )}

        {view === "results" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="text-zinc-400 w-4 h-4" />
                  Candidate Pipeline
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Drag, drop, and move candidates between columns to update status in MongoDB.
                </p>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-zinc-900 border border-[#2e2e2e] text-zinc-400 rounded-lg flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                Pipeline Evaluated
              </span>
            </div>

            <KanbanBoard jobId={jobId} />
          </div>
        )}

      </main>
    </div>
  );
}
