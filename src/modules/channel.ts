import { Channel } from "../interfaces/interfaces";
import fetch from "node-fetch";
import { headers, mainServerId } from "../util/env";
import { consLog } from "../util/console";

export async function getChannels(): Promise<Channel[]> {
    consLog('Getting server channels...');
    return fetch(`https://discord.com/api/v8/guilds/${mainServerId}/channels`, {
        method: "GET",
        headers,
    })
        .then((res) => res.json())
        .then((json: Channel[]) => json);
}

export async function createChannel(
    name: string,
    pos: number,
    newId: string,
    parentId?: string
): Promise<Channel> {
    consLog('Creating channels...');
    return fetch(`https://discord.com/api/v8/guilds/${newId}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            name,
            parent_id: parentId,
            position: pos,
        }),
    }).then((res) => res.json());
}
