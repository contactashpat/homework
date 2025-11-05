"use client";

import { useState } from "react";

type LoginFormProps = {
  redirectTo?: string;
};

const LoginForm = ({ redirectTo = "/study" }: LoginFormProps) => {
  const [username, setUsername] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error ?? "Login failed");
        setPending(false);
        return;
      }

      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="email"
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
            required
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

export default LoginForm;
