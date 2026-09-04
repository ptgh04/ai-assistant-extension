import React from 'react';

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 pb-3 mb-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">AI Assistant</h1>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            MVP
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Chrome Extension &bull; Manifest V3
        </p>
      </header>

      <main className="flex-1 overflow-y-auto space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-medium mb-1">Scaffolding Ready</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Project initialized with WXT, React 19, Tailwind CSS v4, and Zustand.
          </p>
        </div>
      </main>
    </div>
  );
}
