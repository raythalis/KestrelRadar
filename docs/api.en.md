# HTTP API

The Kestrel Radar backend serves both the interface and the API. All application endpoints start with `/api`; `GET /api/health` returns `{ "status": "ok", "apiPrefix": "/api" }`. The routes below are currently registered, not proposed endpoints. v1.0 has no accounts or API authentication; **do not expose the service directly to an untrusted network**. For exact input and output fields, consult the Zod contracts in `packages/contracts/src/`, the routes in `apps/api/src/modules/*/*.routes.ts`, and the service implementations. This page is a guide to calling the API, not an automatically generated OpenAPI specification.

## Requests and results

Creating a resource usually returns HTTP 201, and deleting one returns 204 (without a response body). Reads and updates usually return an entity or list directly. Send `Content-Type: application/json` when supplying a JSON body. Supply GET parameters as specified for each endpoint. Do not assume that every successful response is wrapped in the same `data` field.

A request failure uses a non-2xx status and a body such as `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"…","details":{"field":"name","rule":"REQUIRED_FIELD"}}}`. `details` appears only when location information is available. The current error-code contract defines `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`, and `INTERNAL_ERROR`. The last two are reserved contract values; they do not mean that authentication is implemented in v1.0. The actual status depends on the server response; common statuses are 400/404/409/500.

Reading Telegram chats or testing channel delivery can return **HTTP 200 + `success:true` + `data.ok:false`**; a manual discovery test instead returns top-level `ok:false` (without a `success` envelope). In both cases the HTTP request succeeded but the operation failed: inspect `code` and `message` at the corresponding level, and `details.reason` if needed. Only `ok:true` means the operation succeeded. For example, a channel test may return `{"success":true,"data":{"ok":false,"code":"TIMEOUT","message":"…"}}`. Operation codes include `AUTH_FAILED`, `TIMEOUT`, `NETWORK_ERROR`, `RATE_LIMITED`, `INVALID_RESPONSE`, and `UNAVAILABLE`; do not confuse them with HTTP error codes. The operation-result contract is in `packages/contracts/src/operation-result.ts`. Secrets are write-only and are never returned in plaintext by read endpoints.

## Settings and core resources

| Method and path | Purpose / input | Response |
| --- | --- | --- |
| `GET /api/config` | Read a snapshot of groups, discoveries, monitors, actions, channels, providers, templates, and settings at once | `ConfigSnapshot`, without plaintext secrets |
| `GET /api/settings` | Read settings merged with defaults | `Settings` |
| `PATCH /api/settings` | JSON subset of settings fields; cannot be an empty object | Updated `Settings` |
| `DELETE /api/settings/:key` | Remove an override and restore that setting's code default | Updated `Settings`; **modifies settings** |
| `GET /api/config/rsshub-status` | Optionally pass `force=1` to bypass the short-term cache or `baseUrl` to probe a particular instance | RSSHub status; probes only, does not save settings |
| `GET /api/groups`, `GET /api/groups/:id` | List, detail | Group list or group |
| `POST /api/groups` | JSON: `name`; optional `description`, `enabled` | New group, 201 |
| `PATCH /api/groups/:id`, `DELETE /api/groups/:id` | Partial update, delete | Updated group / 204 |
| `GET /api/discoveries`, `GET /api/discoveries/:id` | Discovery list, detail | Discovery list or discovery |
| `POST /api/discoveries` | JSON: `groupId`, `name`, `kind`, `target`, `cronExpression`; optional `enabled` | New discovery, 201; may also fetch an icon |
| `PATCH /api/discoveries/:id`, `DELETE /api/discoveries/:id` | Partial update, delete | Updated discovery / 204 |
| `POST /api/discoveries/:id/test` | Manually probe a saved discovery; does not add items, but updates its card's probe status | `DiscoveryTestResult` (top-level `ok`, `message`, optional `code`/`details`/`data`) |
| `POST /api/discoveries/:id/icon` | Fetch the icon again; writes icon/source status | Updated discovery |
| `GET /api/icons/:file` | Read a locally cached icon; registered only when the icon directory is enabled | Image content |

For resource types and fields, including enums, length limits, and defaults, see `packages/contracts/src/entities.ts` and `settings.ts`. A discovery's `kind` is `rss`, `rsshub`, or `web`; its detail includes the collection status shown on the card. `/api/config` reads a snapshot; it cannot be used to write all resources.

