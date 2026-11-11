/*
 * Majic — SpotifyControls player
 */

import { Menu } from "@api/contextMenu";
import { copyWithToast, openImageModal } from "@utils/discord";
import { classes, formatDuration } from "@utils/misc";
import { filters, mapMangledModuleLazy } from "@webpack";
import { DiscordIcon, FluxDispatcher, React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { SeekBar } from "./SeekBar";
import { s, settings } from "./settings";
import { SpotifyStore, type Track } from "./SpotifyStore";

const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: (e: any) => typeof e === "function" && e.toString().length < 100
});

const cl = (...names: string[]) => names.map(name => `majic-spotify-${name}`).join(" ");

function debounce<T extends (...args: any[]) => void>(func: T, delay = 300): T {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    }) as T;
}

function ControlIcon({ name, label }: { name: string; label: string }) {
    return (
        <span className={cl("button-icon")} aria-label={label}>
            <DiscordIcon name={name} size={20} />
        </span>
    );
}

const CopyIcon = () => <DiscordIcon name="CopyIcon" size={18} />;
const LinkIcon = () => <DiscordIcon name="LinkIcon" size={18} />;
const OpenExternalIcon = () => <DiscordIcon name="LinkExternalSmallIcon" size={18} />;
const ImageIcon = () => <DiscordIcon name="ImageIcon" size={18} />;

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button className={cl("button")} {...props}>
            {props.children}
        </button>
    );
}

type LinkType = "song" | "artist" | "album";

function CopyContextMenu({ name, type, path }: { type: LinkType; name: string; path: string }) {
    const typeName = s(type);
    return (
        <Menu.Menu navId="majic-spotify-menu" onClose={ContextMenuApi.closeContextMenu} aria-label={s("menu", { type: typeName })}>
            <Menu.MenuItem
                id="majic-spotify-copy-name"
                label={s("copyName", { type: typeName })}
                action={() => copyWithToast(name)}
                icon={CopyIcon}
                leadingAccessory={{ type: "icon", icon: CopyIcon }}
            />
            <Menu.MenuItem
                id="majic-spotify-copy-link"
                label={s("copyLink", { type: typeName })}
                action={() => copyWithToast("https://open.spotify.com" + path)}
                icon={LinkIcon}
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
            />
            <Menu.MenuItem
                id="majic-spotify-open"
                label={s("openIn", { type: typeName })}
                action={() => SpotifyStore.openExternal(path)}
                icon={OpenExternalIcon}
                leadingAccessory={{ type: "icon", icon: OpenExternalIcon }}
            />
        </Menu.Menu>
    );
}

function Controls() {
    const [isPlaying, shuffle, repeat] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.isPlaying, SpotifyStore.shuffle, SpotifyStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "off": return ["context", "repeat-off"] as const;
            case "context": return ["track", "repeat-context"] as const;
            case "track": return ["off", "repeat-track"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    return (
        <div className={cl("button-row")} style={{ display: "flex" }}>
            <Button
                className={classes(cl("button"), cl("shuffle"), cl(shuffle ? "shuffle-on" : "shuffle-off"))}
                onClick={() => SpotifyStore.setShuffle(!shuffle)}
            >
                <ControlIcon name="DiceIcon" label={s("shuffle")} />
            </Button>
            <Button onClick={() => {
                if (settings.store.previousButtonRestartsTrack && SpotifyStore.position > 3000) void SpotifyStore.seek(0);
                else SpotifyStore.prev();
            }}>
                <ControlIcon name="SkipBackwardIcon" label={s("previous")} />
            </Button>
            <Button onClick={() => SpotifyStore.setPlaying(!isPlaying)}>
                {isPlaying ? <ControlIcon name="PauseIcon" label={s("pause")} /> : <ControlIcon name="PlayIcon" label={s("play")} />}
            </Button>
            <Button onClick={() => SpotifyStore.next()}>
                <ControlIcon name="SkipForwardIcon" label={s("next")} />
            </Button>
            <Button
                className={classes(cl("button"), cl("repeat"), cl(repeatClassName))}
                onClick={() => SpotifyStore.setRepeat(nextRepeat)}
                style={{ position: "relative" }}
            >
                {repeat === "track" && <span className={cl("repeat-1")}>1</span>}
                <ControlIcon name="RetryIcon" label={s("repeat")} />
            </Button>
        </div>
    );
}

const seek = debounce((v: number) => {
    void SpotifyStore.seek(v);
});

function SpotifySeekBar() {
    const { duration } = SpotifyStore.track!;

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.mPosition, SpotifyStore.isSettingPosition, SpotifyStore.isPlaying]
    );

    const [position, setPosition] = useState(storePosition);

    useEffect(() => {
        if (isPlaying && !isSettingPosition) {
            setPosition(SpotifyStore.position);
            const interval = setInterval(() => setPosition((p: number) => p + 1000), 1000);
            return () => clearInterval(interval);
        }
    }, [storePosition, isSettingPosition, isPlaying]);

    const onChange = (v: number) => {
        if (isSettingPosition) return;
        setPosition(v);
        seek(v);
    };

    return (
        <div id="majic-spotify-progress-bar">
            <span className={cl("progress-time", "time-left")} aria-label={s("progress")}>
                {formatDuration(position)}
            </span>
            <SeekBar
                initialValue={position}
                minValue={0}
                maxValue={duration}
                onValueChange={onChange}
                asValueChanges={onChange}
                onValueRender={formatDuration}
            />
            <span className={cl("progress-time", "time-right")} aria-label={s("totalDuration")}>
                {formatDuration(duration)}
            </span>
        </div>
    );
}

