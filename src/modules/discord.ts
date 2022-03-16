import Websocket from "ws";
import jsonfile from "jsonfile";
import { WebhookConfig } from "../interfaces/interfaces";
import {
  discordToken,
  mainServerId,
  secondServerId,
  unfilteredWebhookUrl,
  undefinedWebhookUrl,
} from "../util/env";
import { executeWebhook, sendErrorToDiscord, sendInfoToDiscord } from "./webhook";
import { consLog } from "../util/console";

export async function listen(): Promise<void> {
  const serverMap = jsonfile.readFileSync("./map.json");
  let socket = new Websocket("wss://gateway.discord.gg/?v=9&encoding=json");
  let authenticated = false;
  let sequenceNumber: number;
  let sessionId: string;
  let isProgramClose = false;

  consLog(`Socket loaded: ${!!socket}`);

  // if no servers loaded - exit
  if (!serverMap) {
    return;
  }
  consLog('Channel webhooks loaded');

  socket.on("open", () => {
    consLog('Connected to Discord API');
  });

  socket.on("message", async (data: Websocket.Data) => {
    const message = JSON.parse(data.toString());

    switch (message.op) {
      // 0 - Dispatch
      case 0:
        if (
          message.t === "MESSAGE_CREATE" &&
          (message.d.guild_id === mainServerId ||
            message.d.guild_id === secondServerId)
        ) {
          sequenceNumber = message.s;
          let {
            content,
            embeds,
            channel_id: channelId,
            attachments,
          } = message.d;
          const { avatar, username, id, discriminator } = message.d.author;
          const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
          let webhookUrl = serverMap[channelId];

          if (webhookUrl === undefinedWebhookUrl) {
            consLog(`I havent found webhook for channelId: ${channelId}`);
            webhookUrl = unfilteredWebhookUrl;
            await sendErrorToDiscord(
              `I havent found webhook for channelId: ${channelId}`
            );
          }

          // если отправляется изображение
          if (attachments.length > 0 && attachments[0].url) {
            content = content + "\n" + attachments[0].url;
          }

          const hookContent: WebhookConfig = {
            content,
            embeds,
            username: `${username}#${discriminator}`,
            url: webhookUrl,
            avatar: avatarUrl,
          };

          try {
            await executeWebhook(hookContent);
          } catch (e) {
            consLog(`There is error with sending 0 case webhook. Prob missing channel with id: ${message.d.channel_id}`);
            // send error to ds channel
            await sendErrorToDiscord(
              "There is error with sending 0 case webhook."
            );
            consLog('I continue to work.');
          }
        } else if (message.t === "READY") {
          sessionId = message.d.session_id;
          consLog(`Im ready! Session id: ${sessionId}`);
        } else if (
          message.t === "RESUMED" ||
          message.t === "RECONNECT" ||
          message.t === "INVALID_SESSION"
        ) {
          console.log("Its new event in 0 case: ", message.t);
          console.log("message body is: ", message);
        }
        break;

      // 1 - Heartbeat
      case 1:
        let heartBeatPayload = {
          op: 1,
          d: message.s,
        };
        socket.send(JSON.stringify(heartBeatPayload));
        break;

      // 7 - Reconnect. We should try to reconnect.
      case 7:
        // TODO: Fix all issues
        consLog('Reconnecting...');
        await sendInfoToDiscord("Reconnecting..");
        isProgramClose = true;
        // im closing socket
        consLog('Closing the socket...');
        socket.close(1000, "Received retry");
        consLog('Socket closed.');
        break;

      // 9 - Invalid Session
      case 9:
        consLog('Invalid session');
        await sendErrorToDiscord("Invalid session");
        consLog('Reconnecting after invalid session...');
        await sendInfoToDiscord("Reconnecting after invalid session..");
        // session_id - takes from ready
        // seq - last sequence number received
        const invalidSessionPayload = {
          op: 2,
          d: {
            token: discordToken,
            properties: {
              $os: "linux",
              $browser: "test",
              $device: "test",
            },
          },
        };
        socket.send(JSON.stringify(invalidSessionPayload));
        break;

      // Once connected, client(Me) immediately receive opcode 10 with heartbeatInterval
      // 10 - Hello
      case 10:
        consLog('Hello!');
        await sendInfoToDiscord("Hello!");
        const messagePayload = {
          op: 1,
          d: message.s,
        };
        socket.send(JSON.stringify(messagePayload));

        setInterval(() => {
          socket.send(JSON.stringify(messagePayload));
        }, message.d.heartbeat_interval);
        break;

      // 11 - Heartbeat ACK
      case 11:
        if (!authenticated) {
          const payload = {
            op: 2,
            d: {
              token: discordToken,
              properties: {
                $os: "linux",
                $browser: "test",
                $device: "test",
              },
            },
          };
          socket.send(JSON.stringify(payload));
          authenticated = true;
        }
        break;

      default:
        // if havent found case, it sends message to DS
        consLog('Default case got. Please check message below: ');
        consLog(`Message: ${message}`);
        try {
          await sendInfoToDiscord(message);
        } catch (e) {
          //send error to ds channel
          await sendErrorToDiscord(
            e.op || "There is error with sending default case webhook."
          );
        }
        break;
    }
  });

  socket.onclose = (event) => {
    if (!isProgramClose) {
      return;
    }
    consLog(`Close event reason is: ${event.reason}`);
    consLog('Waiting 6 sec for restart...');
    isProgramClose = false;
    setTimeout(listen, 6000);
  };

  socket.on('close', (event) => {
    consLog(`Im closing. Its socket.on. Close event code: ${event}.`);
  });

  socket.on('error', (e) => {
    consLog(`There is error event: ${e.message}`);
    sendErrorToDiscord(e.message);
  })

  socket.on('ping', ()=>{
    consLog('Ping!');
  })

  socket.on('pong', ()=> {
    consLog('Pong!');
  });
}