## Monitors, actions, channels, and templates

| Method and path | Purpose / input | Response |
| --- | --- | --- |
| `GET /api/monitors`, `GET /api/monitors/:id` | Monitor list, detail | Monitor list or monitor |
| `POST /api/monitors` | JSON: `groupId`, `name`; mode, sensitivity, keywords, exclude words, action associations, etc. are optional | New monitor, 201 |
| `PATCH /api/monitors/:id`, `DELETE /api/monitors/:id` | Partial update, delete | Updated monitor / 204 |
| `POST /api/monitors/:id/preview` | JSON may contain `sampleSize` (1–50) and temporary `rules`; **read-only algorithm preview** over existing items in the same group, without a model call or saved judgment | `{total,matched,dropped,needsModel,samples}`; backend endpoint exists, but the current interface has no entry point |
| `GET /api/actions`, `GET /api/actions/:id` | Action list, detail | Action list or action |
| `POST /api/actions` | JSON: `groupId`, `name`, `channelId`; trigger and template, etc. are optional | New action, 201 |
| `PATCH /api/actions/:id`, `DELETE /api/actions/:id` | Partial update, delete | Updated action / 204 |
| `GET /api/channels`, `GET /api/channels/:id` | Channel list, detail | Channel list or channel; no plaintext secrets |
| `POST /api/channels` | JSON: `name`, `type`, `config`; optional `secret` and `enabled` | New channel, 201 |
| `PATCH /api/channels/:id`, `DELETE /api/channels/:id` | Partial update, delete | Updated channel / 204; deleting a channel still referenced by an action causes a conflict |
| `POST /api/channels/:id/test` | **Actually sends a test message**; do not call from read-only scripts | `{success:true,data:ChannelTestResult}` |
| `POST /api/channels/telegram/chats` | JSON: `token` or `channelId` (at least one); read chats previously seen by the Bot API | `{success:true,data:TelegramChatsResult}` |
| `GET /api/templates` | List built-in and custom templates | Template list |
| `POST /api/templates` | JSON: name, body, etc., validated against the template contract | New template, 201 |
| `PATCH /api/templates/:id`, `DELETE /api/templates/:id` | Edit or delete custom templates; built-in templates cannot be edited or deleted | Updated template / 204 |

For judging parameters and their meaning, see [Judgment and scoring](judgment-scoring.en.md) and [LLM+](llm-plus.en.md). Full template fields are in `packages/contracts/src/template.ts`. Do not treat `preview` as an actual judgment or model call.

## Models, events, incidents, and statistics

| Method and path | Purpose / input | Response |
| --- | --- | --- |
| `GET /api/model-providers`, `GET /api/model-providers/:id` | Provider list, detail | Provider data, without plaintext API keys |
| `POST /api/model-providers` | JSON: `name`, `kind`, `baseUrl`, etc.; optional API key | New provider, 201 |
| `PATCH /api/model-providers/:id`, `DELETE /api/model-providers/:id` | Edit, delete | Updated provider / 204 |
| `GET /api/model-providers/:id/available-models` | Request the model list directly from the provider; failures return an empty array | `{models:[...]}`; may contact a third-party network |
| `GET /api/events` | Optional `cursor`, `limit`, `discoveryId`; searches only the last 24 hours | `{events,nextCursor,total}`; 20 per page by default, maximum 50; pass the cursor through unchanged |
| `GET /api/events/sources` | Available sources and their event counts in the recent window | List of `{discoveryId,name,count}` |
| `POST /api/events/:id/read` | Mark an event as read; **writes state** | `{id,readAt}` |
| `GET /api/incidents` | View recent incidents that have not been dismissed | Incident list |
| `POST /api/incidents/:id/dismiss` | Dismiss an incident; **does not fix its cause** | Updated incident |
| `GET /api/stats/overview` | Dashboard summary | Statistics object |
| `GET /api/stats/cards` | Summary for the backs of cards on the configuration page | Statistics for each card type |

For `GET /api/events`, a non-positive `limit` returns 400, while one above the maximum is capped. `cursor` is opaque; do not construct it yourself. Examples illustrate endpoint shapes only and use no real IDs or credentials. There is no user API here for “run an official collection and delivery now”; the scheduler runs discoveries on their schedules. For exact fields, consult `packages/contracts/src/` and the actual server responses.
