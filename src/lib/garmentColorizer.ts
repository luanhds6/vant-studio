/**
 * Utilitário de Processamento de Imagem no Canvas para Colorização Inteligente de Peças e Desenhos Técnicos.
 *
 * Algoritmo:
 * 1. Carrega a imagem do desenho técnico em um Canvas HTML5.
 * 2. Identifica o fundo externo conectando os pixels das 4 bordas (Top, Bottom, Left, Right)
 *    usando Busca em Largura (BFS / Flood Fill).
 * 3. As linhas de contorno pretas/escuras isolam o interior da peça do fundo externo.
 * 4. Mantém o fundo externo 100% branco/transparente (não pinta o quadrado da imagem).
 * 5. Pinta o interior da peça com a cor selecionada (hex), preservando traços, costuras e sombras.
 */

export interface ColorizerOptions {
  /** Limiar de luminância para considerar um pixel como fundo externo (padrão: 0.88) */
  backgroundLuminanceThreshold?: number;
  /** Limiar de luminância para preservar traços pretos/escuros (padrão: 0.35) */
  strokeThreshold?: number;
  /** Intensidade da coloração interna (0 a 1, padrão: 0.95) */
  colorIntensity?: number;
}

// Cache em memória para evitar reprocessamento de imagens já colorizadas
const colorizationCache = new Map<string, string>();

/**
 * Converte código Hexadecimal (#RRGGBB ou #RGB) para [r, g, b] (0 a 255)
 */
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [128, 128, 128];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Sanitiza nomes de arquivos para evitar erros de codificação/conflito no Windows/Mac/Linux.
 */
export function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Converte DataURL ou URL HTTP para Blob binário padronizado (image/png).
 */
export async function urlToBlob(imageUrl: string): Promise<Blob | null> {
  try {
    if (imageUrl.startsWith("data:")) {
      const parts = imageUrl.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }

    const response = await fetch(imageUrl);
    return await response.blob();
  } catch (err) {
    console.error("Erro ao converter URL para Blob:", err);
    return null;
  }
}

/**
 * Converte DataURL ou URL HTTP para Blob binário e realiza o download nativo seguro,
 * prevenindo arquivos corrompidos ou erros no visualizador de fotos do Windows.
 */
export async function downloadImageSafely(imageUrl: string, filename: string): Promise<boolean> {
  try {
    const blob = await urlToBlob(imageUrl);
    if (!blob) return false;

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    const safeName = sanitizeFilename(filename) || "imagem_produto";
    link.download = safeName.endsWith(".png") ? safeName : `${safeName}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 5000);

    return true;
  } catch (err) {
    console.error("Erro ao baixar imagem de forma segura:", err);
    return false;
  }
}

/**
 * Copia a imagem simulada diretamente para a área de transferência do computador (Ctrl + V).
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    const blob = await urlToBlob(imageUrl);
    if (!blob) return false;

    // A API Clipboard do navegador exige PNG
    const pngBlob = blob.type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error("Erro ao copiar imagem para clipboard:", err);
    return false;
  }
}

/**
 * Abre a imagem diretamente em uma nova aba do navegador para visualização rápida.
 */
export function openImageInNewTab(imageUrl: string): boolean {
  try {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Visualização de Peça Simulada - VANT Studio</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; }
              img { max-width: 90vw; max-height: 90vh; object-fit: contain; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Imagem Simulada" />
          </body>
        </html>
      `);
      newWindow.document.close();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Erro ao abrir imagem em nova aba:", err);
    return false;
  }
}

/**
 * Calcula a luminância relativa perceptiva de um pixel (0 a 1)
 */
export function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Coloriza uma imagem de desenho técnico com a cor especificada.
 * Executado diretamente no navegador via Canvas API.
 */
