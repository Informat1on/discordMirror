import * as dotenv from 'dotenv';

dotenv.config();

const {
  DISCORD_TOKEN: discordToken,
  SERVER_ID: serverId,
  ERROR_WEBHOOK_URL: errorWebhookUrl,
  UNFILTERED_WEBHOOK_URL: unfilteredWebhookUrl,
} = process.env;

const headers = {
  'Content-Type': 'application/json',
  Authorization: discordToken!,
};

export {
  discordToken,
  serverId,
  headers,
  errorWebhookUrl,
  unfilteredWebhookUrl,
};
