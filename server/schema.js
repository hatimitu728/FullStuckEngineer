// responseSchema for Gemini JSON mode. Field names are the shared contract
// between the brain (Gemini), the backend and all three UI modes.
// weekdayReal / verifiedBy / date risks are NOT here: code fills them.

const S = { type: "STRING" };
const IDS = { type: "ARRAY", items: S };

export const responseSchema = {
  type: "OBJECT",
  properties: {
    needsReply: {
      type: "OBJECT",
      properties: { value: { type: "BOOLEAN" }, why: S, evidenceIds: IDS },
      required: ["value", "why", "evidenceIds"],
      propertyOrdering: ["value", "why", "evidenceIds"],
    },
    whatItIs: S,
    summary: S,
    evidence: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: S, quote: S },
        required: ["id", "quote"],
        propertyOrdering: ["id", "quote"],
      },
    },
    asks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: S, who: S, what: S, evidenceIds: IDS },
        required: ["id", "who", "what", "evidenceIds"],
        propertyOrdering: ["id", "who", "what", "evidenceIds"],
      },
    },
    dates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: S,
          label: S,
          kind: { type: "STRING", enum: ["event", "deadline", "other"] },
          asWritten: S,
          isoDate: S,
          weekdayWritten: S,
          evidenceIds: IDS,
        },
        required: ["id", "label", "kind", "asWritten", "isoDate", "evidenceIds"],
        propertyOrdering: ["id", "label", "kind", "asWritten", "isoDate", "weekdayWritten", "evidenceIds"],
      },
    },
    risks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: S, type: S, originalSays: S, checkFound: S, nextStep: S, evidenceIds: IDS },
        required: ["id", "type", "originalSays", "checkFound", "nextStep", "evidenceIds"],
        propertyOrdering: ["id", "type", "originalSays", "checkFound", "nextStep", "evidenceIds"],
      },
    },
    notStated: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { field: S, value: S },
        required: ["field", "value"],
        propertyOrdering: ["field", "value"],
      },
    },
    junk: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: S, why: S, evidenceIds: IDS },
        required: ["text", "why", "evidenceIds"],
        propertyOrdering: ["text", "why", "evidenceIds"],
      },
    },
    spokenBeats: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: S,
          kind: { type: "STRING", enum: ["need_reply", "what", "ask", "condition", "risk", "draft"] },
          text: S,
          evidenceIds: IDS,
        },
        required: ["id", "kind", "text", "evidenceIds"],
        propertyOrdering: ["id", "kind", "text", "evidenceIds"],
      },
    },
    easyRead: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: S,
          kind: { type: "STRING", enum: ["what", "ask", "when", "risk", "skip", "next"] },
          title: S,
          body: S,
          evidenceIds: IDS,
        },
        required: ["id", "kind", "title", "body", "evidenceIds"],
        propertyOrdering: ["id", "kind", "title", "body", "evidenceIds"],
      },
    },
    draftReply: S,
    confidenceNote: S,
  },
  required: ["needsReply", "whatItIs", "summary", "evidence", "asks", "dates", "risks", "notStated",
    "junk", "spokenBeats", "easyRead", "draftReply", "confidenceNote"],
  propertyOrdering: ["needsReply", "whatItIs", "summary", "evidence", "asks", "dates", "risks", "notStated",
    "junk", "spokenBeats", "easyRead", "draftReply", "confidenceNote"],
};
