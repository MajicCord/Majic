/*
 * Majic — NoUnblockToJump plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoUnblockToJump",
    description: "Lets you jump to messages of blocked or ignored users and likely spammers without unblocking them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet d'aller aux messages des utilisateurs bloqués, ignorés ou suspects sans les débloquer"
        }
    },

    patches: [
        {
            find: "#{intl::UNIGNORE_TO_JUMP_BODY}",
            replacement: {
                match: /if\(\i\.\i\.isBlockedForMessage\(/,
                replace: "return true;$&"
            }
        }
    ]
});
