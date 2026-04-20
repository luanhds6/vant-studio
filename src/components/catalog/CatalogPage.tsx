import { Product, CompanySettings } from "@/types/Product";

interface CatalogPageProps {
  product: Product;
  settings: CompanySettings;
}

export const CatalogPage = ({ product, settings }: CatalogPageProps) => {
  return (
    <div
      className="catalog-page bg-white text-black"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "8mm",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "10px",
        position: "relative",
        pageBreakAfter: "always",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ height: "14mm", maxWidth: "40mm", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: "14mm", height: "14mm", borderRadius: "3mm",
              background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "16px", fontFamily: "Space Grotesk, sans-serif"
            }}>
              F
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "Space Grotesk, sans-serif" }}>
              {settings.nomeEmpresa}
            </div>
            {settings.slogan && (
              <div style={{ fontSize: "8px", color: "#666" }}>{settings.slogan}</div>
            )}
          </div>
        </div>
        <div style={{ fontSize: "8px", color: "#999", textAlign: "right" }}>
          <div>Ref: {product.referencia}</div>
          <div>{product.categoria}</div>
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
        fontSize: "16px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {product.nome}
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", gap: "5mm" }}>
        {/* Left: Technical Drawing */}
        <div style={{ flex: "1.2", minWidth: 0 }}>
          {product.imagemPrincipal ? (
            <div style={{
              border: "1px solid #ddd", borderRadius: "2mm", padding: "3mm",
              background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "80mm",
            }}>
              <img
                src={product.imagemPrincipal}
                alt={product.nome}
                style={{ maxWidth: "100%", maxHeight: "100mm", objectFit: "contain" }}
              />
            </div>
          ) : (
            <div style={{
              border: "1px dashed #ccc", borderRadius: "2mm", padding: "10mm",
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "80mm", color: "#999", fontSize: "11px",
            }}>
              Desenho técnico
            </div>
          )}

          {/* Dimensions */}
          {(product.dimensoes.largura || product.dimensoes.altura) && (
            <div style={{ marginTop: "3mm", display: "flex", gap: "4mm", fontSize: "9px" }}>
              {product.dimensoes.largura && (
                <div style={{ padding: "2mm 3mm", background: "#f5f5f5", borderRadius: "1mm" }}>
                  <strong>Largura:</strong> {product.dimensoes.largura} {product.dimensoes.unidade}
                </div>
              )}
              {product.dimensoes.altura && (
                <div style={{ padding: "2mm 3mm", background: "#f5f5f5", borderRadius: "1mm" }}>
                  <strong>Altura:</strong> {product.dimensoes.altura} {product.dimensoes.unidade}
                </div>
              )}
            </div>
          )}

          {/* Details list */}
          {product.detalhes.length > 0 && (
            <div style={{ marginTop: "4mm" }}>
              <div style={{
                background: "#333", color: "white", padding: "1.5mm 3mm",
                borderRadius: "1mm 1mm 0 0", fontSize: "8px", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                Detalhes Técnicos
              </div>
              <div style={{ border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 1mm 1mm" }}>
                {product.detalhes.map((d, i) => (
                  <div key={d.id} style={{
                    padding: "2mm 3mm", fontSize: "9px",
                    borderBottom: i < product.detalhes.length - 1 ? "1px solid #eee" : "none",
                    display: "flex", alignItems: "center", gap: "2mm",
                  }}>
                    <span style={{
                      width: "4mm", height: "4mm", borderRadius: "50%",
                      background: "#f97316", color: "white", display: "inline-flex",
                      alignItems: "center", justifyContent: "center", fontSize: "7px", fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {d.texto}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info Sections */}
        <div style={{ flex: "0.8", display: "flex", flexDirection: "column", gap: "4mm" }}>
          {/* Tecido & Tamanhos */}
          <InfoSection title="TECIDO">
            <div style={{ padding: "2mm 3mm", fontSize: "10px" }}>{product.tecido || "—"}</div>
          </InfoSection>

          <InfoSection title="TAMANHOS">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", padding: "2mm 3mm" }}>
              {product.tamanhos.length > 0 ? product.tamanhos.map((t) => (
                <span key={t} style={{
                  padding: "1mm 3mm", background: "#f5f5f5", borderRadius: "1mm",
                  fontSize: "9px", fontWeight: 500,
                }}>
                  {t}
                </span>
              )) : <span style={{ fontSize: "9px", color: "#999" }}>—</span>}
            </div>
          </InfoSection>

          {/* Cores */}
          <InfoSection title="CORES">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2mm", padding: "2mm 3mm", alignItems: "center" }}>
              {product.cores.length > 0 ? product.cores.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "1.5mm" }}>
                  <div style={{
                    width: "4mm", height: "4mm", borderRadius: "50%",
                    background: c.hex, border: "0.5px solid #ccc",
                  }} />
                  <span style={{ fontSize: "8px" }}>{c.nome}</span>
                </div>
              )) : <span style={{ fontSize: "9px", color: "#999" }}>—</span>}
            </div>
          </InfoSection>

          {/* Pintura */}
          <InfoSection title="PINTURA">
            {product.pintura.imagem && (
              <div style={{ padding: "2mm 3mm 1mm" }}>
                <img
                  src={product.pintura.imagem}
                  alt="Pintura do produto"
                  style={{
                    width: "100%",
                    maxHeight: "22mm",
                    objectFit: "contain",
                    border: "1px solid #eee",
                    borderRadius: "1mm",
                    background: "#fafafa",
                  }}
                />
              </div>
            )}
            <InfoRow label="Cor" value={product.pintura.cor} />
            <InfoRow label="Tamanho" value={product.pintura.tamanho} />
            <InfoRow label="Localização" value={product.pintura.localizacao} />
          </InfoSection>

          {/* Marca do Cliente */}
          <InfoSection title="MARCA DO CLIENTE">
            {product.marcaCliente.imagem && (
              <div style={{ padding: "2mm 3mm 1mm" }}>
                <img
                  src={product.marcaCliente.imagem}
                  alt="Marca do cliente"
                  style={{
                    width: "100%",
                    maxHeight: "22mm",
                    objectFit: "contain",
                    border: "1px solid #eee",
                    borderRadius: "1mm",
                    background: "#fafafa",
                  }}
                />
              </div>
            )}
            <InfoRow label="Cor" value={product.marcaCliente.cor} />
            <InfoRow label="Tamanho" value={product.marcaCliente.tamanho} />
            <InfoRow label="Localização" value={product.marcaCliente.localizacao} />
          </InfoSection>

          {/* Nome do Campo */}
          <InfoSection title="NOME DO CAMPO">
            {product.nomeCampo.texto && (
              <div style={{ padding: "2mm 3mm", fontSize: "9px" }}>{product.nomeCampo.texto}</div>
            )}
            <InfoRow label="Cor" value={product.nomeCampo.cor} />
            <InfoRow label="Tamanho" value={product.nomeCampo.tamanho} />
          </InfoSection>
        </div>
      </div>

      {/* Detail Images */}
      {product.imagensDetalhe.length > 0 && (
        <div style={{ marginTop: "5mm" }}>
          <div style={{
            background: "#333", color: "white", padding: "1.5mm 3mm",
            borderRadius: "1mm 1mm 0 0", fontSize: "8px", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Detalhes do Produto
          </div>
          <div style={{
            border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 1mm 1mm",
            display: "flex", flexWrap: "wrap", gap: "3mm", padding: "3mm",
          }}>
            {product.imagensDetalhe.map((d) => (
              <div key={d.id} style={{ width: "25mm", textAlign: "center" }}>
                <img
                  src={d.imagem}
                  alt={d.titulo}
                  style={{
                    width: "25mm", height: "20mm", objectFit: "contain",
                    border: "1px solid #eee", borderRadius: "1mm", background: "#fafafa",
                  }}
                />
                <div style={{ fontSize: "7px", marginTop: "1mm", color: "#555" }}>{d.titulo}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: "5mm", left: "8mm", right: "8mm",
        borderTop: "1px solid #eee", paddingTop: "2mm",
        display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#999",
      }}>
        <span>Gerado por Flux — Catálogo Digital</span>
        <span>{product.referencia}</span>
      </div>
    </div>
  );
};

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div style={{
      background: "#f97316", color: "white", padding: "1.5mm 3mm",
      borderRadius: "1mm 1mm 0 0", fontSize: "8px", fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {title}
    </div>
    <div style={{ border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 1mm 1mm" }}>
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  if (!value) return null;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "1.5mm 3mm",
      fontSize: "9px", borderBottom: "1px solid #f5f5f5",
    }}>
      <span style={{ color: "#666" }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
};
