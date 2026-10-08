# LLM+ judging mode

LLM+ neither collects content nor sends notifications directly. It asks a model to review an item **after keyword checks and local scoring, when needed**. Suppose you follow “the latest Nolan movie trailer”: a title may mention Nolan, yet the model can decide it is a retrospective about an older film, not the trailer you want. For score lines, see [Judgment and scoring](judgment-scoring.en.md); for setup steps, see the [user guide](usage.en.md).

## Enabling it

First add a provider on the **Models** page, select models, and save their **Model order** (up to three). Then select LLM+ under **Settings → Judging**. A monitor set to “Follow global” uses the global mode, but you can instead choose “Algorithm only” or “LLM+” for that monitor. The global default is Algorithm only; **adding a provider alone does not send content to a model**. You can enter an Intent describing what you actually follow; it applies only in LLM+ mode.

Model options must be read from the provider's API; models whose lists cannot be retrieved do not appear as options. Judging requests require a compatible provider endpoint; Ollama, for example, also needs its compatible endpoint enabled. Saved API keys are not returned in plaintext by read endpoints. See [Configuration](configuration.en.md) for details.

## Which items call a model

Exclude words, inclusion keywords, and score are checked first. **An item blocked by an exclude word, the keyword gate, or the low score line does not call a model.** The remaining cases depend on Intent:

- **With an Intent:** any item that passes the local rules goes to the model to check that intent, even when it scores above the high line. For example, “the latest Nolan movie trailer” can exclude an old-film retrospective that merely mentions his name.
- **Without an Intent:** if keywords were entered, only scores in the grey zone between the low and high lines go to model review; high scores pass directly. If neither keywords nor Intent were entered, the item passes with a neutral score of 50 and **does not call a model**.

Algorithm only mode never calls a model and conservatively passes grey-zone items. If the model accepts an item, it is kept; if it rejects it, the item fails. One item leaves only one final judgment per monitor, although failed attempts can generate multiple model requests. A discovery card's “Test collection” only checks its source and does not trigger model judgment. Editing saved monitor rules does not automatically rejudge previously judged items. The current interface has no rule-preview entry; the backend has a local-rule-only preview endpoint, but it neither calls a model nor saves a final judgment.

## What the model sees

Each judging request sends only the **title and summary**, plus your **Intent** if supplied; it also includes a short, fixed judging instruction. **Kestrel Radar neither fetches the webpage body for this purpose nor sends the body to the model.** If essential facts appear only in the body and not in the title or summary, the model may not reach the conclusion you expect. An empty summary does not trigger another fetch to fill it from the body.

## When requests fail

Kestrel Radar tries models in the order saved on the **Models** page. A timeout, provider error, or response that fails the required format counts as a failure. It first makes extra attempts on the **same model**, up to “Model failed retries”; only then does it move to the next model. The default is one extra retry, so each model receives at most two requests. Set it to 0 to skip same-model retries, though the next model may still be tried. It stops as soon as any model succeeds.

If all models fail or none is available, Kestrel Radar records an incident and applies **Settings → Judging → When the model fails**:

- **Fall back to algorithm only (default):** keep the local rule's original passing result. Even a grey-zone item may enter events and later actions; this is not an affirmative model judgment.
- **Do not judge this time:** leave no judgment result for this item and monitor and try again on a future collection. This is not a failed judgment. Until it passes judgment, the item cannot form a new event. The current interface labels this option “Discard,” which can be misleading; this describes the actual behavior.

## When costs may arise

Only items that require model review as described above send judging requests. Algorithm only mode, items rejected by preliminary gates or the low score line, and “Test collection” do not produce judging model requests. Provider pricing determines whether and how requests are billed. Kestrel Radar does not enforce a model-spending cap or estimate a provider bill.

**Rough token estimate:** an actual model judgment is typically a short request. For a title of roughly 20–50 Chinese characters and a summary of roughly 100–300 Chinese characters, with a short Intent, a budgeting allowance is **about 200–800 input tokens plus about 20–100 output tokens per request**. This is a loose budgeting estimate, **not a Kestrel Radar measurement or provider guarantee**. Longer summaries or intents and differences in model tokenization change usage; some models may also bill additional reasoning tokens. For a rough budget, multiply “expected actual model-request count × input and output tokens per request × the provider's respective prices,” allowing for retries. Items that never reach model judgment do not incur this model-request component.

**Failed requests may still be billed:** a provider may already have processed a request before a timeout or malformed response. Retrying or switching models increases request counts. Even if Kestrel Radar ultimately falls back or leaves this item unjudged, requests already sent may be chargeable. A self-hosted local model has no remote API bill but uses your own computing resources.
