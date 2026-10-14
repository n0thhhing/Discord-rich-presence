import WebSocket from "ws";
import { inspect } from "util";

/**
 * RichPresence class for handling Discord Rich Presence functionality.
 * @class
 * @typedef {void} Presence
 * @param {Object} options - Configuration options for the RichPresence instance.
 * @param {string} options.token - Discord bot token or user token.
 * @param {string} options.clientId - Discord client ID / Application ID.
 * @param {boolean} [options.logs=true] - Enable/disable logging.
 * @param {boolean} [options.handle=false] - Enable/disable handle-specific logging.
 * @see {@link https://github.com/n0thhhing/Discord-rich-presence} - for more information or issues
 */
class RichPresence {
  constructor({ token, clientId, logs, handle }) {
    this.token = token;
    this.clientId = clientId;
    this.websocket = null;
    this.heartbeatInterval = null;
    this.connected = false;
    this.verbose = logs !== undefined ? logs : true;
    this.handle = Boolean(handle);
    this.seq = null;
    this.sessionId = null;
    this.pendingPresenceCallback = null;

    if (this.verbose) {
      console.log(
        `\x1b[34m[LOGS]\x1b[0m - RichPresence logs are \x1b[31mEnabled\x1b[0m.` +
          `\nTo disable logs, put \n\x1b[34mlogs\x1b[0m: \x1b[31mfalse\x1b[0m${
            this.handle
              ? ` and \x1b[34mhandle\x1b[0m: \x1b[31mfalse\x1b[0m`
              : ""
          }\ninto the \x1b[32mRichPresence\x1b[0m constructor argument`,
      );
      if (this.handle) {
        console.log(
          `\x1b[34m[LOGS]\x1b[0m - RichPresence handle logs are also \x1b[31mEnabled\x1b[0m.`,
        );
      }
      console.log("");
    }
  }

  /**
   * Establishes a connection to the Discord Gateway.
   * @async
   * @returns {Promise<void>} - Resolves when the connection is successfully established.
   */
  async connect() {
    try {
      await this.setupWebSocket();
    } catch (error) {
      this.handleError("Failed to connect:", error);
      throw error;
    }
  }

  /**
   * Authentication method (no need to authenticate for user tokens).
   * @returns {Promise<void>} - Resolves when authentication is successful.
   */
  authenticate() {
    return Promise.resolve(); // No need to authenticate for user tokens
  }

  /**
   * Sets up the WebSocket connection to the Discord Gateway.
   * @returns {Promise<void>} - Resolves when the WebSocket connection is established and ready.
   */
  setupWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(
          "wss://gateway.discord.gg/?v=10&encoding=json",
        );

        let isResolved = false;
        const completeConnection = () => {
          if (!isResolved) {
            isResolved = true;
            if (this.pendingPresenceCallback) {
              const cb = this.pendingPresenceCallback;
              this.pendingPresenceCallback = null;
              cb();
            }
            resolve();
          }
        };

        this.websocket.on("open", () => {
          if (this.verbose) {
            console.log(`WebSocket \x1b[32mconnected\x1b[0m`);
          }
          this.connected = true;

          // Fallback identify if Hello is delayed
          setTimeout(() => {
            if (this.connected && !this.heartbeatInterval) {
              this.startHeartbeat(41250);
              this.sendIdentify();
            }
          }, 2000);

          // Fallback resolve in case READY is delayed
          setTimeout(() => {
            if (this.connected) {
              completeConnection();
            }
          }, 3000);
        });

        this.websocket.on("message", (data) => {
          try {
            const parsedData = JSON.parse(data);

            // Resolve when session is confirmed ready or resumed
            if (
              parsedData.op === 0 &&
              (parsedData.t === "READY" || parsedData.t === "RESUMED")
            ) {
              completeConnection();
            }

            this.handleMessage(parsedData);
          } catch (error) {
            this.handleError("Error parsing WebSocket message:", error);
          }
        });

        this.websocket.on("close", (code, reason) => {
          const reasonStr = reason ? reason.toString() : "";
          if (this.verbose) {
            console.log(
              `WebSocket \x1b[31mclosed\x1b[0m${code ? ` (code: ${code}${reasonStr ? `, reason: ${reasonStr}` : ""})` : ""}`,
            );
          }
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
          this.connected = false;

          if (code === 4004) {
            this.handleError("Authentication failed: Invalid Discord token.", code);
          }

          if (!isResolved) {
            isResolved = true;
            reject(
              new Error(
                `WebSocket closed before connection was established (code: ${code})`,
              ),
            );
          }
        });

        this.websocket.on("error", (error) => {
          this.handleError("WebSocket error:", error);
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        });
      } catch (error) {
        this.handleError("WebSocket setup error:", error);
        reject(error);
      }
    });
  }

