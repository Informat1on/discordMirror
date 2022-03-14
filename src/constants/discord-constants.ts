export const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
};

export const fileName = new Date(Date.now()).toLocaleString("ru-Ru", options);
