/*
 * Majic — XSOverlay native
 */

import { createSocket, type Socket } from "node:dgram";
import type { IpcMainInvokeEvent } from "electron";

let xsoSocket: Socket | null = null;

export function sendToOverlay(_: IpcMainInvokeEvent, data: any) {
    data.messageType = data.type;
    const json = JSON.stringify(data);
    xsoSocket ??= createSocket("udp4");
    xsoSocket.send(json, 42069, "127.0.0.1");
}

export function closeSocket() {
    xsoSocket?.close();
    xsoSocket = null;
}
