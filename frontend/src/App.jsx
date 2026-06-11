import React, { useState, useEffect } from "react";
import KanbanBoard from "./components/KanbanBoard";
import AskHireflowAI from "./components/AskHireflowAI";
import { Layers, Database, Sparkles, ArrowLeft } from "lucide-react";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const triggerKanbanRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleReset = () => {
    setJobId(null);
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
          }
        }
      } catch (err) {
        setIsDbConnected(false);
        console.error("Backend server unreachable on startup:", err);
      }
    };
    checkActiveJob();
  }, []);

  // Auto-refresh Kanban board every 5 seconds if jobId is active
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(() => {
      triggerKanbanRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="min-h-screen h-screen bg-[#0f0f0f] text-white font-sans selection:bg-zinc-800 selection:text-white flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="border-b border-[#2e2e2e] bg-[#0f0f0f] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black text-sm shadow">
            HF
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight m-0">HireFlow</h1>
            <p className="text-[9px] text-zinc-550 uppercase tracking-widest font-semibold">AI Agent pipeline</p>
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

          {jobId && (
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

      {/* Split Screen Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex gap-6 overflow-hidden min-h-0">
        {/* LEFT 35%: Kanban Board */}
        <div className="w-[35%] flex flex-col border border-[#2e2e2e] bg-[#121212] rounded-xl overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-[#2e2e2e] bg-[#161616] flex items-center justify-between">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="text-zinc-400 w-4 h-4" />
              Candidate Pipeline
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {jobId ? (
              <KanbanBoard jobId={jobId} compact={true} key={refreshTrigger} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-sm">
                <Layers className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
                <p className="font-semibold text-zinc-400">No active campaign</p>
                <p className="text-xs mt-1 text-zinc-650">Upload resumes in the chat to start.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 65%: Agent Chat */}
        <div className="w-[65%] flex flex-col border border-[#2e2e2e] bg-[#121212] rounded-xl overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-[#2e2e2e] bg-[#161616] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-400" />
              <div>
                <h2 className="text-xs font-bold text-white">HireFlow AI Agent</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Conversational Recruiter</p>
              </div>
            </div>
            {jobId && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#0a0a0a] border border-[#2e2e2e] text-zinc-500 rounded">
                Active Job ID: {jobId.substring(0, 8)}...
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <AskHireflowAI
              jobId={jobId}
              setJobId={setJobId}
              triggerKanbanRefresh={triggerKanbanRefresh}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
