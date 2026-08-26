import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Palette,
  Search,
  CheckSquare,
  Square,
  Factory,
  Layers,
} from "lucide-react";
import { BaseColor, FabricIndustry, FabricType } from "@/types/Product";
import { useProductStore } from "@/store/productStore";
import { toast } from "sonner";
import {
  FabricMarkerShape,
  FABRIC_SHAPE_OPTIONS,
  FABRIC_MARKER_SHAPES_STORAGE_KEY,
  FABRIC_MARKER_COLORS_STORAGE_KEY,
} from "@/lib/shapes";

interface ImportColorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetIndustry?: FabricIndustry;
}

interface RawColorImportItem {
  id?: string;
  codigo?: string;
  nome: string;
  hex: string;
  fabricTypeName?: string;
  fabricTypeId?: string;
  industryName?: string;
}

interface ParsedColorImportData {
  items: RawColorImportItem[];
  fabrics: { nome: string; markerColor?: string; markerShape?: FabricMarkerShape }[];
  sourceIndustryName?: string;
  totalCount: number;
}

export const ImportColorsDialog: React.FC<ImportColorsDialogProps> = ({
  open,
  onOpenChange,
  targetIndustry,
}) => {
  const {
    industries,
    fabricTypes,
    colors,
    addIndustry,
    addFabricType,
    addColors,
    fetchData,
  } = useProductStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedColorImportData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setSelectedIndices(new Set());
    setSearchTerm("");
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (isImporting) return;
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const parseJsonContent = (jsonString: string) => {
    try {
      const raw = JSON.parse(jsonString);
      let items: RawColorImportItem[] = [];
      let fabrics: { nome: string; markerColor?: string; markerShape?: FabricMarkerShape }[] = [];
      let sourceIndustryName: string | undefined = undefined;

      if (Array.isArray(raw)) {
        // Raw array of colors
        items = raw.map((c: any) => ({
          codigo: c.codigo || c.code || "",
          nome: String(c.nome || c.name || "Sem nome").trim(),
          hex: String(c.hex || "#000000").trim(),
          fabricTypeName: c.fabricTypeName || c.tecido || c.fabric || "",
          fabricTypeId: c.fabricTypeId,
        }));
      } else if (raw && typeof raw === "object") {
        if (raw.type === "all_fabric_colors" && Array.isArray(raw.industries)) {
          // Full catalog export
          raw.industries.forEach((ind: any) => {
            const indName = ind.nome || ind.name || "Indústria";
            const indFabrics: any[] = Array.isArray(ind.fabricTypes) ? ind.fabricTypes : [];
            indFabrics.forEach((f: any) => {
              if (f.nome) {
                fabrics.push({
                  nome: f.nome,
                  markerColor: f.markerColor,
                  markerShape: f.markerShape,
                });
              }
            });

            if (Array.isArray(ind.colors)) {
              ind.colors.forEach((c: any) => {
                items.push({
                  codigo: c.codigo || c.code || "",
                  nome: String(c.nome || c.name || "Sem nome").trim(),
                  hex: String(c.hex || "#000000").trim(),
                  fabricTypeName: c.fabricTypeName || c.tecido || c.fabric || "",
                  fabricTypeId: c.fabricTypeId,
                  industryName: indName,
                });
              });
            }
          });
        } else if (Array.isArray(raw.colors)) {
          // Single industry export
          sourceIndustryName = raw.industry?.nome || raw.industryName;
          if (Array.isArray(raw.fabricTypes)) {
            raw.fabricTypes.forEach((f: any) => {
              if (f.nome) {
                fabrics.push({
                  nome: f.nome,
                  markerColor: f.markerColor,
                  markerShape: f.markerShape,
                });
              }
            });
          }

          raw.colors.forEach((c: any) => {
            items.push({
              codigo: c.codigo || c.code || "",
              nome: String(c.nome || c.name || "Sem nome").trim(),
              hex: String(c.hex || "#000000").trim(),
              fabricTypeName: c.fabricTypeName || c.tecido || c.fabric || "",
              fabricTypeId: c.fabricTypeId,
              industryName: sourceIndustryName,
            });
          });
        } else if (raw.nome || raw.hex) {
          // Single color
          items = [
            {
              codigo: raw.codigo || "",
              nome: String(raw.nome || "Sem nome").trim(),
              hex: String(raw.hex || "#000000").trim(),
              fabricTypeName: raw.fabricTypeName || raw.tecido || "",
            },
          ];
        } else {
          throw new Error("O formato do arquivo JSON de cores não foi reconhecido.");
        }
      }

      if (items.length === 0) {
        throw new Error("Nenhuma cor encontrada no arquivo selecionado.");
      }

      // Collect any implicit fabrics from items
      items.forEach((item) => {
        if (item.fabricTypeName && !fabrics.some((f) => f.nome.toLowerCase() === item.fabricTypeName?.toLowerCase())) {
          fabrics.push({ nome: item.fabricTypeName });
        }
      });

      setParsedData({
        items,
        fabrics,
        sourceIndustryName,
        totalCount: items.length,
      });

      // Default: select all
      const allSelected = new Set<number>();
      for (let i = 0; i < items.length; i++) {
        allSelected.add(i);
      }
      setSelectedIndices(allSelected);
      setError(null);
    } catch (err: any) {
      console.error("Erro ao analisar arquivo de cores:", err);
      setError(err.message || "Erro ao ler o arquivo JSON. Certifique-se de que é um arquivo válido.");
      setParsedData(null);
      setSelectedIndices(new Set());
    }
  };

  const handleFileProcess = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".json")) {
      setError("Por favor, selecione um arquivo JSON (.json).");
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseJsonContent(content);
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo. Tente novamente.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredIndices: number[]) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      const allFilteredSelected = filteredIndices.every((idx) => next.has(idx));
      if (allFilteredSelected) {
        filteredIndices.forEach((idx) => next.delete(idx));
      } else {
        filteredIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    if (!parsedData) return [];
    const term = searchTerm.toLowerCase().trim();
    return parsedData.items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (!term) return true;
        return (
          item.nome.toLowerCase().includes(term) ||
          (item.codigo || "").toLowerCase().includes(term) ||
          (item.fabricTypeName || "").toLowerCase().includes(term) ||
          item.hex.toLowerCase().includes(term)
        );
      });
  }, [parsedData, searchTerm]);

  const filteredIndices = useMemo(
    () => filteredItems.map((item) => item.originalIndex),
    [filteredItems],
  );

  const isAllFilteredSelected =
    filteredIndices.length > 0 &&
    filteredIndices.every((idx) => selectedIndices.has(idx));

  const handleExecuteImport = async () => {
    if (!parsedData || selectedIndices.size === 0) return;

    setIsImporting(true);
    try {
      // 1. Determine or create target industries and fabrics
      const existingIndustries = useProductStore.getState().industries;
      const existingFabrics = useProductStore.getState().fabricTypes;

      // Storage overrides map
      let markerColorMap: Record<string, string> = {};
      let markerShapeMap: Record<string, FabricMarkerShape> = {};
      try {
        const storedC = localStorage.getItem(FABRIC_MARKER_COLORS_STORAGE_KEY);
        if (storedC) markerColorMap = JSON.parse(storedC);
        const storedS = localStorage.getItem(FABRIC_MARKER_SHAPES_STORAGE_KEY);
        if (storedS) markerShapeMap = JSON.parse(storedS);
      } catch {}

      // Map of fabric name -> FabricType.id
      const fabricNameToId = new Map<string, string>();

      // Prepopulate existing fabrics for the target industry
      const activeIndustryId = targetIndustry?.id;
      existingFabrics.forEach((f) => {
        if (!activeIndustryId || f.industryId === activeIndustryId) {
          fabricNameToId.set(f.nome.trim().toLowerCase(), f.id);
        }
      });

      // Prepare target industry
      let finalTargetIndustryId = activeIndustryId;
      if (!finalTargetIndustryId) {
        // If importing globally or file specifies an industry
        const indName = parsedData.sourceIndustryName || "Indústria Importada";
        const found = existingIndustries.find(
          (i) => i.nome.trim().toLowerCase() === indName.trim().toLowerCase(),
        );
        if (found) {
          finalTargetIndustryId = found.id;
        } else {
          const newIndId = crypto.randomUUID();
          await addIndustry({ id: newIndId, nome: indName });
          finalTargetIndustryId = newIndId;
        }
      }

      // Auto-create missing fabric types
      for (const fab of parsedData.fabrics) {
        const cleanName = fab.nome.trim();
        const key = cleanName.toLowerCase();
        if (!fabricNameToId.has(key)) {
          const newFabId = crypto.randomUUID();
          await addFabricType({
            id: newFabId,
            industryId: finalTargetIndustryId,
            nome: cleanName,
          });
          fabricNameToId.set(key, newFabId);

          if (fab.markerColor) {
            markerColorMap[newFabId] = fab.markerColor;
          }
          if (fab.markerShape) {
            markerShapeMap[newFabId] = fab.markerShape;
          }
        }
      }

      // Save markers in localStorage
      try {
        localStorage.setItem(FABRIC_MARKER_COLORS_STORAGE_KEY, JSON.stringify(markerColorMap));
        localStorage.setItem(FABRIC_MARKER_SHAPES_STORAGE_KEY, JSON.stringify(markerShapeMap));
      } catch {}

      // 2. Prepare color rows
      const colorsToInsert: Omit<BaseColor, "createdAt">[] = [];
      const selectedItems = Array.from(selectedIndices).map((idx) => parsedData.items[idx]);

      for (const item of selectedItems) {
        let fabricTypeId = item.fabricTypeId;
        if (item.fabricTypeName) {
          const foundId = fabricNameToId.get(item.fabricTypeName.trim().toLowerCase());
          if (foundId) {
            fabricTypeId = foundId;
          }
        }

        // If still no fabricTypeId and target industry has at least 1 fabric, use the first one
        if (!fabricTypeId) {
          const industryFabrics = useProductStore
            .getState()
            .fabricTypes.filter((f) => f.industryId === finalTargetIndustryId);
          if (industryFabrics.length > 0) {
            fabricTypeId = industryFabrics[0].id;
          }
        }

        let hex = item.hex.trim();
        if (!hex.startsWith("#")) hex = `#${hex}`;

        colorsToInsert.push({
          id: crypto.randomUUID(),
          codigo: item.codigo?.trim() || "",
          nome: item.nome.trim(),
          hex,
          fabricTypeId,
        });
      }

      // 3. Batch insert colors in chunks
      const CHUNK_SIZE = 50;
      setImportProgress({ current: 0, total: colorsToInsert.length });
      for (let i = 0; i < colorsToInsert.length; i += CHUNK_SIZE) {
        const chunk = colorsToInsert.slice(i, i + CHUNK_SIZE);
        await addColors(chunk);
        setImportProgress({
          current: Math.min(i + chunk.length, colorsToInsert.length),
          total: colorsToInsert.length,
        });
      }

      await fetchData();

      toast.success(
        `${colorsToInsert.length} cor(es) importada(s) com sucesso!`,
      );
      handleClose(false);
    } catch (err: any) {
      console.error("Erro ao importar cores:", err);
      toast.error(err.message || "Erro ao gravar as cores no banco de dados.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importar Cores</DialogTitle>
              <DialogDescription className="text-sm">
                {targetIndustry ? (
                  <>
                    Destino: <strong className="text-foreground">{targetIndustry.nome}</strong>
                  </>
                ) : (
                  "Importar paleta de cores para o catálogo"
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!parsedData ? (
          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                <FileJson className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Arraste e solte o arquivo JSON de cores aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar um arquivo exportado (.json)
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                Suporta exportações de cores do Vant Studio ou listas JSON
              </Badge>
            </div>

            {error ? (
              <div className="flex items-start gap-2 p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 space-y-3 pt-2">
            {/* Header info & search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 min-w-0">
                <Palette className="h-5 w-5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-semibold truncate">
                    {file?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.totalCount} cor(es) encontrada(s)
                    {parsedData.fabrics.length > 0 ? ` · ${parsedData.fabrics.length} tecido(s)` : ""}
                    {parsedData.sourceIndustryName ? ` · Origem: ${parsedData.sourceIndustryName}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={resetState}
                disabled={isImporting}
              >
                Trocar arquivo
              </Button>
            </div>

            {/* Filter and selection bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código, tecido, hex..."
                  className="pl-8 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => handleSelectAllFiltered(filteredIndices)}
                disabled={filteredIndices.length === 0 || isImporting}
              >
                {isAllFilteredSelected ? (
                  <>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    Desmarcar visíveis
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                    Selecionar visíveis
                  </>
                )}
              </Button>
            </div>

            {/* Colors list */}
            <div className="border rounded-lg flex-1 min-h-0 overflow-hidden flex flex-col bg-card">
              <div className="p-2 border-b bg-muted/30 flex items-center justify-between text-xs font-medium text-muted-foreground px-3">
                <span>Cores a importar</span>
                <span>
                  {selectedIndices.size} de {parsedData.totalCount} selecionadas
                </span>
              </div>

              <ScrollArea className="flex-1 max-h-[380px]">
                <div className="p-2 space-y-1 divide-y divide-border/40">
                  {filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Nenhuma cor corresponde aos critérios de busca.
                    </div>
                  ) : (
                    filteredItems.map(({ item, originalIndex }) => {
                      const isSelected = selectedIndices.has(originalIndex);
                      return (
                        <div
                          key={`${item.codigo}-${item.nome}-${originalIndex}`}
                          onClick={() => {
                            if (!isImporting) toggleSelectIndex(originalIndex);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer select-none ${
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "opacity-60 hover:opacity-100 hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectIndex(originalIndex)}
                            disabled={isImporting}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div
                            className="h-9 w-9 shrink-0 rounded-full border shadow-xs"
                            style={{ backgroundColor: item.hex }}
                            title={item.hex}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {item.codigo ? (
                                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 font-bold">
                                  {item.codigo}
                                </Badge>
                              ) : null}
                              <p className="text-sm font-semibold truncate">
                                {item.nome}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
                              <span className="font-mono uppercase text-[11px]">{item.hex}</span>
                              {item.fabricTypeName ? (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{item.fabricTypeName}</span>
                                </>
                              ) : null}
                              {item.industryName ? (
                                <>
                                  <span>·</span>
                                  <span className="truncate text-muted-foreground/80">{item.industryName}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {isImporting ? (
              <div className="pt-2">
                <ProgressBar
                  value={
                    importProgress.total > 0
                      ? (importProgress.current / importProgress.total) * 100
                      : 0
                  }
                  label={`Gravando cores no banco de dados... (${importProgress.current} de ${importProgress.total})`}
                />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="pt-3 border-t mt-2 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>

          {parsedData ? (
            <Button
              onClick={handleExecuteImport}
              disabled={selectedIndices.size === 0 || isImporting}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Importar {selectedIndices.size} cor{selectedIndices.size !== 1 ? "es" : ""}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
