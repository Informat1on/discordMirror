import Websocket from 'ws';
import jsonfile from 'jsonfile';
import fetch, { Response } from 'node-fetch';
import {
  Channel,
  Guild,
  WebhookConfig,
} from '../interfaces/interfaces';
import {
  discordToken,
  mainServerId,
  secondServerId,
  headers,
  errorWebhookUrl,
  unfilteredWebhookUrl,
  undefinedWebhookUrl,
} from '../util/env';
import { Webhook } from "webhook-discord";

const options = {
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric',
  hour12: false
};
let sessionId:string;

export const createWebhook = async (channelId: string): Promise<string> => fetch(`https://discord.com/api/v8/channels/${channelId}/webhooks`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: channelId,
  }),
}).then((res) => res.json())
  .then((json) => `https://discord.com/api/v8/webhooks/${json.id}/${json.token}`);

export const executeWebhook = async ({
  content, embeds, username, url, avatar,
}: WebhookConfig): Promise<Response> => fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content,
    embeds,
    username,
    avatar_url: avatar,
  }),
});

export const createChannel = async (name: string, pos: number, newId: string, parentId?: string): Promise<Channel> => fetch(`https://discord.com/api/v8/guilds/${newId}/channels`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name,
    parent_id: parentId,
    position: pos,
  }),
}).then((res) => res.json());

export const listen = async (): Promise<void> => {
  const serverMap = jsonfile.readFileSync('./map.json');
  const socket = new Websocket('wss://gateway.discord.gg/?v=9&encoding=json');
  let authenticated = false;
  let sequenceNumber: number;

  // if no servers loaded
  if (!serverMap) {
    return ;
  }
  console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options),'] Channel webhooks loaded');

  socket.on('open', () => {
    console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Connected to Discord API');
  });

  socket.on('message', async (data: Websocket.Data) => {
    const message = JSON.parse(data.toString());

    switch (message.op) {

      // 0 - Dispatch
      case 0:
        sequenceNumber = message.s;
        if (
            message.t === 'MESSAGE_CREATE' && (message.d.guild_id === mainServerId || message.d.guild_id === secondServerId)
        ) {
          let { content, embeds, channel_id: channelId, attachments } = message.d;
          const {
            avatar, username, id, discriminator,
          } = message.d.author;
          const avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
          let webhookUrl = serverMap[channelId];

          if (webhookUrl === undefinedWebhookUrl) {
            console.log('[', new Date(Date.now())
                .toLocaleString('ru-Ru', options), '] i havent found webhook for channelId: ', channelId);
            webhookUrl = unfilteredWebhookUrl;
            await sendErrorToDiscord(`I havent found webhook for channelId: ${channelId}`);
          }

          //если отправляется изображение
          if (attachments.length > 0 && attachments[0].url) {
            content = content + '\n' + attachments[0].url;
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
            console.log('[', new Date(Date.now())
                .toLocaleString('ru-Ru', options), '] Message: ', message);
            //send error to ds channel
            await sendErrorToDiscord( 'There is error with sending 0 case webhook.');
            console.log('[', new Date(Date.now())
                .toLocaleString('ru-Ru', options), '] I continue to work.');
          }
        } else if (message.t === 'READY') {
          sessionId = message.d.session_id;
          console.log('[', new Date(Date.now())
              .toLocaleString('ru-Ru', options), '] Im ready! Session id: ', sessionId);
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
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Reconnecting..');
        await sendInfoToDiscord('Reconnecting..');
        authenticated = false;
        // session_id - takes from ready
        // seq - last sequence number received
        // const payload = {
        //   op: 6,
        //   d: {
        //     token: discordToken,
        //     session_id: sessionId,
        //     seq: sequenceNumber,
        //   },
        // }
        const payload = {
          op: 2,
          d: {
            token: discordToken,
            properties: {
              $os: 'linux',
              $browser: 'test',
              $device: 'test',
            },
          },
        }
        socket.send(JSON.stringify(payload));
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Clocking');
        // starting to clock
        const messageClockPayload = {
          op: 1,
          d: message.s,
        };
        socket.send(JSON.stringify(messageClockPayload));
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Sent clock');
        break;

      // 9 - Invalid Session
      case 9:
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Invalid session');
        await sendErrorToDiscord('Invalid session');
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Reconnecting after invalid session..');
        await sendInfoToDiscord('Reconnecting after invalid session..');
        // session_id - takes from ready
        // seq - last sequence number received
        const invalidSessionPayload = {
        op: 2,
        d: {
          token: discordToken,
          properties: {
            $os: 'linux',
            $browser: 'test',
            $device: 'test',
          },
        },
      }
        socket.send(JSON.stringify(invalidSessionPayload));
        break;

      // Once connected, client(Me) immediately receive opcode 10 with heartbeatInterval
      // 10 - Hello
      case 10:
        console.log('[', new Date(Date.now()).toLocaleString('ru-Ru', options), '] Hello!');
        await sendInfoToDiscord('Hello!');
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
                $os: 'linux',
                $browser: 'test',
                $device: 'test',
              },
            },
          }
          socket.send(JSON.stringify(payload));
          authenticated = true;
        }
        break;

      default:
        // if havent found case, it sends message to DS
        console.log('[', new Date(Date.now())
            .toLocaleString('ru-Ru', options), '] Message: ', message);
        try {
          await sendInfoToDiscord(message);
        } catch (e) {
          //send error to ds channel
          await sendErrorToDiscord(e.op || 'There is error with sending default case webhook.');
        }
        break;
    }
  });

  socket.on('ready', async (data: Websocket.Data) =>{
    const message = JSON.parse(data.toString());
    console.log('data from ready is: ', message);
  });
};

