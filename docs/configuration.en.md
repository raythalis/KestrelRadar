# Configuration

Kestrel Radar configuration has two parts: **startup parameters are environment variables**, while **everyday settings are changed in the interface**. For your first use, see [Getting started](getting-started.en.md); for feature workflows see the [User guide](usage.en.md).

## Startup environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `KESTREL_HOST` | `127.0.0.1` | Listen address; set `0.0.0.0` for LAN access, but the application has no authentication |
| `KESTREL_PORT` | `8765` | Listen port |
| `KESTREL_DB_PATH` | `data/kestrel.db` | Database path; the `icons/` directory sits beside the database file |
| `KESTREL_STATIC_DIR` | Automatically finds `apps/web/dist` when built assets exist | Frontend static directory; without it, only the API is served |
| `KESTREL_LOG` | `on` | Request logging is enabled by default; `off` disables it. Currently any value other than `off` leaves it enabled |

These defaults are defined in `apps/api/src/config/index.ts`. A relative database path is resolved against the **backend process's working directory**; do not assume that is always the repository root. `pnpm start` launches `apps/api` through the package filter. Docker Compose explicitly sets `/data/kestrel.db` and mounts `infra/docker/data/` at `/data`.

## Settings in the interface

**Settings** has **General**, **Judging**, **Collection**, **Notifications**, and **About** tabs. After editing a settings card, click **Save** to apply it. **Reset** discards only unsaved changes; it does not restore factory defaults. The defaults below are from the current program; if you have saved different values, the saved values in the interface take precedence. Interface language is stored only in the current browser; the service stores the other settings.

### General

- **Interface language**: switches this browser's interface between Chinese and English; it does not translate existing content or message templates. Defaults to Chinese.
- **Time zone**: determines how the interface displays time and how scheduled jobs interpret it. Defaults to **System (server time)**. Before changing it, check whether your digest time still has the intended meaning in the new zone.

### Judging

- **Global judging mode**: defaults to **Algorithm only**, without model calls. With **LLM+**, monitors set to **Follow global** call a model under the applicable conditions. Monitors can explicitly select their own mode; see [LLM+](llm-plus.en.md).
- **Lenient score band**, **Medium score band**, **Strict score band**: each has an independent low and high line. A score at or below the low line is dropped; a score at or above the high line passes; scores in between form the grey zone. These bands are saved independently, not derived from the medium band. Defaults: lenient low 25/high 55; medium low 35/high 65; strict low 45/high 80. See [Judgment and scoring](judgment-scoring.en.md) for the process and examples.
- **Model call timeout**: maximum time for one model request; defaults to 30 seconds. A timeout fails that attempt; retries or later models may still be tried.
- **Model failed retries**: extra attempts after a model's first failed request; defaults to 1. Set to 0 to avoid retrying that model, although a later model in the order may still be tried.
- **When the model fails**: defaults to **Fall back to algorithm only**, retaining the algorithm's pass result for content that needed model review. The other option, **Discard**, leaves no result for this judgment when all model attempts fail and waits for a future attempt; it does not judge the content as a non-match. Requests may already have incurred provider charges; see [LLM+](llm-plus.en.md).
- **Global exclusion words**: combined with a monitor's own exclusions only when that monitor opts to use them. Matching content is rejected immediately without scoring or model calls. Empty by default.

### Collection

- **Concurrent collections**: maximum discoveries collected simultaneously; defaults to 5. Increasing this adds load to source sites and the local machine.
- **Request timeout**: maximum wait for one discovery's request; defaults to 30 seconds. A timeout counts as a failed collection.
- **Failed retries**: additional attempts after a collection failure; defaults to 2. This is not the collection frequency and does not affect model retries.
- **Retention days**: historical items and events older than this are removed by cleanup; defaults to 90 days. Before reducing it, decide whether you still need older records.
- **Archive after**: archives an event after this many days without new content; defaults to 14 days. Archiving is separate from deleting historical data.
- **Freshness window**: explicitly old published content can still be stored, but is not delivered; defaults to 7 days. Set to 0 for no limit.
- **RSSHub address**: if left unset, the field stays empty and shows `http://localhost:1200` as a hint. Collection, the connection test, and the route prefix in a discovery still use that address. An explicitly entered address takes precedence. In Docker, localhost refers to Kestrel Radar's own container. If RSSHub is elsewhere, use an address reachable from that container. RSSHub is a separate service; see the [User guide](usage.en.md#what-is-rsshub-and-how-do-i-find-a-route) and [official routes](https://docs.rsshub.app/routes/) for route discovery and testing.
- **Access key**: fill only if your RSSHub instance requires one; otherwise leave it empty. **Test connection** probes the current input but does not save it for you.

### Notifications

- **Message language**: controls fixed wording in notifications, such as the “Update” badge and source separators; it does not translate custom templates. Defaults to Chinese.
- **Daily delivery limit**: maximum notifications per day; defaults to 0 (unlimited). After reaching the limit, content is still stored but no further notifications are delivered.
- **Delivery timeout**: maximum time for a Telegram or Webhook delivery; defaults to 15 seconds. A timeout counts as a failed delivery.
- **Message templates**: there is one read-only built-in default body. You can create custom templates and select one on an action. See the [User guide](usage.en.md) for variables and delivery behavior.

**About** displays version and repository information; it has no business settings to save. The interface validates allowed input ranges, subject to server-side rules.

## Notification channels and models

Create Telegram or Webhook instances under **Channels** for use by a group's actions. Telegram requires a **Bot token** and **Chat (chat id)**. You can first have the bot receive a private or group message and then select a chat with **Read chats**, or enter the ID manually. Webhook requires an HTTP(S) receiving URL and optionally a secret. Delivery is a JSON POST containing rendered `text` and event information. If a secret is configured, it is sent as Bearer credentials. Clicking a channel's **Test** **really sends a message**; it verifies the channel, not the entire collection/judgment pipeline. Saved secrets are not returned in plaintext by read requests; leave a secret field empty while editing to keep its current value.

On **Models**, add an Ollama or **OpenAI compatible** provider and enter its **Base URL** and optional **API key**. Model choices come from the lists returned by providers; providers whose lists cannot be retrieved do not appear as options. Select and save at most three models in **Model order**. Only after an earlier model times out or fails its retries is the next tried. Models are called only when LLM+ actually applies. Final handling after model failure is set under **Settings → Judging**; see [LLM+](llm-plus.en.md) and [Judgment and scoring](judgment-scoring.en.md).

## Data and backups

The database stores configuration, items, events, incidents, and delivery records; icons are stored in `icons/` beside the database file. **Include the database and its SQLite WAL/SHM files in a backup, or stop the service before copying the entire data directory.** Copying only a `.db` file with `cp` while the service is running does not guarantee a consistent snapshot. The Docker Compose host data directory is `infra/docker/data/`. For script/manual runs, confirm the actual `KESTREL_DB_PATH` and working directory first.

To restore, stop the service, return the backup to the corresponding data directory, then start it. Back up the database separately before rolling back across versions: startup migrations may already have changed its schema. Data includes channel secrets and model API keys, so restrict access to the directory and backup copies. See [Deployment](deployment.en.md) for other run modes.
