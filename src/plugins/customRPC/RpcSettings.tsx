/*
 * Majic — CustomRPC settings
 */

import { Select, SubHeading, TextInput } from "@components/ui";
import { isPluginEnabled } from "@renderer/plugins";
import { classes } from "@utils/misc";
import { React, useState } from "@webpack/common";

import { ActivityType, s, setRpc, settings, store, TimestampMode } from "./shared";

const cl = (name: string) => `majic-custom-rpc-settings-${name}`;

type Validation = true | string;

interface TextOption<T> {
    settingsKey: string;
    label: string;
    disabled?: boolean;
    transform?: (value: string) => T;
    isValid?: (value: T) => Validation;
}

interface SelectOption<T> {
    settingsKey: string;
    label: string;
    disabled?: boolean;
    options: { label: string; value: T; default?: boolean }[];
}

const makeValidator = (maxLength: number, isRequired = false) => (value: string): Validation => {
    if (isRequired && !value) return s("required");
    if (value.length > maxLength) return s("tooLong", { max: maxLength });
    return true;
};

const maxLength128 = makeValidator(128);

function isAppIdValid(value: string): Validation {
    if (!/^\d{16,21}$/.test(value)) return s("invalidId");
    return true;
}

let updateTimeout: ReturnType<typeof setTimeout> | undefined;
function updateRPC() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        void setRpc(true);
        if (isPluginEnabled("CustomRPC")) void setRpc();
    }, 300);
}

function isStreamLinkValid(value: string): Validation {
    if (store().type === ActivityType.STREAMING && !/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(value)) return s("invalidStream");
    if (value && value.length > 512) return s("streamTooLong");
    return true;
}

const parseNumber = (value: string) => value ? parseInt(value, 10) : 0;

function isNumberValid(value: number): Validation {
    if (isNaN(value)) return s("notNumber");
    if (value < 0) return s("notPositive");
    return true;
}

function isUrlValid(value: string): Validation {
    if (value && !/^https?:\/\/.+/.test(value)) return s("invalidUrl");
    return true;
}

function isImageKeyValid(value: string): Validation {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(value)) return s("discordLink");
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return s("imgurLink");
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return s("tenorLink");
    return true;
}

function SingleSetting<T>({ settingsKey, label, disabled, isValid, transform }: TextOption<T>) {
    const [state, setState] = useState<string>(String(store()[settingsKey] ?? ""));
    const [error, setError] = useState<string | null>(null);

    function handleChange(raw: string) {
        const value = transform ? transform(raw) : raw as unknown as T;
        const valid = isValid?.(value) ?? true;

        setState(raw);
        setError(valid === true ? null : valid);

        if (valid === true) {
            store()[settingsKey] = value;
            updateRPC();
        }
    }

    return (
        <div className={classes(cl("single"), disabled && cl("disabled"))}>
            <SubHeading>{label}</SubHeading>
            <TextInput placeholder={s("enterValue")} value={state} onChange={handleChange} readOnly={disabled} />
            {error && <span className={cl("error")}>{error}</span>}
        </div>
    );
}

function PairSetting<T>({ data: [left, right] }: { data: [TextOption<T>, TextOption<T>] }) {
    return (
        <div className={cl("pair")}>
            <SingleSetting {...left} />
            <SingleSetting {...right} />
        </div>
    );
}

function SelectSetting<T extends string | number | boolean>({ settingsKey, label, options, disabled }: SelectOption<T>) {
    const current = (store()[settingsKey] ?? options.find(o => o.default)?.value) as T;

    return (
        <div className={classes(cl("single"), disabled && cl("disabled"))}>
            <SubHeading>{label}</SubHeading>
            <Select
                value={current}
                options={options}
                onChange={value => {
                    store()[settingsKey] = value;
                    updateRPC();
                }}
            />
        </div>
    );
}

const Divider = () => <hr className={cl("divider")} />;

