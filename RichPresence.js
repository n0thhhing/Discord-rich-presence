import WebSocket from 'ws';
import chalk from 'chalk';
import JSONFormatter from 'json-fmt';
import { syntaxHighlight } from './Functions/Highlight.js';

var fmt = new JSONFormatter(JSONFormatter.PRETTY);

class RichPresence {
 constructor({ token, clientId, logs, handle }) {
  this.token = token;
  this.clientId = clientId;
  this.websocket = null;
  this.heartbeatInterval = null;
  this.connected = false;
  this.logs = logs !== undefined ? logs : true;
  if (handle) {
  this.handle = handle
  } else {
   this.handle = false
  }
  if (this.logs) {
   console.log(
    `${chalk.blue('[LOGS]')} - RichPresence logs are ${chalk.red('Enabled')}.` +
    `\nTo disable logs, put \n"${chalk.blue(`logs`)}: ${chalk.red('false')}"\ninto the "${chalk.green(
     'RichPresence'
    )}" constructor argument`
   );
   if (this.handle) {
    console.log(
     `${chalk.blue('[LOGS]')} - RichPresence handle logs are also ${chalk.red("Enabled")}.`)
   }
   console.log("\n")
  }
 }

 async connect() {
  try {
   await this.authenticate();
   this.setupWebSocket();
  } catch (error) {
   this.handleError('Failed to connect:', error);
  }
 }

 authenticate() {
  return Promise.resolve(); // No need to authenticate for user tokens
 }

 setupWebSocket() {
  try {
   this.websocket = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

   this.websocket.on('open', () => {
    if (this.logs) {
     console.log(`WebSocket ${chalk.green('connected')}`);
    }
    this.connected = true;
    this.startHeartbeat();
    this.sendIdentify();
   });

   this.websocket.on('message', (data) => {
    try {
     const parsedData = JSON.parse(data);
     this.handleMessage(parsedData);
    } catch (error) {
     this.handleError('Error parsing WebSocket message:', error);
    }
   });

   this.websocket.on('close', () => {
    console.log(`WebSocket ${chalk.red('closed')}`);
    clearInterval(this.heartbeatInterval);
    this.connected = false;
   });

   this.websocket.on('error', (error) => {
    this.handleError('WebSocket error:', error);
   });
  } catch (error) {
   this.handleError('WebSocket setup error:', error);
  }
 }

 startHeartbeat() {
  this.heartbeatInterval = setInterval(() => {
   this.sendHeartbeat();
  }, 5000);
 }

 sendIdentify() {
  try {
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
  } catch (error) {
   this.handleError('Error sending identify payload:', error);
  }
 }

 sendHeartbeat() {
  try {
   const payload = {
    op: 1,
    d: null,
   };
   this.websocket.send(JSON.stringify(payload));
  } catch (error) {
   this.handleError('Error sending heartbeat payload:', error);
  }
 }

 handleMessage(message) {
  try {
   const { op, d } = message;

   switch (op) {
    case 10: // Hello
     this.handleHello(d);
     break;
    case 11: // Heartbeat ACK
     if (this.handle) {
      console.log('Heartbeat acknowledged');
     }
     break;
    case 1: // Heartbeat
     if (this.handle) {
      console.log('Received Heartbeat');
     }
     this.handleHeartbeat();
     break;
    case 0: // Dispatch
     if (this.handle) {
      console.log('Received Dispatch');
     }
     this.handleDispatch(d);
     break;
    case 9: // Invalid Session
     if (this.handle) {
      console.log('Invalid Session');
     }
     this.handleInvalidSession();
     break;
    case 7: // Reconnect
     if (this.handle) {
      console.log('Reconnect');
     }
     this.handleReconnect();
     break;
    case 2: // Identify Connection
     if (this.handle) {
      console.log('Identify Connection');
     }
     this.handleIdentifyConnection();
     break;
    case 3: // Presence Update
     if (this.handle) {
      console.log('Presence Update');
     }
     this.handlePresenceUpdate(d);
     break;
    case 4: // Voice State Update
     if (this.handle) {
      console.log('Voice State Update');
     }
     this.handleVoiceStateUpdate(d);
     break;
    case 5: // Resume
     if (this.handle) {
      console.log('Resume');
     }
     this.handleResume(d);
     break;
    case 6: // Reconnect
     if (this.handle) {
      console.log('Reconnect');
     }
     this.handleReconnect();
     break;
    case 8: // Request Guild Members
     if (this.handle) {
      console.log('Request Guild Members');
     }
     this.handleRequestGuildMembers(d);
     break;
    case 12: // Channel Update
     if (this.handle) {
      console.log('Channel Update');
     }
     this.handleChannelUpdate(d);
     break;
    case 13: // Guild Members Chunk
     if (this.handle) {
      console.log('Guild Members Chunk');
     }
     this.handleGuildMembersChunk(d);
     break;
    case 14: // Guild Member Update
     if (this.handle) {
      console.log('Guild Member Update');
     }
     this.handleGuildMemberUpdate(d);
     break;
    default:
     this.handleError(`Unknown OP code: ${op}`);
     break;
   }
  } catch (error) {
   this.handleError('Error handling message:', error);
  }
 }

