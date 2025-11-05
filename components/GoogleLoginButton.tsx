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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initializeGoogleButton = useCallback(() => {
    if (!clientId || !window.google?.accounts?.id || !buttonRef.current) {
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
  }, [clientId, redirectTo, router]);

  useEffect(() => {
    if (!clientId) {
      setError("Google Sign-In is not configured.");
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
      document.head.removeChild(script);
    };
  }, [clientId, initializeGoogleButton]);

  const handleManualClick = () => {
    if (window.google?.accounts?.id) {
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
        disabled={loading || !clientId}
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
