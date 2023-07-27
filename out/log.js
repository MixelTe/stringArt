import { Div, getDiv } from "./littleLib.js";
const log = getDiv("log");
const log_errors = getDiv("log_errors");
const console_log = console.log;
const console_error = console.error;
console.log = Log;
console.error = LogError;
addEventListener("error", e => onError(e.message, `${e.filename}:${e.lineno}:${e.colno}`));
addEventListener("unhandledrejection", e => onError("(in promise) " + e.reason));
function Log(...data) {
    log.appendChild(Div([], [], data.join(" ")));
    log.scroll(0, log.scrollHeight);
    console_log(...data);
}
function LogError(...data) {
    log_errors.appendChild(Div("error", [], data.join(" ")));
    log_errors.scroll(0, log.scrollHeight);
    console_error(...data);
}
export function clearLog() {
    log.innerHTML = "";
}
function onError(msg, path) {
    if (path) {
        const i = path?.lastIndexOf("/");
        msg += "\n at " + path?.slice(i + 1);
    }
    LogError(msg);
}