export function RPCSettings() {
    const current = settings.use() as unknown as Record<string, any>;

    return (
        <div className={cl("root")}>
            <SelectSetting
                settingsKey="type"
                label={s("activityType")}
                options={[
                    { label: s("playing"), value: ActivityType.PLAYING as number, default: true },
                    { label: s("streaming"), value: ActivityType.STREAMING },
                    { label: s("listening"), value: ActivityType.LISTENING },
                    { label: s("watching"), value: ActivityType.WATCHING },
                    { label: s("competing"), value: ActivityType.COMPETING }
                ]}
            />

            <PairSetting data={[
                { settingsKey: "appID", label: s("appId"), isValid: isAppIdValid },
                { settingsKey: "appName", label: s("appName"), isValid: makeValidator(128, true) }
            ]} />

            <PairSetting data={[
                { settingsKey: "details", label: s("details"), isValid: maxLength128 },
                { settingsKey: "detailsURL", label: s("detailsUrl"), isValid: isUrlValid }
            ]} />

            <PairSetting data={[
                { settingsKey: "state", label: s("state"), isValid: maxLength128 },
                { settingsKey: "stateURL", label: s("stateUrl"), isValid: isUrlValid }
            ]} />

            <SingleSetting
                settingsKey="streamLink"
                label={s("streamLink")}
                disabled={current.type !== ActivityType.STREAMING}
                isValid={isStreamLinkValid}
            />

            <PairSetting<number> data={[
                { settingsKey: "partySize", label: s("partySize"), transform: parseNumber, isValid: isNumberValid, disabled: (current.type ?? 0) !== ActivityType.PLAYING },
                { settingsKey: "partyMaxSize", label: s("partyMaxSize"), transform: parseNumber, isValid: isNumberValid, disabled: (current.type ?? 0) !== ActivityType.PLAYING }
            ]} />

            <Divider />

            <PairSetting data={[
                { settingsKey: "imageBig", label: s("imageBig"), isValid: isImageKeyValid },
                { settingsKey: "imageBigTooltip", label: s("imageBigText"), isValid: maxLength128 }
            ]} />
            <SingleSetting settingsKey="imageBigURL" label={s("imageBigUrl")} isValid={isUrlValid} />

            <PairSetting data={[
                { settingsKey: "imageSmall", label: s("imageSmall"), isValid: isImageKeyValid },
                { settingsKey: "imageSmallTooltip", label: s("imageSmallText"), isValid: maxLength128 }
            ]} />
            <SingleSetting settingsKey="imageSmallURL" label={s("imageSmallUrl")} isValid={isUrlValid} />

            <Divider />

            <PairSetting data={[
                { settingsKey: "buttonOneText", label: s("buttonOneText"), isValid: makeValidator(31) },
                { settingsKey: "buttonOneURL", label: s("buttonOneUrl"), isValid: isUrlValid }
            ]} />
            <PairSetting data={[
                { settingsKey: "buttonTwoText", label: s("buttonTwoText"), isValid: makeValidator(31) },
                { settingsKey: "buttonTwoURL", label: s("buttonTwoUrl"), isValid: isUrlValid }
            ]} />

            <Divider />

            <SelectSetting
                settingsKey="timestampMode"
                label={s("timestampMode")}
                options={[
                    { label: s("tsNone"), value: TimestampMode.NONE as number, default: true },
                    { label: s("tsNow"), value: TimestampMode.NOW },
                    { label: s("tsTime"), value: TimestampMode.TIME },
                    { label: s("tsCustom"), value: TimestampMode.CUSTOM }
                ]}
            />

            <PairSetting<number> data={[
                { settingsKey: "startTime", label: s("startTime"), transform: parseNumber, isValid: isNumberValid, disabled: current.timestampMode !== TimestampMode.CUSTOM },
                { settingsKey: "endTime", label: s("endTime"), transform: parseNumber, isValid: isNumberValid, disabled: current.timestampMode !== TimestampMode.CUSTOM }
            ]} />
        </div>
    );
}