function AlbumContextMenu({ track }: { track: Track }) {
    const volume = useStateFromStores([SpotifyStore], () => SpotifyStore.volume);

    return (
        <Menu.Menu
            navId="spotify-album-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label={s("albumMenu")}
        >
            <Menu.MenuItem
                key="open-album"
                id="open-album"
                label={s("openAlbum")}
                action={() => SpotifyStore.openExternal(`/album/${track.album.id}`)}
                icon={OpenExternalIcon}
                leadingAccessory={{ type: "icon", icon: OpenExternalIcon }}
            />
            <Menu.MenuItem
                key="view-cover"
                id="view-cover"
                label={s("viewCover")}
                action={() => openImageModal(track.album.image)}
                icon={ImageIcon}
                leadingAccessory={{ type: "icon", icon: ImageIcon }}
            />
            <Menu.MenuControlItem
                id="spotify-volume"
                key="spotify-volume"
                label={s("volume")}
                control={(props: any, ref: any) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => SpotifyStore.setVolume(v))}
                    />
                )}
            />
        </Menu.Menu>
    );
}

function makeLinkProps(type: LinkType, condition: unknown, name: string, path: string): React.HTMLAttributes<HTMLElement> {
    if (!condition) return {};

    return {
        role: "link",
        onClick: () => SpotifyStore.openExternal(path),
        onContextMenu: e => ContextMenuApi.openContextMenu(e, () => <CopyContextMenu type={type} name={name} path={path} />)
    };
}

function Info({ track }: { track: Track }) {
    const img = track?.album?.image;
    const [coverExpanded, setCoverExpanded] = useState(false);

    const image = img && (
        <img
            id="majic-spotify-album-image"
            src={img.url}
            alt={s("albumImage")}
            onClick={() => setCoverExpanded(!coverExpanded)}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <AlbumContextMenu track={track} />)}
        />
    );

    if (coverExpanded && img) {
        return <div id="majic-spotify-album-expanded-wrapper">{image}</div>;
    }

    return (
        <div id="majic-spotify-info-wrapper">
            {image}
            <div id="majic-spotify-titles">
                <p
                    id="majic-spotify-song-title"
                    className={cl("ellipoverflow")}
                    title={track.name}
                    {...makeLinkProps("song", track.id, track.name, `/track/${track.id}`)}
                >
                    {track.name}
                </p>
                {track.artists.some(a => a.name) && (
                    <p className={cl("ellipoverflow", "secondary-song-info")}>
                        <span className={cl("song-info-prefix")}>{s("by")}&nbsp;</span>
                        {track.artists.map((a, i) => (
                            <React.Fragment key={a.name}>
                                <span
                                    className={cl("artist")}
                                    style={{ fontSize: "inherit" }}
                                    title={a.name}
                                    {...makeLinkProps("artist", a.id, a.name, `/artist/${a.id}`)}
                                >
                                    {a.name}
                                </span>
                                {i !== track.artists.length - 1 && <span className={cl("comma")}>{", "}</span>}
                            </React.Fragment>
                        ))}
                    </p>
                )}
                {track.album.name && (
                    <p className={cl("ellipoverflow", "secondary-song-info")}>
                        <span className={cl("song-info-prefix")}>{s("on")}&nbsp;</span>
                        <span
                            id="majic-spotify-album-title"
                            className={cl("album")}
                            style={{ fontSize: "inherit" }}
                            title={track.album.name}
                            {...makeLinkProps("album", track.album.id, track.album.name, `/album/${track.album.id}`)}
                        >
                            {track.album.name}
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
}

export function Player() {
    const track = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        undefined,
        (prev, next) => prev?.id ? (prev.id === next?.id) : prev?.name === next?.name
    );

    const device = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.device,
        undefined,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    const exportTrackImageStyle = {
        "--majic-spotify-track-image": `url(${track?.album?.image?.url || ""})`
    } as React.CSSProperties;

    return (
        <div id="majic-spotify-player" style={exportTrackImageStyle}>
            <Info track={track} />
            <SpotifySeekBar />
            <Controls />
        </div>
    );
}
