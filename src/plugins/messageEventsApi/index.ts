/*
 * Majic — MessageEventsAPI core plugin
 */

import { _handleClick, _handlePreEdit, _handlePreSend } from "@api/messageEvents";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Lets plugins change or cancel messages before they are sent or edited, and react to message clicks",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins de modifier ou d'annuler un message avant son envoi ou sa modification, et de réagir aux clics"
        }
    },
    required: true,

    patches: [
        {
            find: "#{intl::EDIT_TEXTAREA_HELP}",
            replacement: {
                match: /(?<=,channel:\i,message:\i\}\)\.then\().+?(?=\i\.content!==this\.props\.message\.content&&\i\((.+?)\)\})/,
                replace: (code, args) =>
                    `async ${code}if(await $self.handlePreEdit(${args}))return Promise.resolve({shouldClear:false,shouldRefocus:true});`
            }
        },
        {
            find: ".handleSendMessage,onResize:",
            replacement: {
                match: /(?<=channel:\i\}\)\.then\()(?:async )?(\i=>.+?let (\i)=\i\.\i\.parse\((\i),.+?\.getSendMessageOptions\(\{.+?\}\)?;)(?=.+?(\i)\.flags=)(?<=\)\(({.+?})\)\.then.+?)/,
                replace: (_, body, parsed, channel, options, props) =>
                    `async ${body}if(await $self.handlePreSend(${channel}.id,${parsed},${options},${props}))return{shouldClear:false,shouldRefocus:true};`
            }
        },
        {
            find: '("interactionUsernameProfile',
            replacement: {
                match: /let\{id:\i}=(\i),{id:\i}=(\i);return \i\.useCallback\((\i)=>\{/,
                replace: (code, message, channel, event) =>
                    `const majicMessage=${message},majicChannel=${channel};${code}$self.handleClick(majicMessage,majicChannel,${event});`
            }
        }
    ],

    handlePreSend: _handlePreSend,
    handlePreEdit: _handlePreEdit,
    handleClick: _handleClick
});
