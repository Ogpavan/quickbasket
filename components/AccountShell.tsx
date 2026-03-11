import { ReactNode } from "react";

import { AccountSidebar } from "@/components/AccountSidebar";

interface AccountShellProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function AccountShell({ title, action, children }: AccountShellProps) {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="grid gap-8 p-6 md:grid-cols-[260px_1fr]">
            <AccountSidebar />
            <section className="space-y-6">
              {title ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                  {action}
                </div>
              ) : null}
              {children}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
