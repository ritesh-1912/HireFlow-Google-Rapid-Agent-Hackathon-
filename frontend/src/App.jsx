import React, { useState, useEffect } from "react";
import UploadPanel from "./components/UploadPanel";
import PipelineProgress from "./components/PipelineProgress";
import KanbanBoard from "./components/KanbanBoard";
import { Layers, Database, Sparkles, RefreshCw, ArrowLeft, X } from "lucide-react";

export default function App() {
  const [view, setView] = useState("upload"); // upload, pipeline, results
  const [jobId, setJobId] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col justify-start">
        
        {/* Conditional View Rendering */}
        {view === "upload" && (
          <div className="max-w-xl mx-auto w-full py-4 md:py-8">
            <UploadPanel onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {view === "pipeline" && (
          <div className="max-w-md mx-auto w-full py-8 md:py-12">
            <PipelineProgress jobId={jobId} onComplete={handlePipelineComplete} />
          </div>
        )}

        {view === "results" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2e2e2e] pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="text-zinc-400 w-5 h-5" />
                  Candidate Pipeline
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Drag, drop, and move candidates between columns to update status in MongoDB.
                </p>
              </div>

              <span className="self-start sm:self-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-zinc-900 border border-[#2e2e2e] text-zinc-400 rounded-lg flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                Pipeline Evaluated
              </span>
            </div>

            <KanbanBoard jobId={jobId} />
          </div>
        )}
      </main>

      {/* Floating AI Agent Trigger Button */}
      <button
        onClick={() => setIsAgentOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-full shadow-lg shadow-black/50 transition-all z-40 hover:scale-105"
      >
        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
        Ask HireFlow AI
      </button>

      {/* Slide-out AI Agent Chat Drawer */}
      {isAgentOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Click backdrop to close */}
          <div className="flex-1" onClick={() => setIsAgentOpen(false)} />
          
          <div className="w-full max-w-lg h-full bg-[#121212] border-l border-[#2e2e2e] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e] bg-[#161616]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-zinc-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">HireFlow AI Agent</h2>
                  <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-semibold">Conversational Recruiter</p>
                </div>
              </div>
              <button
                onClick={() => setIsAgentOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Body (Iframe pointing to the deployed ADK UI) */}
            <div className="flex-1 bg-black relative">
              <iframe
                src="https://hireflow-agent-72571306030.us-central1.run.app/dev-ui/"
                title="HireFlow AI Agent Chat"
                className="w-full h-full border-none"
                allow="microphone; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
