import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Главная" },
  { href: "/houses/", label: "Дома" },
  { href: "/events/", label: "События" },
  { href: "/news/", label: "Новости" },
  { href: "/faq/", label: "FAQ" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-white font-bold text-lg">
            <span className="text-primary">Dacha</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base-content/50 hover:text-base-content text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-base-content/30 text-xs">
            © {new Date().getFullYear()} Evergreen Community
          </p>
        </div>
      </div>
    </footer>
  );
}
