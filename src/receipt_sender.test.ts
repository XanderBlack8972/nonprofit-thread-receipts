import assert from "node:assert/strict";
import { shouldRemindVolunteer } from "./receipt_sender.ts";

const pending = { channel: "c", donorId: "d", volunteerId: "v", typing: false, campaign: "spring" };
assert.equal(shouldRemindVolunteer(pending), true);
assert.equal(shouldRemindVolunteer({ ...pending, readAt: "2026-01-01T00:00:00.000Z" }), false);
assert.equal(shouldRemindVolunteer({ ...pending, typing: true }), false);
console.log("receipt decision tests passed");
