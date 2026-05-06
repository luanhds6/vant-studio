import { useState } from "react";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Factory, Scissors, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const generateId = () => crypto.randomUUID();

const FabricColorsPage = () => {
  const navigate = useNavigate();
  const { industries, fabricTypes, colors, addIndustry, deleteIndustry, addFabricType, deleteFabricType, addColor, deleteColor } = useProductStore();
  
  // Navigation State
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [selectedFabricTypeId, setSelectedFabricTypeId] = useState<string | null>(null);

  // Form State
  const [newIndustryName, setNewIndustryName] = useState("");
  const [newFabricName, setNewFabricName] = useState("");
  const [newColor, setNewColor] = useState({ nome: "", hex: "#000000", codigo: "" });
  
  // Dialog Open States
  const [industryDialogOpen, setIndustryDialogOpen] = useState(false);
  const [fabricDialogOpen, setFabricDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);

  // Delete Confirmation States
  const [industryToDelete, setIndustryToDelete] = useState<string | null>(null);
  const [fabricToDelete, setFabricToDelete] = useState<string | null>(null);
  const [colorToDelete, setColorToDelete] = useState<string | null>(null);

  const handleAddIndustry = async () => {
    if (!newIndustryName.trim()) return toast({ title: "Informe o nome da indústria", variant: "destructive" });
    try {
      await addIndustry({ id: generateId(), nome: newIndustryName.trim() });
      setNewIndustryName("");
      setIndustryDialogOpen(false);
      toast({ title: "Indústria cadastrada" });
    } catch (e) {
      toast({ title: "Erro ao cadastrar", variant: "destructive" });
    }
  };

  const handleAddFabricType = async () => {
    if (!newFabricName.trim() || !selectedIndustryId) return toast({ title: "Informe o nome do tecido", variant: "destructive" });
    try {
      await addFabricType({ id: generateId(), industryId: selectedIndustryId, nome: newFabricName.trim() });
      setNewFabricName("");
      setFabricDialogOpen(false);
      toast({ title: "Tecido cadastrado" });
    } catch (e) {
      toast({ title: "Erro ao cadastrar", variant: "destructive" });
    }
  };

  const handleAddColor = async () => {
    if (!newColor.nome.trim() || !newColor.codigo.trim() || !selectedFabricTypeId) {
      return toast({ title: "Preencha o nome e o código exclusivo", variant: "destructive" });
    }
    try {
      await addColor({
        id: generateId(),
        fabricTypeId: selectedFabricTypeId,
        nome: newColor.nome.trim(),
        codigo: newColor.codigo.trim(),
        hex: newColor.hex,
      });
      setNewColor({ nome: "", hex: "#000000", codigo: "" });
      setColorDialogOpen(false);
      toast({ title: "Cor cadastrada" });
    } catch (e) {
      toast({ title: "Erro ao cadastrar", variant: "destructive" });
    }
  };

  const selectedIndustry = industries.find(i => i.id === selectedIndustryId);
  const selectedFabricType = fabricTypes.find(f => f.id === selectedFabricTypeId);

  const handleDeleteIndustryClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasFabrics = fabricTypes.some(f => f.industryId === id);
    if (hasFabrics) {
      toast({ 
        title: "Ação bloqueada", 
        description: "Esta indústria possui tipos de tecido cadastrados. Para excluí-la, você precisa primeiro apagar todos os tecidos vinculados a ela.", 
        variant: "destructive" 
      });
      return;
    }
    setIndustryToDelete(id);
  };

  const confirmDeleteIndustry = async () => {
    if (industryToDelete) {
      try {
        await deleteIndustry(industryToDelete);
        toast({ title: "Indústria excluída" });
      } catch (e) {
        toast({ title: "Erro ao excluir indústria", variant: "destructive" });
      } finally {
        setIndustryToDelete(null);
      }
    }
  };

  const handleDeleteFabricClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasColors = colors.some(c => c.fabricTypeId === id);
    if (hasColors) {
      toast({ 
        title: "Ação bloqueada", 
        description: "Este tecido possui cores cadastradas. Para excluí-lo, você precisa primeiro apagar todas as cores vinculadas a ele.", 
        variant: "destructive" 
      });
      return;
    }
    setFabricToDelete(id);
  };

  const confirmDeleteFabric = async () => {
    if (fabricToDelete) {
      try {
        await deleteFabricType(fabricToDelete);
        toast({ title: "Tecido excluído" });
      } catch (e) {
        toast({ title: "Erro ao excluir tecido", variant: "destructive" });
      } finally {
        setFabricToDelete(null);
      }
    }
  };

  const handleDeleteColorClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setColorToDelete(id);
  };

  const confirmDeleteColor = async () => {
    if (colorToDelete) {
      try {
        await deleteColor(colorToDelete);
        toast({ title: "Cor excluída" });
      } catch (e) {
        toast({ title: "Erro ao excluir cor", variant: "destructive" });
      } finally {
        setColorToDelete(null);
      }
    }
  };

  const renderIndustries = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Indústrias</h2>
        <Dialog open={industryDialogOpen} onOpenChange={setIndustryDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Indústria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Indústria</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Indústria</Label>
                <Input value={newIndustryName} onChange={(e) => setNewIndustryName(e.target.value)} placeholder="Ex: Santanense" />
              </div>
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
          industries.map(industry => (
            <Card 
              key={industry.id} 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all rounded-2xl group overflow-hidden"
              onClick={() => setSelectedIndustryId(industry.id)}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                    <Factory className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{industry.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {fabricTypes.filter(f => f.industryId === industry.id).length} tecidos
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
          ))
        )}
      </div>
    </div>
  );

  const renderFabricTypes = () => {
    const fabrics = fabricTypes.filter(f => f.industryId === selectedIndustryId);
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedIndustryId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Tipos de Tecido</h2>
            <p className="text-sm text-muted-foreground">Indústria: <span className="font-medium text-foreground">{selectedIndustry?.nome}</span></p>
          </div>
          <Dialog open={fabricDialogOpen} onOpenChange={setFabricDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo Tecido</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Tecido</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Tecido</Label>
                  <Input value={newFabricName} onChange={(e) => setNewFabricName(e.target.value)} placeholder="Ex: Oxford" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddFabricType}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {fabrics.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
              <Scissors className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p>Nenhum tecido cadastrado para esta indústria.</p>
            </div>
          ) : (
            fabrics.map(fabric => (
              <Card 
                key={fabric.id} 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all rounded-2xl group overflow-hidden"
                onClick={() => setSelectedFabricTypeId(fabric.id)}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:scale-110 transition-transform">
                      <Scissors className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{fabric.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {colors.filter(c => c.fabricTypeId === fabric.id).length} cores
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                    onClick={(e) => handleDeleteFabricClick(fabric.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderColors = () => {
    const fabricColors = colors.filter(c => c.fabricTypeId === selectedFabricTypeId);
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedFabricTypeId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Cores e Códigos</h2>
            <p className="text-sm text-muted-foreground">Tecido: <span className="font-medium text-foreground">{selectedFabricType?.nome}</span></p>
          </div>
          <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Cor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Cor</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Código Exclusivo</Label>
                  <Input value={newColor.codigo} onChange={(e) => setNewColor({...newColor, codigo: e.target.value})} placeholder="Ex: OX-001" />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Cor</Label>
                  <Input value={newColor.nome} onChange={(e) => setNewColor({...newColor, nome: e.target.value})} placeholder="Ex: Azul Marinho" />
                </div>
                <div className="space-y-2">
                  <Label>Tom Hexadecimal</Label>
                  <div className="flex gap-3">
                    <Input type="color" value={newColor.hex} onChange={(e) => setNewColor({...newColor, hex: e.target.value})} className="h-10 w-20 p-1 cursor-pointer" />
                    <Input value={newColor.hex} onChange={(e) => setNewColor({...newColor, hex: e.target.value})} className="font-mono uppercase" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddColor}>Cadastrar Cor</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {fabricColors.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-2xl border-dashed">
              <Palette className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p>Nenhuma cor cadastrada para este tecido.</p>
            </div>
          ) : (
            fabricColors.map(color => (
              <Card key={color.id} className="rounded-2xl group overflow-hidden border-2 transition-all hover:border-primary/30">
                <div className="h-24 w-full transition-transform group-hover:scale-105" style={{ backgroundColor: color.hex }} />
                <CardContent className="p-4 relative bg-card">
                  <div className="absolute -top-6 right-4 bg-background px-3 py-1 rounded-full border shadow-sm font-mono text-xs font-bold shadow-sm">
                    {color.codigo || "S/ COD"}
                  </div>
                  <div className="flex justify-between items-start mt-2">
                    <div>
                      <h3 className="font-semibold">{color.nome}</h3>
                      <p className="text-xs text-muted-foreground font-mono uppercase">{color.hex}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteColorClick(color.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tecido/Cores</h1>
          <p className="text-muted-foreground">Gerencie suas indústrias, tecidos e cores de forma hierárquica.</p>
        </div>
      </div>

      <div className="min-h-[400px]">
        {!selectedIndustryId && renderIndustries()}
        {selectedIndustryId && !selectedFabricTypeId && renderFabricTypes()}
        {selectedFabricTypeId && renderColors()}
      </div>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!industryToDelete} onOpenChange={(open) => !open && setIndustryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Indústria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta indústria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteIndustry} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!fabricToDelete} onOpenChange={(open) => !open && setFabricToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tecido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tecido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFabric} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!colorToDelete} onOpenChange={(open) => !open && setColorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta cor do sistema?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteColor} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FabricColorsPage;
