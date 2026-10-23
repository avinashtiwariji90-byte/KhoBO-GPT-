"use client";

import React, { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, Download, Play, Maximize2, RefreshCw, ImageOff, ExternalLink } from "lucide-react";
import { API_BASE } from "@/lib/api";

// ─── Code Block with Copy ──────────────────────────────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1f2e] border-b border-white/10">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: "1rem 1.25rem",
          fontSize: "0.8rem",
          lineHeight: "1.6",
          background: "#0d1117",
        }}
        showLineNumbers={code.split("\n").length > 5}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Global cache of loaded media URLs so component remounts during streaming never flicker
const loadedImagesCache = new Set<string>();

// ─── Media Renderer (Images + Animated GIFs) ─────────────────────────────────
const MediaBlock = React.memo(function MediaBlock({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false);
  const isAlreadyLoaded = typeof window !== "undefined" && Boolean(src) && loadedImagesCache.has(src);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    isAlreadyLoaded ? "loaded" : "loading"
  );
  const [retryKey, setRetryKey] = useState(0);
  const [useProxy, setUseProxy] = useState(false);

  const isGif =
    src.toLowerCase().includes(".gif") || src.toLowerCase().includes("video_");

  // Keep status synchronized when src changes or if already cached
  useEffect(() => {
    if (src) {
      if (loadedImagesCache.has(src)) {
        setStatus("loaded");
      } else {
        setStatus("loading");
        setUseProxy(false);
        setRetryKey(0);
      }
    }
  }, [src]);

  // Construct proxy URL if direct fetch fails or on manual retry
  const proxyUrl = `${API_BASE}/files/proxy-image?url=${encodeURIComponent(src)}${
    retryKey > 0 ? `&refresh=true&_r=${retryKey}` : ""
  }`;

  const currentSrc = useProxy
    ? proxyUrl
    : retryKey > 0
    ? `${src}${src.includes("?") ? "&" : "?"}_r=${retryKey}`
    : src;

  const handleImageError = useCallback(() => {
    const isExternal = src.startsWith("http://") || src.startsWith("https://");
    const isAlreadyLocal =
      src.includes("127.0.0.1") || src.includes("localhost") || src.includes("/api/files/");

    // If direct load failed on an external URL, automatically fallback to server proxy
    if (!useProxy && isExternal && !isAlreadyLocal) {
      console.warn("[MediaBlock] Direct load failed, falling back to server proxy:", src);
      setUseProxy(true);
      setStatus("loading");
    } else {
      setStatus("error");
    }
  }, [src, useProxy]);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setUseProxy(true);
    setRetryKey((k) => k + 1);
  }, []);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = currentSrc;
    a.download = (alt || "media").replace(/[^a-z0-9]/gi, "_") + (isGif ? ".gif" : ".jpg");
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentSrc, alt, isGif]);

  return (
    <div className="my-4 w-full">
      {isGif ? (
        /* Animated GIF / Video-like player */
        <div className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-900/60 shadow-2xl shadow-cyan-500/5 w-full">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span className="text-xs font-semibold text-slate-300 truncate max-w-xs">
                {alt || "AI Generated Animation"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">
                GIF
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                title="Download GIF"
              >
                <Download className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div
            className={`relative overflow-hidden transition-all duration-300 ${
              expanded ? "max-h-none" : "max-h-96"
            }`}
          >
            {status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">
                  {useProxy ? "Loading animation via server…" : "Generating animation…"}
                </span>
              </div>
            )}
            <img
              key={`${currentSrc}-${retryKey}`}
              src={currentSrc}
              alt={alt || "AI Generated Animation"}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain"
              onLoad={() => {
                if (src) loadedImagesCache.add(src);
                setStatus("loaded");
              }}
              onError={handleImageError}
            />
          </div>
        </div>
      ) : (
        /* Regular image */
        <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900/40 shadow-lg w-full">
          {/* Loading skeleton */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 bg-slate-900/60 w-full">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg">🎨</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">
                  {useProxy ? "Loading image via secure server proxy…" : "Generating image…"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  AI is creating your visual, this usually takes a few seconds
                </p>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 bg-slate-900/60 w-full">
              <ImageOff className="w-10 h-10 text-rose-400/60" />
              <div className="text-center">
                <p className="text-sm font-semibold text-rose-300">Image failed to load</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {useProxy
                    ? "The AI image service is currently busy or unreachable."
                    : "The AI image service may be slow or blocked by your browser."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry via Server Proxy
                </button>
                {src.startsWith("http") && (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:text-white transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Source URL
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actual image — hidden while loading */}
          <img
            key={`${currentSrc}-${retryKey}`}
            src={currentSrc}
            alt={alt || "AI Generated Image"}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            className={`w-full h-auto block transition-opacity duration-300 ${
              status === "loaded" ? "opacity-100" : "opacity-0 absolute pointer-events-none"
            }`}
            style={{ maxHeight: expanded ? "none" : "520px", objectFit: "contain" }}
            onLoad={() => {
              if (src) loadedImagesCache.add(src);
              setStatus("loaded");
            }}
            onError={handleImageError}
          />

          {/* Footer bar — only visible when loaded */}
          {status === "loaded" && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-slate-900/60">
              <span className="text-[11px] text-slate-500 truncate max-w-[220px]">{alt}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  {expanded ? "Collapse" : "Expand"}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});


// ─── Markdown Renderer ────────────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code — handles both inline and block
          code({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isBlock = codeString.includes("\n") || Boolean(match);

            if (isBlock || match) {
              return <CodeBlock language={match?.[1] ?? ""} code={codeString} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono text-[0.82em] border border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-5 mb-3 pb-2 border-b border-white/10">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-white mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-100 mt-3 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h4>
          ),

          // Paragraph — use div when children contain block elements (e.g. images)
          // to avoid invalid <div> inside <p> hydration errors
          p: ({ children }) => {
            const hasBlock = React.Children.toArray(children).some(
              (child) =>
                React.isValidElement(child) &&
                (child.type === MediaBlock ||
                  (typeof child.type === "string" &&
                    ["div", "figure", "img", "pre", "ul", "ol", "table"].includes(child.type)))
            );
            if (hasBlock) {
              return <div className="text-slate-200 leading-7 mb-3 last:mb-0">{children}</div>;
            }
            return <p className="text-slate-200 leading-7 mb-3 last:mb-0">{children}</p>;
          },

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 space-y-1.5 mb-3 text-slate-200">{children}</ol>
          ),
          li: ({ children, ordered, ...rest }: any) => {
            if (ordered) {
              return <li className="text-slate-200 leading-relaxed pl-1">{children}</li>;
            }
            return (
              <li className="text-slate-200 leading-relaxed flex gap-2 items-start">
                <span className="text-cyan-400 mt-1.5 shrink-0 text-xs">▸</span>
                <span>{children}</span>
              </li>
            );
          },

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-cyan-500/60 pl-4 py-1 my-3 bg-cyan-500/5 rounded-r-lg text-slate-300 italic">
              {children}
            </blockquote>
          ),

          // Inline formatting
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through text-slate-500">{children}</del>
          ),

          // Link
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors"
            >
              {children}
            </a>
          ),

          // Table
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/5 text-slate-300 font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-white/2 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-400">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-slate-300">{children}</td>
          ),

          // HR
          hr: () => <hr className="border-white/10 my-4" />,

          // Images & Animated GIFs
          img: ({ src, alt }) => {
            const imageSrc = typeof src === "string" ? src : "";
            return <MediaBlock src={imageSrc} alt={alt || ""} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-cyan-400 animate-pulse align-middle rounded-sm" />
      )}
    </div>
  );
}
