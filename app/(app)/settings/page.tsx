import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Appearance } from "./appearance";
import { StoreForm } from "./store-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const canManage = can(user.role, "settings.manage");

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">
          Shop ID <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">{user.tenant.slug}</code> · Plan{" "}
          {user.tenant.plan === "TRIAL" && user.tenant.trialEndsAt
            ? `Free trial until ${user.tenant.trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
            : user.tenant.plan}
        </p>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-semibold">Appearance</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Just for you — each staff member can pick their own.</p>
          <Appearance theme={user.theme} mode={user.themeMode} />
        </section>
        {user.store && (
          <section className="card">
            <h2 className="text-xl font-semibold">Shop details</h2>
            <p className="mb-5 mt-1 text-sm text-muted">{canManage ? "Shown on bills and invoices." : "Only the owner can change these."}</p>
            <StoreForm store={user.store} readOnly={!canManage} />
          </section>
        )}
      </div>
    </div>
  );
}
