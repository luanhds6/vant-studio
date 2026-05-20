import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useContractStore } from '@/store/contractStore';
import { Contract } from '@/types/Contract';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, FileSignature, CheckCircle2, Loader2 } from 'lucide-react';
import { stampPdfWithSignature } from '@/lib/pdfSignature';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

const PDFJS_VERSION = '5.7.284';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export default function ContractSignPage() {
  const { id } = useParams<{ id: string }>();
  const { getContractById, signContract } = useContractStore();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  
  // Percentages for 100% accuracy (0-100)
  const [finalPos, setFinalPos] = useState({ x: 50, y: 30 }); 
  const stampRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const data = await getContractById(id);
      if (!data) setError('Contrato não encontrado.');
      else {
        setContract(data);
        if (data.status === 'signed') { setIsSigned(true); setIsUnlocked(true); }
      }
      setLoading(false);
    }
    load();
  }, [id, getContractById]);

  const renderLastPage = async () => {
    if (!contract || !canvasRef.current) return;
    setIsRendering(true);
    try {
      const response = await fetch(contract.file_path);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pdf.numPages);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = canvasRef.current;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    } catch (err) {
      console.error(err);
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    if (showPositionModal) setTimeout(renderLastPage, 300);
  }, [showPositionModal]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!stampRef.current || !canvasRef.current) return;
    isDragging.current = true;
    const stampRect = stampRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - stampRect.left, y: e.clientY - stampRect.top };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !stampRef.current || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - canvasRect.left - offset.current.x;
    let y = e.clientY - canvasRect.top - offset.current.y;
    x = Math.max(0, Math.min(canvasRect.width - stampRef.current.offsetWidth, x));
    y = Math.max(0, Math.min(canvasRect.height - stampRef.current.offsetHeight, y));
    stampRef.current.style.left = `${x}px`;
    stampRef.current.style.top = `${y}px`;
    stampRef.current.style.transform = 'none';
  };

  const onMouseUp = () => {
    if (!isDragging.current || !stampRef.current || !canvasRef.current) return;
    isDragging.current = false;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const stampRect = stampRef.current.getBoundingClientRect();
    // Calculate the percentage of the CENTER point of the stamp
    const centerX = stampRect.left + stampRect.width / 2;
    const centerY = stampRect.top + stampRect.height / 2;
    const xPct = ((centerX - canvasRect.left) / canvasRect.width) * 100;
    const yPct = ((centerY - canvasRect.top) / canvasRect.height) * 100;
    setFinalPos({ x: xPct, y: 100 - yPct });
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  const handleSign = async () => {
    if (!id || !contract) return;
    setIsSigning(true);
    setShowPositionModal(false);
    toast.info("Gerando documento assinado...");

    try {
      const signedPdfBytes = await stampPdfWithSignature(
        contract.file_path, name, cpf, new Date().toISOString(),
        finalPos.x, finalPos.y
      );

      const cleanCpf = cpf.replace(/\D/g, '');
      const fileName = `signed/${cleanCpf}/${Date.now()}_signed.pdf`;
      await supabase.storage.from('contracts').upload(fileName, signedPdfBytes, { contentType: 'application/pdf' });
      const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);

      await signContract(id, { signer_name: name, signer_cpf: cpf, file_path: publicUrl });
      setIsSigned(true);
      toast.success("Assinado com sucesso!");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!isUnlocked && !isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center"><Lock className="mx-auto h-10 w-10 text-primary mb-2" /><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); setIsUnlocked(true); }} className="space-y-4">
              <div className="space-y-1"><Label>CPF</Label><Input value={cpf} onChange={(e) => setCpf(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Nome Completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <Button type="submit" className="w-full h-12 font-bold text-lg">Acessar Documento</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg"><FileSignature className="text-primary" /> Assinatura Digital</div>
        {isSigned ? (
          <Badge className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full flex gap-2"><CheckCircle2 className="h-4 w-4" /> Assinado</Badge>
        ) : (
          <Button onClick={() => setShowPositionModal(true)} className="bg-primary font-bold px-8 shadow-lg">Assinar Agora</Button>
        )}
      </header>

      <main className="flex-1 p-4 flex justify-center">
        <div className="w-full max-w-5xl bg-white shadow-2xl rounded-xl overflow-hidden border" style={{ height: 'calc(100vh - 120px)' }}>
          <iframe src={contract.file_path} className="w-full h-full border-0" />
        </div>
      </main>

      <Dialog open={showPositionModal} onOpenChange={setShowPositionModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-900 border-0">
          <DialogHeader className="p-6 pb-2 text-white"><DialogTitle>Posicione a Assinatura</DialogTitle></DialogHeader>
          <div className="p-4 flex flex-col items-center gap-4">
            <div className="relative bg-white shadow-2xl overflow-y-auto border-4 border-slate-700 rounded-sm max-h-[70vh]" style={{ width: '100%', maxWidth: '600px' }}>
              {isRendering && <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center gap-2"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-slate-500">Preparando preview...</p></div>}
              <canvas ref={canvasRef} className="w-full h-auto block" />
              {!isRendering && (
                <div 
                  ref={stampRef}
                  onMouseDown={onMouseDown}
                  className="absolute bg-white/95 border-2 border-[#1351b4] shadow-2xl rounded flex flex-col cursor-grab active:cursor-grabbing z-20 overflow-hidden"
                  style={{ 
                    left: '50%', top: '30%', transform: 'translate(-50%, -50%)', 
                    width: '168px', height: '50px' // MATCHES PDF PROPORTION (200pt wide on 595pt page)
                  }}
                >
                  <div className="flex items-center gap-1 bg-[#1351b4] p-1 px-2">
                    <div className="text-[8px] font-bold text-white uppercase tracking-wider">Assinatura Digital</div>
                  </div>
                  <div className="p-1 px-2">
                    <div className="text-[9px] font-bold text-slate-900 truncate leading-tight">{name}</div>
                    <div className="text-[7px] text-slate-600">CPF: {cpf}</div>
                    <div className="text-[6px] text-slate-400 mt-1">Formalizado via Vant Studio Catalogo</div>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full flex justify-end gap-3 bg-slate-800 p-4 rounded-xl">
               <Button variant="outline" className="text-slate-300 border-slate-600" onClick={() => setShowPositionModal(false)}>Cancelar</Button>
               <Button className="bg-primary text-white font-bold px-10" onClick={handleSign}>Finalizar e Assinar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
