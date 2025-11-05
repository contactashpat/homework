import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth/serverAuth";
import GoogleLoginButton from "../../components/GoogleLoginButton";

const normalizeRedirect = (value: string | undefined): string => {
  if (!value || typeof value !== "string") {
    return "/study";
  }
  if (!value.startsWith("/")) {
    return "/study";
  }
  // Prevent redirecting back to login to avoid loops
  if (value.startsWith("/login")) {
    return "/study";
  }
  return value;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/study");
  }

  const redirectTo = normalizeRedirect(searchParams?.redirect);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in with your Google account to access flashcards, quizzes, and progress.
        </p>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <GoogleLoginButton redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
