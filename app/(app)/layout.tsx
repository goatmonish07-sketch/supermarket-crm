import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLowStockCount } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const [settings, lowStockCount] = await Promise.all([getSettings(), getLowStockCount()]);

  const location = settings.address.split(",").slice(-2).join(",").trim();

  return (
    <AppShell
      user={user}
      shopName={settings.shopName}
      location={location}
      gstin={settings.gstin}
      lowStockCount={lowStockCount}
    >
      {children}
    </AppShell>
  );
}
