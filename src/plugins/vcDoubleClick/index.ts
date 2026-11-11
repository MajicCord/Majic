/*
 * Majic — VoiceChatDoubleClick plugin
 */

import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

const timers: Record<string, { timeout?: ReturnType<typeof setTimeout>; i: number }> = {};

export default definePlugin({
    name: "VoiceChatDoubleClick",
    description: "Join voice chats with a double click instead of a single click",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Rejoindre les salons vocaux avec un double-clic au lieu d'un simple clic"
        }
    },

    patches: [
        {
            find: ".handleClickChat",
            replacement: {
                match: /onClick:\(\)=>\{this.handleClick\(\)/g,
                replace: "onClick:()=>{$self.schedule(()=>{this.handleClick()},this)"
            }
        },
        {
            find: 'className:"channelMention",children:[null!=',
            replacement: {
                match: /onClick:(\i)(?=,.{0,30}className:"channelMention".+?(\i)\.inContent)/,
                replace: (_: string, onClick: string, props: string) =>
                    `onClick:(majicDoubleClickEvt)=>$self.shouldRunOnClick(majicDoubleClickEvt,${props})&&${onClick}()`
            }
        }
    ],

    shouldRunOnClick(e: MouseEvent, { channelId }: { channelId: string }) {
        const channel = Stores.ChannelStore.getChannel(channelId);
        if (!channel || ![2, 13].includes(channel.type)) return true;
        return e.detail >= 2;
    },

    schedule(cb: () => void, e: any) {
        const id = e.props.channel.id as string;
        if (Stores.SelectedChannelStore.getVoiceChannelId() === id) {
            cb();
            return;
        }

        const data = (timers[id] ??= { timeout: void 0, i: 0 });
        clearTimeout(data.timeout);

        if (++data.i >= 2) {
            cb();
            delete timers[id];
        } else {
            data.timeout = setTimeout(() => {
                delete timers[id];
            }, 500);
        }
    }
});
