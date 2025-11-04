import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth/serverAuth";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/study" : "/login");
}
