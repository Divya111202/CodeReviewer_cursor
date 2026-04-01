export default function Section({ title, items }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">
          {title}
        </h2>
        <span className="text-xs text-slate-400">{items?.length || 0} items</span>
      </div>
      {items?.length ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
          {items.map((t, i) => (
            <li key={`${title}-${i}`} className="leading-relaxed">
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No notes.</p>
      )}
    </section>
  );
}

