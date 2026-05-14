import { createRoot } from "react-dom/client";
import { installGlobalConsoleErrorReporting } from "@/lib/globalConsoleErrorReporting";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import App from "./App.tsx";
import "./index.css";

installGlobalConsoleErrorReporting();

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
