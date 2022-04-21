---
title: "Electron + React + Typescript プロセス間通信"
emoji: "📘"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["electron","react","typescript"]
published: true
---

## 概要
Electron + React + Typescriptでのプロセス間通信方法
React + Typescriptで実装する際にトラップが多かったので、記事にまとめる

## 作ったもの
レンダラープロセス起点
- 同期通信(sendSync)
- 非同期通信(send)
- 非同期通信(invoke)

メインプロセス起点

## コード
https://github.com/NoriyukiMatsumoto/zenn/tree/main/articles/electron-react-data-send

```bash
$ npm i
$ npm run dev
```
上記で実行できるはず

## 構成ポイント
### ipcRendererをreactで使えるようにする
**参考**
https://github.com/electron/electron/issues/9920#issuecomment-947170941
```ts:preload.ts
import { contextBridge, ipcRenderer } from "electron";
process.once("loaded", () => {
  contextBridge.exposeInMainWorld("ipcRenderer", {
    ...ipcRenderer,
    on: (channel: string, func: (arg: any) => void) => {
      ipcRenderer.on(channel, (event, arg) => func(arg));
    },
  });
});
```
上記だと、セキュリティ的に問題があるっぽいが、今回は無視。
```ts:preload.ts
    ...ipcRenderer,
    on: (channel: string, func: (arg: any) => void) => {
      ipcRenderer.on(channel, (event, arg) => func(arg));
    },
```
上記の用に、記載している理由は、以下の問題に直面したため。
https://stackoverflow.com/questions/66913598/ipcrenderer-on-is-not-a-function

```ts:electron.d.ts
import { IpcRenderer } from "electron";

declare global {
  interface Window {
    ipcRenderer: any;
  }
}

export const { ipcRenderer } = window;
```
本当は`any`使いたくないが、検証なので無視。


### 親ウィンドウと子ウィンドウの出力ファイルを分ける
今回親ウィンドウと、子ウィンドウを作成したいので、２つのバンドルファイルを生成する必要がある。
`filename` を指定して、`parent.html` `parent.js` `child.html` `child.js` を生成する。
```ts:webpack.config.ts
const rendererChild: Configuration = {
  ...common,
  target: "web",
  entry: {
    app: "./src/Child.tsx",
  },
  output: {
    filename: "child.js",
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/child.html",
      filename: "child.html",
    }),
    new Dotenv({ path: path.resolve(__dirname, `.env`) }),
  ],
};

const rendererParent: Configuration = {
  ...common,
  target: "web",
  entry: {
    app: "./src/Parent.tsx",
  },
  output: {
    filename: "parent.js",
  },

  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/parent.html",
      filename: "parent.html",
    }),
    new Dotenv({ path: path.resolve(__dirname, `.env`) }),
  ],
};
```

## レンダラープロセス起点
### 同期通信(sendSync)
![](/images/electron-react-data-send/sendSync.gif)
```tsx:Parent.tsx
      <button
        onClick={() => {
          const retval = window.ipcRenderer.sendSync("sendSync", {
            message: "parent sendSync",
          });
          setMessage(retval.message);
        }}
      >
        sendSync
      </button>
```

```ts:main.ts
    ipcMain.on("sendSync", (event, arg) => {
      console.log({ arg });
      event.returnValue = { message: "sendSync event" };
    });
```

`window.ipcRenderer.sendSync` でmainプロセスにイベントを送信。
`event.returnValue` で画面側にデータを返す。

### 非同期通信(send)
![](/images/electron-react-data-send/sendAsync.gif)
```tsx:Parent.tsx
    
  useEffect(() => {
    window.ipcRenderer.on("sendAsyncOnComplete", (arg: any) => {
      console.log("sendAsyncOnComplete", arg);
      setMessage(arg.message);
    });
    ~割愛~
  }, []);

    ~割愛~

      <button
        onClick={() => {
          window.ipcRenderer.send("sendAsync", {
            message: "parent sendAsync",
          });
        }}
      >
        sendAsync
      </button>
```

```ts:main.ts
    ipcMain.on("sendAsync", (event, arg) => {
      console.log({ arg });
      event.reply("sendAsyncOnComplete", { message: "sendAsync event" });
    });
```

