import path from "path";
import { BrowserWindow, app, ipcMain } from "electron";

const isDev = process.env.NODE_ENV === "development";

class Manager {
  parentWindow: BrowserWindow | null = null;
  childWindows: BrowserWindow[] = [];
  timerTickCnt: number = 0;

  constructor() {
    ipcMain.on("sendSync", (event, arg) => {
      console.log({ arg });
      event.returnValue = { message: "sendSync event" };
    });

    ipcMain.on("sendAsync", (event, arg) => {
      console.log({ arg });
      event.reply("sendAsyncOnComplete", { message: "sendAsync event" });
    });

    ipcMain.handle("invoke", async (event, arg) => {
      console.log({ arg });
      return Promise.resolve({ message: "invoke event" });
    });

    ipcMain.on("createChild", async (event, arg) => {
      console.log({ arg });
      const cw = await this.createChildWindow();
      cw.webContents.send("send-data", {
        message: `createChild ${this.childWindows.length}`,
      });
    });

    ipcMain.on("sendMessageToParent", (event, arg) => {
      console.log({ arg });
      this.parentWindow?.webContents.send("childMessage", {
        message: arg.message,
      });
    });
  }

  async createParentWindow() {
    const parentWindow = new BrowserWindow({
      width: 600,
      height: 480,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    await parentWindow.loadFile(path.join(__dirname, "parent.html"));

    if (isDev) {
      try {
        parentWindow.webContents.openDevTools({ mode: "detach" });
      } catch (e) {
        console.error({ e });
      }
    }

    this.parentWindow = parentWindow;

    global.setInterval(() => {
      parentWindow.webContents.send("timer_tick", {
        message: `timer_tick:${++this.timerTickCnt}`,
      });
    }, 1000);

    return parentWindow;
  }

  async createChildWindow() {
    if (!this.parentWindow) {
      throw new Error("Nothing parent window.");
    }
    const childWindow = new BrowserWindow({
      width: 600,
      height: 480,
      parent: this.parentWindow,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    await childWindow.loadFile(path.join(__dirname, "child.html"));

    this.childWindows.push(childWindow);

    return childWindow;
  }
}

const manager = new Manager();

app.once("window-all-closed", () => {
  app.quit();
});
app.on("ready", () => {
  manager.createParentWindow();
});
