# User guide

Kestrel Radar's everyday flow is to configure **Discoveries** (where content comes from), **Monitors** (what stays), and **Actions** (when and where to send it) within a group. Use the **Dashboard** to see resulting events and incidents. This guide follows tasks in the actual interface. For installation and your first successful run, see [Getting started](getting-started.en.md).

## First use: create a group

Open **Config**, click **New group**, enter a name and optionally a short description, and save. An expanded group has **Discoveries**, **Monitors**, and **Actions** columns; you can add multiple entries to each. Groups can be collapsed, expanded, edited, and deleted. Turning off a group stops its collection and subsequent processing without deleting existing data. Read the confirmation dialog before deleting; do not confuse turning off with deletion.

## Add a discovery and schedule collection

In the group's **Discoveries** column, click **Add discovery** and enter a name, type, target address/route, and **Collection frequency**:

- **RSS feed**: a complete RSS/Atom feed URL beginning with `http://` or `https://`.
- **RSSHub route**: a path such as `/namespace/route`. Configure the instance base address under **Settings → Collection**, not separately for each discovery.
- **Web page**: a complete page URL. Kestrel Radar attempts to find a feed through the page's RSS/Atom declarations. A normal web page without a discoverable feed does not imply Kestrel Radar can scrape arbitrary page content.

### What is RSSHub, and how do I find a route?

