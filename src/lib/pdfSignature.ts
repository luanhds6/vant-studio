import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function stampPdfWithSignature(
  pdfUrl: string,
  signerName: string,
  signerCpf: string,
  signedAt: string,
  xPct: number, // Percentage from left
  yPct: number  // Percentage from bottom
): Promise<Uint8Array> {
  const existingPdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // FIXED BOX SIZE
  const boxWidth = 200;
  const boxHeight = 60;
  
  // Calculate position based on the center point provided as percentage
  // We want the CENTER of the box to be at the chosen percentage
  const posX = (xPct / 100) * width - (boxWidth / 2);
  const posY = (yPct / 100) * height - (boxHeight / 2);

  // Draw signature box
  lastPage.drawRectangle({
    x: Math.max(0, Math.min(width - boxWidth, posX)),
    y: Math.max(0, Math.min(height - boxHeight, posY)),
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.07, 0.32, 0.71),
    borderWidth: 1.5,
    color: rgb(0.98, 0.99, 1),
  });

  const drawX = Math.max(5, Math.min(width - boxWidth + 5, posX + 8));
  const drawY = Math.max(5, Math.min(height - boxHeight + 5, posY));

  // Draw header text
  lastPage.drawText('ASSINATURA DIGITAL', {
    x: drawX,
    y: drawY + boxHeight - 15,
    size: 10,
    font: helveticaBold,
    color: rgb(0.07, 0.32, 0.71),
  });

  const details = [
    `Nome: ${signerName}`,
    `CPF: ${signerCpf}`,
    `Data: ${new Date(signedAt).toLocaleString('pt-BR')}`,
    `Formalizado via Vant Studio Catalogo`
  ];

  details.forEach((text, i) => {
    lastPage.drawText(text, {
      x: drawX,
      y: drawY + boxHeight - 28 - (i * 8),
      size: 7,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  return await pdfDoc.save();
}
