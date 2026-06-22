import "server-only";

import { countTranscripts, createTranscript, type Transcript } from "@/lib/db";

/**
 * A realistic short meeting used as a read-only demo transcript, so the chat is
 * instantly usable on an empty account. Seeded once when there are no
 * transcripts; marked is_sample so it can't be edited or deleted.
 */
const SAMPLE_TITLE = "Sample — Weekly product sync";

const SAMPLE_CONTENT = `Speaker A: Morning everyone. Quick weekly sync — let's cover the launch, the bug backlog, and hiring. Maya, where are we on the launch?

Speaker B: We're on track for Thursday. The marketing page is done and the onboarding flow is in review. One risk: the email provider hasn't confirmed our sending domain yet.

Speaker A: Okay. Can you chase the email provider today so it's not a blocker?

Speaker B: Yes, I'll follow up this morning and report back by end of day.

Speaker C: On the bug backlog — we closed nine issues this week. The only P1 left is the timezone bug on the calendar view. I'll have a fix up for review by Wednesday.

Speaker A: Good. Let's hold the launch to Thursday only if that P1 is merged. If it slips, we move to Friday.

Speaker C: Agreed.

Speaker A: Last thing — hiring. We decided to extend an offer to the senior designer candidate. Maya, you're drafting the offer?

Speaker B: Yes, I'll send the offer letter tomorrow.

Speaker A: Great. To recap: Maya chases the email provider today and sends the design offer tomorrow, Sam merges the timezone fix by Wednesday, and we launch Thursday if it lands. Thanks all.`;

/** Seed the sample transcript if the account has none. */
export async function ensureSampleTranscript(): Promise<void> {
  const count = await countTranscripts();
  if (count > 0) return;
  await createTranscript({
    source: "pasted",
    title: SAMPLE_TITLE,
    status: "ready",
    content: SAMPLE_CONTENT,
    durationSeconds: 142,
    isSample: true,
  });
}

export type { Transcript };
