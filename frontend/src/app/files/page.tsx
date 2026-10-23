"use client";
import RequireAuth from "@/components/RequireAuth";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, FileItem } from "@/lib/api";
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  Eye, 
  X, 
  Sparkles, 
  AlertCircle 
} from "lucide-react";

function FilesVaultPageContent() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await api.listFiles();
      setFiles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      for (let i = 0; i < fileList.length; i++) {
        await api.uploadFile(fileList[i]);
      }
      loadFiles();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this document?")) return;
    try {
      await api.deleteFile(id);
      loadFiles();
    } catch (err: any) {
      alert(err.message || "Failed to delete file");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Document RAG Pipeline
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Document Intelligence &amp; File Vault
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload documents for automated text extraction, chunking, and semantic vector Q&amp;A with KhoBO GPT.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleUpload(e.dataTransfer.files);
        }}
        className={`glass-panel p-10 rounded-2xl border-2 border-dashed text-center transition-all ${
          dragActive
            ? "border-cyan-400 bg-cyan-500/5 scale-[1.01]"
            : "border-white/15 hover:border-cyan-500/40"
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">
          {uploading ? "Extracting & Indexing Document..." : "Drop your documents here, or browse"}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          Supported file formats: <span className="text-cyan-300 font-medium">PDF, DOCX, TXT, CSV, JSON, MD, Images</span> (Max 25MB).
        </p>

        <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all">
          <span>Choose Files</span>
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.doc,.txt,.csv,.json,.md,.png,.jpg,.jpeg"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Uploaded Documents List */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span>Your Ingested Documents</span>
          <span className="text-xs font-normal text-slate-400">{files.length} Total Files</span>
        </h2>

        {loading ? (
          <div className="text-center py-12 text-sm text-slate-500">Loading documents...</div>
        ) : files.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-sm text-slate-400">
            No documents uploaded yet. Upload a PDF or TXT above to test KhoBO GPT&apos;s retrieval answers!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="glass-panel p-4 rounded-xl flex items-start justify-between gap-4 glass-panel-hover transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                      {file.original_filename}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Vector Indexed
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {file.extracted_text_preview && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="Inspect extracted text"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/chat")}
                    title="Chat with this file"
                    className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    title="Delete document"
                    className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border-cyan-500/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <h3 className="text-sm font-semibold text-white truncate">{previewFile.original_filename}</h3>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-1 hover:text-white text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-950/70 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap border border-white/5">
              {previewFile.extracted_text_preview || "No readable preview text available for this file format."}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilesVaultPage() {
  return (
    <RequireAuth>
      <FilesVaultPageContent />
    </RequireAuth>
  );
}

