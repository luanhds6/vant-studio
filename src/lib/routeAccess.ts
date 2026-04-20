import type { PermissionKey } from "@/lib/permissions";

export type CanAccessFn = (permission: PermissionKey) => boolean;

/**
 * Rota "/" e item «Página inicial» no menu.
 * Apenas quem tem permissão explícita de página inicial ou de gerar catálogo (área da home).
 */
export function canAccessRouteHome(can: CanAccessFn): boolean {
  return can("pagina_inicial") || can("gerar_catalogo");
}

/** Página /hospitais e hub /hospital/:id (inclui quem só cadastra unidades pela rota, vindo da home). */
export function canAccessModuloHospitais(can: CanAccessFn): boolean {
  return (
    can("pagina_inicial") ||
    can("produtos") ||
    can("gerar_catalogo") ||
    can("novo_produto")
  );
}

/** Baixar/gerar o PDF do catálogo do hospital: qualquer permissão do módulo hospitais (não só «Gerar catálogo»). */
export function canDownloadCatalogPdf(can: CanAccessFn): boolean {
  return canAccessModuloHospitais(can);
}

/** Permissões que liberam o item «Hospitais» no menu (não inclui só «Página inicial» — cadastro de unidades fica na home). */
export const MENU_HOSPITAIS_PERMISSIONS: PermissionKey[] = ["produtos", "gerar_catalogo", "novo_produto"];

export function canShowHospitaisMenu(can: CanAccessFn): boolean {
  return MENU_HOSPITAIS_PERMISSIONS.some((k) => can(k));
}

/** Incluir ou excluir hospital (formulário e exclusão na lista). */
export function canCadastrarHospitais(can: CanAccessFn): boolean {
  return can("pagina_inicial");
}

/**
 * Na home, mostrar atalho para /hospitais (cadastro ou gestão de produtos).
 * Quem só gera catálogo na home não precisa desse link.
 */
export function canShowHospitaisExtrasFromHome(can: CanAccessFn): boolean {
  return canCadastrarHospitais(can) || can("produtos") || can("novo_produto");
}

/** Primeira tela útil após login ou em fallback de rota. */
export function getDefaultLandingPath(can: CanAccessFn): string {
  if (can("pagina_inicial") || can("gerar_catalogo")) return "/";
  if (can("produtos") || can("novo_produto")) return "/hospitais";
  if (can("configuracoes")) return "/config";
  if (can("usuarios")) return "/config";
  return "/login";
}
