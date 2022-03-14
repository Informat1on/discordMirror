import { fileName, options } from "../constants/discord-constants";
import fs from "fs";

export function consLog(message: string): void {
    const logMessage = "[" + new Date(Date.now()).toLocaleString("ru-Ru", options) + "] " + message;
    console.log(logMessage);
    const filename = `src/logs/${fileName}.log`;
    fs.appendFile(filename, logMessage + '\n', (err => {
        if (err) {
            console.log('Error on appending');
        }
    }));
}