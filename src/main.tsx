import { createRoot } from "react-dom/client";
import mockData from "../mockCatalog.json";

const STORE_KEY = "flux-catalog-store";
const emptyStoreStr = '{"state":{"products":[],"settings":{"logo":"","nomeEmpresa":"Minha Empresa","slogan":""}},"version":0}';

if (!localStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY) === emptyStoreStr || !localStorage.getItem(STORE_KEY)?.includes("data:image")) {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    state: {
      products: mockData,
      settings: {
        logo: "",
        nomeEmpresa: "ServBrasil Importado",
        slogan: "Catálogo Modelo"
      }
    },
    version: 0
  }));
}

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
