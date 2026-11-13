/*
 * Majic — NoticesAPI core plugin
 */

import { _hasCurrentNotice, _isMajicNotice, _showNextNotice } from "@api/notices";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoticesAPI",
    description: "Lets plugins show banners at the top of Discord",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'afficher des bandeaux en haut de Discord"
        }
    },
    required: true,

    patches: [
        {
            find: '"NoticeStore"',
            replacement: [
                {
                    match: /(?<=!1(?:;|}))\i=null;(?=.{0,80}getPremiumSubscription\(\))/g,
                    replace: "if($self.hasCurrentNotice())return false;$&"
                },
                {
                    match: /(?<=,NOTICE_DISMISS:function\(\i\){)return null!=(\i)/,
                    replace: (m: string, notice: string) => `if($self.isMajicNotice(${notice}))return(${notice}=null,$self.showNext(),true);${m}`
                }
            ]
        }
    ],

    isMajicNotice: _isMajicNotice,
    hasCurrentNotice: _hasCurrentNotice,
    showNext: _showNextNotice
});
