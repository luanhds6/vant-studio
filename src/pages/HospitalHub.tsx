import { useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Edit, Package, PlusCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/authStore";
import { canDownloadCatalogPdf, getDefaultLandingPath } from "@/lib/routeAccess";
import { toast } from "sonner";

const HospitalHub = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const allProducts = useProductStore((s) => s.products);
  const deleteProduct = useProductStore((s) => s.deleteProduct);

  const hospital = useMemo(
    () => (hospitalId ? hospitals.find((h) => h.id === hospitalId) : undefined),
    [hospitalId, hospitals],
  );
  const products = useMemo(
    () => (hospitalId ? allProducts.filter((p) => p.hospitalId === hospitalId) : []),
    [hospitalId, allProducts],
  );

  if (!hospitalId || !hospital) {
    const to = getDefaultLandingPath(canAccess);
    return <Navigate to={to} replace />;
  }

  const canProducts = canAccess("produtos");
  const canNew = canAccess("novo_produto");
  const canCatalog = canDownloadCatalogPdf(canAccess);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/hospitais")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Hospitais
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{hospital.nome}</h1>
          {hospital.cidade ? <p className="text-muted-foreground mt-1">{hospital.cidade}</p> : null}
          <p className="text-muted-foreground mt-1 text-sm">
            {products.length} produto{products.length !== 1 ? "s" : ""} neste hospital
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCatalog ? (
            <Button variant="outline" onClick={() => navigate(`/hospital/${hospitalId}/catalogo`)} disabled={products.length === 0}>
              <BookOpen className="mr-2 h-4 w-4" />
              Gerar catálogo
            </Button>
          ) : null}
          {canNew ? (
            <Button onClick={() => navigate(`/hospital/${hospitalId}/produto/novo`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo produto
            </Button>
          ) : null}
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">Nenhum produto neste hospital</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {canNew
                ? "Adicione o primeiro produto para este hospital."
                : "Nenhum produto cadastrado neste hospital."}
            </p>
            {canNew ? (
              <Button onClick={() => navigate(`/hospital/${hospitalId}/produto/novo`)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo produto
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="group transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg">{product.nome}</CardTitle>
                    <CardDescription className="mt-1">
                      {product.referencia && `Ref: ${product.referencia} · `}
                      {product.categoria}
                    </CardDescription>
                  </div>
                  {product.imagemPrincipal ? (
                    <div className="ml-2 h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <img src={product.imagemPrincipal} alt="" className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-1">
                  {product.tamanhos.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {t}
                    </span>
                  ))}
                  {product.tamanhos.length > 4 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      +{product.tamanhos.length - 4}
                    </span>
                  ) : null}
                </div>
                <div className="mb-4 flex items-center gap-1">
                  {product.cores.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="h-5 w-5 rounded-full border"
                      style={{ backgroundColor: c.hex }}
                      title={c.nome}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {canProducts ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/hospital/${hospitalId}/produto/${product.id}`)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                  ) : null}
                  {canProducts ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir «{product.nome}»?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteProduct(product.id);
                              toast.success("Produto excluído com sucesso!");
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalHub;
