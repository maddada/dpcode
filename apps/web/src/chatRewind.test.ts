import { MessageId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { buildRewindTurnCountByUserMessageId } from "./chatRewind";

describe("buildRewindTurnCountByUserMessageId", () => {
  it("maps each user message to the number of prior user turns", () => {
    const rewindTurnCounts = buildRewindTurnCountByUserMessageId([
      {
        id: "user-1",
        kind: "message",
        createdAt: "2026-04-10T10:00:00.000Z",
        message: {
          id: MessageId.makeUnsafe("user-1"),
          role: "user",
          text: "first",
          createdAt: "2026-04-10T10:00:00.000Z",
          streaming: false,
        },
      },
      {
        id: "assistant-1",
        kind: "message",
        createdAt: "2026-04-10T10:00:01.000Z",
        message: {
          id: MessageId.makeUnsafe("assistant-1"),
          role: "assistant",
          text: "reply",
          createdAt: "2026-04-10T10:00:01.000Z",
          streaming: false,
        },
      },
      {
        id: "work-1",
        kind: "work",
        createdAt: "2026-04-10T10:00:02.000Z",
        entry: {
          id: "work-1",
          label: "working",
          tone: "info",
          createdAt: "2026-04-10T10:00:02.000Z",
        },
      },
      {
        id: "user-2",
        kind: "message",
        createdAt: "2026-04-10T10:00:03.000Z",
        message: {
          id: MessageId.makeUnsafe("user-2"),
          role: "user",
          text: "second",
          createdAt: "2026-04-10T10:00:03.000Z",
          streaming: false,
        },
      },
      {
        id: "user-3",
        kind: "message",
        createdAt: "2026-04-10T10:00:04.000Z",
        message: {
          id: MessageId.makeUnsafe("user-3"),
          role: "user",
          text: "third",
          createdAt: "2026-04-10T10:00:04.000Z",
          streaming: false,
        },
      },
    ]);

    expect(rewindTurnCounts).toEqual(
      new Map([
        [MessageId.makeUnsafe("user-1"), 0],
        [MessageId.makeUnsafe("user-2"), 1],
        [MessageId.makeUnsafe("user-3"), 2],
      ]),
    );
  });
});