export const getChannels = async (): Promise<Channel[]> => fetch(`https://discord.com/api/v8/guilds/${mainServerId}/channels`, {
  method: 'GET',
  headers,
}).then((res) => res.json())
  .then((json: Channel[]) => json);

export const createServer = async (channels: Channel[]): Promise<void> => {
  console.log('Creating mirror server...');
  const cleanedChannels = channels.map(({
    id, parent_id, guild_id, last_message_id, ...rest
  }) => rest);
  const categories = cleanedChannels.filter((channel) => channel.type === 4);
  const body = {
    name: 'mirror',
    channels: categories,
  };
  const serverMap = new Map();
  const serverResp: Response = await fetch('https://discord.com/api/v8/guilds', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const server: Guild = await serverResp.json();
  const newId = server.id;

  serverMap.set('serverId', newId);

  const channelResp = await fetch(`https://discord.com/api/v8/guilds/${newId}/channels`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: discordToken!,
    },
  });

  const serverChannels: Channel[] = await channelResp.json();

  return new Promise(async (resolve) => {
    for (const channel of channels) {
      if (channel.parent_id && channel.type !== 2) {
        const parentChannel = channels.find((chan) => chan.id === channel.parent_id);
        if (parentChannel) {
          const newParentChannel = serverChannels.find((chan) => chan.name === parentChannel.name);
          if (newParentChannel) {
            const newChannel = await createChannel(
              channel.name,
              channel.position,
              newId,
              newParentChannel.id,
            );
            const newWebhook = await createWebhook(newChannel.id);
            serverMap.set(channel.id, newWebhook);
          }
        }
      }
    }
    jsonfile.writeFileSync('./map.json', Object.fromEntries(serverMap));
    resolve();
  });
};

async function sendErrorToDiscord(exceptionText: string): Promise<void> {
  const webhook = new Webhook(errorWebhookUrl!);
  webhook.err('Error', exceptionText);
}

async function sendInfoToDiscord(messageText: string): Promise<void> {
  const webhook = new Webhook(errorWebhookUrl!);
  webhook.info('Error', messageText);
}
