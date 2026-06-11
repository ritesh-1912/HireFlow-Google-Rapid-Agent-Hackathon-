import React, { useState, useEffect } from "react";
import CandidateCard from "./CandidateCard";
import { UserCheck, Users, UserX, Loader2 } from "lucide-react";

export default function KanbanBoard({ jobId, compact = false }) {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const columns = [
    {
      id: "shortlisted",
      title: "Shortlisted",
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      colorClass: "bg-emerald-950/5 border-emerald-900/30",
      textClass: "text-emerald-400",
    },
    {
      id: "applied",
      title: "Applied",
      icon: <Users className="w-4 h-4 text-blue-400" />,
      colorClass: "bg-blue-950/5 border-blue-900/30",
      textClass: "text-blue-400",
    },
    {
      id: "rejected",
      title: "Rejected",
      icon: <UserX className="w-4 h-4 text-rose-400" />,
      colorClass: "bg-rose-950/5 border-rose-900/30",
      textClass: "text-rose-400",
    },
  ];

  const fetchCandidates = async () => {
    if (!jobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/candidates?job_id=${jobId}`);
      if (!response.ok) throw new Error("Failed to load candidates.");
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      console.error("Error loading candidates:", err);
      setError(err.message || "Could not retrieve candidate data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [jobId]);

  const handleMove = async (candidateId, newStatus) => {
    // Optimistic Update for UI responsiveness
    const prevCandidates = [...candidates];
    setCandidates((prev) =>
      prev.map((c) => (c._id === candidateId ? { ...c, status: newStatus } : c))
    );

    try {
      const response = await fetch(`${BASE_URL}/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to save updated status.");
    } catch (err) {
      console.error("Failed to update status on server, rolling back:", err);
      setCandidates(prevCandidates); // Rollback state
    }
  };

  const getCandidatesByStatus = (statusId) => {
    return candidates.filter((c) => c.status === statusId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
        <span className="text-xs text-zinc-500">Loading candidates...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center justify-between p-3 bg-rose-950/30 border border-rose-900/40 rounded-lg text-xs text-rose-400 animate-in fade-in duration-200">
          <span className="font-semibold">{error}</span>
          <button
            onClick={fetchCandidates}
            className="px-2 py-0.5 bg-rose-900/50 hover:bg-rose-900 text-white rounded text-[10px] font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed border-[#2e2e2e] rounded-xl p-6 bg-[#121212] text-center w-full animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-[#1c1c1c] border border-[#2e2e2e] flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">No candidates found</h3>
          <p className="text-xs text-zinc-500">
            Tell the AI agent who you're hiring for and upload resumes in the chat.
          </p>
        </div>
      ) : (
        <div className={compact ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-3 gap-6"}>
          {columns.map((col) => {
            const colCandidates = getCandidatesByStatus(col.id);

            return (
              <div
                key={col.id}
                className={`flex flex-col border rounded-xl p-4 bg-[#121212] ${col.colorClass} ${
                  compact ? "min-h-[150px] max-h-[350px]" : "min-h-[250px] md:h-[calc(100vh-240px)]"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#2e2e2e]">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h2 className="font-bold text-sm text-white">{col.title}</h2>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.textClass} bg-[#0a0a0a] border border-[#2e2e2e]`}>
                    {colCandidates.length}
                  </span>
                </div>

                {/* Candidates List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {colCandidates.length > 0 ? (
                    colCandidates.map((cand) => (
                      <CandidateCard
                        key={cand._id}
                        id={cand._id}
                        name={cand.name}
                        score={cand.score}
                        reasoning={cand.reasoning}
                        interviewQuestions={cand.interview_questions}
                        status={cand.status}
                        onMove={handleMove}
                      />
                    ))
                  ) : (
                    <div className="h-full min-h-[60px] flex flex-col items-center justify-center text-center p-2 border border-dashed border-[#2e2e2e] rounded-lg">
                      <span className="text-xs text-zinc-650">No candidates</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
