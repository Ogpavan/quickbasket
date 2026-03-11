import Image from "next/image";
import Link from "next/link";

const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Partner with us", href: "#" },
      { label: "Blog", href: "#" }
    ]
  },
  {
    title: "Help",
    links: [
      { label: "FAQs", href: "#" },
      { label: "Delivery areas", href: "#" },
      { label: "Order issues", href: "#" },
      { label: "Contact support", href: "#" }
    ]
  },
  {
    title: "Policies",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Refunds", href: "#" },
      { label: "Cookie policy", href: "#" }
    ]
  }
];

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "Twitter", href: "#" }
];

export function Footer() {
  return (
    <footer className="border-t border-brand-line/80 bg-white">
      <div className="site-container grid gap-8 py-10 lg:grid-cols-[1.2fr_2fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-lg font-bold text-brand-ink">QuickBasket</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Fresh groceries, essentials, and top brands delivered within minutes.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-brand-ink">Registered Office</p>
            <p>QuickBasket Retail Pvt Ltd</p>
            <p>99 Market Street, Bengaluru 560001</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{column.title}</p>
              <div className="space-y-2">
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm font-medium text-slate-500 transition hover:text-brand-green"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Download App</p>
            <div className="mt-3 grid gap-2">
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-lg px-2 py-1 transition hover:brightness-105"
                aria-label="Get it on Google Play"
              >
                <Image
                  src="https://blinkit.com/8ed033800ea38f24c4f0.png"
                  alt="Get it on Google Play"
                  width={160}
                  height={48}
                  className="h-10 w-auto"
                />
              </Link>
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-lg px-2 py-1 transition hover:brightness-105"
                aria-label="Download on the App Store"
              >
                <Image
                  src="https://blinkit.com/d61019073b700ca49d22.png"
                  alt="Download on the App Store"
                  width={160}
                  height={48}
                  className="h-10 w-auto"
                />
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Follow us</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-semibold text-slate-500 transition hover:text-brand-green"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-line/80">
        <div className="site-container flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-slate-500">
          <span>Copyright © 2026 QuickBasket. All rights reserved.</span>
          <span>Made for fast daily delivery.</span>
        </div>
      </div>
    </footer>
  );
}
