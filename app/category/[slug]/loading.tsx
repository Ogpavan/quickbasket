export default function CategoryLoading() {
  return (
    <section className="site-container py-3 sm:py-4">
      <div className="surface-panel overflow-hidden rounded-md bg-white">
        <div className="h-[80vh]">
          <div className="flex h-full gap-4">
            <div className="native-scrollbar h-full w-[90px] shrink-0 overflow-y-auto border-r border-brand-line bg-white px-2 py-3">
              <div className="flex flex-col gap-2">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center gap-1 rounded-sm border border-slate-100 bg-white px-2 py-2">
                    <div className="h-12 w-12 rounded-sm bg-slate-100" />
                    <div className="h-3 w-full rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              <div className="space-y-6">
                <div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div key={index} className="surface-panel p-2.5">
                        <div className="aspect-square bg-slate-100" />
                        <div className="mt-3 h-4 w-16 rounded-full bg-slate-100" />
                        <div className="mt-2 h-4 w-11/12 rounded-full bg-slate-100" />
                        <div className="mt-2 h-4 w-8/12 rounded-full bg-slate-100" />
                        <div className="mt-4 h-10 w-full rounded-md bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="w-[176px] min-w-[176px] bg-slate-100">
                        <div className="aspect-square" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
