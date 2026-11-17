/*
 * Majic — AudioPlayerAPI core plugin
 */

import { type AudioPlayerInternal, type AudioPlayerOptions, audioProcessorFunctions, AudioType, identifyAudioType, playAudio } from "@api/audioPlayer";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "AudioPlayerAPI",
    description: "Lets plugins play Discord's sounds or external audio links",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins de jouer les sons de Discord ou des liens audio externes"
        }
    },
    AudioType,
    playAudio,

    patches: [
        {
            find: "could not play audio",
            group: true,
            replacement: [
                {
                    match: /(let \i=class.{0,1250}?new Audio;\i.src=)((\i\(\d+\))\(`\.\/\$\{)this.name(\}\.mp3`\))/,
                    replace: "$3;$1this.type!==$self.AudioType.DISCORD?this.audio:$2this.audio$4"
                },
                {
                    match: /constructor\(((?:\i,){3}\i)([^)]*)\)\{[^}]+}/,
                    replace: "constructor(options,$1$2){$self.buildPlayer(this,options,$1);}"
                },
                {
                    match: /(\i.pause\(\),(\i).src="".{0,20}?null)/,
                    replace: "$2.onerror=()=>{},$1"
                },
                {
                    match: /(?<=(\i).onloadeddata=\(\)=>{)/,
                    replace: "$1.playbackRate=this._speed,"
                },
                {
                    match: /(onerror=\()(\)=>{)(?=let)/,
                    replace: "$1error$2this.onError?.(error);"
                },
                {
                    match: /(?<=onended=\(\)=>)(.{0,40}?),/,
                    replace: "{$self.stopAudio(this);this.onEnded?.();},"
                },
                {
                    match: /(stop\()(\){)this.destroyAudio\(\)/,
                    replace: "$1restart$2$self.stopAudio(this,restart);"
                },
                {
                    match: /let \i=new Audio\((\(0,\i.\i\)\(\i\)).{0,35}?play\(\)/,
                    replace: "$self.playAudio($1)"
                }
            ]
        },
        {
            find: "SoundUtils",
            replacement: {
                match: /return new (\i)\((.{0,50}?)(?=})/,
                replace: "return new $1(undefined,$2"
            }
        },
        {
            find: '"UPDATE_OPEN_ON_STARTUP"',
            group: true,
            replacement: [
                {
                    match: /(?<=discodo",\i)(\);return )\i.volume=1,/,
                    replace: ",1$1"
                },
                {
                    match: /,(this._connectedSound.volume)=1/,
                    replace: ";"
                }
            ]
        }
    ],

    stopAudio(player: AudioPlayerInternal, restart?: boolean) {
        if (restart) {
            player.ensureAudio().then(audio => {
                audio.currentTime = 0;
                audio.play();
            });
        } else if (!player.persistent) {
            player.destroyAudio();
        } else {
            player._audio?.then(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        }
    },

    processAudio(player: AudioPlayerInternal) {
        player.preprocessDataPrevious = player.preprocessDataCurrent ? structuredClone(player.preprocessDataCurrent) : null;
        player.preprocessDataCurrent = structuredClone(player.preprocessDataOriginal);
        player.preprocessDataCurrent.volume *= 100;

        for (const processor of Object.values(audioProcessorFunctions)) {
            processor(player.preprocessDataCurrent);
        }

        player.preprocessDataCurrent.volume /= 100;
        player.audio = player.preprocessDataCurrent.audio;
        player.type = identifyAudioType(player.preprocessDataCurrent.audio);
        player._volume = Math.max(0, Math.min(1, player.preprocessDataCurrent.volume));
        player._speed = Math.max(0.0625, Math.min(16, player.preprocessDataCurrent.speed));

        if (player.preprocessDataCurrent.audio !== player.preprocessDataPrevious?.audio) {
            player.destroyAudio();
            player.persistent && player.ensureAudio();
        }

        if (player.preprocessDataCurrent.volume !== player.preprocessDataPrevious?.volume) {
            player._audio?.then(audio => {
                audio.volume = player._volume;
            });
        }

        if (player.preprocessDataCurrent.speed !== player.preprocessDataPrevious?.speed) {
            player._audio?.then(audio => {
                audio.playbackRate = player._speed;
            });
        }
    },

    buildPlayer(player: AudioPlayerInternal, options: AudioPlayerOptions = {}, audio: string, _unused: any, internalVolume: number, channel: string) {
        player.preprocessDataOriginal = {
            audio,
            type: identifyAudioType(audio),
            volume: Math.max(0, Math.min(1, (internalVolume || (options.volume ? options.volume / 100 : 1)))),
            speed: Math.max(0.0625, Math.min(16, options.speed ?? 1))
        };

        player.audio = player.preprocessDataOriginal.audio;
        player._audio = null;
        player._volume = player.preprocessDataOriginal.volume;
        player._speed = player.preprocessDataOriginal.speed;
        player.preload = options.preload ?? false;
        player.persistent = options.persistent ?? false;
        player.type = identifyAudioType(audio);
        player.outputChannel = channel;
        player.onEnded = options.onEnded;
        player.onError = options.onError;

        player.processAudio = () => this.processAudio(player);
        player.processAudio();
        player.preload && player.ensureAudio();
    }
});