export async function colorizeGarment(
  imageSrc: string,
  targetHex: string,
  options: ColorizerOptions = {},
): Promise<string> {
  if (!imageSrc || !targetHex) return imageSrc;

  // Se a cor selecionada for branco ou muito clara (#ffffff ou #fff), retorna o original
  const [tr, tg, tb] = hexToRgb(targetHex);
  if (tr > 250 && tg > 250 && tb > 250) {
    return imageSrc;
  }

  const cacheKey = `${imageSrc}__${targetHex}__${JSON.stringify(options)}`;
  if (colorizationCache.has(cacheKey)) {
    return colorizationCache.get(cacheKey)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(imageSrc);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Desenha a imagem original
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        const bgThreshold = options.backgroundLuminanceThreshold ?? 0.88;
        const strokeThreshold = options.strokeThreshold ?? 0.38;
        const intensity = options.colorIntensity ?? 0.95;

        // Array para marcar pixels pertencentes ao fundo externo
        // 0 = não visitado, 1 = fundo externo
        const isExternalBg = new Uint8Array(totalPixels);
        const queue: number[] = [];

        const isLightPixel = (idx: number) => {
          const a = data[idx * 4 + 3];
          if (a < 30) return true; // Pixel transparente conta como fundo
          const r = data[idx * 4];
          const g = data[idx * 4 + 1];
          const b = data[idx * 4 + 2];
          return getLuminance(r, g, b) >= bgThreshold;
        };

        // 1. Inicializa a fila de Flood Fill com os pixels das 4 bordas da imagem
        // Top e Bottom
        for (let x = 0; x < width; x++) {
          const topIdx = x;
          const btmIdx = (height - 1) * width + x;
          if (isLightPixel(topIdx)) {
            isExternalBg[topIdx] = 1;
            queue.push(topIdx);
          }
          if (isLightPixel(btmIdx)) {
            isExternalBg[btmIdx] = 1;
            queue.push(btmIdx);
          }
        }
        // Left e Right
        for (let y = 0; y < height; y++) {
          const leftIdx = y * width;
          const rightIdx = y * width + (width - 1);
          if (!isExternalBg[leftIdx] && isLightPixel(leftIdx)) {
            isExternalBg[leftIdx] = 1;
            queue.push(leftIdx);
          }
          if (!isExternalBg[rightIdx] && isLightPixel(rightIdx)) {
            isExternalBg[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // 2. BFS Flood Fill para expandir todo o fundo externo até encontrar as linhas de contorno
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          // 4 vizinhos (cima, baixo, esquerda, direita)
          const neighbors = [
            cy > 0 ? (cy - 1) * width + cx : -1,
            cy < height - 1 ? (cy + 1) * width + cx : -1,
            cx > 0 ? cy * width + (cx - 1) : -1,
            cx < width - 1 ? cy * width + (cx + 1) : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && isExternalBg[n] === 0) {
              if (isLightPixel(n)) {
                isExternalBg[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        // 3. Processa e pinta exclusivamente os pixels internos da peça
        for (let i = 0; i < totalPixels; i++) {
          // Se for fundo externo, deixa inalterado
          if (isExternalBg[i] === 1) {
            continue;
          }

          const offset = i * 4;
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          const a = data[offset + 3];

          // Se for transparente, mantém
          if (a === 0) continue;

          const lum = getLuminance(r, g, b);

          // Se for traçado escuro (linha de desenho / contorno / costura), mantém escuro
          if (lum < strokeThreshold) {
            // Suave mesclagem para traços escuros não ficarem com borda áspera
            const strokeRatio = lum / strokeThreshold;
            data[offset] = Math.round(r * (1 - strokeRatio * 0.3) + tr * 0.15 * strokeRatio);
            data[offset + 1] = Math.round(g * (1 - strokeRatio * 0.3) + tg * 0.15 * strokeRatio);
            data[offset + 2] = Math.round(b * (1 - strokeRatio * 0.3) + tb * 0.15 * strokeRatio);
            continue;
          }

          // Pixel de tecido / preenchimento interno:
          // Aplica a cor alvo modulando pela luminância original para manter sombras e pregas
          const fabricLum = lum; // 0.38 a 1.0
          // Normaliza a faixa de luz para 0 a 1
          const normLum = (fabricLum - strokeThreshold) / (1 - strokeThreshold);

          // Mistura a cor alvo
          const blendedR = tr * (0.45 + 0.55 * normLum);
          const blendedG = tg * (0.45 + 0.55 * normLum);
          const blendedB = tb * (0.45 + 0.55 * normLum);

          data[offset] = Math.round(r * (1 - intensity) + blendedR * intensity);
          data[offset + 1] = Math.round(g * (1 - intensity) + blendedG * intensity);
          data[offset + 2] = Math.round(b * (1 - intensity) + blendedB * intensity);
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL("image/png");
        colorizationCache.set(cacheKey, resultUrl);
        resolve(resultUrl);
      } catch (err) {
        console.error("Erro na colorização da imagem:", err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      console.warn("Falha ao carregar imagem para colorização:", imageSrc);
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}
