import { options } from "../constants/discord-constants";

export function consLog(message: string): void {
    console.log(
        "[",
        new Date(Date.now()).toLocaleString("ru-Ru", options),
        "] ",
        message,
    );
}