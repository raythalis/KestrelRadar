# Judgment and scoring

After Kestrel Radar collects new content, enabled monitors in the same group decide whether it is worth keeping. This page explains why some items become events and others do not. To create a monitor, see the [user guide](usage.en.md); for model review, see [LLM+](llm-plus.en.md). These scores are for **monitor judgment**, not for merging similar events.

## Follow one item through the process

Suppose a monitor has the keywords “open source” and “model,” with match mode set to “Any keyword”:

1. **Check exclude words first.** If the title or summary contains any exclude word, the item fails immediately: no score is calculated and no model is called. If the monitor has “Also use global exclude words” enabled, both sets apply.
2. **Check inclusion keywords next.** “Any keyword” requires one match; “All keywords” requires every keyword to match. If the selected requirement is not met, the item fails immediately. Matching examines text in the title and summary; it does not infer synonyms or equivalent phrasing.
3. **Score only after the keyword gate passes.** More complete matches and matches in the title generally raise the score; a very short summary or missing original URL lowers it. Publication time does not contribute to this judgment score.
4. **Apply the score lines for the selected sensitivity.** High scores pass, low scores fail, and the “grey zone” between them passes conservatively in Algorithm only mode or goes to model review under the LLM+ conditions. Only items that pass can enter event merging; failed or not-yet-judged items do not form new events.

If **no inclusion keywords are entered**, the rule differs: exclude words still take precedence; other items receive a neutral **score of 50** and pass the algorithm, even if 50 lies in the low-score range. LLM+ then consults a model only if an Intent was also entered. The same item can be judged separately by different monitors in its group, with different outcomes.

## Understanding the score lines

Each monitor selects “Loose,” “Normal,” or “Strict.” Each sensitivity has its **own saved pair** of low and high score lines. A score **equal to the low line fails; equal to the high line passes**. Scores strictly between the lines are in the grey zone. The defaults are Loose: low 25 / high 55; Normal: low 35 / high 65; Strict: low 45 / high 80. Adjust these under **Settings → Judging**. Under the default Normal band, for instance, 65 passes directly, 35 fails, and 50 enters the grey zone. The currently saved settings are authoritative.

There is one exception for an LLM+ monitor with an Intent: **an item that the algorithm has passed still goes to the model to check its intent, even if it reaches the high line**. Items that fail the low-score or keyword gate never go to the model. Algorithm only never calls a model and lets grey-zone items pass. For model failures, see [LLM+](llm-plus.en.md).

## How the score is calculated

When keywords are present and the keyword gate passes, scoring starts at 35 and adjusts as follows:

| Content condition | Adjustment |
| --- | --- |
| Proportion of keywords matched | Add proportionally, up to 55; round the result to the nearest integer |
| Matched keyword appears in title | Add 5 each, up to 15 |
| Two matched keywords appear adjacent to one another | Add 8; examine at most the first 10 matched keywords |
| Summary has at least 120 characters | Add 8 |
| Summary has fewer than 20 characters | Subtract 12 |
| No original URL | Subtract 4 |

The final score is capped to 0–100. Summary length is measured after trimming leading and trailing whitespace; repeated occurrences of the same keyword do not earn repeated points. For example, with “open source” and “model” both matched, “open source” in the title, a summary that is neither long nor short, no adjacent keyword pair, and an original URL: 35 + 55 + 5 = **95 points**. The default Strict high line is 80, so the algorithm passes the item directly; if this monitor is in LLM+ mode and has an Intent, the model still reviews it.

## When judgment runs again

Only newly collected items not yet judged by that monitor are processed during an official collection. The first successful collection establishes a historical baseline. A discovery card's “Test collection” only probes the source and does not write items. Editing monitor rules **does not automatically rejudge previously judged historical content**. There is no monitor-rule preview entry in the current interface. The backend has a read-only preview endpoint, but it neither calls a model nor saves a final judgment; it is not an official collection.
