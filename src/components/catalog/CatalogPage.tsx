import type { CSSProperties, ReactNode } from "react";
import { Product, CompanySettings, type ProductColor } from "@/types/Product";

export type CatalogOrientation = "portrait" | "landscape";

/** Texto do título — no PDF só este nó sobe (card/fundo mantém tamanho). */
function CatalogHeaderLabel({ children }: { children: ReactNode }) {
  return <span className="catalog-header-label">{children}</span>;
}

interface CatalogPageProps {
  product: Product;
  settings: CompanySettings;
  orientation?: CatalogOrientation;
}

function normalizeHexForSwatch(hex: string | undefined): string {
  const t = (hex ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/i.test(t)) return t;
  if (/^#[0-9a-fA-F]{3}$/i.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#888888";
}

/** Amostra da cor (`hex`) + nome — layout da pré-visualização; nudge no PDF via onclone. */
function CatalogColorSwatchRow({ c, compact }: { c: ProductColor; compact: boolean }) {
  const fill = normalizeHexForSwatch(c.hex);
  const sw = compact ? "2.8mm" : "3.2mm";
  const fontSize = compact ? "8px" : "9px";
  const gap = compact ? "1mm" : "1.5mm";
  return (
    <div className="catalog-color-swatch-row" style={{ display: "flex", alignItems: "center", gap }}>
      <div
        aria-hidden
        className="catalog-color-dot"
        style={{
          width: sw,
          height: sw,
          borderRadius: "50%",
          backgroundColor: fill,
          border: "1px solid rgba(0,0,0,0.22)",
          flexShrink: 0,
          boxSizing: "border-box",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      />
      <span
        className="catalog-color-label"
        style={{ fontSize, fontWeight: 600, color: "#111111", lineHeight: 1.25 }}
      >
        {c.nome}
      </span>
    </div>
  );
}

function CatalogDetailMarker({ index, sizeMm }: { index: number; sizeMm: string }) {
  return (
    <div
      className="catalog-detail-marker"
      style={{
        width: sizeMm,
        height: sizeMm,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 20 20" className="catalog-detail-marker-svg">
        <circle cx="10" cy="10" r="10" fill="#f97316" />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          {index}
        </text>
      </svg>
    </div>
  );
}

export const CatalogPage = ({
  product,
  settings,
  orientation = "portrait",
}: CatalogPageProps) => {
  const isLandscape = orientation === "landscape";

  const shellStyle: CSSProperties = {
    width: isLandscape ? "297mm" : "210mm",
    minHeight: isLandscape ? "210mm" : "297mm",
    /* Mais espaço em baixo para o rodapé absoluto e galeria «Detalhes do Produto» não ficarem sobrepostos. */
    padding: isLandscape ? "6mm 6mm 12mm 6mm" : "8mm 8mm 18mm 8mm",
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
    fontSize: isLandscape ? "10px" : "11px",
    lineHeight: 1.35,
    color: "#111111",
    position: "relative",
    pageBreakAfter: "always",
    boxSizing: "border-box",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  };

  return (
    <div className="catalog-page bg-white text-black" style={shellStyle}>
      {isLandscape ? (
        <CatalogLandscapeBody product={product} settings={settings} />
      ) : (
        <>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6mm" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" style={{ height: "14mm", maxWidth: "40mm", objectFit: "contain" }} />
              ) : (
                <div style={{
                  width: "14mm", height: "14mm", borderRadius: "3mm",
                  background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: "16px", fontFamily: "Space Grotesk, sans-serif",
                }}>
                  VS
                </div>
              )}
            </div>
            <div style={{ fontSize: "9px", color: "#454545", fontWeight: 500, textAlign: "right", lineHeight: 1.4 }}>
              {product.referencia && <div>Ref: {product.referencia}</div>}
              {product.categoria && <div>{product.categoria}</div>}
            </div>
          </div>

          {/* Product Name Banner */}
          <div style={{
            background: "#f97316",
            color: "white",
            padding: "3mm 5mm",
            borderRadius: "2mm",
            marginBottom: "5mm",
            fontFamily: "Space Grotesk, sans-serif",
            fontWeight: 700,
            fontSize: "17px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            {product.nome}
          </div>

          {/* Main Content */}
          <div style={{ display: "flex", gap: "5mm" }}>
            <div style={{ flex: "1.2", minWidth: 0 }}>
              {product.imagemPrincipal ? (
                <div style={{
                  border: "1px solid #b8b8b8", borderRadius: "2mm", padding: "3mm",
                  background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: "80mm",
                }}>
                  <img
                    src={product.imagemPrincipal}
                    alt={product.nome}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100mm",
                      width: "auto",
                      height: "auto",
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  border: "1px dashed #b0b0b0", borderRadius: "2mm", padding: "10mm",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: "80mm", color: "#555555", fontSize: "12px", fontWeight: 500,
                }}>
                  Desenho técnico
                </div>
              )}

              {product.dimensoes.some((dim) => dim.largura || dim.altura || dim.titulo) && (
                <div style={{ marginTop: "3mm", display: "flex", flexDirection: "column", gap: "2.5mm" }}>
                  {product.dimensoes.map((dim) => {
                    if (!dim.largura && !dim.altura && !dim.titulo) return null;
                    return (
                      <div key={dim.id}>
                        {dim.titulo ? (
                          <div
                            className="catalog-dim-title"
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              color: "#111111",
                              marginBottom: "1mm",
                              textTransform: "uppercase",
                              letterSpacing: "0.35px",
                            }}
                          >
                            <CatalogHeaderLabel>{dim.titulo}</CatalogHeaderLabel>
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: "4mm", fontSize: "10px", color: "#111111", fontWeight: 500, flexWrap: "wrap" }}>
                          {dim.largura ? (
                            <div className="catalog-dim-chip" style={{ padding: "2mm 3mm", background: "#eeeeee", borderRadius: "1mm", border: "1px solid #cfcfcf" }}>
                              <CatalogHeaderLabel>
                                <strong>Largura:</strong> {dim.largura} {dim.unidade || "cm"}
                              </CatalogHeaderLabel>
                            </div>
                          ) : null}
                          {dim.altura ? (
                            <div className="catalog-dim-chip" style={{ padding: "2mm 3mm", background: "#eeeeee", borderRadius: "1mm", border: "1px solid #cfcfcf" }}>
                              <CatalogHeaderLabel>
                                <strong>Altura:</strong> {dim.altura} {dim.unidade || "cm"}
                              </CatalogHeaderLabel>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {product.detalhes.length > 0 && (
                <div style={{ marginTop: "4mm" }}>
                  <div
                    className="catalog-panel-title"
                    style={{
                      background: "#2a2a2a", color: "white", padding: "1.75mm 3mm",
                      borderRadius: "1mm 1mm 0 0", fontSize: "9px", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      minHeight: "6.5mm", display: "flex", alignItems: "center",
                    }}
                  >
                    <CatalogHeaderLabel>Detalhes Técnicos</CatalogHeaderLabel>
                  </div>
                  <div style={{ border: "1px solid #c0c0c0", borderTop: "none", borderRadius: "0 0 1mm 1mm" }}>
                    {product.detalhes.map((d, i) => (
                      <div key={d.id} className="catalog-detail-row" style={{
                        padding: "2.25mm 3mm", fontSize: "10px", color: "#111111", lineHeight: 1.4,
                        borderBottom: i < product.detalhes.length - 1 ? "1px solid #e2e2e2" : "none",
                        display: "flex", alignItems: "center", gap: "2.5mm",
                      }}>
                        {d.imagem ? (
                          <img
                            src={d.imagem}
                            alt=""
                            className="catalog-detail-marker"
                            style={{
                              width: "4.5mm",
                              height: "4.5mm",
                              flexShrink: 0,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1px solid #cfcfcf",
                              background: "#f7f7f7",
                            }}
                          />
                        ) : (
                          <CatalogDetailMarker index={i + 1} sizeMm="4.5mm" />
                        )}
                        <span className="catalog-detail-label" style={{ flex: 1, minWidth: 0 }}>{d.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: "0.8", display: "flex", flexDirection: "column", gap: "4mm" }}>
              {product.tecido && (
                <InfoSection title="TECIDO">
                  <div style={{ padding: "2.25mm 3mm", fontSize: "11px", color: "#111111", fontWeight: 500, lineHeight: 1.4 }}>
                    {product.tecido}
                  </div>
                </InfoSection>
              )}
              {product.tamanhos.length > 0 && (
                <InfoSection title="TAMANHOS">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", padding: "2mm 3mm" }}>
                    {product.tamanhos.map((t) => (
                      <span key={t} style={{
                        padding: "1.25mm 3mm", background: "#eeeeee", borderRadius: "1mm",
                        fontSize: "10px", fontWeight: 600, color: "#111111", border: "1px solid #cfcfcf",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </InfoSection>
              )}
              {product.cores.length > 0 && (
                <InfoSection title="CORES">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", padding: "2mm 3mm", alignItems: "center" }}>
                    {product.cores.map((c) => (
                      <CatalogColorSwatchRow key={c.id} c={c} compact={false} />
                    ))}
                  </div>
                </InfoSection>
              )}
              {(product.pintura.imagem || product.pintura.cor || product.pintura.tamanho || product.pintura.localizacao) && (
                <InfoSection title="PINTURA">
                  {product.pintura.imagem && (
                    <div style={{
                      padding: "2mm 3mm",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      boxSizing: "border-box",
                      height: "38mm",
                      background: "#f7f7f7",
                      border: "1px solid #c5c5c5",
                      borderRadius: "1mm",
                    }}>
                      <img
                        src={product.pintura.imagem}
                        alt="Pintura do produto"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                          display: "block",
                          objectFit: "contain",
                          flexShrink: 0,
                          alignSelf: "center",
                        }}
                      />
                    </div>
                  )}
                  <InfoRow label="Cor" value={product.pintura.cor} />
                  <InfoRow label="Tamanho" value={product.pintura.tamanho} />
                  <InfoRow label="Localização" value={product.pintura.localizacao} />
                </InfoSection>
              )}
              {(product.marcaCliente.imagem || product.marcaCliente.cor || product.marcaCliente.tamanho || product.marcaCliente.localizacao) && (
                <InfoSection title="MARCA DO CLIENTE">
                  {product.marcaCliente.imagem && (
                    <div style={{ padding: "2mm 3mm 1mm", display: "flex", justifyContent: "center" }}>
                      <img
                        src={product.marcaCliente.imagem}
                        alt="Marca do cliente"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "22mm",
                          width: "auto",
                          height: "auto",
                          display: "block",
                          objectFit: "contain",
                          border: "1px solid #c5c5c5",
                          borderRadius: "1mm",
                          background: "#f7f7f7",
                        }}
                      />
                    </div>
                  )}
                  <InfoRow label="Cor" value={product.marcaCliente.cor} />
                  <InfoRow label="Tamanho" value={product.marcaCliente.tamanho} />
                  <InfoRow label="Localização" value={product.marcaCliente.localizacao} />
                </InfoSection>
              )}
              {(product.nomeCampo.texto ||
                product.nomeCampo.cor ||
                product.nomeCampo.tamanho ||
                product.nomeCampo.localizacao) && (
                <InfoSection title="NOME DO CAMPO">
                  {product.nomeCampo.texto && (
                    <div style={{ padding: "2.25mm 3mm", fontSize: "10px", color: "#111111", fontWeight: 500, lineHeight: 1.4 }}>
                      {product.nomeCampo.texto}
                    </div>
                  )}
                  <InfoRow label="Cor" value={product.nomeCampo.cor} />
                  <InfoRow label="Tamanho" value={product.nomeCampo.tamanho} />
                  <InfoRow label="Localização" value={product.nomeCampo.localizacao} />
                </InfoSection>
              )}
              {product.timbrado?.ativo && product.timbrado?.imagem && (
                <InfoSection title="TIMBRADO">
                  <div style={{ padding: "2mm 3mm", display: "flex", justifyContent: "center" }}>
                    <img
                      src={product.timbrado.imagem}
                      alt="Timbrado"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "22mm",
                        width: "auto",
                        height: "auto",
                        display: "block",
                        objectFit: "contain",
                        border: "1px solid #c5c5c5",
                        borderRadius: "1mm",
                        background: "#f7f7f7",
                      }}
                    />
                  </div>
                </InfoSection>
              )}
              {product.rastreavel?.ativo && product.rastreavel?.imagem && (
                <InfoSection title="RASTREÁVEL">
                  <div style={{ padding: "2mm 3mm", display: "flex", justifyContent: "center" }}>
                    <img
                      src={product.rastreavel.imagem}
                      alt="Rastreamento"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "22mm",
                        width: "auto",
                        height: "auto",
                        display: "block",
                        objectFit: "contain",
                        border: "1px solid #c5c5c5",
                        borderRadius: "1mm",
                        background: "#f7f7f7",
                      }}
                    />
                  </div>
                </InfoSection>
              )}
            </div>
          </div>

          {product.imagensDetalhe.length > 0 && (
            <div style={{ marginTop: "5mm" }}>
              <div
                className="catalog-panel-title"
                style={{
                  background: "#2a2a2a", color: "white", padding: "1.75mm 3mm",
                  borderRadius: "1mm 1mm 0 0", fontSize: "10px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.45px",
                  minHeight: "6.5mm", display: "flex", alignItems: "center",
                }}
              >
                <CatalogHeaderLabel>Detalhes do Produto</CatalogHeaderLabel>
              </div>
              <div style={{
                border: "1px solid #c0c0c0", borderTop: "none", borderRadius: "0 0 1mm 1mm",
                display: "flex",
                flexWrap: "wrap",
                gap: "2.5mm",
                padding: "2.5mm",
                alignItems: "flex-start",
              }}>
                {product.imagensDetalhe.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      flex: "1 1 0",
                      minWidth: "32mm",
                      maxWidth: "48mm",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    <img
                      src={d.imagem}
                      alt={d.titulo}
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        height: "auto",
                        maxHeight: "42mm",
                        margin: "0 auto",
                        display: "block",
                        objectFit: "contain",
                        border: "1px solid #c5c5c5",
                        borderRadius: "1mm",
                        background: "#f7f7f7",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "9px",
                        marginTop: "1.25mm",
                        color: "#1a1a1a",
                        fontWeight: 600,
                        lineHeight: 1.35,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {d.titulo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            position: "absolute", bottom: "5mm", left: "8mm", right: "8mm",
            borderTop: "1px solid #c0c0c0", paddingTop: "2mm",
            display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#444444", fontWeight: 500,
          }}>
            <span>Gerado por Vant Studio Catalogo — Catálogo Digital</span>
            <span>{product.referencia}</span>
          </div>
        </>
      )}
    </div>
  );
};

/** Blocos da coluna direita em paisagem: ordem fixa; distribuição em 2 colunas flex (ímpar/par) evita lacunas do CSS Grid por linhas. */
function getLandscapeInfoBlocks(product: Product): { id: string; node: ReactNode }[] {
  const blocks: { id: string; node: ReactNode }[] = [];

  if (product.tecido) {
    blocks.push({
      id: "tecido",
      node: (
        <InfoSection title="TECIDO" compact>
          <div style={{ padding: "1.75mm 2mm", fontSize: "10px", color: "#111111", fontWeight: 500, lineHeight: 1.4 }}>
            {product.tecido}
          </div>
        </InfoSection>
      ),
    });
  }
  if (product.tamanhos.length > 0) {
    blocks.push({
      id: "tamanhos",
      node: (
        <InfoSection title="TAMANHOS" compact>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1mm", padding: "1.5mm 2mm" }}>
            {product.tamanhos.map((t) => (
              <span key={t} style={{
                padding: "0.75mm 2mm", background: "#eeeeee", borderRadius: "1mm",
                fontSize: "9px", fontWeight: 600, color: "#111111", border: "1px solid #cfcfcf",
              }}>
                {t}
              </span>
            ))}
          </div>
        </InfoSection>
      ),
    });
  }
  if (product.cores.length > 0) {
    blocks.push({
      id: "cores",
      node: (
        <InfoSection title="CORES" compact>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5mm", padding: "1.5mm 2mm", alignItems: "center" }}>
            {product.cores.map((c) => (
              <CatalogColorSwatchRow key={c.id} c={c} compact />
            ))}
          </div>
        </InfoSection>
      ),
    });
  }
  if (product.pintura.imagem || product.pintura.cor || product.pintura.tamanho || product.pintura.localizacao) {
    blocks.push({
      id: "pintura",
      node: (
        <InfoSection title="PINTURA" compact>
          {product.pintura.imagem && (
            <div style={{
              padding: "1.5mm 2mm",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              boxSizing: "border-box",
              height: "30mm",
              background: "#f7f7f7",
              border: "1px solid #c5c5c5",
              borderRadius: "1mm",
            }}>
              <img
                src={product.pintura.imagem}
                alt="Pintura"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                  flexShrink: 0,
                  alignSelf: "center",
                }}
              />
            </div>
          )}
          <InfoRow label="Cor" value={product.pintura.cor} />
          <InfoRow label="Tamanho" value={product.pintura.tamanho} />
          <InfoRow label="Localização" value={product.pintura.localizacao} />
        </InfoSection>
      ),
    });
  }
  if (product.marcaCliente.imagem || product.marcaCliente.cor || product.marcaCliente.tamanho || product.marcaCliente.localizacao) {
    blocks.push({
      id: "marca",
      node: (
        <InfoSection title="MARCA DO CLIENTE" compact>
          {product.marcaCliente.imagem && (
            <div style={{ padding: "1mm 2mm", display: "flex", justifyContent: "center" }}>
              <img
                src={product.marcaCliente.imagem}
                alt="Marca"
                style={{
                  maxWidth: "100%",
                  maxHeight: "14mm",
                  objectFit: "contain",
                  border: "1px solid #c5c5c5",
                  borderRadius: "1mm",
                  background: "#f7f7f7",
                }}
              />
            </div>
          )}
          <InfoRow label="Cor" value={product.marcaCliente.cor} />
          <InfoRow label="Tamanho" value={product.marcaCliente.tamanho} />
          <InfoRow label="Localização" value={product.marcaCliente.localizacao} />
        </InfoSection>
      ),
    });
  }
  if (
    product.nomeCampo.texto ||
    product.nomeCampo.cor ||
    product.nomeCampo.tamanho ||
    product.nomeCampo.localizacao
  ) {
    blocks.push({
      id: "nomeCampo",
      node: (
        <InfoSection title="NOME DO CAMPO" compact>
          {product.nomeCampo.texto && (
            <div style={{ padding: "1.75mm 2mm", fontSize: "9px", color: "#111111", fontWeight: 500, lineHeight: 1.4 }}>
              {product.nomeCampo.texto}
            </div>
          )}
          <InfoRow label="Cor" value={product.nomeCampo.cor} />
          <InfoRow label="Tamanho" value={product.nomeCampo.tamanho} />
          <InfoRow label="Localização" value={product.nomeCampo.localizacao} />
        </InfoSection>
      ),
    });
  }
  if (product.timbrado?.ativo && product.timbrado?.imagem) {
    blocks.push({
      id: "timbrado",
      node: (
        <InfoSection title="TIMBRADO" compact>
          <div style={{ padding: "1mm 2mm", display: "flex", justifyContent: "center" }}>
            <img
              src={product.timbrado.imagem}
              alt="Timbrado"
              style={{ maxWidth: "100%", maxHeight: "14mm", objectFit: "contain", border: "1px solid #c5c5c5", borderRadius: "1mm", background: "#f7f7f7" }}
            />
          </div>
        </InfoSection>
      ),
    });
  }
  if (product.rastreavel?.ativo && product.rastreavel?.imagem) {
    blocks.push({
      id: "rastreavel",
      node: (
        <InfoSection title="RASTREÁVEL" compact>
          <div style={{ padding: "1mm 2mm", display: "flex", justifyContent: "center" }}>
            <img
              src={product.rastreavel.imagem}
              alt="Rastreável"
              style={{ maxWidth: "100%", maxHeight: "14mm", objectFit: "contain", border: "1px solid #c5c5c5", borderRadius: "1mm", background: "#f7f7f7" }}
            />
          </div>
        </InfoSection>
      ),
    });
  }

  return blocks;
}

const landscapeInfoCardShell: CSSProperties = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

/** A4 paisagem (297×210 mm): desenho | detalhes técnicos | blocos em duas colunas flex (sem alinhamento forçado por linha do grid). */
function CatalogLandscapeBody({
  product,
  settings,
}: {
  product: Product;
  settings: CompanySettings;
}) {
  const padX = "6mm";
  const infoBlocks = getLandscapeInfoBlocks(product);
  const infoColLeft = infoBlocks.filter((_, i) => i % 2 === 0);
  const infoColRight = infoBlocks.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4mm", gap: "4mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3mm", minWidth: 0 }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ height: "10mm", maxWidth: "32mm", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: "10mm", height: "10mm", borderRadius: "2mm",
              background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "12px", fontFamily: "Space Grotesk, sans-serif",
            }}>
              VS
            </div>
          )}
          {settings.slogan ? (
            <div style={{ fontSize: "8px", color: "#555555", maxWidth: "52mm", lineHeight: 1.4, fontWeight: 500 }}>
              {settings.slogan}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: "8px", color: "#454545", fontWeight: 500, textAlign: "right", flexShrink: 0, lineHeight: 1.4 }}>
          {settings.nomeEmpresa && <div style={{ fontWeight: 700, color: "#222222" }}>{settings.nomeEmpresa}</div>}
          {product.referencia && <div>Ref: {product.referencia}</div>}
          {product.categoria && <div>{product.categoria}</div>}
        </div>
      </div>

      <div style={{
        background: "#f97316",
        color: "white",
        padding: "2mm 4mm",
        borderRadius: "2mm",
        marginBottom: "4mm",
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 700,
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
      }}>
        {product.nome}
      </div>

      <div style={{ display: "flex", gap: "4mm", alignItems: "flex-start" }}>
        <div style={{ flex: "1.12", minWidth: 0 }}>
          {product.imagemPrincipal ? (
            <div style={{
              border: "1px solid #b8b8b8", borderRadius: "2mm", padding: "2mm",
              background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "52mm", maxHeight: "74mm",
            }}>
              <img
                src={product.imagemPrincipal}
                alt={product.nome}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70mm",
                  width: "auto",
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <div style={{
              border: "1px dashed #ccc", borderRadius: "2mm", padding: "6mm",
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "52mm", color: "#555555", fontSize: "11px", fontWeight: 500,
            }}>
              Desenho técnico
            </div>
          )}
          {product.dimensoes.some((dim) => dim.largura || dim.altura || dim.titulo) && (
            <div style={{ marginTop: "2mm", display: "flex", flexDirection: "column", gap: "2mm" }}>
              {product.dimensoes.map((dim) => {
                if (!dim.largura && !dim.altura && !dim.titulo) return null;
                return (
                  <div key={dim.id}>
                    {dim.titulo ? (
                      <div
                        className="catalog-dim-title"
                        style={{
                          fontSize: "8px",
                          fontWeight: 700,
                          color: "#111111",
                          marginBottom: "0.6mm",
                          lineHeight: 1,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                            <CatalogHeaderLabel>{dim.titulo}</CatalogHeaderLabel>
                          </div>
                        ) : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", fontSize: "9px", color: "#111111", fontWeight: 500 }}>
                      {dim.largura ? (
                        <div className="catalog-dim-chip" style={{ padding: "1.5mm 2mm", background: "#eeeeee", borderRadius: "1mm", border: "1px solid #cfcfcf" }}>
                          <CatalogHeaderLabel>
                            <strong>Largura:</strong> {dim.largura} {dim.unidade || "cm"}
                          </CatalogHeaderLabel>
                        </div>
                      ) : null}
                      {dim.altura ? (
                        <div className="catalog-dim-chip" style={{ padding: "1.5mm 2mm", background: "#eeeeee", borderRadius: "1mm", border: "1px solid #cfcfcf" }}>
                          <CatalogHeaderLabel>
                            <strong>Altura:</strong> {dim.altura} {dim.unidade || "cm"}
                          </CatalogHeaderLabel>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: "0 0 26%", minWidth: 0 }}>
          {product.detalhes.length > 0 && (
            <div>
              <div
                className="catalog-panel-title"
                style={{
                  background: "#2a2a2a", color: "white", padding: "1.5mm 2mm",
                  borderRadius: "1mm 1mm 0 0", fontSize: "8px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.4px",
                  minHeight: "5.5mm", display: "flex", alignItems: "center",
                }}
              >
                <CatalogHeaderLabel>Detalhes Técnicos</CatalogHeaderLabel>
              </div>
              <div style={{ border: "1px solid #c0c0c0", borderTop: "none", borderRadius: "0 0 1mm 1mm" }}>
                {product.detalhes.map((d, i) => (
                  <div key={d.id} className="catalog-detail-row" style={{
                    padding: "1.75mm 2mm", fontSize: "9px", color: "#111111", lineHeight: 1.4,
                    borderBottom: i < product.detalhes.length - 1 ? "1px solid #e2e2e2" : "none",
                    display: "flex", alignItems: "center", gap: "1.75mm",
                  }}>
                    {d.imagem ? (
                      <img
                        src={d.imagem}
                        alt=""
                        className="catalog-detail-marker"
                        style={{
                          width: "3.5mm",
                          height: "3.5mm",
                          flexShrink: 0,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #cfcfcf",
                          background: "#f7f7f7",
                        }}
                      />
                    ) : (
                      <CatalogDetailMarker index={i + 1} sizeMm="3.5mm" />
                    )}
                    <span className="catalog-detail-label" style={{ lineHeight: 1.4, wordBreak: "break-word", fontWeight: 500, flex: 1, minWidth: 0 }}>{d.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          flex: "1",
          minWidth: 0,
          display: "flex",
          flexDirection: "row",
          gap: "2.5mm",
          alignItems: "flex-start",
        }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2.5mm" }}>
            {infoColLeft.map((b) => (
              <div key={b.id} style={landscapeInfoCardShell}>
                {b.node}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2.5mm" }}>
            {infoColRight.map((b) => (
              <div key={b.id} style={landscapeInfoCardShell}>
                {b.node}
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.imagensDetalhe.length > 0 && (
        <div style={{ marginTop: "3mm" }}>
          <div
            className="catalog-panel-title"
            style={{
              background: "#2a2a2a", color: "white", padding: "1.75mm 2.5mm",
              borderRadius: "1mm 1mm 0 0", fontSize: "10px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.45px",
              minHeight: "6.5mm", display: "flex", alignItems: "center",
            }}
          >
            <CatalogHeaderLabel>Detalhes do Produto</CatalogHeaderLabel>
          </div>
          <div style={{
            border: "1px solid #c0c0c0", borderTop: "none", borderRadius: "0 0 1mm 1mm",
            display: "flex",
            flexWrap: "wrap",
            gap: "2.5mm",
            padding: "2.5mm",
            alignItems: "flex-start",
          }}>
            {product.imagensDetalhe.map((d) => (
              <div
                key={d.id}
                style={{
                  flex: "1 1 0",
                  minWidth: "36mm",
                  maxWidth: "58mm",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                <img
                  src={d.imagem}
                  alt={d.titulo}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    height: "auto",
                    maxHeight: "36mm",
                    margin: "0 auto",
                    display: "block",
                    objectFit: "contain",
                    border: "1px solid #c5c5c5",
                    borderRadius: "1mm",
                    background: "#f7f7f7",
                  }}
                />
                <div
                  style={{
                    fontSize: "9px",
                    marginTop: "1.1mm",
                    color: "#1a1a1a",
                    fontWeight: 600,
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {d.titulo}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        position: "absolute", bottom: "4mm", left: padX, right: padX,
        borderTop: "1px solid #c0c0c0", paddingTop: "1.5mm",
        display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#444444", fontWeight: 500,
      }}>
        <span>Gerado por Vant Studio Catalogo — Catálogo Digital</span>
        <span>{product.referencia}</span>
      </div>
    </>
  );
}

const InfoSection = ({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) => (
  <div>
    <div
      className="catalog-section-title"
      style={{
        background: "#ea580c",
        color: "white",
        padding: "0 3mm",
        borderRadius: "1mm 1mm 0 0",
        fontSize: compact ? "8px" : "9px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.45px",
        minHeight: compact ? "5.5mm" : "6.5mm",
        display: "flex",
        alignItems: "center",
      }}
    >
      <CatalogHeaderLabel>{title}</CatalogHeaderLabel>
    </div>
    <div style={{ border: "1px solid #b0b0b0", borderTop: "none", borderRadius: "0 0 1mm 1mm", background: "#fff" }}>
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      gap: "2mm",
      padding: "2mm 3mm",
      fontSize: "10px",
      lineHeight: 1.4,
      borderBottom: "1px solid #e8e8e8",
    }}>
      <span style={{ color: "#333333", fontWeight: 700, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 600, color: "#0a0a0a", textAlign: "right" }}>{value}</span>
    </div>
  );
};
