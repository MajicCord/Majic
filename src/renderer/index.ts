/*
 * Majic — renderer entry point
 */

import "./reporterEnv";

import { Logger } from "@utils/logger";
import { settings } from "@api/settings";
import { enableStyle } from "@api/styles";
import { initThemes, initThemeStoreListener } from "@api/themes";
import { runStartupUpdateCheck } from "@api/updater";
import { initWebpackHook, reportPendingPatches } from "./webpack/patchWebpack";
import * as Plugins from "./plugins";
import * as Reporter from "./reporter";
import * as Webpack from "./webpack";

export { Plugins, Reporter, Webpack, settings };
export const version = "0.1.0";

const logger = new Logger("Core");

function startReporter() {
    const onFirstFactory = () => {
        Webpack.factoryListeners.delete(onFirstFactory);
        setTimeout(async () => {
            try {
                const result = await Reporter.run();
                console.log("[MAJIC_REPORT]", JSON.stringify(result));
            } catch (err) {
                console.log("[MAJIC_REPORT_ERROR]", String(err));
            }
        }, 0);
    };
    Webpack.factoryListeners.add(onFirstFactory);
}

function onDomReady() {
    Plugins.startAllPlugins("DOMContentLoaded");
    initThemes();
    logger.info(`Majic v${version} loaded`);
    setTimeout(reportPendingPatches, 10_000);
}

initWebpackHook();
Plugins.registerPatches();

if (IS_REPORTER) {
    startReporter();
} else {
    enableStyle("majic-base", ":root { --majic-accent: #ff2d55; }");
    Plugins.startAllPlugins("Init");
    Webpack.onceReady.then(() => {
        Plugins.startAllPlugins("WebpackReady");
        initThemeStoreListener();
        setTimeout(Webpack.Common.reportCommons, 5_000);
        setTimeout(runStartupUpdateCheck, 10_000);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
    } else {
        onDomReady();
    }
}
