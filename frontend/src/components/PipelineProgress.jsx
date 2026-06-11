import React, { useState, useEffect } from "react";
import { Check, Loader2, Play, Circle, AlertCircle } from "lucide-react";

export default function PipelineProgress({ jobId, onComplete }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

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
  }, [jobId, onComplete, retryTrigger]);

  const handleRetry = async () => {
    setError(null);
    setStatus(null);
    // If the pipeline was in a failed state, try to re-trigger it
    if (status && status.status === "failed") {
      try {
        await fetch(`${BASE_URL}/run-pipeline`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ job_id: jobId }),
        });
      } catch (err) {
        console.error("Failed to re-trigger pipeline on retry:", err);
      }
    }
    setRetryTrigger((prev) => prev + 1);
  };

  const getStepStatus = (stepName) => {
    if (!status || !status.steps) return "pending";
    return status.steps[stepName] || "pending";
  };

  const getStepIcon = (stepName) => {
    const stepStatus = getStepStatus(stepName);
    switch (stepStatus) {
      case "completed":
        return (
          <div className="w-6 h-6 rounded-full bg-[#0f1f15] border border-emerald-500 flex items-center justify-center text-emerald-450 shrink-0 shadow-sm shadow-emerald-500/20">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        );
      case "running":
        return (
          <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
            {/* Pulsing radar ring */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/20 animate-ping opacity-75"></span>
            {/* Center pulsing indicator */}
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-md animate-pulse"></span>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-[#0a0a0a] border border-[#2e2e2e] flex items-center justify-center text-zinc-700 shrink-0">
            <Circle className="w-2.5 h-2.5 fill-current" />
          </div>
        );
    }
  };

  return (
    <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl p-6 shadow-md transition-all duration-300">
      <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <Play className="text-zinc-400 w-4 h-4 fill-current" />
        Execution Pipeline
      </h2>

      <div className="relative pl-0.5">
        {/* Vertical Connector Line */}
        <div className="absolute left-[11px] top-4.5 bottom-4.5 w-[1px] bg-[#2e2e2e]" />

        <div className="space-y-6 relative">
          {steps.map((step, idx) => {
            const stepStatus = getStepStatus(step);
            const isActive = stepStatus === "running";
            const isDone = stepStatus === "completed";

            return (
              <div
                key={idx}
                className={`flex items-center gap-4 transition-all duration-200 ${
                  isActive ? "opacity-100" : isDone ? "opacity-95" : "opacity-40"
                }`}
              >
                {getStepIcon(step)}

                <div>
                  <h3
                    className={`text-sm font-semibold ${
                      isActive ? "text-white animate-pulse" : isDone ? "text-zinc-350" : "text-zinc-550"
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

      {(error || (status && status.status === "failed")) && (
        <div className="mt-6 p-4 bg-rose-950/30 border border-rose-900/40 rounded-lg flex flex-col gap-3 text-sm text-rose-400 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Pipeline Execution Failed</span>
              <span className="font-mono text-xs break-all">
                {error || (status && status.error) || "Hiring analysis failed."}
              </span>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="self-end px-3 py-1 bg-rose-900/50 hover:bg-rose-900 text-white rounded text-xs font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
