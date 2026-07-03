import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { resolveAddresses } from "./config/address-resolver";

resolveAddresses().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