[RSSHub](https://docs.rsshub.app/guide/) is a separate project that turns website content into RSS feeds. Kestrel Radar does not include RSSHub or use it to scrape arbitrary sites: for an **RSSHub route**, Kestrel Radar requests feed content from your configured instance on the collection schedule and passes it to the monitors. If the site already has an RSS/Atom feed URL, choose **RSS feed** instead; RSSHub is unnecessary.

Search the target site in the [official RSSHub routes](https://docs.rsshub.app/routes/), open the route's instructions, supply any required parameters, and obtain the actual path. The [official guide](https://docs.rsshub.app/guide/) explains how paths relate to the instance address. In Kestrel Radar, enter the instance address at **Settings → Collection → RSSHub address** and the route path as the discovery's **RSSHub route** target; Kestrel Radar combines them. If the instance requires an **Access key**, set it there too. Both the instance and target route must be reachable **from the environment running Kestrel Radar**. Some routes require credentials or browser rendering, or are affected by the target site's anti-bot measures; a route appearing in the docs does not guarantee your instance can collect it. Test the instance connection in Settings first, then save the discovery and use **Test collection** to check its content.

Open the **Collection frequency** field to choose a time with the generator, or enter a five-field cron expression. This controls **how often Kestrel Radar checks**, not how many hours of content each check reads. After saving, click **Test collection** on the card: it checks the route and content and reports the result in a toast; **the test does not store items**. Creation currently **does not test automatically before saving**, nor is there a separate way to test an unsaved target.

Enabled discoveries collect on their own schedules. The first successful collection establishes a baseline and treats existing content as history; only newly appearing content in later collections enters judgment and delivery. Recollecting the same item does not make it new again. Editing a discovery can change its target or schedule or turn it on/off; before deletion the UI warns that historical items and events are kept.

## Create monitors and judge content

In the same group's **Monitors** column, use **Add monitor** and set its name, **Mode**, **Keywords**, **Match mode**, **Sensitivity**, and **Exclude words**:

- Choose **Any keyword** or **All keywords**; leaving keywords empty adds no keyword threshold. Exclusion words can be combined with global exclusion words.
- **Mode** can be **Follow global**, **Algorithm only**, or **LLM+**. **Intent** appears only for applicable modes. Before model judgment, configure a provider, **Model order**, and global judging settings; see [Configuration](configuration.en.md). For details see [Judgment and scoring](judgment-scoring.en.md) and [LLM+](llm-plus.en.md).
- Leave **Actions to use** empty to follow the actions in the same group. Selecting actions means only those actions process this monitor's matches.

Judgment happens **after new items are collected**; changing a rule does not automatically rejudge all historical items. The current Config page lets you create, edit, and delete monitors but has **no usable monitor-rule preview or trial-run control**. Do not treat preview APIs described in older development documents as an interface feature. To observe before enabling delivery, you can inspect later events without configuring an action, but you still need real new content. Items that do not pass judgment do not become events; the Dashboard is not a browser for all raw items.

## Configure actions and message templates

In a group's **Actions** column, use **Add action** and set its name, **Trigger**, **Channel**, and **Message template**. Triggers are **Deliver as soon as collected** and **Daily digest**; the latter also requires **Digest time**. You can select **Merge into one message**, and for a digest you can choose **Include content already delivered instantly**. No notification goes out if no channel is selected or the channel is disabled.

Manage templates under **Settings → Notifications**. The built-in default template is read-only; custom templates can be created, edited, and deleted. Select a template on an action. If none is selected or the selected template was deleted, the backend uses the same built-in default body, not separate bodies for each interface language. The following variables are filled in when a custom template is delivered:

| Variable | Value |
| --- | --- |
| `{{title}}` | Event title. |
| `{{summary}}` | Summary of the event's first source, collapsed to one line and truncated with an ellipsis after 120 characters; empty if there are no sources. |
| `{{url}}` | Event's original URL; empty if unavailable. |
| `{{sourceCount}}` | Number of sources recorded for the event. |
| `{{sources}}` | One line per source with its name and URL; sources without a URL show “(no link)”; empty if there are no sources. |
| `{{hitAt}}` | Time of the event's first item, formatted in the timezone selected under **Settings → General**; empty if the time is unavailable or invalid. |
| `{{group}}` | Name of the group containing the event. |
| `{{badge}}` | “有更新 ” or “Update ” according to message language when the event is marked as updated; otherwise empty. |
| `{{eventCount}}` | Number of events in this message. |

Unrecognized variables remain unchanged in the message, so typos are visible. Template text differs from the message-language setting: changing interface language does not translate your template. Webhook delivery is a JSON POST and uses Bearer credentials if a secret is configured. The request includes rendered text, event title, original URL, source count, number of events in the message, and hit time. The recipient must return 2xx for success.

The same action does not repeatedly deliver an item just because it was collected again. By default, an already-delivered event also is not redelivered merely because it gains another source; only a significant new development recognized by the code may mark it as an update and cause another delivery. A digest takes matches not yet delivered by that action; it does not rescan a specified time interval.

## Configure and test notification channels

**Channels** supports **Telegram** and **Webhook**; you can create multiple instances and edit, disable, or delete each one. For Telegram, enter a **Bot token** and **Chat (chat id)**. First have the bot receive a private message or add it to a group where it receives messages, then use **Read chats** to select one; you can also enter the chat ID manually. For Webhook, enter a receiving URL and optionally a secret. See [Configuration](configuration.en.md) for protocol details.

The channel card's **Test** **really sends a test message**; confirm the destination before clicking. A toast reports success or failure, and the card shows this test's status. Changing channel credentials invalidates the old test status. A channel test does not prove collection and monitoring succeeded. Deleting a channel still referenced by actions prevents those actions from delivering.

## Configure models and global settings

On **Models**, add an Ollama or **OpenAI compatible** provider, enter its **Base URL**, and optionally an **API key**. Select up to three rows in **Model order** from the model lists actually returned by providers, then save. Providers whose model lists cannot be retrieved do not appear among selectable models. Global judgment defaults to **Algorithm only** and works without a model. For LLM+, also select a mode under **Settings → Judging** and adjust timeout, retries, and fallback if needed. Model requests may incur provider charges.

**Settings** has **General**, **Judging**, **Collection**, **Notifications**, and **About** tabs. Edit each settings card's draft, then click its **Save**. Its **Reset** only discards **unsaved** changes and returns to the saved values; it **does not restore factory defaults**. The RSSHub address's connection test reads the current input without saving it. Interface language is a preference stored in this browser; other global settings are stored by the backend. See [Configuration](configuration.en.md) for individual settings.

## View events and incidents

The **Dashboard** has real statistics, **Recent events** from the last 24 hours, and **Incidents**; it is not a placeholder page. Filter events by discovery. Clicking an event opens its linked original and marks it read. **View all** in the list header expands the list, and scrolling loads more. “All” is still limited to the last 24 hours, **not every historical raw item**. One event can contain several sources; their individual links appear in source tags or the `+N` list.

**Incidents** shows failures in collection, judgment, or delivery. **Dismiss** removes an incident from the current list; **it does not fix the cause**. If one of the event, statistics, or incident sections fails to load, the others can still appear independently; watch for request-error toasts.

## Why are there no events or notifications?

Check the pipeline in order rather than testing only the channel:

1. **No new content collected?** Check whether the group and discovery are enabled, the collection schedule, and whether the target can be read. Use **Test collection** on the discovery card. Testing only probes; it stores nothing. The first real collection only establishes a baseline. For an RSSHub route, confirm the instance address is reachable from the running environment.
2. **New items but no events?** Check enabled monitors in the same group, **Any keyword** versus **All keywords**, exclusion words, and sensitivity. With LLM+, check the provider, **Model order**, and failure fallback. Event merging takes only items that passed judgment; unjudged or dropped items do not appear in Recent events, which also covers only the last 24 hours.
3. **Events but no messages?** Check that an action in the same group is enabled, its trigger (immediate or awaiting digest time), whether the monitor is bound only to other actions, and whether the channel is enabled. Check the freshness window, daily delivery limit, and rules against redelivering content already sent by this action or, by default, the same event. A successful channel test does not imply a qualifying business match.
4. **A previous delivery failed?** Check Dashboard incidents and channel-test feedback. Correct the address, chat, or credentials and wait for the next suitable trigger; **Dismiss** is neither retry nor repair.

The current interface has **no complete raw-item browser or per-item judgment-reason search**, and no user button to “collect now and deliver immediately.” Do not mistake planned features in old requirements for current product behavior.
