"use client";

import { useActionState, useState } from "react";
import { Delete } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { pinSwitchAction } from "../actions";
import { FormError, SubmitButton } from "../form-bits";

type Staff = { id: string; name: string; role: string };

export function PinPad({ staff, currentId }: { staff: Staff[]; currentId: string }) {
  const [state, action] = useActionState(pinSwitchAction, undefined);
  const [userId, setUserId] = useState(currentId);
  const [pin, setPin] = useState("");

  const press = (digit: string) => setPin((p) => (p.length < 6 ? p + digit : p));

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="label">Who&apos;s at the counter?</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setUserId(s.id)}
              aria-pressed={userId === s.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs transition",
                userId === s.id ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
              )}
            >
              <Avatar name={s.name} size="sm" />
              <span className="line-clamp-1 font-medium">{s.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="pin" value={pin} />

      <div className="flex justify-center gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={cn("h-3.5 w-3.5 rounded-full border-2 border-primary", i < pin.length && "bg-primary")} />
        ))}
      </div>

      <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="h-16 rounded-2xl bg-surface-2 text-2xl font-semibold transition hover:bg-primary-soft active:scale-95">
            {d}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} className="h-16 rounded-2xl bg-surface-2 text-2xl font-semibold transition hover:bg-primary-soft active:scale-95">
          0
        </button>
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="flex h-16 items-center justify-center rounded-2xl text-muted hover:bg-surface-2" aria-label="Delete digit">
          <Delete className="h-6 w-6" />
        </button>
      </div>

      <FormError message={state?.error} />
      <SubmitButton>Unlock</SubmitButton>
    </form>
  );
}
