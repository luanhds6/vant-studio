import { useEffect, useMemo, useState } from "react";
import { useProductStore } from "@/store/productStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Factory, Palette, Pencil, Printer, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BaseColor } from "@/types/Product";
import { 
  FabricMarkerShape, 
  FABRIC_SHAPE_OPTIONS, 
  FABRIC_MARKER_SHAPES_STORAGE_KEY, 
  getFabricMarkerColor, 
  getFabricShapeSymbol,
  getFabricShapeValue
} from "@/lib/shapes";

const generateId = () => crypto.randomUUID();
const FABRIC_MARKER_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#7c3aed"];
const FABRIC_MARKER_STORAGE_KEY = "fabric-marker-colors-v1";
const DEFAULT_FABRIC_MARKER_SHAPE: FabricMarkerShape = "circle";

/** Normaliza hex para comparação (evita duplicata “fantasma” entre #020203 e 020203). */
const normalizeHexForKey = (hex: string) => {
  let h = (hex || "").trim().toLowerCase();
  if (!h) return "";
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-f]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(h) ? h : (hex || "").trim().toLowerCase();
};

const colorFamilyKey = (color: { codigo?: string; nome: string; hex: string }) =>
  `${(color.codigo || "").trim().toLowerCase()}|${(color.nome || "").trim().toLowerCase()}|${normalizeHexForKey(color.hex || "")}`;
/** Quantidade de cores mostradas na legenda antes de pedir «Expandir». */
const LEGEND_CARD_PREVIEW_COUNT = 5;

