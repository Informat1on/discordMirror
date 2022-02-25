import * as dotenv from 'dotenv';

dotenv.config();

const {
  DISCORD_TOKEN: discordToken,
  MAIN_SERVER_ID: mainServerId,
  // SECOND_SERVER_ID: secondServerId,
  ERROR_WEBHOOK_URL: errorWebhookUrl,
  UNFILTERED_WEBHOOK_URL: unfilteredWebhookUrl,
  UNDEFINED_WEBHOOK_URL: undefinedWebhookUrl,
} = process.env;

const headers = {
  'Content-Type': 'application/json',
  Authorization: discordToken!,
};

export {
  discordToken,
  mainServerId,
  // secondServerId,
  headers,
  errorWebhookUrl,
  unfilteredWebhookUrl,
  undefinedWebhookUrl,
};
