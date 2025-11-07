"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GoogleCredentialResponse } from "../types/google";

type GoogleLoginButtonProps = {
  redirectTo: string;
};

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const GoogleLoginButton = ({ redirectTo }: GoogleLoginButtonProps) => {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [clientId, setClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null,
  );
  const [configLoading, setConfigLoading] = useState(!clientId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeGoogleButton = useCallback(() => {
    if (
      !clientId ||
      configLoading ||
      !window.google?.accounts?.id ||
      !buttonRef.current
    ) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: GoogleCredentialResponse) => {
        if (!response?.credential) {
          setError("Google authentication did not return a credential.");
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const result = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });

          if (!result.ok) {
            const data = await result.json().catch(() => ({}));
            throw new Error(data?.error ?? "Google authentication failed");
          }

          router.replace(redirectTo);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to sign in with Google";
          setError(message);
        } finally {
          setLoading(false);
        }
      },
      ux_mode: "popup",
      auto_select: false,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: buttonRef.current.offsetWidth || 320,
    });
  }, [clientId, configLoading, redirectTo, router]);

  useEffect(() => {
    if (clientId) {
      setConfigLoading(false);
      return;
    }
    let cancelled = false;
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const response = await fetch("/api/config/google", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Google Sign-In is not configured.");
        }
        const data = (await response.json()) as { clientId?: string };
        if (!cancelled) {
          if (typeof data.clientId === "string" && data.clientId.length > 0) {
            setClientId(data.clientId);
            setError(null);
          } else {
            setError("Google Sign-In is not configured.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Google Sign-In is not configured.",
          );
        }
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
        }
      }
    };
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [clientId, initializeGoogleButton]);

  const handleManualClick = () => {
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div ref={buttonRef} />
      </div>
      <button
        type="button"
        onClick={handleManualClick}
        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        disabled={loading || !clientId || configLoading}
      >
        {loading ? "Signing in…" : "Use another Google account"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default GoogleLoginButton;
