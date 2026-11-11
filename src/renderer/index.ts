/*
 * Majic — renderer entry point
 */

import { Logger } from "@utils/logger";
import { settings } from "@api/settings";
import { enableStyle } from "@api/styles";
import { initThemes, initThemeStoreListener } from "@api/themes";
import { initWebpackHook, reportPendingPatches } from "./webpack/patchWebpack";
import * as Plugins from "./plugins";
import * as Webpack from "./webpack";

import * as Reporter from "./reporter";

export { Plugins, Reporter, Webpack, settings };
export const version = "0.1.0";

const logger = new Logger("Core");

initWebpackHook();
enableStyle("majic-base", ":root { --majic-accent: #ff2d55; }");
Plugins.registerPatches();
Plugins.startAllPlugins("Init");
Webpack.onceReady.then(() => {
    Plugins.startAllPlugins("WebpackReady");
    initThemeStoreListener();
    setTimeout(Webpack.Common.reportCommons, 5_000);
});

function onDomReady() {
    Plugins.startAllPlugins("DOMContentLoaded");
    initThemes();
    logger.info(`Majic v${version} loaded`);
    setTimeout(reportPendingPatches, 10_000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
} else {
    onDomReady();
}
