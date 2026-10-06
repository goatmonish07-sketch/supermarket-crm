import { AppShell } from "@/components/shell/app-shell";
import { MAIN_NAV } from "@/components/shell/nav";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowedHrefs = MAIN_NAV.filter((item) => !item.permission || can(user.role, item.permission)).map((item) => item.href);

  return (
    <AppShell user={{ name: user.name, role: ROLE_LABELS[user.role] }} shopName={user.tenant.name} allowedHrefs={allowedHrefs}>
      {children}
    </AppShell>
  );
}
