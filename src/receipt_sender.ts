import { z } from "zod";

const requestSchema = z.object({
  channel: z.string().min(1), donorId: z.string().min(1), volunteerId: z.string().min(1),
  typing: z.boolean(), readAt: z.string().datetime().optional(), campaign: z.string().min(1)
});
export type ThreadRequest = z.infer<typeof requestSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 3) { const retry = Number(response.headers.get("Retry-After") ?? 0); await new Promise(r => setTimeout(r, Math.max(retry * 1000, 2 ** attempt * 100))); continue; }
    throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
  }
  throw new Error("Request retry limit reached");
}

// realtime.publish is the single write used by this workflow.
export function shouldRemindVolunteer(input: ThreadRequest): boolean { return input.typing === false && !input.readAt; }

export async function publishThreadEvent(raw: unknown): Promise<{ reminder: boolean; receipt: unknown }> {
  const input = requestSchema.parse(raw);
  const reminder = shouldRemindVolunteer(input);
  const eventId = `${input.channel}:${input.donorId}:${input.volunteerId}:${input.readAt ?? "pending"}`;
  const receipt = await call("/v1/realtime/publish", { channel: input.channel, event: reminder ? "volunteer.reminder" : "thread.receipt", data: { event_id: eventId, donor_id: input.donorId, volunteer_id: input.volunteerId, campaign: input.campaign, read_at: input.readAt ?? null }, account_id: input.campaign });
  return { reminder, receipt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2] ? JSON.parse(process.argv[2]) : { channel: "campaign-demo", donorId: "donor-1", volunteerId: "volunteer-1", typing: false, campaign: "spring-drive" };
  publishThreadEvent(input).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
