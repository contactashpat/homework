import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth/serverAuth";

const FlashcardsLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
};

export default FlashcardsLayout;
