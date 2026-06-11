import React, { useState, useEffect } from "react";
import { Check, Loader2, Play, Circle, AlertCircle } from "lucide-react";

export default function PipelineProgress({ jobId, onComplete }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const steps = [
    "Parsing Resumes",
    "Structuring with Gemini",
    "Generating Embeddings",
    "Running Vector Search",
    "Ranking Candidates",
  ];

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${BASE_URL}/pipeline-status?job_id=${jobId}`);
        if (!response.ok) throw new Error("Failed to fetch status");
        const data = await response.json();
        setStatus(data);

        if (data.status === "completed") {
          // Allow short delay so user sees last step completed
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } catch (err) {
        console.error("Error polling pipeline status:", err);
        setError(err.message);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const getStepStatus = (stepName) => {
    if (!status || !status.steps) return "pending";
    return status.steps[stepName] || "pending";
  };

  const getStepIcon = (stepName) => {
    const stepStatus = getStepStatus(stepName);
    switch (stepStatus) {
      case "completed":
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
        );
      case "running":
        return (
          <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-500 flex items-center justify-center text-white shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-[#0a0a0a] border border-[#2e2e2e] flex items-center justify-center text-zinc-700 shrink-0">
            <Circle className="w-1.5 h-1.5 fill-current" />
          </div>
        );
    }
  };

  return (
    <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl p-6 shadow-md transition-all duration-300">
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <Play className="text-zinc-400 w-4 h-4 fill-current" />
        Execution Pipeline
      </h2>

      <div className="relative pl-0.5">
        {/* Vertical Connector Line */}
        <div className="absolute left-[9px] top-3 bottom-3 w-[1px] bg-[#2e2e2e]" />

        <div className="space-y-5 relative">
          {steps.map((step, idx) => {
            const stepStatus = getStepStatus(step);
            const isActive = stepStatus === "running";
            const isDone = stepStatus === "completed";

            return (
              <div
                key={idx}
                className={`flex items-start gap-4 transition-all duration-200 ${
                  isActive ? "opacity-100" : isDone ? "opacity-95" : "opacity-40"
                }`}
              >
                {getStepIcon(step)}

                <div className="mt-0.5">
                  <h3
                    className={`text-xs font-semibold ${
                      isActive ? "text-white" : isDone ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {step}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(error || (status && status.error)) && (
        <div className="mt-5 p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-lg flex items-start gap-2.5 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Pipeline Execution Failed</span>
            <span className="font-mono text-[10px] break-all">
              {error || status.error}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
