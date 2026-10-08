# Kestrel Radar · UX writing / content design rules

Status: **In effect**. Write copy for every page according to these rules.

> For page structure and information hierarchy, see [Product pages](product-pages.en.md) (original path: `docs/design/product-pages.md`; Style Lab ≠ product pages).

## 0. Align with requirements and implementation

The interface is **not responsible for explaining to users what each feature is for**.

- Confirmed requirements govern scope and acceptance. User-facing copy must reflect operations actually available now, not describe unimplemented plans as current capabilities.
- **Pages in the feature-verification stage must meet the same finished-product standard for copy**: do not write "What is this?" or "What is it for?"; write only labels, states, errors, and the scope of consequences.
- If the reason for a line of copy is "users might not know what this area does," that is the line to delete.

## 1. Core principle

**The interface should explain itself, not explain the interface.**

There is only one test: **Would removing this sentence cause a user to make a mistake?**
Yes → put it in the appropriate place (field hint / tooltip / empty state / dangerous-action confirmation / error). No → delete it.
The goal is not simply to write fewer words; users should understand the product from the interface itself, rather than having the product continually explain itself.

## 2. Permitted copy (only these four categories)

| Category | Example | Placement |
| --- | --- | --- |
| Label / field name | “Channels”; “Bot token” | On the field itself |
| Status (short noun or phrase) | “No channel selected”; “Reachable”; “Disabled” | Status indicator or card status row |
| Error (one sentence identifying the problem) | “A cron expression needs five fields (minute hour day month weekday)” | Below the field |
| Scope of a dangerous action's consequences | “Actions still using it will stop receiving deliveries.” | In the delete confirmation |

## 3. Forbidden copy

1. Instructions on where to click: “After editing, click Save on this card”; “Click it again.”
2. Implementation details: “The app joins it automatically”; “It only reads and never changes database records”; “Put it in the request header Authorization: ***”.
3. Descriptions written to fill space: card explanations and generic feature introductions in page subtitles.
4. Repeating the same information: do not add a paragraph to explain what a field name already says, or a sentence to restate a visually conveyed state.
5. Version/progress notes: “v1.0 only registers…”; “Dashboard is a placeholder for now…”.

## 4. Style constraints

- Length: status ≤ 8 Chinese characters (keep English equally short); field hint one line (about 24 Chinese characters); error ≤ one sentence; delete confirmation ≤ two lines.
- Voice: neutral, professional, present tense. Avoid honorific “您” (and its English equivalent), exclamation marks, cuteness, and tutorial-like phrasing.
- Terminology: use technical terms only when users must enter or judge them themselves, and immediately explain them in one sentence (for example, “Group IDs are negative; private chat IDs are positive”).
- Example values: give one only if users genuinely could not write the value without it (for example, a natural-language query such as “Yang Mi’s new movie”).
- Focus: write about what users need to do, not how the system works internally.

## 5. Exemptions

- `/style-lab` (the development-only component preview) is for developers and acceptance review and is exempt. Its explanatory text addresses implementers.
- Keep factual explanations in errors, empty states, and delete confirmations, but tighten them according to the length and voice constraints above.

## 6. Application and checklist

Change copy together with the page rather than returning later to fill it in. On completion of each page, ask:

1. Does any text teach users what to click?
2. Does it expose implementation details?
3. Does it explain the same thing twice?
4. Could it be a status label instead?

These rules apply equally to all stages, including feature verification. Write to finished-product standards throughout; do not add explanatory text merely to “help people understand what this is for.”
