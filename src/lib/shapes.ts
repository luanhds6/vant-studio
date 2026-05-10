import { useProductStore } from "@/store/productStore";

export type FabricMarkerShape = "circle" | "circle-outline" | "square" | "square-outline" | "triangle" | "triangle-down" | "diamond" | "star" | "star-4" | "hexagon";

export const FABRIC_SHAPE_OPTIONS: { value: FabricMarkerShape; label: string; symbol: string }[] = [
  { value: "circle", label: "Círculo", symbol: "●" },
  { value: "circle-outline", label: "Círculo vazado", symbol: "○" },
  { value: "square", label: "Quadrado", symbol: "■" },
  { value: "square-outline", label: "Quadrado vazado", symbol: "□" },
  { value: "triangle", label: "Triângulo", symbol: "▲" },
  { value: "triangle-down", label: "Triângulo invertido", symbol: "▼" },
  { value: "diamond", label: "Losango", symbol: "◆" },
  { value: "star", label: "Estrela", symbol: "★" },
  { value: "star-4", label: "Estrela 4 Pontas", symbol: "✦" },
  { value: "hexagon", label: "Hexágono", symbol: "⬢" },
];

export const FABRIC_MARKER_SHAPES_STORAGE_KEY = "fabric-marker-shapes-v1";
export const FABRIC_MARKER_COLORS_STORAGE_KEY = "fabric-marker-colors-v1";

const DEFAULT_FABRIC_MAPPINGS: Record<string, { shape: FabricMarkerShape, color: string }> = {
  "WORKDENIN PROF 5 oz": { shape: "star-4", color: "#2e2559" },
  "CEDROWORK BLUE": { shape: "circle", color: "#fde047" },
  "CEDROMIX 5 oz II": { shape: "circle", color: "#0ea5e9" },
  "CEDROMIX 8 oz": { shape: "star", color: "#1e1b4b" },
  "POLYFLEX PROF": { shape: "circle", color: "#22c55e" },
  "POLYCEDROBRIM SUPER II": { shape: "circle-outline", color: "#0ea5e9" },
  "POLYCEDROLEVE SUPER II": { shape: "square-outline", color: "#b91c1c" },
  "POLYCOTTON MAIS": { shape: "star", color: "#eab308" },
  "POLYCOTTON LEVE II": { shape: "triangle", color: "#dc2626" },
  "CEDROPAC II / CEDROPAC LEVE II": { shape: "hexagon", color: "#f472b6" },
  "CEDROLEVE DRILL II / CEDROBRIM DRILL II": { shape: "circle", color: "#7e22ce" },
  "CEDROLEVE SUPER II / CEDROBRIM SUPER II": { shape: "square", color: "#dc2626" },
  "VERSÁTIL WORK II": { shape: "hexagon", color: "#fcd34d" },
  "VERSÁTIL WORK LEVE": { shape: "hexagon", color: "#fcd34d" },
};

function getFabricName(fabricId: string): string | null {
  try {
    const fabrics = useProductStore.getState().fabricTypes;
    const f = fabrics.find((x: any) => x.id === fabricId);
    return f ? f.nome.trim().toUpperCase() : null;
  } catch (e) {
    return null;
  }
}

function getDefaultMapping(fabricId: string) {
  const name = getFabricName(fabricId);
  if (!name) return null;
  // Try exact match or partial match
  for (const key of Object.keys(DEFAULT_FABRIC_MAPPINGS)) {
    if (name === key.toUpperCase() || name.includes(key.toUpperCase())) {
      return DEFAULT_FABRIC_MAPPINGS[key];
    }
  }
  return null;
}

export function getFabricShapeValue(fabricId: string | undefined): FabricMarkerShape {
  if (!fabricId) return "circle";
  try {
    const raw = localStorage.getItem(FABRIC_MARKER_SHAPES_STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      if (overrides[fabricId]) {
        return overrides[fabricId] as FabricMarkerShape;
      }
    }
    // Fallback to name-based defaults
    const defaultMap = getDefaultMapping(fabricId);
    if (defaultMap) {
      return defaultMap.shape;
    }
  } catch (e) {
    console.error("Error reading fabric marker shapes", e);
  }
  return "circle";
}

export function getFabricShapeSymbol(fabricId: string | undefined): string {
  if (!fabricId) return "●";
  const shapeValue = getFabricShapeValue(fabricId);
  const option = FABRIC_SHAPE_OPTIONS.find(o => o.value === shapeValue);
  return option ? option.symbol : "●";
}

export function getFabricMarkerColor(fabricId: string | undefined): string {
  if (!fabricId) return "#000000";
  try {
    const raw = localStorage.getItem(FABRIC_MARKER_COLORS_STORAGE_KEY);
    if (raw) {
      const overrides = JSON.parse(raw);
      if (overrides[fabricId]) {
        return overrides[fabricId];
      }
    }
    // Fallback to name-based defaults
    const defaultMap = getDefaultMapping(fabricId);
    if (defaultMap) {
      return defaultMap.color;
    }
  } catch (e) {
    console.error("Error reading fabric marker colors", e);
  }
  return "#000000";
}
