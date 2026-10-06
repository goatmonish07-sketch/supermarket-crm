import { avatarTone, cn, initials } from "@/lib/utils";

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", sizes[size], avatarTone(name), className)}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
