import { Channel, Guild } from "../interfaces/interfaces";
import fetch, { Response } from "node-fetch";
import { discordToken, headers } from "../util/env";
import jsonfile from "jsonfile";
import { createWebhook } from "./webhook";
import { createChannel } from "./channel";
import { consLog } from "../util/console";

export async function createServer(channels: Channel[]): Promise<void> {
    consLog('Creating mirror server...');
    const cleanedChannels = channels.map(
        ({ id, parent_id, guild_id, last_message_id, ...rest }) => rest
    );
    const categories = cleanedChannels.filter((channel) => channel.type === 4);
    const body = {
        name: "mirror",
        channels: categories,
    };
    const serverMap = new Map();
    const serverResp: Response = await fetch(
        "https://discord.com/api/v8/guilds",
        {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        }
    );
    const server: Guild = await serverResp.json();
    const newId = server.id;

    serverMap.set("serverId", newId);

    const channelResp = await fetch(
        `https://discord.com/api/v8/guilds/${newId}/channels`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: discordToken!,
            },
        }
    );

    const serverChannels: Channel[] = await channelResp.json();

    return new Promise(async (resolve) => {
        for (const channel of channels) {
            if (channel.parent_id && channel.type !== 2) {
                const parentChannel = channels.find(
                    (chan) => chan.id === channel.parent_id
                );
                if (parentChannel) {
                    const newParentChannel = serverChannels.find(
                        (chan) => chan.name === parentChannel.name
                    );
                    if (newParentChannel) {
                        const newChannel = await createChannel(
                            channel.name,
                            channel.position,
                            newId,
                            newParentChannel.id
                        );
                        const newWebhook = await createWebhook(newChannel.id);
                        serverMap.set(channel.id, newWebhook);
                    }
                }
            }
        }
        jsonfile.writeFileSync("./map.json", Object.fromEntries(serverMap));
        resolve();
    });
}
