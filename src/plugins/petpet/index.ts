/*
 * Majic — petpet plugin
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, type CommandArgument, type CommandContext, findOption, sendBotMessage } from "@api/commands";
import { createStrings } from "@i18n";
import { makeLazy } from "@utils/lazy";
import { definePlugin } from "@utils/types";
import { DraftType, Stores, UploadHandler, UploadManager, UserUtils } from "@webpack/common";
import { GIFEncoder, nearestColorIndex, quantize } from "gifenc";

const s = createStrings({
    en: {
        command: "Create a petpet gif. You can only specify one of the image options",
        delay: "The delay between each frame in ms. Rounded to nearest 10ms. Defaults to the minimum value of 20.",
        resolution: "Resolution for the gif. Defaults to 120. If you enter an insane number and it freezes Discord that's your fault.",
        image: "Image attachment to use",
        url: "URL to fetch image from",
        user: "User whose avatar to use as image",
        noServerPfp: "Use the normal avatar instead of the server specific one when using the 'user' option",
        loadError: "An error occurred while loading {url}. Check the console for more info.",
        notImage: "Upload is not an image",
        fetchUserError: "Failed to fetch user. Check the console for more info.",
        noImage: "No image specified!",
        delayTooLow: "Delay must be at least 20."
    },
    fr: {
        command: "Crée un gif petpet. Tu ne peux choisir qu'une seule des options d'image",
        delay: "Le délai entre chaque image en ms, arrondi à 10 ms près. 20 par défaut, c'est le minimum.",
        resolution: "Résolution du gif. 120 par défaut. Si tu mets un nombre énorme et que Discord se fige, c'est de ta faute.",
        image: "Image jointe à utiliser",
        url: "Lien de l'image à utiliser",
        user: "Utilisateur dont l'avatar sert d'image",
        noServerPfp: "Utiliser l'avatar normal au lieu de celui du serveur avec l'option « user »",
        loadError: "Erreur pendant le chargement de {url}. Regarde la console pour plus de détails.",
        notImage: "Le fichier envoyé n'est pas une image",
        fetchUserError: "Impossible de récupérer l'utilisateur. Regarde la console pour plus de détails.",
        noImage: "Aucune image choisie !",
        delayTooLow: "Le délai doit être d'au moins 20."
    }
});

const DEFAULT_DELAY = 20;
const DEFAULT_RESOLUTION = 128;
const FRAMES = 10;

const getFrames = makeLazy(() => Promise.all(
    Array.from({ length: FRAMES }, (_, i) => loadImage(`https://raw.githubusercontent.com/VenPlugs/petpet/main/frames/pet${i}.gif`))
));

function loadImage(source: File | string) {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => reject(Error(s("loadError", { url })));
        img.crossOrigin = "Anonymous";
        img.src = url;
    });
}

async function resolveImage(options: CommandArgument[], ctx: CommandContext, noServerPfp: boolean): Promise<File | string | null> {
    for (const opt of options) {
        switch (opt.name) {
            case "image": {
                const upload = Stores.UploadAttachmentStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw s("notImage");
                    }
                    return upload.item.file;
                }
                break;
            }
            case "url":
                return opt.value;
            case "user":
                try {
                    const user = await UserUtils.getUser(opt.value);
                    return user.getAvatarURL(noServerPfp ? void 0 : ctx.guild?.id, 2048).replace(/\?size=\d+$/, "?size=2048");
                } catch (err) {
                    console.error("[petpet] Failed to fetch user\n", err);
                    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                    throw s("fetchUserError");
                }
        }
    }
    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return null;
}

const rgb888ToRgb565 = (r: number, g: number, b: number) => ((r << 8) & 0xf800) | ((g << 3) & 0x07e0) | (b >> 3);

function applyPaletteTransparent(data: Uint8Array | Uint8ClampedArray, palette: number[][], cache: number[], threshold: number): Uint8Array {
    const index = new Uint8Array(Math.floor(data.length / 4));

    for (let i = 0; i < index.length; i++) {
        const r = data[4 * i];
        const g = data[4 * i + 1];
        const b = data[4 * i + 2];
        const a = data[4 * i + 3];

        if (a < threshold) {
            index[i] = 255;
        } else {
            const key = rgb888ToRgb565(r, g, b);
            index[i] = key in cache ? cache[key] : (cache[key] = nearestColorIndex(palette, [r, g, b]));
        }
    }
    return index;
}

const option = (name: string, key: Parameters<typeof s>[0], type: ApplicationCommandOptionType) => ({
    name,
    type,
    get description() {
        return s(key);
    }
});

export default definePlugin({
    name: "petpet",
    description: "Adds a /petpet slash command to create headpet gifs from any image",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute une commande /petpet pour créer des gifs de caresse à partir de n'importe quelle image"
        }
    },

    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "petpet",
            get description() {
                return s("command");
            },
            options: [
                option("delay", "delay", ApplicationCommandOptionType.INTEGER),
                option("resolution", "resolution", ApplicationCommandOptionType.INTEGER),
                option("image", "image", ApplicationCommandOptionType.ATTACHMENT),
                option("url", "url", ApplicationCommandOptionType.STRING),
                option("user", "user", ApplicationCommandOptionType.USER),
                option("no-server-pfp", "noServerPfp", ApplicationCommandOptionType.BOOLEAN)
            ],
            async execute(opts: CommandArgument[], cmdCtx: CommandContext) {
                const frames = await getFrames();

                const noServerPfp = findOption<boolean>(opts, "no-server-pfp", false)!;
                let url: File | string | null;
                try {
                    url = await resolveImage(opts, cmdCtx, noServerPfp);
                    if (!url) throw s("noImage");
                } catch (err) {
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                    sendBotMessage(cmdCtx.channel.id, { content: String(err) });
                    return;
                }

                const avatar = await loadImage(url);

                const delay = findOption<number>(opts, "delay", DEFAULT_DELAY)!;
                if (delay < 20) return void sendBotMessage(cmdCtx.channel.id, { content: s("delayTooLow") });

                const resolution = findOption<number>(opts, "resolution", DEFAULT_RESOLUTION)!;

                const gif = GIFEncoder();
                const paletteImageSize = Math.min(120, resolution);

                const canvas = document.createElement("canvas");
                canvas.width = resolution;
                canvas.height = Math.max(resolution, 2 * paletteImageSize);

                const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

                UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);

                ctx.drawImage(avatar, 0, paletteImageSize, 0.8 * paletteImageSize, 0.8 * paletteImageSize);
                ctx.drawImage(frames[0], 0, 0, paletteImageSize, paletteImageSize);
                const { data } = ctx.getImageData(0, 0, paletteImageSize, 2 * paletteImageSize);
                const palette = quantize(data, 255);

                const cache = new Array(2 ** 16);

                for (let i = 0; i < FRAMES; i++) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const j = i < FRAMES / 2 ? i : FRAMES - i;
                    const width = 0.8 + j * 0.02;
                    const height = 0.8 - j * 0.05;
                    const offsetX = (1 - width) * 0.5 + 0.1;
                    const offsetY = 1 - height - 0.08;

                    ctx.drawImage(avatar, offsetX * resolution, offsetY * resolution, width * resolution, height * resolution);
                    ctx.drawImage(frames[i], 0, 0, resolution, resolution);

                    const { data } = ctx.getImageData(0, 0, resolution, resolution);
                    const index = applyPaletteTransparent(data, palette, cache, 1);

                    gif.writeFrame(index, resolution, resolution, {
                        transparent: true,
                        transparentIndex: 255,
                        delay,
                        palette: i === 0 ? palette : undefined
                    });
                }

                gif.finish();
                const file = new File([gif.bytesView() as Uint8Array<ArrayBuffer>], "petpet.gif", { type: "image/gif" });
                setTimeout(() => UploadHandler.promptToUpload([file], cmdCtx.channel, DraftType.ChannelMessage), 10);
            }
        }
    ]
});
