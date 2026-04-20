import { createRoot } from "react-dom/client";
import mockData from "../mockCatalog.json";

const STORE_KEY = "flux-catalog-store";
const MOCK_HOSPITAL_ID = "00000000-0000-4000-8000-000000000001";
const emptyStoreStr = `{"state":{"hospitals":[],"products":[],"settings":{"logo":"","nomeEmpresa":"Minha Empresa","slogan":""}},"version":0}`;

if (!localStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY) === emptyStoreStr || !localStorage.getItem(STORE_KEY)?.includes("data:image")) {
  const products = (mockData as Array<Record<string, unknown>>).map((p) => ({
    ...p,
    hospitalId: (p.hospitalId as string) || MOCK_HOSPITAL_ID,
  }));
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      state: {
        hospitals: [
          {
            id: MOCK_HOSPITAL_ID,
            nome: "Hospital demonstração",
            cidade: "",
            createdAt: new Date().toISOString(),
          },
        ],
        products,
        settings: {
          logo: "",
          nomeEmpresa: "ServBrasil Importado",
          slogan: "Catálogo Modelo",
        },
      },
      version: 2,
    }),
  );
}

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
