export function LoadingMessage() {
  return (
    <div aria-label="AI Helper is responding" aria-live="polite" className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
        {[0, 1, 2].map((dot) => (
          <span
            className="size-1.5 animate-pulse rounded-full bg-slate-400"
            key={dot}
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
        <span className="sr-only">AI Helper is responding</span>
      </div>
    </div>
  );
}
