import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(
  tenantId: string,
  userId: string | null,
  action: string,
  extra: { entity?: string; entityId?: string; details?: Prisma.InputJsonValue } = {},
) {
  await db.auditLog.create({ data: { tenantId, userId, action, ...extra } });
}
