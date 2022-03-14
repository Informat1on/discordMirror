import fetch, { Response } from "node-fetch";
import { errorWebhookUrl, headers } from "../util/env";
import { WebhookConfig } from "../interfaces/interfaces";
import { Webhook } from "webhook-discord";

export async function createWebhook(channelId: string): Promise<string> {
    return fetch(`https://discord.com/api/v8/channels/${channelId}/webhooks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            name: channelId,
        }),
    })
        .then((res) => res.json())
        .then(
            (json) => `https://discord.com/api/v8/webhooks/${json.id}/${json.token}`
        );
}

export async function executeWebhook(
    {
        content,
        embeds,
        username,
        url,
        avatar,
    }: WebhookConfig,
): Promise<Response> {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content,
            embeds,
            username,
            avatar_url: avatar,
        }),
    });
}

export async function sendErrorToDiscord(exceptionText: string): Promise<void> {
    const webhook = new Webhook(errorWebhookUrl!);
    webhook.err("Error", exceptionText);
}

export async function sendInfoToDiscord(messageText: string): Promise<void> {
    const webhook = new Webhook(errorWebhookUrl!);
    webhook.info("Error", messageText);
}
