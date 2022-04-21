import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Parent = () => {
  const [message, setMessage] = useState<string>("");
  const [timerTickMessage, setTimerTickMessage] = useState<string>("");
  const [childMessage, setChildMessage] = useState<string>("");

  useEffect(() => {
    window.ipcRenderer.on("sendAsyncOnComplete", (arg: any) => {
      console.log("sendAsyncOnComplete", arg);
      setMessage(arg.message);
    });
    window.ipcRenderer.on("timer_tick", (arg: any) => {
      setTimerTickMessage(arg.message);
    });
    window.ipcRenderer.on("childMessage", (arg: any) => {
      setChildMessage(arg.message);
    });
  }, []);

  return (
    <div>
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
      <button
        onClick={() => {
          window.ipcRenderer.send("sendAsync", {
            message: "parent sendAsync",
          });
        }}
      >
        sendAsync
      </button>
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
      <button
        onClick={async () => {
          window.ipcRenderer.send("createChild", {
            message: "parent invoke",
          });
        }}
      >
        createChild
      </button>
      <div>message:{message}</div>
      <div>timer tick message:{timerTickMessage}</div>
      <div>child message:{childMessage}</div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Parent />
  </React.StrictMode>,
  document.getElementById("root")
);
