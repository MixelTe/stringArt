import { Div, getDiv } from "./littleLib.js";
const log = getDiv("log");
const log_errors = getDiv("log_errors");
console.log = Log;
console.error = LogError;
addEventListener("error", e => onError(e.message, `${e.filename}:${e.lineno}:${e.colno}`));
addEventListener("unhandledrejection", e => onError("(in promise) " + e.reason));
export function Log(...data) {
    log.appendChild(Div([], [], data.join(" ")));
    log.scroll(0, log.scrollHeight);
}
export function LogError(...data) {
    log_errors.appendChild(Div("error", [], data.join(" ")));
    log_errors.scroll(0, log.scrollHeight);
}
function onError(msg, path) {
    if (path) {
        const i = path?.lastIndexOf("/");
        msg += "\n at " + path?.slice(i + 1);
    }
    LogError(msg);
}
