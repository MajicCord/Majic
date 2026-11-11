/*
 * Majic — DirectFileDownload plugin
 */

import { getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin, type PluginNative } from "@utils/types";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, DiscordIcon, React } from "@webpack/common";

const Native = MajicNative.pluginHelpers.DirectFileDownload as PluginNative<typeof import("./native")>;

const AttachmentButton = findComponentByCodeLazy("__unsupportedReactNodeAsText", "caretConfig");
const ButtonWrapperClasses = findCssClassesLazy("hoverButton", "hoverButtonGroup");

function saveAttachment(downloadURL: string) {
    Native.saveAttachment(downloadURL).catch(() => MajicNative.openExternal(downloadURL));
}

function DownloadButton({ downloadURL }: { downloadURL: string }) {
    return (
        <AttachmentButton text={getIntlMessage("DOWNLOAD")}>
            <Clickable className={classes(ButtonWrapperClasses.hoverButton)} onClick={() => saveAttachment(downloadURL)}>
                <DiscordIcon name="DownloadIcon" size={20} />
            </Clickable>
        </AttachmentButton>
    );
}

export default definePlugin({
    name: "DirectFileDownload",
    description: "Downloads files directly from Discord instead of opening them in the browser",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Télécharge les fichiers directement depuis Discord au lieu de les ouvrir dans le navigateur"
        }
    },

    patches: [
        {
            find: '},"download"));',
            replacement: {
                match: /(\i&&!\i&&\i\.push\()\(0(.*?)},"download"\)\);/,
                replace: "$1$self.renderDownloadButton(arguments[0]));"
            }
        },
        {
            find: '"plaintext-preview-overflow-menu"',
            replacement: {
                match: /(,action:\(\)=>{)\i\.current\?\.click\(\),\i\(\)}/,
                replace: "$1$self.saveAttachment(arguments[0].url)}"
            }
        }
    ],

    saveAttachment,

    renderDownloadButton: withErrorBoundary("DirectFileDownload", DownloadButton)
});
