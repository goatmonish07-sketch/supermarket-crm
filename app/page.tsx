import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function Home() {
  // Send authenticated users to the dashboard, everyone else to login.
  const user = await getSession();
  redirect(user ? "/dashboard" : "/login");
}
