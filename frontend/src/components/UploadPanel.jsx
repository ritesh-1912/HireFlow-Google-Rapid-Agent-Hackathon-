import React, { useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";

export default function UploadPanel({ onUploadSuccess }) {
  const [jdText, setJdText] = useState("");
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (selectedFiles.length === 0) {
        setError("Only PDF files are allowed.");
      } else {
        setFiles((prev) => [...prev, ...selectedFiles]);
        setError("");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (selectedFiles.length === 0) {
        setError("Only PDF files are allowed.");
      } else {
        setFiles((prev) => [...prev, ...selectedFiles]);
        setError("");
      }
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jdText.trim()) {
      setError("Job description is required.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one PDF resume.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("jd_text", jdText);
    files.forEach((file) => {
      formData.append("files", file); // Param name matches FastAPI 'files'
    });

    try {
      // 1. POST to VITE_API_URL/upload
      const uploadRes = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.detail || "Failed to upload files.");
      }

      const uploadData = await uploadRes.json();
      const jobId = uploadData.job_id;

      // 2. POST to VITE_API_URL/run-pipeline with the returned job_id
      const pipelineRes = await fetch(`${BASE_URL}/run-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!pipelineRes.ok) {
        const errData = await pipelineRes.json();
        throw new Error(errData.detail || "Failed to trigger pipeline.");
      }

      // 3. Transition to pipeline view
      onUploadSuccess(jobId);
    } catch (err) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prominent App Title and Tagline */}
      <div className="text-center py-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          HireFlow
        </h1>
        <p className="text-zinc-400 text-sm font-medium">
          Screen candidates in seconds, not days.
        </p>
      </div>

      <div className="bg-[#161616] border border-[#2e2e2e] rounded-xl p-6 shadow-md transition-all duration-300">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <FileText className="text-zinc-400 w-5 h-5" />
          Configure Campaign
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Job Description *
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description requirements..."
              required
              className="w-full h-36 bg-[#0a0a0a] border border-[#2e2e2e] focus:border-zinc-500 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Resumes (PDF only) *
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                dragActive
                  ? "border-zinc-400 bg-zinc-900/50"
                  : "border-[#2e2e2e] bg-[#0a0a0a] hover:border-zinc-650"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".pdf"
                className="hidden"
              />
              
              <Upload className="w-5 h-5 text-zinc-500 mb-2" />
              <p className="text-sm text-zinc-350">
                Drag & drop PDFs or <span className="text-white underline font-semibold">browse</span>
              </p>
            </div>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Files ({files.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#0a0a0a] border border-[#2e2e2e] rounded px-3 py-1.5 text-sm text-zinc-300"
                  >
                    <span className="truncate pr-4">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Alert with Try Again Button */}
          {error && (
            <div className="flex flex-col gap-3 bg-rose-950/30 border border-rose-900/40 rounded-lg p-4 text-sm text-rose-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="self-end px-3 py-1 bg-rose-900/50 hover:bg-rose-900 text-white rounded text-xs font-semibold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              isLoading
                ? "bg-[#222] text-zinc-500 cursor-not-allowed border border-[#333]"
                : "bg-white text-black hover:bg-zinc-200 border border-white"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing & Uploading...</span>
              </>
            ) : (
              <span>Submit Campaign</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
