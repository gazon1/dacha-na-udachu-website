"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { logout } from "@/lib/auth";
import { useUserStore } from "@/stores/user";

const NAV_LINKS = [
  { href: "/", label: "Главная" },
  { href: "/houses/", label: "Дома" },
  { href: "/events/", label: "События" },
  { href: "/news/", label: "Новости" },
  { href: "/faq/", label: "FAQ" },
];

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "YourDachaBot";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const identity = useUserStore((s) => s.identity);
  const { clearIdentity } = useUserStore();

  const handleAuth = () => {
    toast.success("Вы вошли через Telegram!");
  };

  const handleLogout = async () => {
    await logout();
    clearIdentity();
    setUserMenuOpen(false);
    toast.success("Вы вышли");
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <span className="text-primary">Dacha</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                    ? "text-white bg-white/10"
                    : "text-base-content/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-3">
            {!identity ? (
              <TelegramLoginButton botUsername={BOT_USERNAME} onAuth={handleAuth} />
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                >
                  {identity.telegram_photo_url ? (
                    <img
                      src={identity.telegram_photo_url}
                      alt={identity.telegram_first_name}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                      {identity.telegram_first_name[0]}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">
                    {identity.telegram_first_name}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface-2 rounded-xl border border-white/10 shadow-xl overflow-hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-base-content/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-base-content/70 hover:text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Меню"
          >
            <span className="material-symbols-outlined">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-surface">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                  pathname === link.href
                    ? "text-white bg-white/10"
                    : "text-base-content/60 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/5">
              {!identity ? (
                <TelegramLoginButton botUsername={BOT_USERNAME} onAuth={handleAuth} />
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  {identity.telegram_photo_url ? (
                    <img
                      src={identity.telegram_photo_url}
                      alt={identity.telegram_first_name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      {identity.telegram_first_name[0]}
                    </div>
                  )}
                  <span className="text-white font-medium">{identity.telegram_first_name}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-auto text-base-content/50 hover:text-white text-sm"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
