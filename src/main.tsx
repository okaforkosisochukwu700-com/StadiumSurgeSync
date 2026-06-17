import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

pendo.initialize({
  visitor: {
    id: ''
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
