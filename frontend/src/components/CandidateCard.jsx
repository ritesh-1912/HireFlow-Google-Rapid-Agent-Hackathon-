import React, { useState } from "react";
import { ChevronDown, HelpCircle, MessageSquare, Loader2 } from "lucide-react";

export default function CandidateCard({
  id,
  name,
  score,
  reasoning,
  interviewQuestions = [],
  status,
  onMove
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isScored = score !== null && score !== undefined;

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdating(true);
    try {
      await onMove(id, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute color based on score
  const getScoreBadgeStyles = (val) => {
    if (val >= 8.0) {
      return "border-emerald-500 bg-[#0f1f15] text-emerald-400";
    }
    if (val >= 5.0) {
      return "border-amber-500 bg-[#241a0b] text-amber-400";
    }
    return "border-rose-500 bg-[#260e12] text-rose-455";
  };

  return (
    <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl p-4 shadow-sm hover:border-zinc-500 transition-all duration-200 flex flex-col gap-3">
      {/* Card Header */}
      <div className="flex justify-between items-center gap-3">
        <h3 className="font-bold text-white text-sm truncate">{name}</h3>
        
        {isScored ? (
          <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-extrabold shrink-0 shadow-inner ${getScoreBadgeStyles(score)}`}>
            <span className="text-xs">{score.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#0a0a0a] border border-[#2e2e2e] text-zinc-500 rounded shrink-0">
            Unranked
          </span>
        )}
      </div>

      {/* Accordion Toggle */}
      {(reasoning || (interviewQuestions && interviewQuestions.length > 0)) && (
        <div className="border-t border-[#2e2e2e] pt-3 mt-1">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <span className="font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              Insights
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Collapsible Content */}
          {isOpen && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              {reasoning && (
                <div className="bg-[#0a0a0a] border border-[#2e2e2e] rounded-lg p-2.5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Recruiter Reasoning
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {reasoning}
                  </p>
                </div>
              )}

              {interviewQuestions && interviewQuestions.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#2e2e2e] rounded-lg p-2.5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                    Interview Questions
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-300 leading-relaxed">
                    {interviewQuestions.map((q, idx) => (
                      <li key={idx} className="marker:text-zinc-500 pl-0.5">
                        <span className="inline text-zinc-300">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Move Status Selector */}
      <div className="flex justify-between items-center border-t border-[#2e2e2e] pt-3 mt-1">
        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Move column:</span>
        <div className="flex items-center gap-2">
          {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
          <select
            value={status}
            disabled={isUpdating}
            onChange={handleStatusChange}
            className="text-xs bg-[#0a0a0a] border border-[#2e2e2e] text-zinc-300 px-2 py-1 rounded focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          >
            <option value="shortlisted">Shortlisted</option>
            <option value="applied">Applied</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
}
