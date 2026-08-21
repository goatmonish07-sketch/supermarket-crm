import { prisma } from "./db";

export type AppSettings = {
  id: number;
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  currency: string;
  loyaltyRate: number;
};

const DEFAULTS: Omit<AppSettings, "id"> = {
  shopName: "SuperMart",
  tagline: "Fresh Groceries & Daily Essentials",
  address: "Gandhipuram, Coimbatore, TN 641012",
  phone: "+91 98765 43210",
  gstin: "33ABCDE1234F1Z5",
  currency: "INR",
  loyaltyRate: 100,
};

/** Returns the settings singleton, creating it with defaults if absent. */
export async function getSettings(): Promise<AppSettings> {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.setting.create({ data: { id: 1, ...DEFAULTS } });
}
