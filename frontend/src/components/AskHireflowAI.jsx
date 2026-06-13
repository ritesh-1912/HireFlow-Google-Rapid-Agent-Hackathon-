import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, AlertCircle, Paperclip, X } from "lucide-react";

export default function AskHireflowAI({ jobId, setJobId, triggerKanbanRefresh }) {
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "👋 I'm HireFlow AI. Tell me who you're hiring for and upload your resumes — I'll screen and rank candidates for you automatically."
    }
  ]);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, error]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (selectedFiles.length < e.target.files.length) {
        setError("Only PDF files are allowed.");
      } else {
        setError("");
      }
      setAttachedFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeAttachedFile = (idxToRemove) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage && attachedFiles.length === 0) return;

    setError("");
    setIsThinking(true);

    let activeJobId = jobId;
    let finalUserText = userMessage;

    // Build immediate message to show user's action
    if (attachedFiles.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: `Hiring requirement: "${userMessage}"\nUploaded ${attachedFiles.length} resume(s): ${attachedFiles.map(f => f.name).join(", ")}`
        }
      ]);
    } else {
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    }

    setInput("");

    try {
      // 1. If files attached, call /upload-in-chat first
      if (attachedFiles.length > 0) {
        const formData = new FormData();
        formData.append("message", userMessage);
        formData.append("session_id", "session_001");
        attachedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetch(`${BASE_URL}/upload-in-chat`, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json();
          throw new Error(errData.detail || "Failed to upload resumes in chat.");
        }

        const uploadData = await uploadResponse.json();
        activeJobId = uploadData.job_id;
        setJobId(activeJobId);
        setAttachedFiles([]);
        triggerKanbanRefresh();

        // Adjust text sent to the chat model to let it know the context
        finalUserText = `I have uploaded ${uploadData.resume_count} resumes for: "${userMessage}". Please process them now.`;
      }

      // Convert history to match the API payload schema
      const sessionHistory = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      const userMessage = finalUserText;
      const currentJobId = activeJobId;
      const conversationHistory = sessionHistory;

      const response = await fetch(
        `${BASE_URL}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            job_id: currentJobId || null,
            history: conversationHistory || []
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      const agentReply = data.reply

      setMessages((prev) => [...prev, { role: "model", text: agentReply }]);
      triggerKanbanRefresh(); // Refresh Kanban board after agent decisions
    } catch (err) {
      console.error(err);
      setError("Agent unavailable. Please check your pipeline results above.");
    } finally {
      setIsThinking(false);
    }
  };

  const renderMessageText = (text) => {
    const lines = text.split("\n");
    const candidateRegex = /^\d+\.\s+([^-]+)\s*-\s*([\d.]+):\s*(.*)$/;

    return lines.map((line, idx) => {
      const match = line.match(candidateRegex);
      if (match) {
        const name = match[1].trim();
        const score = parseFloat(match[2].trim());
        const summary = match[3].trim();

        return (
          <div key={idx} className="my-3 bg-[#0a0a0a] border border-[#2e2e2e] rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-inner">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-xs truncate">{name}</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{summary}</p>
            </div>
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-extrabold text-[11px] shrink-0 ${
              score >= 8.0 ? "border-emerald-500 bg-[#0f1f15] text-emerald-400" :
              score >= 5.0 ? "border-amber-500 bg-[#241a0b] text-amber-400" :
              "border-rose-500 bg-[#260e12] text-rose-455"
            }`}>
              {score.toFixed(1)}
            </div>
          </div>
        );
      }
      return <p key={idx} className="mb-1">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-zinc-200">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "model" && (
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white text-black rounded-tr-none font-medium"
                  : "bg-zinc-900 border border-[#2e2e2e] text-zinc-350 rounded-tl-none"
              }`}
            >
              {renderMessageText(msg.text)}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
            </div>
            <div className="bg-zinc-900 border border-[#2e2e2e] text-zinc-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 justify-start animate-in fade-in">
            <div className="w-7 h-7 rounded-lg bg-rose-950/50 border border-rose-900/40 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm font-medium">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded files preview chips */}
      {attachedFiles.length > 0 && (
        <div className="px-4 py-2 bg-[#161616] border-t border-[#2e2e2e] flex flex-wrap gap-2">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 bg-[#0a0a0a] border border-[#2e2e2e] rounded-full px-2.5 py-0.5 text-xs text-zinc-300"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachedFile(idx)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-[#2e2e2e] bg-[#161616] flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg border border-[#2e2e2e] bg-[#0a0a0a] hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all shrink-0"
          title="Upload Resumes"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf"
          className="hidden"
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            attachedFiles.length > 0
              ? "Describe the job requirements here..."
              : "Ask about candidates or status..."
          }
          className="flex-1 bg-[#0a0a0a] border border-[#2e2e2e] focus:border-zinc-500 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isThinking || (!input.trim() && attachedFiles.length === 0)}
          className="p-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:bg-[#222] disabled:text-zinc-600 disabled:cursor-not-allowed border border-white disabled:border-[#333] transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
