import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth/serverAuth";

const ProgressLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
};

export default ProgressLayout;
