/*
 * Majic — managed stylesheets
 */

const styles = new Map<string, HTMLStyleElement>();
let container: HTMLElement | undefined;

function getContainer() {
    if (container?.isConnected) return container;
    container ??= document.createElement("majic-styles");
    const userStyles = document.querySelector("majic-root");
    if (userStyles) document.documentElement.insertBefore(container, userStyles);
    else document.documentElement.append(container);
    return container;
}

function whenDocumentReady(callback: () => void) {
    if (document.documentElement && document.head) callback();
    else document.addEventListener("DOMContentLoaded", callback, { once: true });
}

export function enableStyle(id: string, css: string) {
    let style = styles.get(id);
    if (!style) {
        style = document.createElement("style");
        style.dataset.majicStyle = id;
        styles.set(id, style);
    }
    style.textContent = css;

    const element = style;
    whenDocumentReady(() => styles.get(id) === element && !element.isConnected && getContainer().append(element));
}

export function disableStyle(id: string) {
    styles.get(id)?.remove();
    styles.delete(id);
}

export const isStyleEnabled = (id: string) => styles.has(id);
