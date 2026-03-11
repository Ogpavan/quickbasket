export default function CategoryLoading() {
  return (
    <section className="site-container page-section space-y-5">
      <div className="surface-panel px-6 py-6">
        <div className="h-6 w-40 rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-64 rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="surface-panel p-4">
            <div className="h-40 w-full rounded-xl bg-slate-100" />
            <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-1/2 rounded-full bg-slate-100" />
            <div className="mt-4 h-10 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
