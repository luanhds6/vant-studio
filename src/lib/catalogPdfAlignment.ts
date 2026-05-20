/** Ajustes de captura PDF (html2canvas) — só move texto; não altera padding dos cards. */

export const CATALOG_PDF_LABEL_NUDGE_PX = -7;
export const CATALOG_PDF_DOT_NUDGE_PX = -2;
/**
 * Títulos TECIDO / CORES / faixas laranja e cinza (Detalhes técnicos).
 * Meio-termo: preview ok; -7px subia demais; 0px ficava baixo no PDF.
 * Nome do produto (.catalog-product-title) não recebe nudge.
 */
export const CATALOG_PDF_SECTION_TITLE_LABEL_NUDGE_PX = -3;
export const CATALOG_PDF_PANEL_TITLE_LABEL_NUDGE_PX = -3;

function nudgeUp(el: HTMLElement, px: number) {
  const cur = el.style.transform?.trim();
  el.style.transform =
    cur && cur !== "none" ? `${cur} translateY(${px}px)` : `translateY(${px}px)`;
}

function nudgeLabelUp(el: HTMLElement, px: number) {
  nudgeUp(el, px);
  el.style.lineHeight = "1";
  el.style.display = "inline-block";
  if (px < 0) el.style.marginTop = `${px / 2}px`;
}

/** Aplica o mesmo alinhamento em todos os nós dentro de `root` (página clonada). */
export function applyCatalogPdfAlignment(root: ParentNode) {
  root.querySelectorAll(".catalog-color-dot").forEach((el) => {
    if (el instanceof HTMLElement) nudgeUp(el, CATALOG_PDF_DOT_NUDGE_PX);
  });
  root.querySelectorAll(".catalog-color-label").forEach((el) => {
    if (el instanceof HTMLElement) nudgeLabelUp(el, CATALOG_PDF_LABEL_NUDGE_PX);
  });
  root.querySelectorAll(".catalog-detail-row").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const fs = parseFloat(el.style.fontSize || "10");
    el.style.paddingTop = fs <= 9 ? "1mm" : "1.5mm";
  });
  root.querySelectorAll(".catalog-detail-marker").forEach((el) => {
    if (el instanceof HTMLElement) nudgeUp(el, CATALOG_PDF_DOT_NUDGE_PX);
  });
  root.querySelectorAll(".catalog-detail-label").forEach((el) => {
    if (el instanceof HTMLElement) nudgeLabelUp(el, CATALOG_PDF_LABEL_NUDGE_PX);
  });

  root.querySelectorAll(".catalog-section-title .catalog-header-label").forEach((el) => {
    if (el instanceof HTMLElement) nudgeLabelUp(el, CATALOG_PDF_SECTION_TITLE_LABEL_NUDGE_PX);
  });
  root.querySelectorAll(".catalog-panel-title .catalog-header-label").forEach((el) => {
    if (el instanceof HTMLElement) nudgeLabelUp(el, CATALOG_PDF_PANEL_TITLE_LABEL_NUDGE_PX);
  });
}
