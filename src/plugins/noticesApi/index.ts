/*
 * Majic — NoticesAPI core plugin
 */

import { _isMajicNotice, _showNextNotice } from "@api/notices";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoticesAPI",
    description: "Lets plugins show banners at the top of Discord",
    authors: [{ name: "SnailyStudios" }],
    required: true,

    patches: [
        {
            find: '"NoticeStore"',
            replacement: [
                {
                    match: /(\i)=null;(?=let \i=\i\.\i\.getCurrentUser\(\);if\(null==\i\)return!1;let \i=\i\.\i\.getPremiumSubscription\(\))/,
                    replace: "if($self.isMajicNotice($1))return!1;$&"
                },
                {
                    match: /(?<=NOTICE_DISMISS:function\((\i)\)\{)(?=return null!=(\i)&&)/,
                    replace: "if($self.isMajicNotice($2)&&(null==$1.id||$1.id===$2.id))return $2=null,$self.showNext(),!0;"
                }
            ]
        }
    ],

    isMajicNotice: _isMajicNotice,
    showNext: _showNextNotice
});
