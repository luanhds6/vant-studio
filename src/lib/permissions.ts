export type PermissionKey =
  | "pagina_inicial"
  | "gerar_catalogo"
  | "novo_produto"
  | "produtos"
  | "configuracoes"
  | "usuarios";

export const ALL_PERMISSIONS: PermissionKey[] = [
  "pagina_inicial",
  "gerar_catalogo",
  "novo_produto",
  "produtos",
  "configuracoes",
  "usuarios",
];

export const DEFAULT_USER_PERMISSIONS: PermissionKey[] = ["gerar_catalogo"];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  pagina_inicial: "Página Inicial",
  gerar_catalogo: "Gerar Catálogo",
  novo_produto: "Novo Produto",
  produtos: "Produtos",
  configuracoes: "Configurações",
  usuarios: "Usuários",
};

/** Texto auxiliar no cadastro de usuários (o que cada permissão libera no sistema). */
export const PERMISSION_HELP: Record<PermissionKey, string> = {
  pagina_inicial:
    "Acessa a página inicial; cadastra e exclui hospitais (unidades) pelos atalhos da home. O item «Hospitais» no menu só aparece com permissões de produtos ou catálogo.",
  gerar_catalogo:
    "Acesso explícito à página inicial (com «Gerar catálogo») e à pré-visualização; o PDF do catálogo também fica disponível para quem tem Página inicial, Produtos ou Novo produto.",
  novo_produto: "Cria novos produtos dentro de um hospital (página Hospitais → abrir hospital).",
  produtos: "Edita e exclui produtos no hospital (página Hospitais → abrir hospital).",
  configuracoes: "Acessa configurações da empresa e dados gerais (onde aplicável).",
  usuarios: "Gerencia usuários e permissões de acesso.",
};

/** Valores possíveis na coluna profiles.role (evita bloquear admin por variação de texto na BD). */
const ADMIN_ROLE_ALIASES = new Set([
  "admin",
  "administrador",
  "administrator",
  "master",
  "administrador master",
]);

/**
 * Normaliza o papel vindo do Postgres / formulários para o modelo da app.
 */
export function normalizeRole(raw: string | null | undefined): "admin" | "user" {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (ADMIN_ROLE_ALIASES.has(v)) return "admin";
  return "user";
}

export const normalizePermissions = (
  role: "admin" | "user" | string | undefined,
  permissions?: PermissionKey[]
): PermissionKey[] => {
  if (normalizeRole(role) === "admin") return ALL_PERMISSIONS;
  if (!permissions || permissions.length === 0) return DEFAULT_USER_PERMISSIONS;
  return Array.from(new Set(permissions));
};

/** Administrador = acesso a todas as áreas e ações, independentemente do array permissions na BD. */
export const hasUserPermission = (
  role: "admin" | "user" | string | undefined,
  permissions: PermissionKey[] | undefined,
  permission: PermissionKey
): boolean => {
  if (normalizeRole(role) === "admin") return true;
  return (permissions || []).includes(permission);
};
