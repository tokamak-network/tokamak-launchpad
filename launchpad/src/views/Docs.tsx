"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

type DocEntry = { slug: string; title: string; file: string };

export function DocsView() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Load manifest */
  useEffect(() => {
    fetch("/docs/_meta.json")
      .then((r) => r.json())
      .then((data: DocEntry[]) => {
        setEntries(data);
        /* check hash or default to first */
        const hash = window.location.hash.replace("#", "");
        const match = data.find((e) => e.slug === hash);
        setActiveSlug(match ? match.slug : data[0]?.slug ?? null);
      })
      .catch(() => setEntries([]));
  }, []);

  /* Load active section content */
  const loadContent = useCallback(
    (slug: string) => {
      const entry = entries.find((e) => e.slug === slug);
      if (!entry) return;
      setLoading(true);
      setContent(null);
      fetch(`/docs/${entry.file}`)
        .then((r) => r.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch(() => {
          setContent("_Failed to load this section._");
          setLoading(false);
        });
    },
    [entries],
  );

  useEffect(() => {
    if (activeSlug && entries.length > 0) {
      loadContent(activeSlug);
      window.history.replaceState(null, "", `#${activeSlug}`);
    }
  }, [activeSlug, entries, loadContent]);

  const handleNav = (slug: string) => {
    setActiveSlug(slug);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">Documentation</span>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 md:hidden"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Sections
      </button>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } w-full shrink-0 md:block md:w-56 lg:w-64`}
        >
          <nav className="sticky top-24 space-y-1">
            {entries.map((entry) => (
              <button
                key={entry.slug}
                type="button"
                onClick={() => handleNav(entry.slug)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSlug === entry.slug
                    ? "bg-tokamak-blue/10 font-semibold text-tokamak-blue dark:bg-tokamak-blue/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                {entry.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-tokamak-blue" />
            </div>
          ) : (
            <article className="prose prose-gray dark:prose-invert max-w-none rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 dark:border-slate-700 dark:bg-slate-800/50">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content ?? ""}
              </ReactMarkdown>
            </article>
          )}

          {/* Prev / Next navigation */}
          {entries.length > 0 && activeSlug && (
            <PrevNextNav
              entries={entries}
              activeSlug={activeSlug}
              onNavigate={handleNav}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Prev / Next navigation ── */

function PrevNextNav({
  entries,
  activeSlug,
  onNavigate,
}: {
  entries: DocEntry[];
  activeSlug: string;
  onNavigate: (slug: string) => void;
}) {
  const idx = entries.findIndex((e) => e.slug === activeSlug);
  const prev = idx > 0 ? entries[idx - 1] : null;
  const next = idx < entries.length - 1 ? entries[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      {prev ? (
        <button
          type="button"
          onClick={() => onNavigate(prev.slug)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {prev.title}
        </button>
      ) : (
        <div />
      )}
      {next ? (
        <button
          type="button"
          onClick={() => onNavigate(next.slug)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
        >
          {next.title}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}
