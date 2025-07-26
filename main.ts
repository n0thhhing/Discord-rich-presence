import { RichPresence } from "./RichPresence.js";
const TOKEN = "OTEyODg5MzI4ODE0OTQwMjAx.8tVwHOerJSm8X5AWDa_lVvGKIh0"; // dont worry, the only place this is going is to discords rpc gateway
const CLIENT_ID = "1345026949478879304"; // again, this will not be used in any other way than simply connecting to the discord gateway

const rich = new RichPresence({
  token: TOKEN,
  clientId: CLIENT_ID,
  logs: true,
  /*default is true*/ handle: true /*default is false*/,
});

// ./RPC/main.ts

rich.connect().then(() => {
  setTimeout(() => {
    // you need to set a timeout else an error will be thrown ( this is mmy fault )
    rich.setPresence({
      activities: [
        {
          name: "Coding",
          type: 0, // playing
          details: "VULX : TTJY",
          state: "In the zone",
          party: {
            size: [2, 4],
            id: "party123",
          },
          timestamps: {
            start: Date.now() / 1000,
          },
          assets: {
            large_image: "large_image url", // both large and small image have to be a discord attatchment url
            large_text: "Custom Image Text",
            small_image: "small_image_url",
            small_text: "Custom Image Text",
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