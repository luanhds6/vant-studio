/** Versão do app = campo `version` do `package.json`, injetada pelo Vite em `__APP_VERSION__`. */
export function getAppVersionLabel(): string {
  return typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__.length > 0 ? __APP_VERSION__ : "0.0.0";
}
