import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Start free trial" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Start your free trial</h1>
      <p className="mb-8 mt-2 text-muted">14 days, every feature. No card needed.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have a shop?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
