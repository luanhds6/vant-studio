import { useProductStore } from "@/store/productStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, BookOpen, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const Dashboard = () => {
  const { products, deleteProduct } = useProductStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/catalogo")} disabled={products.length === 0}>
            <BookOpen className="mr-2 h-4 w-4" />
            Gerar Catálogo
          </Button>
          <Button onClick={() => navigate("/produto/novo")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhum produto cadastrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Comece adicionando seu primeiro produto ao catálogo.
            </p>
            <Button onClick={() => navigate("/produto/novo")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{product.nome}</CardTitle>
                    <CardDescription className="mt-1">
                      {product.referencia && `Ref: ${product.referencia} · `}
                      {product.categoria}
                    </CardDescription>
                  </div>
                  {product.imagemPrincipal && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0 ml-3">
                      <img
                        src={product.imagemPrincipal}
                        alt={product.nome}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.tamanhos.slice(0, 4).map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {t}
                    </span>
                  ))}
                  {product.tamanhos.length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      +{product.tamanhos.length - 4}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-4">
                  {product.cores.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: c.hex }}
                      title={c.nome}
                    />
                  ))}
                  {product.cores.length > 6 && (
                    <span className="text-xs text-muted-foreground ml-1">+{product.cores.length - 6}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/produto/${product.id}`)}>
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
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
                          Tem certeza que deseja excluir "{product.nome}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProduct(product.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
