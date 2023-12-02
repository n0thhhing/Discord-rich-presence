# RichPresence Library

## Overview
The RichPresence library is a simple Node.js library that allows you to set a custom Discord Rich Presence for your account or application. It uses the Discord Gateway API to establish a WebSocket connection and update the presence information.

**Note:** The library is currently in development, and some features may not be fully functional.

## Installation
To use the RichPresence library, follow these steps:

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/n0thhhing/Discord-rich-presence.git
   cd Discord-rich-presence
   ```

2. Install the required dependencies using npm:
   ```bash
   npm install
   ```

## Usage
Here's a simple example of how to use the RichPresence "library":

```javascript
import { RichPresence } from "./RichPresence.js" // or const { RichPresence } = require("RichPresence.js")
const TOKEN = "your token"; // dont worry, the only place this is going is to discords rpc gateway
const CLIENT_ID = "your clientId"; // again, this will not be used in any other way than simply connecting to the discord gateway

const rich = new RichPresence({ token: TOKEN, clientId: CLIENT_ID, logs: false,/*default is true*/ handle: true /*default is false*/ });

rich.connect().then(() => {
  setTimeout(() => { // you need to set a timeout else an error will be thrown ( this is mmy fault )
    rich.setPresence({
      activities: [
        {
          name: 'Coding',
          type: 0, // playing
          details: 'Working on a project',
          state: 'In the zone',
          party: {
            size: [2, 4],
            id: 'party123',
          },
          timestamps: {
            start: Date.now() / 1000,
          },
          assets: {
            large_image: 'large_image url', // both large and small image have to be a discord attatchment url
            large_text: 'Custom Image Text',
            small_image: 'small_image_url',
            small_text: 'Custom Image Text',
          },
         /* once i fix buttons itd look something like =>
         buttons: [
           { label: "name", url: "redirect-url"}
         ]
         */
        },
      ],
    });
  }, 3000);
});
```

## Extra
- if you dont want progress/error logs you can simply put
  ```json
  logs: false
  ```
   into your RichPresence constructor arguments( default is true ), i recommend keeping this enabled because it allows error logging
- if you want handle updates just put
  ```json
  handle: true
  ```
  into your RichPresence constructor argument( default is false )
 
## Important Notes
- Make sure to replace placeholders like `YOUR_DISCORD_TOKEN` and `YOUR_CLIENT_ID` with your actual Discord account token and client ID.
- The library is currently under development, and some features may not work as expected.

## Known Issues
- Buttons are currently not functional.
- Only supports user token

## Troubleshooting
If you encounter any issues, please check the console logs for error messages. If you need further assistance, feel free to open an issue on the GitHub repository.