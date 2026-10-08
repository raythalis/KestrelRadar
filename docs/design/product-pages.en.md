# Kestrel Radar · Product-page design rules (Style Lab is not the product)

Status: **In effect** (decided 2026-10-02). Design pages according to these rules starting in P2.

## 1. The core distinction

| | `/style-lab` (Style Lab) | Product pages (from P2) |
| --- | --- | --- |
| Purpose | Demonstrate component capabilities and states | Solve user tasks |
| Organization | Grouped by component | Organized around user tasks and information hierarchy |
| States | Show as many as practical | Include only states that actually occur |

**Style Lab demonstrates what components can do; the product solves user tasks. Do not reverse those roles.**

## 2. Do not copy the showcase

- Do not treat the component showcase structure in `/style-lab` as the information architecture of product pages.
- Do not bring every state into product pages merely to demonstrate component capabilities.
- Do not bring `/style-lab`'s state-explanation copy ("Status: reachable / untested / warning…") into product pages.
- Do not expose developer-facing states and implementation details directly to users.

## 3. Red lines, item by item

1. **Do not fill every card with metadata.** A card should contain only what users need to judge at that moment; move the rest into details.
2. **Express a state only once.** Do not use a left border, colored icon, status dot, and status text simultaneously. Choose one, or at most two (color + short label).
3. **Separate action tiers.** Primary, ordinary, and dangerous actions must not share the same visual priority; keep dangerous actions out of the main line of sight.
4. **Let tasks dictate structure.** In management contexts, consider lists, forms, and detail drawers before a wall of cards.
5. **Cards are not the default answer.** Ask "What is the user trying to do here?" before deciding between a list, form, or card.

## 4. Checklist before starting each page

- What is the user's task on this page? Write it in one sentence.
- What is the information hierarchy: what should be visible at a glance, what comes after a first look, and what needs expanding only later?
- Does each piece of data need to be shown right now? Could it go in a detail drawer?
- Does every state actually occur? Leave out all fictional states.
- Are the three action tiers visibly distinct?
- Did any explanatory copy come from the Lab? If so, remove it.

## 5. Relationship to UX writing

For copy rules, see [UX writing](ux-writing.en.md) (the original reference is `docs/design/ux-writing.md`; self-explanatory interfaces; copy must match confirmed requirements and current product behavior).
Use both sets of rules together: **structure comes from user tasks first; copy covers only labels, states, errors, and the scope of consequences.**

## 6. P1.5 business-component layer: frozen (2026-10-02)

This layer is frozen. From P2 onward, product pages consume these as building blocks rather than changing them:

- Cards: `ChannelCard`, `SourceCard`, `ActionCard`, `MonitorCard`
- Dialogs: `FormDialog` (shell), `ChannelDialog`, `SourceDialog`, `MonitorDialog`, `ActionDialog`, `ConfirmDialog`
- Other pieces: `CronPicker`, `components/biz/icons.ts`, `AppTagsInput` / `AppTextarea` (two input components added to the App layer)

Ask before changing anything in this layer.
