/*
 * Majic — renderer entry point
 */

import { Logger } from "@utils/logger";
import { settings } from "@api/settings";
import { initWebpackHook, reportPendingPatches } from "./webpack/patchWebpack";
import * as Plugins from "./plugins";
import * as Webpack from "./webpack";

export { Plugins, Webpack, settings };
export const version = "0.1.0";

const logger = new Logger("Core");

initWebpackHook();
Plugins.registerPatches();
Plugins.startAllPlugins("Init");

async function injectQuickCss() {
    if (!settings.useQuickCss) return;
    const css = await MajicNative.getQuickCss();
    if (!css) return;
    const style = document.createElement("style");
    style.id = "majic-quickcss";
    style.textContent = css;
    document.head.append(style);
}

function onDomReady() {
    Plugins.startAllPlugins("DOMContentLoaded");
    injectQuickCss();
    logger.info(`Majic v${version} loaded`);
    setTimeout(reportPendingPatches, 10_000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
} else {
    onDomReady();
}
