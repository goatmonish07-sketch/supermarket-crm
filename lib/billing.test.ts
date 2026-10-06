import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, calculateBill, financialYear, formatInvoiceNumber, resolveDiscount, type CalcLineInput } from "./billing";

const line = (p: Partial<CalcLineInput>): CalcLineInput => ({ key: "k", unitPrice: 0, qty: 1, lineDiscount: 0, taxInclusive: true, gstRateBp: 500, ...p });

test("allocate splits exactly and proportionally", () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.equal(allocate(1001, [3, 7]).reduce((a, b) => a + b), 1001);
  assert.deepEqual(allocate(50, [0, 0]), [0, 0]);
});

test("inclusive 5% splits price into taxable + tax", () => {
  const b = calculateBill([line({ unitPrice: 105000 })], 0, false);
  assert.equal(b.taxable, 100000);
  assert.equal(b.tax, 5000);
  assert.equal(b.payable, 105000);
  assert.deepEqual(b.taxRows, [{ rateBp: 500, taxable: 100000, cgst: 2500, sgst: 2500 }]);
});

test("exclusive pricing adds tax on top", () => {
  const b = calculateBill([line({ unitPrice: 100000, taxInclusive: false, gstRateBp: 1800 })], 0, false);
  assert.equal(b.taxable, 100000);
  assert.equal(b.tax, 18000);
  assert.equal(b.payable, 118000);
});

test("bill discount is shared across lines and totals stay exact", () => {
  const b = calculateBill([line({ key: "a", unitPrice: 99900, qty: 2 }), line({ key: "b", unitPrice: 45000 })], 10000, false);
  assert.equal(b.billDiscount, 10000);
  assert.equal(b.lines.reduce((s, l) => s + l.billDiscountShare, 0), 10000);
  assert.equal(b.payable, 99900 * 2 + 45000 - 10000);
  assert.equal(b.taxable + b.tax, b.payable);
});

test("garment slab: above ₹2,500 per piece moves to 18%", () => {
  const slab = { gstSlabAbove: 250000, gstHighRateBp: 1800 };
  const low = calculateBill([line({ unitPrice: 199900, ...slab })], 0, false);
  assert.equal(low.lines[0].rateBp, 500);
  const high = calculateBill([line({ unitPrice: 499900, ...slab })], 0, false);
  assert.equal(high.lines[0].rateBp, 1800);
  // A discount that brings the piece under the threshold drops it back to 5%.
  const discounted = calculateBill([line({ unitPrice: 299900, lineDiscount: 60000, ...slab })], 0, false);
  assert.equal(discounted.lines[0].rateBp, 500);
});

test("round-off to nearest rupee", () => {
  const b = calculateBill([line({ unitPrice: 12345 })], 0, true);
  assert.equal(b.payable, 12300);
  assert.equal(b.roundOff, -45);
  const up = calculateBill([line({ unitPrice: 12355 })], 0, true);
  assert.equal(up.payable, 12400);
});

test("discounts never exceed the amount", () => {
  const b = calculateBill([line({ unitPrice: 10000, lineDiscount: 50000 })], 99999, false);
  assert.equal(b.payable, 0);
  assert.equal(b.lines[0].lineDiscount, 10000);
});

test("savings include MRP difference and discounts", () => {
  const b = calculateBill([line({ unitPrice: 149900, mrp: 199900, qty: 2, lineDiscount: 10000 })], 0, false);
  assert.equal(b.savings, 50000 * 2 + 10000);
});

test("resolveDiscount handles % and rupees", () => {
  assert.equal(resolveDiscount("10%", 150000), 15000);
  assert.equal(resolveDiscount("150", 150000), 15000);
  assert.equal(resolveDiscount("₹1,000", 50000), 50000);
  assert.equal(resolveDiscount("abc", 50000), 0);
});

test("financial year and invoice numbers", () => {
  assert.equal(financialYear(new Date("2026-10-06T10:00:00Z")), "2026-27");
  assert.equal(financialYear(new Date("2027-03-31T10:00:00Z")), "2026-27");
  assert.equal(financialYear(new Date("2027-03-31T20:00:00Z")), "2027-28"); // 1:30 am IST on 1 April
  assert.equal(formatInvoiceNumber("DB", "2026-27", 42), "DB/2026-27/00042");
});

import { dayRange, localDate, monthRange } from "./dates";

test("IST day and month ranges", () => {
  const { start, end } = dayRange("2026-10-06", "Asia/Kolkata");
  assert.equal(start.toISOString(), "2026-10-05T18:30:00.000Z");
  assert.equal(end.toISOString(), "2026-10-06T18:30:00.000Z");
  assert.equal(localDate(new Date("2026-10-05T19:00:00Z"), "Asia/Kolkata"), "2026-10-06");
  const m = monthRange(new Date("2026-12-15T10:00:00Z"), "Asia/Kolkata");
  assert.equal(m.start.toISOString(), "2026-11-30T18:30:00.000Z");
  assert.equal(m.end.toISOString(), "2026-12-31T18:30:00.000Z");
});
