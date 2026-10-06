import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOWS, isOpen, manualStages, nextStage, statusMessage } from "./orders";

test("stage flows", () => {
  assert.equal(nextStage("JOB", "RECEIVED"), "MEASURED");
  assert.equal(nextStage("JOB", "TRIAL"), "READY");
  assert.equal(nextStage("JOB", "READY"), null); // delivered only through billing
  assert.equal(nextStage("ORDER", "CONFIRMED"), "AWAITING_STOCK");
  assert.ok(!manualStages("ORDER").includes("DELIVERED"));
  assert.ok(FLOWS.JOB.includes("DELIVERED"));
  assert.ok(isOpen("READY"));
  assert.ok(!isOpen("CANCELLED"));
});

test("ready message mentions balance only when due", () => {
  const fmt = (p: number) => `₹${p / 100}`;
  const due = statusMessage({ number: "JOB-0001", kind: "JOB", status: "READY", customerName: "Riya Menon", balance: 50000 }, "Demo", fmt);
  assert.match(due, /Hello Riya,/);
  assert.match(due, /Balance to pay: ₹500/);
  const paid = statusMessage({ number: "JOB-0001", kind: "JOB", status: "READY", customerName: "Riya", balance: 0 }, "Demo", fmt);
  assert.doesNotMatch(paid, /Balance/);
});
