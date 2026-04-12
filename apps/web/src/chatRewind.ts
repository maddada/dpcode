import type { MessageId } from "@t3tools/contracts";

import type { deriveTimelineEntries } from "./session-logic";

export function buildRewindTurnCountByUserMessageId(
  timelineEntries: ReturnType<typeof deriveTimelineEntries>,
): Map<MessageId, number> {
  const byUserMessageId = new Map<MessageId, number>();
  let userTurnCount = 0;

  for (const entry of timelineEntries) {
    if (entry.kind !== "message" || entry.message.role !== "user") {
      continue;
    }
    byUserMessageId.set(entry.message.id, userTurnCount);
    userTurnCount += 1;
  }

  return byUserMessageId;
}