 handleResume(data) {
     try {
         if (this.websocket.readyState === WebSocket.OPEN) {
             const payload = {
                 op: 6,
                 d: {
                     token: this.token,
                     session_id: data.session_id,
                     seq: data.seq,
                 },
             };
             this.websocket.send(JSON.stringify(payload));
             if (this.logs) {
                 console.log('Resuming session...');
             }
         } else {
             this.handleError('WebSocket is not open. Unable to resume session.');
         }
     } catch (error) {
         this.handleError('Error handling resume:', error);
     }
 }

 handleRequestGuildMembers(data) {
     try {
         if (this.logs) {
             console.log('Requesting guild members with data:', data);
         }

         const guildId = data.guild_id;
         const members = Array.from({ length: 10 }, (_, index) => ({
             user: {
                 id: `${index + 1}`,
                 username: `User${index + 1}`,
             },
         }));

         const payload = {
             op: 8,
             d: {
                 guild_id: guildId,
                 members,
                 nonce: data.nonce,
                 chunk_index: 0,
                 chunk_count: 1,
             },
         };

         if (this.websocket.readyState === WebSocket.OPEN) {
             this.websocket.send(JSON.stringify(payload));
         } else {
             this.handleError('WebSocket is not open. Unable to send guild members.');
         }
     } catch (error) {
         this.handleError('Error handling request guild members:', error);
     }
 }

 handleChannelUpdate(data) {
     try {
         if (this.logs) {
             console.log('Channel updated with data:', data);
         }

     } catch (error) {
         this.handleError('Error handling channel update:', error);
     }
 }

 handleGuildMembersChunk(data) {
     try {
         if (this.logs) {
             console.log('Received guild members chunk with data:', data);
         }

     } catch (error) {
         this.handleError('Error handling guild members chunk:', error);
     }
 }

 handleGuildMemberUpdate(data) {
     try {
         if (this.logs) {
             console.log('Guild member updated with data:', data);
         }

     } catch (error) {
         this.handleError('Error handling guild member update:', error);
     }
 }
 handleHello({ heartbeat_interval }) {
  try {
   clearInterval(this.heartbeatInterval);
   this.heartbeatInterval = setInterval(() => {
    this.sendHeartbeat();
   }, heartbeat_interval);
  } catch (error) {
   this.handleError('Error handling hello:', error);
  }
 }
 handleDispatch(data) {
     try {
         // Handle Dispatch
     } catch (error) {
         this.handleError('Error handling dispatch:', error);
     }
 }

 setPresence(presenceData ) {
  try {
   if (this.logs) {
    console.log('WebSocket state:', this.websocket.readyState);
   }
   if (this.connected && this.websocket.readyState === WebSocket.OPEN) {
    const activities = presenceData.activities.map((activity) => {
     if (activity.assets) {
      if (activity.assets.large_image) {
       activity.assets.large_image = this.replaceImageURL(activity.assets.large_image);
      }
      if (activity.assets.small_image) {
       activity.assets.small_image = this.replaceImageURL(activity.assets.small_image);
      }
     }

     if (activity.buttons) {
      const buttons = activity.buttons
       ? activity.buttons.map((button) => ({
        label: button.label,
        type: '2',
        url: button.url,
       }))
       : undefined;
      return {
       ...activity,
       buttons,
      };
     } else {
      return {
       ...activity,
      };
     }
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
    if (this.logs) {
     fmt.end(JSON.stringify(payload.d));
     console.log(syntaxHighlight(fmt.flush()));
    }
    this.websocket.send(JSON.stringify(payload));
   } else {
    this.handleError('WebSocket is not open. Unable to set presence.');
   }
  } catch (error) {
   this.handleError('Error setting presence:', error);
  }
 }

 replaceImageURL(url) {
  return url
   .replace('https://cdn.discordapp.com/', 'mp:')
   .replace('http://cdn.discordapp.com/', 'mp:')
   .replace('https://media.discordapp.net/', 'mp:')
   .replace('http://media.discordapp.net/', 'mp:');
 }

 handleError(message, error) {
  console.error(`${chalk.red('[ERROR]')} - ${message}`, error);
 }
}

export { RichPresence }
