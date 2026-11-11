/*
 * Majic — ReactErrorDecoder plugin
 */

import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { React } from "@webpack/common";

const logger = new Logger("ReactErrorDecoder", "#61dafb");

let ERROR_CODES: Record<string, string> | undefined;

export default definePlugin({
    name: "ReactErrorDecoder",
    description: "Replaces \"Minified React Error\" with the actual error message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remplace « Minified React Error » par le vrai message d'erreur"
        }
    },

    patches: [
        {
            find: "React has blocked a javascript: URL as a security precaution.",
            replacement: {
                match: /"https:\/\/react.dev\/errors\/"\+\i;/,
                replace: "$&const majicDecodedError=$self.decodeError(...arguments);if(majicDecodedError)return majicDecodedError;"
            }
        }
    ],

    async start() {
        const codesUrl = `https://raw.githubusercontent.com/facebook/react/v${React.version}/scripts/error-codes/codes.json`;

        ERROR_CODES = await fetch(codesUrl)
            .then(res => res.json())
            .catch(err => logger.error("Failed to fetch React error codes", err));
    },

    stop() {
        ERROR_CODES = undefined;
    },

    decodeError(code: number, ...args: unknown[]) {
        let index = 0;
        return ERROR_CODES?.[code]?.replace(/%s/g, () => String(args[index++]));
    }
});
