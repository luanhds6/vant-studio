import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import ProductForm from "./pages/ProductForm";
import CatalogPreview from "./pages/CatalogPreview";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import UsersManagement from "./pages/UsersManagement";
import { ProtectedLayout } from "./components/layout/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produto/novo" element={<ProductForm />} />
            <Route path="/produto/:id" element={<ProductForm />} />
            <Route path="/catalogo" element={<CatalogPreview />} />
            <Route path="/config" element={<SettingsPage />} />
            <Route path="/usuarios" element={<UsersManagement />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
