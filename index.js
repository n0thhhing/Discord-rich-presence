import axios from 'axios';
import WebSocket from 'ws';
import chalk from "chalk";

class RichPresence {
 constructor({ token, clientId, logs }) {
  this.token = token;
  this.clientId = clientId;
  this.websocket = null;
  this.heartbeatInterval = null;
  this.connected = false;
  if (logs) {
   this.logs = logs;
  } else {
   this.logs = true;
   console.log(`${chalk.blue('[LOGS]')} - RichPresence logs are ${chalk.red(`Enabled`)}.` +
    `\nTo disable logs, put \n"${chalk.blue(`logs`)}: ${chalk.red('false')}"\ninto the "${chalk.green('RichPresence')}" constructor argument\n`);
  }
 }

 async connect() {
  try {
   await this.authenticate();
   this.setupWebSocket();
  } catch (error) {
   console.error('Failed to connect:', error.message);
  }
 }

 authenticate() {
  return Promise.resolve(); // No need to authenticate for user tokens
 }



 setupWebSocket() {
  this.websocket = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

  this.websocket.on('open', () => {
   if (this.logs) {
    console.log('WebSocket connected');
   }
   this.connected = true;
   this.startHeartbeat();
   this.sendIdentify();
  });

  this.websocket.on('message', (data) => {
   this.handleMessage(JSON.parse(data));
  });

  this.websocket.on('close', () => {
   console.log('WebSocket closed');
   clearInterval(this.heartbeatInterval);
   this.connected = false; // Update connection state
  });
 }

 startHeartbeat() {
  this.heartbeatInterval = setInterval(() => {
   this.sendHeartbeat();
  }, 5000);
 }

 sendIdentify() {
  const payload = {
   op: 2,
   d: {
    token: this.token,
    properties: {
     $os: 'linux',
     $browser: 'my_library',
     $device: 'my_library',
    },
    intents: 513,
   },
  };
  this.websocket.send(JSON.stringify(payload));
 }


 sendHeartbeat() {
  const payload = {
   op: 1,
   d: null,
  };
  this.websocket.send(JSON.stringify(payload));
 }

 handleMessage(message) {
  const { op, d } = message;

  switch (op) {
   case 10: // Hello
    this.handleHello(d);
    break;
   case 11: // Heartbeat ACK
    if (this.logs) {
     console.log('Heartbeat acknowledged');
    }
    break;
  }
 }

 handleHello({ heartbeat_interval }) {
  console.log('Received Hello, starting heartbeat');
  clearInterval(this.heartbeatInterval);
  this.heartbeatInterval = setInterval(() => {
   this.sendHeartbeat();
  }, heartbeat_interval);
 }


 setPresence(presenceData) {
  if (this.logs) {
   console.log('WebSocket state:', this.websocket.readyState);
  }
  if (this.connected && this.websocket.readyState === WebSocket.OPEN) {
   const activities = presenceData.activities.map(activity => {
    // Check and replace image URLs
    if (activity.assets) {
     if (activity.assets.large_image) {
      activity.assets.large_image = activity.assets.large_image
       .replace('https://cdn.discordapp.com/', 'mp:')
       .replace('http://cdn.discordapp.com/', 'mp:')
       .replace('https://media.discordapp.net/', 'mp:')
       .replace('http://media.discordapp.net/', 'mp:');
     }
     if (activity.assets.small_image) {
      activity.assets.small_image = activity.assets.small_image
       .replace('https://cdn.discordapp.com/', 'mp:')
       .replace('http://cdn.discordapp.com/', 'mp:')
       .replace('https://media.discordapp.net/', 'mp:')
       .replace('http://media.discordapp.net/', 'mp:');
     }
    }

    // Create a new property for buttons
    const buttons = activity.buttons
     ? activity.buttons.map(button => ({
      label: button.label,
      type: '2', // Ensure type is a string
      url: button.url,
     }))
     : undefined;

    return {
     ...activity,
     buttons,
    };
   });

   const payload = {
    op: 3,
    d: {
     since: presenceData.since || null,
     activities: activities || [],
     status: presenceData.status || 'online',
     afk: presenceData.afk || false,
    },
   };
   if (logs) {
    console.log(payload.d);
   }
   this.websocket.send(JSON.stringify(payload));
  } else {
   console.error('WebSocket is not open. Unable to set presence.');
  }
 }
}

// Example usage
const TOKEN = process.env.PROPLAM_USER;
const CLIENT_ID = process.env.PROPLAM_CLIENT;

const rich = new RichPresence({ token: TOKEN, clientId: "1134948869986320574" });

rich.connect().then(() => {
 setTimeout(() => {
  rich.setPresence({
   activities: [
    {
     name: 'Coding',
     type: 0, // Playing
     details: 's',
     state: 'what',
     timestamps: {
      start: Date.now() / 1000,
     },
     assets: {
      large_image: process.env.PROPLAM_PFP, // this is a url
      large_text: 'Custom Image Text',
      small_image: process.env.PROPLAM_PFP, // this is a url
      small_text: 'Custom Image Text',
     },
     // buttons: [
     //  {label: "test", url: "https://discord.com"},
     // ]
    },
   ],
  });
 }, 3000);
});
