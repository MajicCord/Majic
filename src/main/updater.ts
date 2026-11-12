/*
 * Majic — updater (git checkout or GitHub releases)
 */

import { IpcEvents } from "@shared/IpcEvents";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { ipcMain, net } from "electron";

export interface UpdateChange {
    hash: string;
    author: string;
    message: string;
}

type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string };

const run = promisify(execFile);

const DIST_DIR = __dirname;
const SOURCE_DIR = join(DIST_DIR, "..");
const DIST_FILES = ["patcher.js", "preload.js", "renderer.js"];
const USER_AGENT = `Majic (https://github.com/${MAJIC_GIT_REMOTE})`;

const isGitCheckout = () => existsSync(join(SOURCE_DIR, ".git"));

function wrap<T>(handler: () => Promise<T>) {
    return async (): Promise<IpcResult<T>> => {
        try {
            return { ok: true, value: await handler() };
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
    };
}

const git = (...args: string[]) => run("git", args, { cwd: SOURCE_DIR });

const gitBackend = {
    async repo() {
        const { stdout } = await git("remote", "get-url", "origin");
        return stdout.trim().replace(/git@(.+):/, "https://$1/").replace(/\.git$/, "");
    },

    async changes(): Promise<UpdateChange[]> {
        await git("fetch");
        const branch = (await git("branch", "--show-current")).stdout.trim();
        if (!(await git("ls-remote", "origin", branch)).stdout.length) return [];

        const { stdout } = await git("log", `HEAD...origin/${branch}`, "--pretty=format:%an/%h/%s");
        return stdout.trim().split("\n").filter(Boolean).map(line => {
            const [author, hash, ...message] = line.split("/");
            return { author, hash, message: message.join("/") };
        });
    },

    async download() {
        const { stdout } = await git("pull");
        return stdout.includes("Fast-forward");
    },

    async apply() {
        const args = [join(SOURCE_DIR, "scripts", "build.mjs")];
        if (IS_DEV) args.push("--dev");
        await run("node", args, { cwd: SOURCE_DIR });
        return true;
    }
};

async function githubGet<T = any>(endpoint: string): Promise<T> {
    const res = await net.fetch(`https://api.github.com/repos/${MAJIC_GIT_REMOTE}${endpoint}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": USER_AGENT }
    });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    return res.json() as Promise<T>;
}

let pendingDownloads: Array<[name: string, url: string]> = [];

const releaseBackend = {
    async repo() {
        return `https://github.com/${MAJIC_GIT_REMOTE}`;
    },

    async findLatest() {
        const release = await githubGet<{ name: string; assets: Array<{ name: string; browser_download_url: string }> }>("/releases/latest");
        const hash = release.name.slice(release.name.lastIndexOf(" ") + 1);
        if (hash === MAJIC_GIT_HASH) return false;

        pendingDownloads = release.assets
            .filter(asset => DIST_FILES.includes(asset.name))
            .map(asset => [asset.name, asset.browser_download_url]);
        return pendingDownloads.length > 0;
    },

    async changes(): Promise<UpdateChange[]> {
        if (!await releaseBackend.findLatest()) return [];

        const comparison = await githubGet(`/compare/${MAJIC_GIT_HASH}...HEAD`);
        return comparison.commits.map((commit: any) => ({
            hash: commit.sha.slice(0, 7),
            author: commit.author?.login ?? commit.commit?.author?.name ?? "Unknown",
            message: commit.commit.message.split("\n")[0]
        }));
    },

    download: () => releaseBackend.findLatest(),

    async apply() {
        const files = await Promise.all(pendingDownloads.map(async ([name, url]) => {
            const res = await net.fetch(url, { headers: { "User-Agent": USER_AGENT } });
            if (!res.ok) throw new Error(`Download of ${name} failed with ${res.status}`);
            return [join(DIST_DIR, name), Buffer.from(await res.arrayBuffer())] as const;
        }));

        await Promise.all(files.map(([path, contents]) => writeFile(path, contents)));
        pendingDownloads = [];
        return true;
    }
};

export function initUpdater() {
    const backend = () => isGitCheckout() ? gitBackend : releaseBackend;

    ipcMain.handle(IpcEvents.GET_REPO, wrap(() => backend().repo()));
    ipcMain.handle(IpcEvents.GET_UPDATES, wrap(() => backend().changes()));
    ipcMain.handle(IpcEvents.UPDATE, wrap(() => backend().download()));
    ipcMain.handle(IpcEvents.BUILD, wrap(() => backend().apply()));
}