  /**
   * Starts the heartbeat interval.
   * @param {number} [interval=41250] - Interval in milliseconds.
   * @returns {void}
   */
  startHeartbeat(interval = 41250) {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  /**
   * Sends an identification payload to the Discord Gateway.
   * @returns {Promise<void>} - Resolves when the identification payload is sent successfully.
   */
  sendIdentify() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          return resolve();
        }

        const osName =
          process.platform === "win32"
            ? "windows"
            : process.platform === "darwin"
              ? "macos"
              : "linux";

        const payload = {
          op: 2,
          d: {
            token: this.token,
            properties: {
              $os: osName,
              $browser: "Discord_rich",
              $device: "Discord_rich",
            },
            intents: 513,
          },
        };

        this.websocket.send(JSON.stringify(payload), (error) => {
          if (error) {
            this.handleError("Error sending identify payload:", error);
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        this.handleError("Error sending identify payload:", error);
        reject(error);
      }
    });
  }

  /**
   * Sends a heartbeat payload to the Discord Gateway.
   * @returns {Promise<void>} - Resolves when the heartbeat payload is sent successfully.
   */
  sendHeartbeat() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          return resolve();
        }

        const payload = {
          op: 1,
          d: this.seq ?? null,
        };

        this.websocket.send(JSON.stringify(payload), (error) => {
          if (error) {
            this.handleError("Error sending heartbeat payload:", error);
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        this.handleError("Error sending heartbeat payload:", error);
        reject(error);
      }
    });
  }

  /**
   * Handles incoming WebSocket messages.
   * @param {Object} message - Parsed WebSocket message.
   * @returns {Promise<void>} - Resolves when the message is successfully handled.
   */
  handleMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        const { op, d, s, t } = message;

        if (s !== null && s !== undefined) {
          this.seq = s;
        }

        switch (op) {
          case 10: // Hello
            this.handleHello(d);
            break;
          case 11: // Heartbeat ACK
            if (this.handle) {
              console.log("Heartbeat acknowledged");
            }
            break;
          case 1: // Heartbeat request from server
            if (this.handle) {
              console.log("Received Heartbeat request from server");
            }
            this.handleHeartbeat();
            break;
          case 0: // Dispatch
            if (this.handle) {
              console.log(`Received Dispatch: ${t}`);
            }
            if (t === "READY") {
              this.sessionId = d.session_id;
              if (this.verbose && d.user) {
                console.log(`Connected as \x1b[32m${d.user.username}\x1b[0m`);
              }
            } else if (t === "RESUMED") {
              if (this.verbose) {
                console.log("Session resumed successfully");
              }
            }
            this.handleDispatch(d, t);
            break;
          case 9: // Invalid Session
            if (this.handle) {
              console.log("Invalid Session");
            }
            this.handleInvalidSession(d);
            break;
          case 7: // Reconnect
            if (this.handle) {
              console.log("Reconnect requested by server");
            }
            this.handleReconnect();
            break;
          case 2: // Identify Connection
          case 3: // Presence Update
          case 4: // Voice State Update
          case 5: // Resume
          case 6: // Reconnect request
            break;
          case 8: // Request Guild Members
            if (this.handle) {
              console.log("Request Guild Members");
            }
            this.handleRequestGuildMembers(d);
            break;
          case 12: // Channel Update
            if (this.handle) {
              console.log("Channel Update");
            }
            this.handleChannelUpdate(d);
            break;
          case 13: // Guild Members Chunk
            if (this.handle) {
              console.log("Guild Members Chunk");
            }
            this.handleGuildMembersChunk(d);
            break;
          case 14: // Guild Member Update
            if (this.handle) {
              console.log("Guild Member Update");
            }
            this.handleGuildMemberUpdate(d);
            break;
          default:
            if (this.handle) {
              console.log(`Received unhandled OP code: ${op}`);
            }
            break;
        }
        resolve();
      } catch (error) {
        this.handleError("Error handling message:", error);
        reject(error);
      }
    });
  }

  /**
   * Handles server-requested heartbeat (Opcode 1).
   */
  handleHeartbeat() {
    this.sendHeartbeat();
  }

  /**
   * Handles invalid session (Opcode 9).
   * @param {boolean} resumable - Whether the session can be resumed.
   */
  handleInvalidSession(resumable) {
    if (this.verbose) {
      console.log(
        "Invalid session.",
        resumable ? "Attempting to resume..." : "Re-identifying...",
      );
    }
    if (resumable && this.sessionId) {
      setTimeout(() => {
        this.handleResume();
      }, 1000);
    } else {
      this.sessionId = null;
      this.seq = null;
      setTimeout(() => {
        this.sendIdentify();
      }, 1000);
    }
  }

  /**
   * Resumes an existing Discord Gateway session (Opcode 6).
   */
  handleResume() {
    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const payload = {
          op: 6,
          d: {
            token: this.token,
            session_id: this.sessionId,
            seq: this.seq,
          },
        };
        this.websocket.send(JSON.stringify(payload));
        if (this.verbose) {
          console.log("Resuming session...");
        }
      } else {
        this.handleError("WebSocket is not open. Unable to resume session.");
      }
    } catch (error) {
      this.handleError("Error handling resume:", error);
    }
  }

  /**
   * Attempts to clean up resources and reconnect.
   * @returns {Promise<void>} - Resolves when reconnect is successfully initiated.
   */
  handleReconnect() {
    return new Promise((resolve, reject) => {
      try {
        if (this.verbose) {
          console.log("Reconnecting...");
        }

        this.cleanupResources();

        setTimeout(() => {
          this.connect()
            .then(() => {
              resolve();
            })
            .catch((error) => {
              reject(error);
            });
        }, 5000); // Wait for 5 seconds before attempting to reconnect
      } catch (error) {
        this.handleError("Error handling reconnect:", error);
        reject(error);
      }
    });
  }

  /**
   * Cleans up resources such as closing the WebSocket connection and clearing intervals.
   * @returns {void}
   */
  cleanupResources() {
    if (this.websocket) {
      try {
        if (this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.close();
          if (this.verbose) {
            console.log("WebSocket connection closed.");
          }
        } else if (this.websocket.readyState === WebSocket.CONNECTING) {
          if (this.verbose) {
            console.log(
              "WebSocket is still connecting. Waiting for connection to open...",
            );
          }

          setTimeout(() => {
            this.cleanupResources();
          }, 1000);
          return;
        }
      } catch (error) {
        this.handleError("Error closing WebSocket connection:", error);
      }
    }

    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    if (this.verbose) {
      console.log("Heartbeat interval cleared.");
      console.log("Cleanup complete.");
    }
  }

  /**
   * Disconnects the rich presence client and cleans up resources.
   */
  disconnect() {
    this.cleanupResources();
    this.connected = false;
  }

  handleRequestGuildMembers(data) {
    try {
      if (this.verbose) {
        console.log("Requesting guild members with data:", data);
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

      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(payload));
      } else {
        this.handleError(
          "WebSocket is not open. Unable to send guild members.",
        );
      }
    } catch (error) {
      this.handleError("Error handling request guild members:", error);
    }
  }

  handleChannelUpdate(data) {
    try {
      if (this.verbose) {
        console.log("Channel updated with data:", data);
      }
    } catch (error) {
      this.handleError("Error handling channel update:", error);
    }
  }

  handleGuildMembersChunk(data) {
    try {
      if (this.verbose) {
        console.log("Received guild members chunk with data:", data);
      }
    } catch (error) {
      this.handleError("Error handling guild members chunk:", error);
    }
  }

  handleGuildMemberUpdate(data) {
    try {
      if (this.verbose) {
        console.log("Guild member updated with data:", data);
      }
    } catch (error) {
      this.handleError("Error handling guild member update:", error);
    }
  }

  /**
   * Handles the HELLO message from the Discord Gateway.
   * @param {Object} data - Data from the HELLO message.
   * @returns {Promise<void>} - Resolves when the HELLO message is successfully handled.
   */
  handleHello({ heartbeat_interval }) {
    return new Promise((resolve, reject) => {
      try {
        this.startHeartbeat(heartbeat_interval);
        this.sendHeartbeat();

        if (this.sessionId && this.seq !== null) {
          this.handleResume();
        } else {
          this.sendIdentify();
        }
        resolve();
      } catch (error) {
        this.handleError("Error handling hello:", error);
        reject(error);
      }
    });
  }

  handleDispatch(data, eventName) {
    if (data && data.type === 1 && data.data) {
      // Handle button click
      const { custom_id } = data.data;
      if (this.verbose) {
        console.log(`Button with custom_id ${custom_id} clicked`);
      }
    }
  }

  /**
   * Updates the presence on Discord (alias for setPresence).
   *
   * @param {Object} presenceData - Updated presence data.
   * @returns {Promise<void>} - Resolves when the presence update is sent successfully.
   */
  updatePresence(presenceData) {
    return this.setPresence(presenceData);
  }

  /**
   * Handles the overall rich presence connections and payloads.
   * @param {Object} presenceData - Rich presence data.
   * @returns {Promise<void>}
   */
  setPresence(presenceData) {
    return new Promise((resolve, reject) => {
      try {
        if (!presenceData) {
          return reject(new Error("No presence data provided."));
        }

        const activities = (presenceData.activities || []).map((activity) => {
          const formattedActivity = { ...activity };

          if (activity.assets) {
            const assets = { ...activity.assets };

            if (assets.large_image) {
              assets.large_image = this.formatAsset(assets.large_image);
            }
            if (assets.small_image) {
              assets.small_image = this.formatAsset(assets.small_image);
            }

            formattedActivity.assets = assets;
          }

          if (
            activity.buttons &&
            Array.isArray(activity.buttons) &&
            activity.buttons.length > 0
          ) {
            const buttonLabels = [];
            const buttonUrls = [];

            for (const button of activity.buttons.slice(0, 2)) {
              if (typeof button === "string") {
                buttonLabels.push(button);
              } else if (button && typeof button === "object") {
                buttonLabels.push(button.label || "");
                if (button.url) {
                  buttonUrls.push(this.parseButtonURL(button.url));
                }
              }
            }

            formattedActivity.buttons = buttonLabels;
            if (buttonUrls.length > 0) {
              formattedActivity.metadata = {
                ...(activity.metadata || {}),
                button_urls: buttonUrls,
              };
            }
          }

          if (!formattedActivity.application_id && this.clientId) {
            formattedActivity.application_id = this.clientId;
          }

          return formattedActivity;
        });

        const payload = {
          op: 3,
          d: {
            since: presenceData.since ?? null,
            activities: activities,
            status: presenceData.status || "online",
            afk: Boolean(presenceData.afk),
            party: presenceData.party || {},
          },
        };

        const executeSend = () => {
          if (this.verbose) {
            console.log("\x1b[34m[LOGS]\x1b[0m - Updating presence...");
            console.log(inspect(payload.d, { depth: null, colors: true }));
          }

          if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            const error = new Error(
              "WebSocket is not open. Unable to set presence.",
            );
            this.handleError(error.message, error);
            return reject(error);
          }

          this.websocket.send(JSON.stringify(payload), (error) => {
            if (error) {
              this.handleError("Error setting presence:", error);
              reject(error);
            } else {
              resolve();
            }
          });
        };

        if (
          this.connected &&
          this.websocket &&
          this.websocket.readyState === WebSocket.OPEN
        ) {
          executeSend();
        } else if (
          this.websocket &&
          this.websocket.readyState === WebSocket.CONNECTING
        ) {
          if (this.verbose) {
            console.log(
              "WebSocket is still connecting. Presence will be set once connected.",
            );
          }
          this.pendingPresenceCallback = executeSend;
        } else {
          const error = new Error(
            "WebSocket is not open. Unable to set presence.",
          );
          this.handleError(error.message, error);
          reject(error);
        }
      } catch (error) {
        this.handleError("Error setting presence:", error);
        reject(error);
      }
    });
  }

  /**
   * Formats an image asset string for Discord Rich Presence.
   * Converts Discord attachment/media URLs to mp: format,
   * while preserving asset keys, external URLs, and already-proxied mp: strings.
   * @param {string} asset - Image URL, asset key, or mp: string.
   * @returns {string} - Formatted asset string.
   */
  formatAsset(asset) {
    if (typeof asset !== "string") return asset;
    const trimmed = asset.trim();

    // Already in media proxy or special scheme format
    if (
      trimmed.startsWith("mp:") ||
      trimmed.startsWith("spotify:") ||
      trimmed.startsWith("youtube:")
    ) {
      return trimmed;
    }

    // Convert Discord CDN / media URLs to mp: format
    if (this.isDiscordImageUrl(trimmed)) {
      return this.replaceImageURL(trimmed);
    }

    // External image URL (e.g. Imgur, personal host, Tenor)
    if (this.isValidUrl(trimmed)) {
      return trimmed;
    }

    // Discord Developer Portal asset key
    return trimmed;
  }

  /**
   * Checks if a URL is a Discord CDN or Media proxy URL.
   * @param {string} url - URL to check.
   * @returns {boolean}
   */
  isDiscordImageUrl(url) {
    if (typeof url !== "string") return false;
    return /^https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//i.test(
      url,
    );
  }

  /**
   * Replaces Discord CDN or Media URLs with the mp: prefix required by Rich Presence.
   * @param {string} url - Discord CDN or Media URL.
   * @returns {string} - mp: prefixed asset string.
   */
  replaceImageURL(url) {
    if (typeof url !== "string") return url;
    return url
      .replace(/^https?:\/\/cdn\.discordapp\.com\//i, "mp:")
      .replace(/^https?:\/\/media\.discordapp\.net\//i, "mp:");
  }

  /**
   * Validates a URL string.
   * @param {string} url - The URL string to validate.
   * @returns {boolean} - Returns true if the URL is valid, false otherwise.
   */
  isValidUrl(url) {
    if (typeof url !== "string") return false;
    try {
      const urlObject = new URL(url);
      const allowedSchemes = ["http:", "https:", "ftp:"];
      if (!allowedSchemes.includes(urlObject.protocol)) {
        return false;
      }
      return Boolean(urlObject.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Handles errors and logs them to the console.
   * @param {string} message - Error message.
   * @param {string|Error} [error] - The actual error.
   * @returns {Promise<void>} - Resolves after logging the error.
   */
  handleError(message, error) {
    return new Promise((resolve) => {
      if (error) {
        console.error(`\x1b[31m[ERROR]\x1b[0m - ${message}`, error);
      } else {
        console.error(`\x1b[31m[ERROR]\x1b[0m - ${message}`);
      }
      resolve();
    });
  }

  /**
   * Parse metadata for the button URL.
   * @param {string} url - Original button URL.
   * @returns {string} - The parsed button URL.
   */
  parseButtonURL(url) {
    if (typeof url !== "string") return url;
    try {
      const urlObject = new URL(url);
      const metadataValue = urlObject.searchParams.get("metadata");

      if (metadataValue) {
        urlObject.searchParams.set("parsedMetadata", metadataValue);
        return urlObject.toString();
      }
      return url;
    } catch {
      return url;
    }
  }
}

export { RichPresence };
export default RichPresence;
