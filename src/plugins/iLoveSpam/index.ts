/*
 * Majic — iLoveSpam plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "iLoveSpam",
    description: "Stops hiding messages from \"likely spammers\"",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Arrête de masquer les messages des « spammeurs probables »"
        }
    },

    patches: [
        {
            find: "hasFlag:{writable",
            replacement: {
                match: /if\((\i)<=(?:0x40000000|(?:1<<30|1073741824))\)return/,
                replace: "if($1===(1<<20))return false;$&"
            }
        }
    ]
});
