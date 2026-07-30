"use client";

/**
 * Telegram Login Widget button.
 *
 * Renders the Telegram Login Widget script and wires up window.onTelegramAuth.
 * Next.js 16's <Script> component does not forward data-* attributes to the
 * rendered <script> tag, so we use useEffect + document.createElement instead.
 *
 * If Telegram is blocked (widget fails to load), shows a fallback button
 * that opens the bot chat directly via tg:// protocol.
 *
 * Configure proxy via NEXT_PUBLIC_TELEGRAM_PROXY_URL (optional).
 */
import { useEffect, useRef, useState } from "react";
import { loginWithTelegram, type TelegramWidgetUser } from "@/lib/auth";
import { useUserStore } from "@/stores/user";

interface TelegramLoginButtonProps {
  /** Bot username configured via @BotFather (e.g. "YourDachaBot"). */
  botUsername: string;
  /** Called after successful Telegram auth + API call. Receives the raw widget user. */
  onAuth?: (user: TelegramWidgetUser) => void;
  /** Widget button size. Default "large". */
  size?: "small" | "medium" | "large";
  /** Corner radius. Default 8. */
  cornerRadius?: number;
}

export function TelegramLoginButton({
  botUsername,
  onAuth,
  size = "large",
  cornerRadius = 8,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const setIdentity = useUserStore((s) => s.setIdentity);

  const proxyUrl = process.env.NEXT_PUBLIC_TELEGRAM_WIDGET_URL;
  const widgetSrc = proxyUrl ?? "https://telegram.org/js/telegram-widget.js?22";
  const botDirectLink = `https://t.me/${botUsername}/start`;

  useEffect(() => {
    if (!botUsername || typeof window === "undefined") return;

    const callbackId = `telegramAuth_${Math.random().toString(36).slice(2)}`;

    const script = document.createElement("script");
    script.src = widgetSrc;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-radius", String(cornerRadius));
    script.setAttribute("data-onauth", callbackId);
    script.setAttribute("data-request-access", "write");
    script.async = true;

    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => setLoadFailed(true);

    const handleAuth = async (user: TelegramWidgetUser) => {
      const result = await loginWithTelegram(user);
      if (!("error" in result)) {
        setIdentity({
          telegram_id: result.telegram_id,
          telegram_username: result.telegram_username,
          telegram_first_name: result.telegram_first_name,
          telegram_last_name: result.telegram_last_name,
          telegram_photo_url: result.telegram_photo_url,
        });
        onAuth?.(user);
      }
    };

    (window as unknown as Record<string, unknown>)[callbackId] = handleAuth;

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackId];
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [botUsername, size, cornerRadius, onAuth, widgetSrc]);

  if (loadFailed || !widgetLoaded) {
    return (
      <div className="flex flex-col items-center gap-2">
        {loadFailed && (
          <p className="text-base-content/50 text-sm text-center">
            Не удалось загрузить виджет Telegram
          </p>
        )}
        <a
          href={botDirectLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#0088cc] hover:bg-[#0077b5] text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.775c-.18 1.485-1.06 5.595-1.5 7.725-.186.902-.56.76-.76.76-.326.044-.576-.226-.914-.768-.97-1.555-1.932-4.39-2.152-5.727-.12-.718-.246-.5-.43-.31-.84.873-1.74 3.01-1.74 3.01s-.15.157-.428.045c-2.155-.868-3.5-2.5-3.5-2.5s-.18-.12-.01-.31c.08-.092.26-.197.43-.3.12-.073.31-.03.31-.03s2.39-2.1 3.81-3.33c1.17-1.017 2.18-1.21 2.5-1.28.326-.072.5-.06.5-.06s.19-.18 1.57-.18c1.38 0 1.79.27 2.08.6.29.33.38.85.38.85s.46 4.23.62 6.04c.07.82.03.66-.13 1.01z" />
          </svg>
          Открыть Telegram
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className="telegram-login-widget-container" />;
}