const FabricColorsPage = () => {
  const navigate = useNavigate();
  const {
    industries,
    fabricTypes,
    colors,
    addIndustry,
    deleteIndustry,
    addFabricType,
    updateFabricType,
    deleteFabricType,
    addColors,
    applyColorEdits,
    updateColor,
    deleteColor,
    deleteColors,
  } =
    useProductStore();

  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [newIndustryName, setNewIndustryName] = useState("");
  const [newFabricName, setNewFabricName] = useState("");
  const [newFabricMarkerColor, setNewFabricMarkerColor] = useState("#2563eb");
  const [newFabricMarkerShape, setNewFabricMarkerShape] = useState<FabricMarkerShape>(DEFAULT_FABRIC_MARKER_SHAPE);
  const [newColorFabricTypeIds, setNewColorFabricTypeIds] = useState<string[]>([]);
  const [newColor, setNewColor] = useState({ nome: "", hex: "#000000", codigo: "" });
  const [colorSearch, setColorSearch] = useState("");
  const [fabricSearch, setFabricSearch] = useState("");
  const [selectedColorKeys, setSelectedColorKeys] = useState<string[]>([]);
  const [selectedLegendFabricIds, setSelectedLegendFabricIds] = useState<string[]>([]);
  const [expandedFabricLegendIds, setExpandedFabricLegendIds] = useState<string[]>([]);

  const [industryDialogOpen, setIndustryDialogOpen] = useState(false);
  const [fabricDialogOpen, setFabricDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [colorDialogError, setColorDialogError] = useState<string | null>(null);
  const [isSavingNewColor, setIsSavingNewColor] = useState(false);
  const [editColorDialogOpen, setEditColorDialogOpen] = useState(false);
  const [isSavingEditColor, setIsSavingEditColor] = useState(false);
  const [editColorDialogError, setEditColorDialogError] = useState<string | null>(null);
  const [editFabricDialogOpen, setEditFabricDialogOpen] = useState(false);

  const [industryToDelete, setIndustryToDelete] = useState<string | null>(null);
  const [fabricToDelete, setFabricToDelete] = useState<string | null>(null);
  const [colorToDeleteKey, setColorToDeleteKey] = useState<string | null>(null);
  const [bulkDeleteColorsOpen, setBulkDeleteColorsOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteTotal, setBulkDeleteTotal] = useState(0);
  const [bulkDeleteDone, setBulkDeleteDone] = useState(0);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editColorFabricTypeIds, setEditColorFabricTypeIds] = useState<string[]>([]);
  const [editingColorLinkedIds, setEditingColorLinkedIds] = useState<string[]>([]);
  const [editColor, setEditColor] = useState({ nome: "", hex: "#000000", codigo: "" });
  const [editingFabricId, setEditingFabricId] = useState<string | null>(null);
  const [editFabricName, setEditFabricName] = useState("");
  const [editFabricMarkerColor, setEditFabricMarkerColor] = useState("#2563eb");
  const [editFabricMarkerShape, setEditFabricMarkerShape] = useState<FabricMarkerShape>(DEFAULT_FABRIC_MARKER_SHAPE);
  const [isSavingFabric, setIsSavingFabric] = useState(false);
  const [isDedupingLegends, setIsDedupingLegends] = useState(false);
  const [fabricMarkerOverrides, setFabricMarkerOverrides] = useState<Record<string, string>>({});
  const [fabricMarkerShapeOverrides, setFabricMarkerShapeOverrides] = useState<Record<string, FabricMarkerShape>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FABRIC_MARKER_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setFabricMarkerOverrides(parsed);
      }
    } catch {
      // Ignora falha de leitura do localStorage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FABRIC_MARKER_STORAGE_KEY, JSON.stringify(fabricMarkerOverrides));
    } catch {
      // Ignora falha de escrita do localStorage
    }
  }, [fabricMarkerOverrides]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FABRIC_MARKER_SHAPES_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, FabricMarkerShape>;
      if (parsed && typeof parsed === "object") {
        setFabricMarkerShapeOverrides(parsed);
      }
    } catch {
      // Ignora falha de leitura do localStorage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FABRIC_MARKER_SHAPES_STORAGE_KEY, JSON.stringify(fabricMarkerShapeOverrides));
    } catch {
      // Ignora falha de escrita do localStorage
    }
  }, [fabricMarkerShapeOverrides]);

  useEffect(() => {
    setExpandedFabricLegendIds([]);
  }, [selectedIndustryId]);

  const selectedIndustry = useMemo(
    () => industries.find((industry) => industry.id === selectedIndustryId),
    [industries, selectedIndustryId],
  );
  const selectedIndustryFabrics = useMemo(
    () => fabricTypes.filter((fabric) => fabric.industryId === selectedIndustryId),
    [fabricTypes, selectedIndustryId],
  );
  const selectedIndustryColors = useMemo(
    () => colors.filter((color) => selectedIndustryFabrics.some((fabric) => fabric.id === color.fabricTypeId)),
    [colors, selectedIndustryFabrics],
  );
  const fabricNameById = useMemo(
    () =>
      selectedIndustryFabrics.reduce<Record<string, string>>((acc, fabric) => {
        acc[fabric.id] = fabric.nome || "";
        return acc;
      }, {}),
    [selectedIndustryFabrics],
  );
  const filteredIndustryColors = useMemo(() => {
    const baseColors =
      selectedLegendFabricIds.length > 0
        ? selectedIndustryColors.filter((color) => color.fabricTypeId && selectedLegendFabricIds.includes(color.fabricTypeId))
        : selectedIndustryColors;
    const term = colorSearch.trim().toLowerCase();
    if (!term) return baseColors;
    return baseColors.filter((color) => {
      const codigo = (color.codigo || "").toLowerCase();
      const nome = (color.nome || "").toLowerCase();
      const tecido = (fabricNameById[color.fabricTypeId || ""] || "").toLowerCase();
      return codigo.includes(term) || nome.includes(term) || tecido.includes(term);
    });
  }, [selectedIndustryColors, colorSearch, selectedLegendFabricIds, fabricNameById]);
  const colorFamilies = useMemo(() => {
    const rowsByKey = selectedIndustryColors.reduce<Record<string, typeof selectedIndustryColors>>((acc, row) => {
      const key = colorFamilyKey(row);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    const filteredKeysInOrder: string[] = [];
    filteredIndustryColors.forEach((row) => {
      const key = colorFamilyKey(row);
      if (!filteredKeysInOrder.includes(key)) filteredKeysInOrder.push(key);
    });

    return filteredKeysInOrder.map((key) => {
      const rows = rowsByKey[key] || [];
      const representative = rows[0];
      const linkedFabricIds = Array.from(
        new Set(rows.map((row) => row.fabricTypeId).filter((id): id is string => Boolean(id))),
      );
      const primaryFabricId =
        selectedIndustryFabrics.find((fabric) => linkedFabricIds.includes(fabric.id))?.id || linkedFabricIds[0] || "";
      return {
        key,
        representative,
        rows,
        linkedFabricIds,
        primaryFabricId,
      };
    });
  }, [selectedIndustryColors, filteredIndustryColors, selectedIndustryFabrics]);
  const displayFabrics = useMemo(() => {
    const bySelected =
      selectedLegendFabricIds.length === 0
        ? selectedIndustryFabrics
        : selectedIndustryFabrics.filter((fabric) => selectedLegendFabricIds.includes(fabric.id));
    const term = fabricSearch.trim().toLowerCase();
    if (!term) return bySelected;
    return bySelected.filter((fabric) => (fabric.nome || "").toLowerCase().includes(term));
  }, [selectedIndustryFabrics, selectedLegendFabricIds, fabricSearch]);
  const visibleLegendFabrics = useMemo(() => {
    const term = fabricSearch.trim().toLowerCase();
    const base =
      term === ""
        ? selectedIndustryFabrics
        : selectedIndustryFabrics.filter((fabric) => (fabric.nome || "").toLowerCase().includes(term));

    const colorCountByFabricId = colors.reduce<Record<string, number>>((acc, row) => {
      if (!row.fabricTypeId) return acc;
      acc[row.fabricTypeId] = (acc[row.fabricTypeId] || 0) + 1;
      return acc;
    }, {});

    return [...base].sort((a, b) => {
      const ca = colorCountByFabricId[a.id] || 0;
      const cb = colorCountByFabricId[b.id] || 0;
      const hasA = ca > 0 ? 1 : 0;
      const hasB = cb > 0 ? 1 : 0;
      if (hasA !== hasB) return hasB - hasA;
      if (cb !== ca) return cb - ca;
      return (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" });
    });
  }, [selectedIndustryFabrics, fabricSearch, colors]);
  /** Cores «únicas» na indústria (mesmo código+nome+hex em vários tecidos = uma cor para catálogo/seleção). */
  const distinctIndustryColorCount = useMemo(
    () => new Set(selectedIndustryColors.map((row) => colorFamilyKey(row))).size,
    [selectedIndustryColors],
  );

  const groupedFilteredColors = useMemo(() => {
    const totalByFabricId = selectedIndustryColors.reduce<Record<string, number>>((acc, color) => {
      if (!color.fabricTypeId) return acc;
      acc[color.fabricTypeId] = (acc[color.fabricTypeId] || 0) + 1;
      return acc;
    }, {});

    const groups = displayFabrics.map((fabric) => {
      const families = colorFamilies.filter((family) => family.primaryFabricId === fabric.id);
      return {
        fabric,
        families,
        filteredCount: families.length,
        totalCount: totalByFabricId[fabric.id] || 0,
      };
    });

    return groups.sort((a, b) => {
      if (a.filteredCount > 0 && b.filteredCount === 0) return -1;
      if (a.filteredCount === 0 && b.filteredCount > 0) return 1;
      if (a.totalCount > 0 && b.totalCount === 0) return -1;
      if (a.totalCount === 0 && b.totalCount > 0) return 1;
      if (a.filteredCount !== b.filteredCount) return b.filteredCount - a.filteredCount;
      if (a.totalCount !== b.totalCount) return b.totalCount - a.totalCount;
      return 0;
    });
  }, [displayFabrics, colorFamilies, selectedIndustryColors]);

  const markerColorByFabricId = useMemo(
    () =>
      selectedIndustryFabrics.reduce<Record<string, string>>((acc, fabric, index) => {
        const stored = fabricMarkerOverrides[fabric.id];
        if (stored) {
          acc[fabric.id] = stored;
        } else {
          const defaultColor = getFabricMarkerColor(fabric.id);
          if (defaultColor !== "#000000") {
            acc[fabric.id] = defaultColor;
          } else {
            acc[fabric.id] = FABRIC_MARKER_COLORS[index % FABRIC_MARKER_COLORS.length];
          }
        }
        return acc;
      }, {}),
    [selectedIndustryFabrics, fabricMarkerOverrides],
  );
  const markerShapeByFabricId = useMemo(
    () =>
      selectedIndustryFabrics.reduce<Record<string, FabricMarkerShape>>((acc, fabric) => {
        acc[fabric.id] = fabricMarkerShapeOverrides[fabric.id] || getFabricShapeValue(fabric.id);
        return acc;
      }, {}),
    [selectedIndustryFabrics, fabricMarkerShapeOverrides],
  );

  const normalizeLegendName = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const selectedColorsForPrint = useMemo(
    () => colorFamilies.filter((family) => selectedColorKeys.includes(family.key)),
    [colorFamilies, selectedColorKeys],
  );

  const renderFabricMarker = (fabricId: string, className = "text-xs") => {
    const shape = markerShapeByFabricId[fabricId] || DEFAULT_FABRIC_MARKER_SHAPE;
    const symbol = FABRIC_SHAPE_OPTIONS.find((item) => item.value === shape)?.symbol || "●";
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ color: markerColorByFabricId[fabricId] || "#666666" }}
        aria-hidden="true"
      >
        {symbol}
      </span>
    );
  };

  useEffect(() => {
    if (!selectedIndustryId || !selectedIndustry || isDedupingLegends) return;

    const runDedup = async () => {
      const grouped = new Map<string, Array<(typeof selectedIndustryFabrics)[number]>>();
      selectedIndustryFabrics.forEach((fabric) => {
        const key = normalizeLegendName(fabric.nome);
        const list = grouped.get(key) || [];
        list.push(fabric);
        grouped.set(key, list);
      });

      const duplicateGroups = Array.from(grouped.values()).filter((group) => group.length > 1);
      if (duplicateGroups.length === 0) return;

      setIsDedupingLegends(true);
      try {
        for (const group of duplicateGroups) {
          const [keeper, ...duplicates] = group;
          for (const duplicate of duplicates) {
            const duplicateColors = colors.filter((color) => color.fabricTypeId === duplicate.id);
            const keeperColors = colors.filter((color) => color.fabricTypeId === keeper.id);

            for (const color of duplicateColors) {
              const alreadyExists = keeperColors.some(
                (k) =>
                  (k.codigo || "").trim().toLowerCase() === (color.codigo || "").trim().toLowerCase() &&
                  (k.nome || "").trim().toLowerCase() === (color.nome || "").trim().toLowerCase() &&
                  (k.hex || "").trim().toLowerCase() === (color.hex || "").trim().toLowerCase(),
              );
              if (alreadyExists) {
                await deleteColor(color.id);
              } else {
                await updateColor({
                  id: color.id,
                  fabricTypeId: keeper.id,
                  codigo: color.codigo,
                  nome: color.nome,
                  hex: color.hex,
                });
              }
            }
            await deleteFabricType(duplicate.id);
          }
        }
      } catch {
        toast({
          title: "Erro ao remover legends duplicadas",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsDedupingLegends(false);
      }
    };

    void runDedup();
  }, [selectedIndustryId, selectedIndustry, selectedIndustryFabrics, colors, isDedupingLegends]);

  const handleAddIndustry = async () => {
    if (!newIndustryName.trim()) {
      toast({ title: "Informe o nome da indústria", variant: "destructive" });
      return;
    }
    try {
      await addIndustry({ id: generateId(), nome: newIndustryName.trim() });
      setNewIndustryName("");
      setIndustryDialogOpen(false);
      toast({ title: "Indústria cadastrada" });
    } catch {
      toast({ title: "Erro ao cadastrar indústria", variant: "destructive" });
    }
  };

  const handleAddFabricType = async () => {
    if (!selectedIndustryId || !newFabricName.trim()) {
      toast({ title: "Informe o nome da legenda de tecido", variant: "destructive" });
      return;
    }
    try {
      const fabricId = generateId();
      await addFabricType({ id: fabricId, industryId: selectedIndustryId, nome: newFabricName.trim() });
      setFabricMarkerOverrides((prev) => ({ ...prev, [fabricId]: newFabricMarkerColor }));
      setFabricMarkerShapeOverrides((prev) => ({ ...prev, [fabricId]: newFabricMarkerShape }));
      setNewFabricName("");
      setNewFabricMarkerColor("#2563eb");
      setNewFabricMarkerShape(DEFAULT_FABRIC_MARKER_SHAPE);
      setFabricDialogOpen(false);
      toast({ title: "Legenda de tecido cadastrada" });
    } catch {
      toast({ title: "Erro ao cadastrar legenda de tecido", variant: "destructive" });
    }
  };

  const handleAddColor = async () => {
    setColorDialogError(null);
    if (!newColor.nome.trim() || !newColor.codigo.trim() || newColorFabricTypeIds.length === 0) {
      const msg = "Selecione ao menos um tecido de legenda, preencha o nome e o código da cor.";
      setColorDialogError(msg);
      toast({ title: "Dados incompletos", description: msg, variant: "destructive" });
      return;
    }

    const hexForSave = normalizeHexForKey(newColor.hex) || newColor.hex.trim();
    const trimmed = {
      nome: newColor.nome.trim(),
      codigo: newColor.codigo.trim(),
      hex: hexForSave,
    };
    const incomingKey = colorFamilyKey(trimmed);
    const fabricsWithDuplicate: string[] = [];
    const fabricIdsToInsert: string[] = [];

    for (const fabricTypeId of newColorFabricTypeIds) {
      const alreadySameColor = colors.some(
        (color) => color.fabricTypeId === fabricTypeId && colorFamilyKey(color) === incomingKey,
      );
      if (alreadySameColor) {
        fabricsWithDuplicate.push(fabricTypeId);
      } else {
        fabricIdsToInsert.push(fabricTypeId);
      }
    }

    if (fabricIdsToInsert.length === 0) {
      const nomes = fabricsWithDuplicate.map((id) => fabricNameById[id] || id).join(", ");
      const msg = `Já existe um cadastro igual (código "${trimmed.codigo}", nome "${trimmed.nome}" e tom ${trimmed.hex}) para ${fabricsWithDuplicate.length > 1 ? "os tecidos" : "o tecido"}: ${nomes}. Altere algum dado ou edite o registro existente.`;
      setColorDialogError(msg);
      toast({
        title: "Não foi possível cadastrar esta cor",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    setIsSavingNewColor(true);
    try {
      await addColors(
        fabricIdsToInsert.map((fabricTypeId) => ({
          id: generateId(),
          fabricTypeId,
          nome: trimmed.nome,
          codigo: trimmed.codigo,
          hex: trimmed.hex,
        })),
      );
      setNewColor({ nome: "", hex: "#000000", codigo: "" });
      setNewColorFabricTypeIds([]);
      setColorDialogOpen(false);
      setColorDialogError(null);
      if (fabricsWithDuplicate.length > 0) {
        const nomesIgnorados = fabricsWithDuplicate.map((id) => fabricNameById[id] || id).join(", ");
        toast({
          title: "Cor cadastrada",
          description: `Nos tecidos ${nomesIgnorados} essa cor já existia (mesmo código, nome e hex); apenas os demais foram atualizados.`,
        });
      } else {
        toast({ title: "Cor cadastrada" });
      }
    } catch (err: unknown) {
      const description =
        err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string"
          ? (err as { message: string }).message
          : "Verifique a conexão e as permissões do banco. Se persistir, pode haver uma regra única (ex.: código repetido no mesmo tecido).";
      setColorDialogError(description);
      toast({ title: "Erro ao cadastrar cor", description, variant: "destructive" });
    } finally {
      setIsSavingNewColor(false);
    }
  };

  const handleDeleteIndustryClick = (industryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasFabrics = fabricTypes.some((fabric) => fabric.industryId === industryId);
    if (hasFabrics) {
      toast({
        title: "Ação bloqueada",
        description: "Exclua os tipos de tecido vinculados antes de remover a indústria.",
        variant: "destructive",
      });
      return;
    }
    setIndustryToDelete(industryId);
  };

  const confirmDeleteIndustry = async () => {
    if (!industryToDelete) return;
    try {
      await deleteIndustry(industryToDelete);
      toast({ title: "Indústria excluída" });
    } catch {
      toast({ title: "Erro ao excluir indústria", variant: "destructive" });
    } finally {
      setIndustryToDelete(null);
    }
  };

  const handleDeleteFabricClick = (fabricId: string) => {
    const hasColors = colors.some((color) => color.fabricTypeId === fabricId);
    if (hasColors) {
      toast({
        title: "Ação bloqueada",
        description: "Exclua as cores vinculadas antes de remover o tecido.",
        variant: "destructive",
      });
      return;
    }
    setFabricToDelete(fabricId);
  };

  const startEditFabric = (fabricId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const f = fabricTypes.find((x) => x.id === fabricId);
    if (!f) return;
    setEditingFabricId(f.id);
    setEditFabricName(f.nome);
    setEditFabricMarkerColor(markerColorByFabricId[f.id] || "#2563eb");
    setEditFabricMarkerShape(markerShapeByFabricId[f.id] || "circle");
    setEditFabricDialogOpen(true);
  };

  const handleUpdateFabric = async () => {
    if (!editingFabricId) {
      toast({ title: "Nenhum tecido selecionado para edição", variant: "destructive" });
      return;
    }
    if (!editFabricName.trim()) {
      toast({ title: "Informe o nome do tecido", variant: "destructive" });
      return;
    }
    const currentFabric = fabricTypes.find((fabric) => fabric.id === editingFabricId);
    if (!currentFabric) {
      toast({ title: "Tecido não encontrado", variant: "destructive" });
      return;
    }
    setIsSavingFabric(true);
    try {
      if (editFabricName.trim() !== currentFabric.nome.trim()) {
        await updateFabricType({
          id: editingFabricId,
          industryId: currentFabric.industryId,
          nome: editFabricName.trim(),
        });
      }
      setFabricMarkerOverrides((prev) => ({ ...prev, [editingFabricId]: editFabricMarkerColor }));
      setFabricMarkerShapeOverrides((prev) => ({ ...prev, [editingFabricId]: editFabricMarkerShape }));
      setEditFabricDialogOpen(false);
      setEditingFabricId(null);
      setEditFabricName("");
      setEditFabricMarkerColor("#2563eb");
      setEditFabricMarkerShape(DEFAULT_FABRIC_MARKER_SHAPE);
      toast({ title: "Tecido atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar tecido", variant: "destructive" });
    } finally {
      setIsSavingFabric(false);
    }
  };

  const confirmDeleteFabric = async () => {
    if (!fabricToDelete) return;
    try {
      await deleteFabricType(fabricToDelete);
      setNewColorFabricTypeIds((prev) => prev.filter((id) => id !== fabricToDelete));
      toast({ title: "Tipo de tecido excluído" });
    } catch {
      toast({ title: "Erro ao excluir tipo de tecido", variant: "destructive" });
    } finally {
      setFabricToDelete(null);
    }
  };

  /**
   * Exclui todas as linhas da «família» no banco. Recebe `familyKey` pelo botão (data-attribute):
   * ao confirmar, o Radix pode fechar o diálogo e disparar `onOpenChange(false)` antes do estado
   * `colorToDeleteKey` ser lido — ficava `null` e a exclusão não corria (falha silenciosa).
   */
  const confirmDeleteColor = async (familyKey: string) => {
    const key = familyKey.trim();
    if (!key) return;
    if (!selectedIndustryId) {
      toast({ title: "Selecione uma indústria", variant: "destructive" });
      setColorToDeleteKey(null);
      return;
    }
    try {
      const { fabricTypes: fts, colors: allColors } = useProductStore.getState();
      const fabricIdsInIndustry = new Set(
        fts.filter((f) => f.industryId === selectedIndustryId).map((f) => f.id),
      );
      const rows = allColors.filter(
        (c) =>
          c.fabricTypeId &&
          fabricIdsInIndustry.has(c.fabricTypeId) &&
          colorFamilyKey(c) === key,
      );
      if (rows.length === 0) {
        toast({
          title: "Não foi possível excluir",
          description:
            "Não encontramos registros desta cor na indústria atual. Os filtros ou os dados podem ter mudado — atualize a página e tente de novo.",
          variant: "destructive",
        });
        return;
      }
      await deleteColors(rows.map((row) => row.id));
      setSelectedColorKeys((prev) => prev.filter((k) => k !== key));
      toast({ title: "Cor excluída" });
    } catch (err: unknown) {
      const description =
        err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string"
          ? (err as { message: string }).message
          : "Erro ao excluir cor.";
      toast({ title: "Erro ao excluir cor", description, variant: "destructive" });
    } finally {
      setColorToDeleteKey(null);
    }
  };

  const confirmDeleteSelectedColors = async () => {
    if (selectedColorKeys.length === 0) {
      setBulkDeleteColorsOpen(false);
      return;
    }
    const idsToDelete = colorFamilies
      .filter((family) => selectedColorKeys.includes(family.key))
      .flatMap((family) => family.rows.map((row) => row.id));
    setBulkDeleteColorsOpen(false);
    setBulkDeleting(true);
    setBulkDeleteTotal(idsToDelete.length);
    setBulkDeleteDone(0);

    try {
      // Atualiza a barra para feedback imediato.
      setBulkDeleteDone(Math.max(1, Math.floor(idsToDelete.length * 0.35)));
      await deleteColors(idsToDelete);
      setBulkDeleteDone(idsToDelete.length);
      setSelectedColorKeys([]);
      toast({ title: `${selectedColorKeys.length} cor(es) excluída(s)` });
    } catch {
      toast({
        title: "Não foi possível excluir as cores selecionadas",
        description: "Tente novamente. Se persistir, pode haver bloqueio de permissão no banco.",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteColorsOpen(false);
    }
  };

  const startEditColor = (colorId: string) => {
    const color = colors.find((item) => item.id === colorId);
    if (!color) return;
    const familyKey = colorFamilyKey(color);
    const linked = selectedIndustryColors.filter((item) => colorFamilyKey(item) === familyKey);
    const linkedRows = linked.length > 0 ? linked : [color];
    setEditingColorId(color.id);
    setEditingColorLinkedIds(linkedRows.map((item) => item.id));
    setEditColorFabricTypeIds(
      Array.from(new Set(linkedRows.map((item) => item.fabricTypeId).filter((id): id is string => Boolean(id)))),
    );
    const hexInitial = normalizeHexForKey(color.hex || "") || color.hex || "#000000";
    setEditColor({ nome: color.nome || "", hex: hexInitial, codigo: color.codigo || "" });
    setEditColorDialogError(null);
    setEditColorDialogOpen(true);
  };

  const handleUpdateColor = async () => {
    setEditColorDialogError(null);
    if (!editingColorId || editColorFabricTypeIds.length === 0 || !editColor.nome.trim() || !editColor.codigo.trim()) {
      toast({ title: "Selecione ao menos um tecido, nome e código", variant: "destructive" });
      return;
    }

    const fabricIdsUnique = Array.from(new Set(editColorFabricTypeIds));

    setIsSavingEditColor(true);
    try {
      const latestColors = useProductStore.getState().colors;

      const linkedRows = editingColorLinkedIds
        .map((id) => latestColors.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const byFabric = new Map<string, { id: string }>();
      linkedRows.forEach((row) => {
        if (row.fabricTypeId) byFabric.set(row.fabricTypeId, { id: row.id });
      });

      const hexNormalized = normalizeHexForKey(editColor.hex) || editColor.hex.trim();
      const candidateTrimmed = {
        nome: editColor.nome.trim(),
        codigo: editColor.codigo.trim(),
        hex: hexNormalized,
      };
      const candidateKey = colorFamilyKey(candidateTrimmed);

      const upserts: Omit<BaseColor, "createdAt">[] = [];
      const inserts: Omit<BaseColor, "createdAt">[] = [];

      for (const fabricTypeId of fabricIdsUnique) {
        const existing = byFabric.get(fabricTypeId);
        if (existing) {
          upserts.push({
            id: existing.id,
            fabricTypeId,
            nome: candidateTrimmed.nome,
            codigo: candidateTrimmed.codigo,
            hex: candidateTrimmed.hex,
          });
        } else {
          const dupOtherRow = latestColors.some(
            (c) =>
              c.fabricTypeId === fabricTypeId &&
              colorFamilyKey(c) === candidateKey &&
              !linkedRows.some((lr) => lr.id === c.id),
          );
          if (dupOtherRow) {
            const nomeTecido = fabricNameById[fabricTypeId] || fabricTypeId;
            const msg = `Em "${nomeTecido}" já existe uma cor igual (código "${candidateTrimmed.codigo}", nome "${candidateTrimmed.nome}" e tom ${candidateTrimmed.hex}).`;
            setEditColorDialogError(msg);
            toast({
              title: "Não foi possível vincular a este tecido",
              description: msg,
              variant: "destructive",
            });
            return;
          }
          inserts.push({
            id: generateId(),
            fabricTypeId,
            nome: candidateTrimmed.nome,
            codigo: candidateTrimmed.codigo,
            hex: candidateTrimmed.hex,
          });
        }
      }

      const deleteIds = linkedRows
        .filter((row) => row.fabricTypeId && !fabricIdsUnique.includes(row.fabricTypeId))
        .map((row) => row.id);

      await applyColorEdits({ upserts, inserts, deleteIds });

      setEditColorDialogOpen(false);
      setEditingColorId(null);
      setEditingColorLinkedIds([]);
      setEditColorFabricTypeIds([]);
      setEditColorDialogError(null);
      toast({ title: "Cor atualizada" });
    } catch (err: unknown) {
      const description =
        err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string"
          ? (err as { message: string }).message
          : "Erro ao atualizar cor. Tente novamente.";
      setEditColorDialogError(description);
      toast({ title: "Erro ao atualizar cor", description, variant: "destructive" });
    } finally {
      setIsSavingEditColor(false);
    }
  };

  const toggleColorSelection = (colorId: string) => {
    setSelectedColorKeys((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId],
    );
  };

  const selectAllFilteredColors = () => {
    setSelectedColorKeys((prev) => {
      const ids = new Set(prev);
      colorFamilies.forEach((family) => ids.add(family.key));
      return Array.from(ids);
    });
  };

  const clearSelection = () => {
    setSelectedColorKeys([]);
  };

  const printSelectedColorsCatalog = () => {
    if (!selectedIndustry) return;
    if (selectedColorsForPrint.length === 0) {
      toast({ title: "Selecione pelo menos uma cor para imprimir", variant: "destructive" });
      return;
    }

    const escapeHtmlPrint = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const swatchImageSrc = (hex: string) => {
      const safeHex = (hex || "#ffffff").replace(/"/g, "");
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='220'><rect width='100%' height='100%' fill='${safeHex}'/></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const linkedFabricsBlockHtml = (family: (typeof selectedColorsForPrint)[number]) => {
      const lines = family.linkedFabricIds
        .map((fabricId) => {
          const linkedFabric = selectedIndustryFabrics.find((item) => item.id === fabricId);
          if (!linkedFabric) return "";
          const mcol = markerColorByFabricId[fabricId] || "#666666";
          const mshape =
            FABRIC_SHAPE_OPTIONS.find(
              (item) => item.value === (markerShapeByFabricId[fabricId] || DEFAULT_FABRIC_MARKER_SHAPE),
            )?.symbol || "●";
          return `<p class="fabric-line"><span class="shape-marker" style="color:${mcol};">${mshape}</span><span>${escapeHtmlPrint(linkedFabric.nome || "")}</span></p>`;
        })
        .filter(Boolean);
      if (lines.length === 0) {
        return `<p class="fabric-line muted">Sem tecido vinculado</p>`;
      }
      return `<div class="fabrics">${lines.join("")}</div>`;
    };

    const printableGroups = displayFabrics
      .map((fabric) => {
        const familiesForFabric = selectedColorsForPrint.filter((family) => family.primaryFabricId === fabric.id);
        if (familiesForFabric.length === 0) return "";
        const marker = markerColorByFabricId[fabric.id] || "#666666";
        const markerSymbol = FABRIC_SHAPE_OPTIONS.find(
          (item) => item.value === (markerShapeByFabricId[fabric.id] || DEFAULT_FABRIC_MARKER_SHAPE),
        )?.symbol || "●";
        const cards = familiesForFabric
          .map(
            (family) => `
              <article class="card">
                <img class="swatch-image" src="${swatchImageSrc(family.representative.hex || "#ffffff")}" alt="Amostra ${escapeHtmlPrint(family.representative.nome || "")}" />
                <div class="meta">
                  <div class="code-primary">${escapeHtmlPrint(family.representative.codigo || "S/COD")}</div>
                  <p class="color-name">${escapeHtmlPrint(family.representative.nome || "Sem nome")}</p>
                  <p class="hex">${escapeHtmlPrint((family.representative.hex || "-").toUpperCase())}</p>
                  ${linkedFabricsBlockHtml(family)}
                </div>
              </article>
            `,
          )
          .join("");
        return `
          <section class="group">
            <h2 class="group-title"><span class="shape-marker" style="color:${marker};">${markerSymbol}</span>${fabric.nome}</h2>
            <div class="grid">${cards}</div>
          </section>
        `;
      })
      .filter(Boolean)
      .join("");

    const title = `Catálogo de Cores - ${selectedIndustry.nome}`;
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 8px 0; font-size: 24px; }
            .subtitle { margin: 0 0 10px 0; color: #4b5563; font-size: 13px; }
            .group { margin-bottom: 8px; page-break-inside: auto; break-inside: auto; }
            .group-title { margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px; font-size: 13px; text-transform: uppercase; color: #334155; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
            .card {
              border: 2px solid #64748b;
              border-radius: 10px;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
            }
            .swatch-image { display: block; width: 100%; height: 54px; object-fit: cover; border-bottom: 2px solid #e2e8f0; }
            .meta { padding: 10px 10px 8px 10px; }
            .code-primary {
              display: block;
              font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.02em;
              color: #0f172a;
              line-height: 1.15;
              margin: 0 0 5px 0;
              padding: 4px 0 2px 0;
              border-bottom: 2px solid #e2e8f0;
            }
            .color-name {
              margin: 0 0 5px 0;
              font-size: 11px;
              font-weight: 500;
              color: #475569;
              line-height: 1.3;
            }
            .hex { margin: 0 0 6px 0; font-family: monospace; font-size: 11px; color: #374151; text-transform: uppercase; }
            .fabrics { margin: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 4px; border-top: 1px solid #f3f4f6; }
            .fabric-line { margin: 0; font-size: 11px; color: #374151; display: flex; align-items: center; gap: 6px; line-height: 1.25; }
            .fabric-line.muted { color: #9ca3af; font-style: italic; border-top: none; padding-top: 0; }
            .shape-marker { display: inline-flex; width: 11px; height: 11px; align-items: center; justify-content: center; line-height: 1; font-size: 11px; flex-shrink: 0; }
            @media print {
              body { margin: 8mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .group { margin-bottom: 6px; }
              .group-title { margin-bottom: 4px; }
              .subtitle { margin-bottom: 6px; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="subtitle">Total selecionado: ${selectedColorsForPrint.length} cor(es) única(s) no catálogo (agrupa vários tecidos sob o mesmo código/nome/hex)</p>
          ${printableGroups}
        </body>
      </html>
    `;

    // Impressão via iframe oculto para evitar abrir aba/janela about:blank.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      toast({ title: "Não foi possível iniciar a impressão", variant: "destructive" });
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 150);
  };

  const renderIndustries = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Indústrias</h2>
        <Dialog open={industryDialogOpen} onOpenChange={setIndustryDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Indústria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Indústria</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label>Nome da Indústria</Label>
              <Input value={newIndustryName} onChange={(e) => setNewIndustryName(e.target.value)} placeholder="Ex: Cedro Têxtil" />
            </div>
            <DialogFooter>
              <Button onClick={handleAddIndustry}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {industries.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
            <Factory className="mx-auto h-12 w-12 mb-3 opacity-20" />
            <p>Nenhuma indústria cadastrada.</p>
          </div>
        ) : (
          industries.map((industry) => {
            const industryFabrics = fabricTypes.filter((fabric) => fabric.industryId === industry.id);
            const industryColors = colors.filter((color) => industryFabrics.some((fabric) => fabric.id === color.fabricTypeId));
            const industryDistinctColors = new Set(industryColors.map((c) => colorFamilyKey(c))).size;
            return (
              <Card
                key={industry.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all rounded-2xl group overflow-hidden"
                onClick={() => setSelectedIndustryId(industry.id)}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Factory className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{industry.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {industryFabrics.length} tecidos · {industryDistinctColors} cores no catálogo ·{" "}
                        <span title="Linhas na base: cada vínculo desta cor a um tecido conta separado">
                          {industryColors.length} vínculos
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                    onClick={(e) => handleDeleteIndustryClick(industry.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderIndustryPalette = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedIndustryId(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Cores da Indústria</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIndustry?.nome}</span> · por tipo de tecido
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={fabricDialogOpen} onOpenChange={setFabricDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova Legenda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Legenda de Tecido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da legenda / tecido</Label>
                  <Input value={newFabricName} onChange={(e) => setNewFabricName(e.target.value)} placeholder="Ex: Cedromix 8 oz II" />
                </div>
                <div className="space-y-2">
                  <Label>Cor da bolinha de referência</Label>
                  <div className="flex gap-3">
                    <Input
                      type="color"
                      value={newFabricMarkerColor}
                      onChange={(e) => setNewFabricMarkerColor(e.target.value)}
                      className="h-10 w-20 p-1 cursor-pointer"
                    />
                    <Input
                      value={newFabricMarkerColor}
                      onChange={(e) => setNewFabricMarkerColor(e.target.value)}
                      className="font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Forma geométrica da referência</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={newFabricMarkerShape}
                    onChange={(e) => setNewFabricMarkerShape(e.target.value as FabricMarkerShape)}
                  >
                    {FABRIC_SHAPE_OPTIONS.map((shape) => (
                      <option key={shape.value} value={shape.value}>
                        {shape.symbol} {shape.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Essa legenda aparecerá na lista lateral e será usada para identificar visualmente os tecidos nas cores.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleAddFabricType}>Cadastrar Legenda</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={colorDialogOpen}
            onOpenChange={(open) => {
              setColorDialogOpen(open);
              if (!open) {
                setColorDialogError(null);
                setIsSavingNewColor(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">
                <Plus className="mr-2 h-4 w-4" />
                Nova Cor
              </Button>
            </DialogTrigger>
            <DialogContent aria-busy={isSavingNewColor}>
              <DialogHeader>
                <DialogTitle>Cadastrar Cor</DialogTitle>
              </DialogHeader>
              {colorDialogError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {colorDialogError}
                </div>
              ) : null}
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipos de tecido</Label>
                  <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-2">
                    {selectedIndustryFabrics.map((fabric) => (
                      <label key={fabric.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newColorFabricTypeIds.includes(fabric.id)}
                          onChange={(e) => {
                            setColorDialogError(null);
                            setNewColorFabricTypeIds((prev) =>
                              e.target.checked ? Array.from(new Set([...prev, fabric.id])) : prev.filter((id) => id !== fabric.id),
                            );
                          }}
                        />
                        <span>{fabric.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={newColor.codigo}
                    onChange={(e) => {
                      setColorDialogError(null);
                      setNewColor({ ...newColor, codigo: e.target.value });
                    }}
                    placeholder="Ex: CED-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da cor</Label>
                  <Input
                    value={newColor.nome}
                    onChange={(e) => {
                      setColorDialogError(null);
                      setNewColor({ ...newColor, nome: e.target.value });
                    }}
                    placeholder="Ex: Azul Royal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hex</Label>
                  <div className="flex gap-3">
                    <Input
                      type="color"
                      value={newColor.hex}
                      onChange={(e) => {
                        setColorDialogError(null);
                        setNewColor({ ...newColor, hex: e.target.value });
                      }}
                      className="h-10 w-20 p-1 cursor-pointer"
                    />
                    <Input
                      value={newColor.hex}
                      onChange={(e) => {
                        setColorDialogError(null);
                        setNewColor({ ...newColor, hex: e.target.value });
                      }}
                      className="font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" disabled={isSavingNewColor} onClick={() => void handleAddColor()}>
                  {isSavingNewColor ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Salvando…
                    </>
                  ) : (
                    "Cadastrar Cor"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold">Legenda dos tecidos</h3>
              <p className="text-xs text-muted-foreground">Bolinha de referência + cores usadas em cada tecido.</p>
            </div>
            <div className="space-y-2">
              <Label>Pesquisar tecido</Label>
              <Input
                value={fabricSearch}
                onChange={(e) => setFabricSearch(e.target.value)}
                placeholder="Ex: Cedrofil, Work, Mix..."
              />
            </div>

            {visibleLegendFabrics.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
                Nenhum tecido encontrado para essa busca.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleLegendFabrics.map((fabric) => {
                  const fabricColors = colors.filter((color) => color.fabricTypeId === fabric.id);
                  return (
                    <div
                      key={fabric.id}
                      className={`rounded-xl border p-3 space-y-2 cursor-pointer transition-colors ${
                        selectedLegendFabricIds.includes(fabric.id) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() =>
                        setSelectedLegendFabricIds((prev) =>
                          prev.includes(fabric.id) ? prev.filter((id) => id !== fabric.id) : [...prev, fabric.id],
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderFabricMarker(fabric.id, "text-sm shrink-0")}
                          <span className="text-sm font-medium truncate">{fabric.nome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditFabric(fabric.id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFabricClick(fabric.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {fabricColors.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem cores cadastradas.</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground leading-snug">
                            {(expandedFabricLegendIds.includes(fabric.id)
                              ? fabricColors
                              : fabricColors.slice(0, LEGEND_CARD_PREVIEW_COUNT)
                            )
                              .map((color) => `${color.codigo || "S/COD"} - ${color.nome}`)
                              .join(" • ")}
                            {!expandedFabricLegendIds.includes(fabric.id) &&
                            fabricColors.length > LEGEND_CARD_PREVIEW_COUNT ? (
                              <span className="text-muted-foreground/85">
                                {" "}
                                · … +{fabricColors.length - LEGEND_CARD_PREVIEW_COUNT}{" "}
                                {fabricColors.length - LEGEND_CARD_PREVIEW_COUNT === 1 ? "cor" : "cores"}
                              </span>
                            ) : null}
                          </p>
                          {fabricColors.length > LEGEND_CARD_PREVIEW_COUNT ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedFabricLegendIds((prev) =>
                                  prev.includes(fabric.id)
                                    ? prev.filter((id) => id !== fabric.id)
                                    : [...prev, fabric.id],
                                );
                              }}
                            >
                              {expandedFabricLegendIds.includes(fabric.id)
                                ? "Recolher lista"
                                : `Expandir lista (${fabricColors.length} cores)`}
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-lg">Cores cadastradas</h3>
            <p className="text-sm text-muted-foreground text-right max-w-md leading-snug">
              <span className="font-medium text-foreground">{colorFamilies.length}</span> cor(es) única(s) na vista ·{" "}
              <span title="Registros cor×tecido">{filteredIndustryColors.length}</span> de {selectedIndustryColors.length}{" "}
              vínculos · indústria com{" "}
              <span className="font-medium text-foreground">{distinctIndustryColorCount}</span> cor(es) única(s) no total.
              Impressão e seleção usam cor única (não cada vínculo).
            </p>
          </div>
          {selectedLegendFabricIds.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Filtro por tecido(s):{" "}
                <strong className="text-foreground">
                  {selectedLegendFabricIds
                    .map((id) => selectedIndustryFabrics.find((fabric) => fabric.id === id)?.nome)
                    .filter(Boolean)
                    .join(", ")}
                </strong>
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setSelectedLegendFabricIds([])}>
                Limpar filtro
              </Button>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Pesquisar por código da cor</Label>
            <Input
              value={colorSearch}
              onChange={(e) => setColorSearch(e.target.value)}
              placeholder="Ex: 5412, CED-001, Azul Royal, Cedrofil..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllFilteredColors}>
              Selecionar filtradas
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteColorsOpen(true)}
              disabled={selectedColorKeys.length === 0 || bulkDeleting}
            >
              Excluir selecionadas ({selectedColorKeys.length})
            </Button>
            <Button size="sm" onClick={printSelectedColorsCatalog}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir catálogo ({selectedColorsForPrint.length})
            </Button>
          </div>
          {bulkDeleting ? (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <span>Excluindo cores selecionadas...</span>
                <span className="font-medium">{bulkDeleteDone} / {bulkDeleteTotal}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-destructive transition-all duration-200"
                  style={{ width: `${bulkDeleteTotal > 0 ? (bulkDeleteDone / bulkDeleteTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
            {filteredIndustryColors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
                <Palette className="mx-auto h-12 w-12 mb-3 opacity-20" />
                <p>Nenhuma cor encontrada para essa busca.</p>
              </div>
            ) : (
              groupedFilteredColors.map(({ fabric, families: fabricFamilies }) => (
                <div key={fabric.id} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    {renderFabricMarker(fabric.id, "text-sm")}
                    <h4 className="font-semibold">{fabric.nome}</h4>
                    <span className="text-xs text-muted-foreground">({fabricFamilies.length} cores)</span>
                  </div>

                  {fabricFamilies.length === 0 ? (
                    <div className="py-6 text-sm text-muted-foreground border rounded-xl border-dashed text-center">
                      Nenhuma cor para este tecido com o filtro atual.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {fabricFamilies.map((family) => {
                        const color = family.representative;
                        const isSelected = selectedColorKeys.includes(family.key);
                        return (
                          <Card
                            key={family.key}
                            className={`rounded-2xl overflow-hidden border-2 transition-all hover:border-primary/40 ${isSelected ? "border-primary ring-2 ring-primary/25" : "border-slate-400/80 dark:border-slate-600"}`}
                          >
                            <div className="h-24 w-full border-b-2 border-border/80" style={{ backgroundColor: color.hex }} />
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <div className="font-mono text-2xl font-extrabold tracking-wide text-foreground leading-none border-b border-border pb-2">
                                    {color.codigo || "S/COD"}
                                  </div>
                                  <p className="text-[11px] font-medium leading-snug text-muted-foreground line-clamp-2">
                                    {color.nome || "Sem nome"}
                                  </p>
                                  <p className="text-[11px] font-mono uppercase text-muted-foreground/90">{color.hex}</p>
                                  <div className="text-xs text-muted-foreground flex items-center gap-x-2 gap-y-1 mt-1 flex-wrap">
                                    {family.linkedFabricIds.map((fabricId) => {
                                      const linkedFabric = selectedIndustryFabrics.find((item) => item.id === fabricId);
                                      if (!linkedFabric) return null;
                                      return (
                                        <span key={fabricId} className="inline-flex items-center gap-1 max-w-full">
                                          {renderFabricMarker(fabricId, "text-xs")}
                                          <span className="truncate">{linkedFabric.nome}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleColorSelection(family.key)}
                                    className="h-4 w-4 mt-1 accent-primary"
                                    title="Selecionar para impressão"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => startEditColor(color.id)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setColorToDeleteKey(family.key)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="min-h-[400px]">{!selectedIndustryId ? renderIndustries() : renderIndustryPalette()}</div>

      <AlertDialog open={!!industryToDelete} onOpenChange={(open) => !open && setIndustryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Indústria</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta indústria?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteIndustry} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!fabricToDelete} onOpenChange={(open) => !open && setFabricToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tipo de Tecido</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este tipo de tecido?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFabric} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!colorToDeleteKey} onOpenChange={(open) => !open && setColorToDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cor</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta cor?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              data-delete-key={colorToDeleteKey ?? ""}
              onClick={(e) => {
                const raw = (e.currentTarget as HTMLButtonElement).dataset.deleteKey?.trim();
                if (!raw) return;
                void confirmDeleteColor(raw);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteColorsOpen} onOpenChange={setBulkDeleteColorsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cores Selecionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedColorKeys.length} cor(es) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSelectedColors}
              className="bg-destructive hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              Excluir selecionadas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editColorDialogOpen}
        onOpenChange={(open) => {
          setEditColorDialogOpen(open);
          if (!open) {
            setIsSavingEditColor(false);
            setEditColorDialogError(null);
          }
        }}
      >
        <DialogContent aria-busy={isSavingEditColor}>
          <DialogHeader>
            <DialogTitle>Editar Cor</DialogTitle>
          </DialogHeader>
          {editColorDialogError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {editColorDialogError}
            </div>
          ) : null}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de tecido</Label>
              <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-2">
                {selectedIndustryFabrics.map((fabric) => (
                  <label key={fabric.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={isSavingEditColor}
                      checked={editColorFabricTypeIds.includes(fabric.id)}
                      onChange={(e) => {
                        setEditColorDialogError(null);
                        setEditColorFabricTypeIds((prev) =>
                          e.target.checked ? Array.from(new Set([...prev, fabric.id])) : prev.filter((id) => id !== fabric.id),
                        );
                      }}
                    />
                    <span>{fabric.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                disabled={isSavingEditColor}
                value={editColor.codigo}
                onChange={(e) => {
                  setEditColorDialogError(null);
                  setEditColor({ ...editColor, codigo: e.target.value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da cor</Label>
              <Input
                disabled={isSavingEditColor}
                value={editColor.nome}
                onChange={(e) => {
                  setEditColorDialogError(null);
                  setEditColor({ ...editColor, nome: e.target.value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Hex</Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  disabled={isSavingEditColor}
                  value={editColor.hex}
                  onChange={(e) => {
                    setEditColorDialogError(null);
                    setEditColor({ ...editColor, hex: e.target.value });
                  }}
                  className="h-10 w-20 p-1 cursor-pointer"
                />
                <Input
                  disabled={isSavingEditColor}
                  value={editColor.hex}
                  onChange={(e) => {
                    setEditColorDialogError(null);
                    setEditColor({ ...editColor, hex: e.target.value });
                  }}
                  className="font-mono uppercase"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" disabled={isSavingEditColor} onClick={() => void handleUpdateColor()}>
              {isSavingEditColor ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editFabricDialogOpen} onOpenChange={setEditFabricDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tipo de Tecido</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome do tecido</Label>
            <Input value={editFabricName} onChange={(e) => setEditFabricName(e.target.value)} />
            <Label className="pt-2">Cor da bolinha de referência</Label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={editFabricMarkerColor}
                onChange={(e) => setEditFabricMarkerColor(e.target.value)}
                className="h-10 w-20 p-1 cursor-pointer"
              />
              <Input
                value={editFabricMarkerColor}
                onChange={(e) => setEditFabricMarkerColor(e.target.value)}
                className="font-mono uppercase"
              />
            </div>
            <Label className="pt-2">Forma geométrica da referência</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editFabricMarkerShape}
              onChange={(e) => setEditFabricMarkerShape(e.target.value as FabricMarkerShape)}
            >
              {FABRIC_SHAPE_OPTIONS.map((shape) => (
                <option key={shape.value} value={shape.value}>
                  {shape.symbol} {shape.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateFabric} disabled={isSavingFabric}>
              {isSavingFabric ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FabricColorsPage;
