import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: 'dark' | 'light' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: (err?: any) => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = "0x4AAAAAAC_bMoaIUWm54Wj";

export default function TurnstileWidget({
  onSuccess,
  onExpire,
  onError,
  theme = 'dark',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Clean up previous widget instance if exists
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          callback: (token: string) => {
            if (isMounted) onSuccess(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          'error-callback': (err) => {
            if (isMounted && onError) onError(err);
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn("Turnstile render error:", err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // Poll until the Cloudflare Turnstile script is ready
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
      }, 6000);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        clearTimeout(timeout);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
        }
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [theme]);

  return (
    <div className={`flex justify-center my-3 min-h-[65px] ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}

