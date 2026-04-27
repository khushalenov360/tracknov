import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/data";

export default async function HomePage() {
  if (!env.isConfigured) {
    redirect("/login");
  }

  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
