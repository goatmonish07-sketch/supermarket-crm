import { queryFirst, execute } from "./d1";

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

export async function getSettings(): Promise<AppSettings> {
  const row = await queryFirst<AppSettings>(`SELECT * FROM Setting WHERE id = 1 LIMIT 1`);
  if (row) return row;
  await execute(
    `INSERT INTO Setting (id, shopName, tagline, address, phone, gstin, currency, loyaltyRate)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [DEFAULTS.shopName, DEFAULTS.tagline, DEFAULTS.address, DEFAULTS.phone, DEFAULTS.gstin, DEFAULTS.currency, DEFAULTS.loyaltyRate],
  );
  return { id: 1, ...DEFAULTS };
}
