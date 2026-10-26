import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Camera barcode / QR scanner. Loads the scanner library only after the button is pressed (browser-only). */
export function ScanButton({ onCode, label = "Scan", className }: { onCode: (code: string) => void; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" className={className ?? "h-12"} onClick={() => setOpen(true)}><Camera /> {label}</Button>
      {open && <ScannerModal onClose={() => setOpen(false)} onCode={(c) => { setOpen(false); onCode(c); }} />}
    </>
  );
}

function ScannerModal({ onClose, onCode }: { onClose: () => void; onCode: (c: string) => void }) {
  const id = useRef(`scan-${Math.random().toString(36).slice(2)}`).current;
  const [err, setErr] = useState("");
  useEffect(() => {
    let stop: (() => Promise<void>) | null = null;
    let done = false;
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
        const s = new Html5Qrcode(id, { formatsToSupport: [F.CODE_128, F.QR_CODE, F.CODE_39, F.EAN_13], verbose: false, useBarCodeDetectorIfSupported: true });
        await s.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 280, height: 160 } }, (text) => {
          if (done) return; done = true;
          navigator.vibrate?.(80);
          s.stop().catch(() => {}).finally(() => onCode(text.trim().toUpperCase()));
        }, () => {});
        stop = () => s.stop().catch(() => {});
      } catch { setErr("Camera unavailable. Allow camera access or type the code."); }
    })();
    return () => { if (!done) stop?.(); };
  }, [id, onCode]);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/70 p-4" role="dialog" aria-label="Scan barcode">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card">
        <div className="flex items-center justify-between p-4"><p className="font-bold">Point camera at the barcode</p><button aria-label="Close scanner" onClick={onClose}><X /></button></div>
        <div id={id} className="aspect-[4/3] w-full bg-muted" />
        {err && <p className="p-4 text-sm text-destructive">{err}</p>}
      </div>
    </div>
  );
}
