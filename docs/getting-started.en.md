# Getting started

This guide takes you from a fresh Kestrel Radar installation to a first configuration that collects, judges, and delivers content. For complete installation commands, data directories, and upgrades, see [Deployment](deployment.en.md).

## 1. Start Kestrel Radar and open the interface

First obtain the project source. Run `./start.sh` on Linux/macOS or `start.bat` on Windows. If compatible Node.js or pnpm is missing, the scripts ask permission to install it inside the project, then build and start the service in the current terminal (not in the background). For requirements and Docker installation, see [Deployment](deployment.en.md).

```bash
./start.sh
```

Then open <http://127.0.0.1:8765> on the same device. To access it from another device on your LAN, set `KESTREL_HOST=0.0.0.0` before starting and open the host's LAN address. See [Deployment](deployment.en.md) for Docker port mapping and restricting access. **Kestrel Radar currently has no accounts or authentication; do not expose it directly to the public internet.**

The database is created on first startup. Docker data lives in `infra/docker/data/`; the relative data path for script/manual startup depends on the backend process's working directory. Confirm the actual path in [Configuration](configuration.en.md) before backing up.

## 2. Prepare a discovery

If you use an RSSHub route, first check the RSSHub base address under **Settings → Collection**. The default is `http://localhost:1200` within the environment running Kestrel Radar. In Docker, this points to the Kestrel Radar container itself. If RSSHub runs in another container or on the host, change the address to one Kestrel Radar can reach; use the page's test control to check it. Find a route and its parameters in the [official RSSHub routes](https://docs.rsshub.app/routes/). For the concept, path syntax, and validation steps, see [the RSSHub section of the user guide](usage.en.md#what-is-rsshub-and-how-do-i-find-a-route). A direct RSS/Atom feed URL does not require RSSHub.

Open **Config**, create a **New group**, then add a discovery in the group's **Discoveries** column. Choose **RSS feed** and enter a complete `http://` or `https://` feed URL, choose **RSSHub route** and enter a route, or choose **Web page** to have Kestrel Radar look for its RSS/Atom link. Enter a name and **Collection frequency**, then save. Open the frequency field to choose a schedule with the generator, or enter a five-field expression directly. **Saving does not automatically test collection first.** After saving, use **Test collection** on the discovery card to check connectivity. Manual testing neither stores items nor generates events or notifications.

## 3. Turn content into events

Create an **Add monitor** in the same group's **Monitors** column. You can enter keywords and select **Any keyword** or **All keywords**, or leave keywords empty (no keyword threshold). Add exclusion words and choose sensitivity as needed. For a first run, the default algorithm-only mode avoids model charges; for LLM+, configure providers and **Model order** first, as described in [Configuration](configuration.en.md).

The first scheduled collection establishes a historical baseline; **old items seen for the first time do not generate notifications**. Events form only when later collections find new content that passes monitor judgment. Manual **Test collection** is not a way to force a real event either.

## 4. Configure the first delivery

Under **Channels**, create and save a Telegram or Webhook channel. If needed, click **Test** on its card: this **really sends a test message**. Telegram needs a bot token and chat ID; Webhook needs a receiving URL. See [Configuration](configuration.en.md).

Return to the group's **Actions** column and use **Add action**. Select **Deliver as soon as collected** or **Daily digest**, an enabled channel, and a message template, then save. A daily digest also needs a **Digest time**. By default, a monitor follows the actions in its group; if you select **Actions to use** on the monitor, only those actions receive its matches.

## 5. Check the result

The **Dashboard** shows real statistics, **Recent events**, and **Incidents**. When new content appears, check that the discovery completed a collection beyond its first one, then check events. If an event exists but no notification arrived, inspect the action, channel, and incidents. A successful channel test proves only that the channel can send one test message; **it does not prove the discovery → monitor → action pipeline matched**. Follow the [user guide's troubleshooting steps](usage.en.md#why-are-there-no-events-or-notifications).