import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Child = () => {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    console.log("useEffect");
    window.ipcRenderer.on("send-data", (arg: any) => {
      setMessage(arg.message);
    });
  }, []);
  return (
    <div>
      <div>message : {message}</div>
      <button
        onClick={async () => {
          window.ipcRenderer.send("sendMessageToParent", {
            message: message,
          });
        }}
      >
        sendMessageToParent
      </button>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Child />
  </React.StrictMode>,
  document.getElementById("root")
);
