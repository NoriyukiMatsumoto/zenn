/**
 * https://github.com/electron/electron/issues/9920#issuecomment-947170941
 */
import { contextBridge, ipcRenderer } from "electron";
process.once("loaded", () => {
  contextBridge.exposeInMainWorld("ipcRenderer", {
    ...ipcRenderer,
    on: (channel: string, func: (arg: any) => void) => {
      ipcRenderer.on(channel, (event, arg) => func(arg));
    },
  });
});