`window.ipcRenderer.send`でイベントを送り、
mainプロセス側`ipcMain.on`イベントハンドラで受信。
`event.reply`で非同期で情報を渡すことができる。
非同期で渡された情報は、画面側の`window.ipcRenderer.on`イベントハンドラで受信。

### 非同期通信(invoke)
![](/images/electron-react-data-send/invoke.gif)
```tsx:Parent.tsx
      <button
        onClick={async () => {
          var retval = await window.ipcRenderer.invoke("invoke", {
            message: "parent invoke",
          });
          console.log({ retval });
          setMessage(retval.message);
        }}
      >
        invoke
      </button>
```

```ts:main.ts
    ipcMain.handle("invoke", async (event, arg) => {
      console.log({ arg });
      return Promise.resolve({ message: "invoke event" });
    });
```
画面側の`window.ipcRenderer.invoke`でイベントを送り、
mainプロセス側の`ipcMain.handle`イベントハンドラで受信。返り値に画面に渡す値を返す。
画面側は、返り値を受け取る。

## メインプロセス起点
![](/images/electron-react-data-send/TimerTick.gif)
```tsx:Parent.tsx
  useEffect(() => {
    ~割愛~
    window.ipcRenderer.on("timer_tick", (arg: any) => {
      setTimerTickMessage(arg.message);
    });
    ~割愛~
  }, []);
```

```ts:main.ts
    global.setInterval(() => {
      parentWindow.webContents.send("timer_tick", {
        message: `timer_tick:${++this.timerTickCnt}`,
      });
    }, 1000);
```
1秒ごとにmainプロセスから`parentWindow.webContents.send`でイベントを発火させる
画面側は`window.ipcRenderer.on`イベントハンドラで受信する。

## おまけ①
親ウィンドウから子ウィンドウを作成。
作成後、子ウィンドウにデータを送信する。
親ウィンドウから子ウィンドウへ`createChild${生成数}`というデータを渡して、子ウィンドウでは表示している。
![](/images/electron-react-data-send/dataToChild.gif)

**親ウィンドウから子ウィンドウを作成。**
```tsx:Parent.tsx
      <button
        onClick={async () => {
          window.ipcRenderer.send("createChild", {
            message: "parent invoke",
          });
        }}
      >
        createChild
      </button>
```
画面側から`window.ipcRenderer.send`でイベントを発火。

```ts:main.ts
    ipcMain.on("createChild", async (event, arg) => {
      console.log({ arg });
      const cw = await this.createChildWindow();
      cw.webContents.send("send-data", {
        message: `createChild ${this.childWindows.length}`,
      });
    });
```
mainプロセス側`ipcMain.on`で受信して、子ウィンドウを作成する。
`cw.webContents.send`で子ウィンドウにデータを送信する。

```tsx:Child.tsx
  useEffect(() => {
    console.log("useEffect");
    window.ipcRenderer.on("send-data", (arg: any) => {
      setMessage(arg.message);
    });
  }, []);
```
子ウィンドウ側は、`window.ipcRenderer.on`イベントハンドラでデータを受信する。

## おまけ②
子ウィンドウから親ウィンドウにデータを渡す
![](/images/electron-react-data-send/dataToParent.gif)

```tsx:Child.tsx
      <button
        onClick={async () => {
          window.ipcRenderer.send("sendMessageToParent", {
            message: message,
          });
        }}
      >
        sendMessageToParent
      </button>
```

```ts:main.ts
    ipcMain.on("sendMessageToParent", (event, arg) => {
      console.log({ arg });
      this.parentWindow?.webContents.send("childMessage", {
        message: arg.message,
      });
    });
```
子ウィンドウから`window.ipcRenderer.send`を使用して、イベントを発火する。
mainプロセス側の`ipcMain.on`イベントハンドラで受信。
`this.parentWindow?.webContents.send`で親ウィンドウにデータを送信する。

```tsx:Parent.tsx
  useEffect(() => {
    ~割愛~
    window.ipcRenderer.on("childMessage", (arg: any) => {
      setChildMessage(arg.message);
    });
  }, []);
```
`window.ipcRenderer.on`イベントハンドラでデータを受信する。

## 参考記事
https://garafu.blogspot.com/2020/07/interprocess-communication-electron.html

## おわりに
Electron歴、1ヶ月の記事でした。
良い参考記事あれば、教えてください！