import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import { SetupNeeded } from "./pages/SetupNeeded";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

const root = ReactDOM.createRoot(document.getElementById("root")!);

if (!convexUrl) {
  // Convex todavía no está conectado (falta correr `npx convex dev`).
  root.render(
    <React.StrictMode>
      <SetupNeeded />
    </React.StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <React.StrictMode>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    </React.StrictMode>,
  );
}
