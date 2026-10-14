# RichPresence Library

## Overview

The RichPresence library is a Node.js library that allows you to set a custom Discord Rich Presence for your account or application. It connects directly to the Discord Gateway API via WebSocket to establish a presence session and update your activity in real-time.

## Installation

1. Clone the repository and navigate into it:

   ```bash
   git clone https://github.com/n0thhhing/Discord-rich-presence.git
   cd Discord-rich-presence
   ```

2. Install dependencies using npm:

   ```bash
   npm install
   ```

## Usage

Here's an example of how to use the RichPresence library:

```javascript
import { RichPresence } from "./RichPresence.js";

const TOKEN = "your token"; // Discord account or bot token
const CLIENT_ID = "your clientId"; // Discord application / client ID

const rich = new RichPresence({
  token: TOKEN,
  clientId: CLIENT_ID,
  logs: true,
  handle: false,
});

rich.connect().then(() => {
  rich.setPresence({
    activities: [
      {
        name: "Coding",
        type: 0, // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 5 = Competing
        details: "Working on a project",
        state: "In the zone",
        party: {
          size: [2, 4],
          id: "party123",
        },
        timestamps: {
          start: Math.floor(Date.now() / 1000),
        },
        assets: {
          // Supports Discord attachment URLs (auto-converted to mp: format),
          // external image URLs (e.g. Imgur, personal host), mp: links, or Developer Portal asset keys
          large_image: "https://cdn.discordapp.com/attachments/1234567890/1234567890/image.png",
          large_text: "Custom Large Image Text",
          small_image: "https://media.discordapp.net/attachments/1234567890/1234567890/icon.png",
          small_text: "Custom Small Image Text",
        },
        buttons: [
          { label: "Website", url: "https://example.com" },
          { label: "GitHub", url: "https://github.com" },
        ],
      },
    ],
  });
});
```

## Image Assets

The library automatically processes image assets for `large_image` and `small_image`:
- **Discord Attachment & Media URLs** (e.g., `https://cdn.discordapp.com/attachments/...` or `https://media.discordapp.net/attachments/...`) are automatically transformed into Discord's required `mp:` media proxy format.
- **Media Proxy Links** (`mp:attachments/...` or `mp:external/...`) are preserved as is.
- **External Image URLs** (e.g., `https://i.imgur.com/...`) are preserved as is and proxied by Discord.
- **Developer Portal Asset Keys** (e.g., `logo`, `my_asset_key`) are preserved as is.
- `small_image` and `large_image` are handled independently.

## Buttons

Rich Presence supports up to 2 clickable buttons.
> **Note:** Due to Discord client behavior, Discord does not render Rich Presence buttons when viewing your own profile. To verify your buttons, view your profile from a secondary account or ask a friend.

## Configuration Options

- `logs` (boolean, default: `true`): Enable or disable status and error logging.
- `handle` (boolean, default: `false`): Enable or disable verbose gateway event logging (heartbeats, dispatches, etc.).

## Methods

- `connect()`: Connects to the Discord Gateway and resolves once the connection is established and ready.
- `setPresence(presenceData)`: Sets or updates the active Rich Presence activities and status. If called while the connection is still establishing, the presence update will be queued and sent immediately upon connecting.
- `updatePresence(presenceData)`: Alias for `setPresence`.
- `disconnect()`: Closes the WebSocket connection and clears heartbeat timers.

## Important Notes

- Make sure to replace placeholders like `YOUR_DISCORD_TOKEN` and `YOUR_CLIENT_ID` with your actual Discord token and application ID.
- Keep your token secure; never commit it to public repositories.
