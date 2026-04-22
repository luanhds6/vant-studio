import { Building2, Home, LogOut, QrCode, Settings, Palette, type LucideIcon } from "lucide-react";
import { APP_NAME, BRAND_LOGO_SRC } from "@/brand";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { PermissionKey } from "@/lib/permissions";
import { MENU_HOSPITAIS_PERMISSIONS } from "@/lib/routeAccess";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Se definido, exige pelo menos uma destas permissões */
  anyOf?: PermissionKey[];
  permission?: PermissionKey;
};

const menuItems: MenuItem[] = [
  {
    title: "Página inicial",
    url: "/",
    icon: Home,
    anyOf: ["pagina_inicial", "gerar_catalogo"],
  },
  {
    title: "Hospitais",
    url: "/hospitais",
    icon: Building2,
    anyOf: [...MENU_HOSPITAIS_PERMISSIONS],
  },
  {
    title: "Cadastro de produtos",
    url: "/cadastro-produtos",
    icon: QrCode,
    anyOf: ["novo_produto", "produtos"],
  },
  {
    title: "Cores",
    url: "/cores",
    icon: Palette,
    anyOf: ["configuracoes", "novo_produto"],
  },
  { title: "Configurações", url: "/config", icon: Settings, anyOf: ["configuracoes", "usuarios"] },
];

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canAccess, logout, currentUser } = useAuthStore();

  const items = menuItems.filter((item) => {
    if (item.anyOf) {
      return item.anyOf.some((k) => canAccess(k));
    }
    if (item.permission && !canAccess(item.permission)) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon" variant="floating" className="border-0">
      <SidebarContent>
        <div className={`flex items-center gap-2 border-b border-sidebar-border/60 px-4 py-4 ${collapsed ? "justify-center" : ""}`}>
          <img
            src={BRAND_LOGO_SRC}
            alt={APP_NAME}
            className={
              collapsed
                ? "h-9 w-9 shrink-0 rounded-full border border-sidebar-border bg-sidebar object-cover"
                : "h-11 w-11 shrink-0 rounded-full border border-sidebar-border bg-sidebar object-cover"
            }
          />
          {!collapsed && (
            <span
              className="truncate text-lg font-bold tracking-tight text-sidebar-foreground"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {APP_NAME}
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/" || item.url === "/hospitais" || item.url === "/cadastro-produtos"}
                      className="rounded-xl transition duration-300 ease-out hover:bg-sidebar-accent/90 hover:shadow-sm"
                      activeClassName="bg-gradient-to-r from-primary/18 via-primary/12 to-orange-400/10 font-semibold text-primary shadow-sm ring-1 ring-primary/15"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto space-y-2 p-3">
        <NavLink
          to="/perfil"
          className={`flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-sidebar-foreground transition duration-300 ease-out hover:border-sidebar-border/60 hover:bg-sidebar-accent/80 hover:shadow-sm ${
            collapsed ? "justify-center" : ""
          }`}
          activeClassName="border-primary/20 bg-sidebar-accent/90 text-primary shadow-sm"
        >
          <Avatar className={collapsed ? "h-8 w-8" : "h-9 w-9"}>
            {currentUser?.profilePhoto ? (
              <AvatarImage src={currentUser.profilePhoto} alt="" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
              {currentUser?.name ? userInitials(currentUser.name) : "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && currentUser ? (
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium leading-tight">{currentUser.name}</div>
              <div className="truncate text-xs text-muted-foreground">{currentUser.email}</div>
            </div>
          ) : null}
        </NavLink>
        <div className="border-t border-sidebar-border pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => logout()}
                className="w-full justify-start rounded-xl font-medium text-destructive transition duration-300 hover:scale-[1.01] hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sair do Sistema</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    </Sidebar>
  );
}
