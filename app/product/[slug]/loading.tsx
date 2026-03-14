export default function ProductLoading() {
  return (
    <section className="site-container page-section space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-md border border-brand-line/80 bg-white p-4">
          <div className="aspect-square w-full rounded-md bg-slate-100" />
        </div>
        <div className="rounded-md border border-brand-line/80 bg-white p-6">
          <div className="h-6 w-48 rounded-md bg-slate-100" />
          <div className="mt-3 h-4 w-72 rounded-md bg-slate-100" />
          <div className="mt-6 h-12 w-40 rounded-md bg-slate-100" />
          <div className="mt-4 h-10 w-full rounded-md bg-slate-100" />
          <div className="mt-2 h-10 w-full rounded-md bg-slate-100" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-5 w-40 rounded-md bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-md border border-brand-line/80 bg-white p-4">
              <div className="h-32 w-full rounded-md bg-slate-100" />
              <div className="mt-4 h-4 w-3/4 rounded-md bg-slate-100" />
              <div className="mt-2 h-4 w-1/2 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
