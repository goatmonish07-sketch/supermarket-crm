import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-8 mt-2 text-muted">Log in to your shop.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        New to AuraPOS?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Start a free 14-day trial
        </Link>
      </p>
    </>
  );
}
