import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "../customer-form";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  await requirePermission("customers.manage");
  return (
    <div className="space-y-4">
      <PageHeader title="Add customer" back={{ href: "/customers", label: "Customers" }} />
      <section className="card max-w-2xl">
        <CustomerForm initial={{ name: "", phone: "", email: "", birthday: "", notes: "" }} />
      </section>
    </div>
  );
}
