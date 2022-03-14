import fs from "fs";
import { listen } from "./modules/discord";
import { getChannels } from "./modules/channel";
import { createServer } from "./modules/server";

// if mirror server exists
// TODO: Сделать проверку на полноту каналов на мирроре. Если все каналы - ок.
//  Если нет, то просканировать и добавить недостающие.
//  Также добавить проверку на наличие всех вебхуков.
if (fs.existsSync("./map.json")) {
  listen();
} else {
  getChannels()
    .then((channels) => createServer(channels))
    .then(() => listen());
}
