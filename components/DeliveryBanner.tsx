import { Clock3, MapPin, Zap } from "lucide-react";

export function DeliveryBanner() {
  return (
    <section className="site-container page-section pb-3">
      <div className="overflow-hidden rounded-xl bg-brand-yellow px-4 py-4 text-brand-ink shadow-card sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-ink/70">Quick delivery</p>
            <h1 className="text-xl font-semibold text-brand-ink">Delivering to Home • 10-15 min</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-brand-ink/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Home
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              Live slot
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
