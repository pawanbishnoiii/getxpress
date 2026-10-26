import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Loader2, Mail, MessageCircle, Phone, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

export function NeedHelp({ inline = false }: { inline?: boolean } = {}) {
  const [openState, setOpen] = useState(false);
  const open = inline || openState;
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Namaste! I am the GetXpress assistant. Ask me about booking, prices, tracking or anything else.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: ['public-company'], queryFn: async () => ((await supabase.rpc('public_company')).data ?? {}) as Record<string, string | null> });
  const email = data?.['support_email'] ?? '';
  const phone = (data?.['support_phone'] ?? '').replace(/[^\d+]/g, '');
  const wa = (data?.['support_whatsapp'] ?? '').replace(/\D/g, '');

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user' as const, content: q.slice(0, 600) }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const r = await fetch('/api/public/help-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(1).slice(-12) }) });
      const j = (await r.json()) as { answer?: string; error?: string };
      setMsgs([...next, { role: 'assistant', content: j.answer || j.error || 'Sorry, no answer right now.' }]);
    } catch {
      setMsgs([...next, { role: 'assistant', content: 'Connection problem. Please try again.' }]);
    }
    setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <div className="relative">
      {!inline && <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}><MessageCircle /><span className="hidden sm:inline">Need help?</span></Button>}
      {open && (
        <div role="dialog" aria-label="Chat with GetXpress assistant" className={inline ? "flex w-full flex-col rounded-xl border bg-popover shadow-soft" : "absolute right-0 top-12 z-50 flex w-[360px] max-w-[92vw] flex-col rounded-xl border bg-popover shadow-soft"}>
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="flex items-center gap-2 font-bold"><Bot className="h-5 w-5 text-primary" />Chat with assistant</h2>
            {!inline && <Button variant="ghost" size="icon" aria-label="Close help" onClick={() => setOpen(false)}><X /></Button>}
          </div>
          <div className={inline ? "max-h-[55vh] min-h-64 space-y-2 overflow-y-auto p-3 text-sm" : "max-h-80 min-h-48 space-y-2 overflow-y-auto p-3 text-sm"}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ml-8 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground' : 'mr-8 whitespace-pre-wrap'}>{m.content}</div>
            ))}
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t p-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input autoFocus={!inline} aria-label="Your question" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <Button type="submit" size="icon" aria-label="Send" disabled={busy || !text.trim()}><Send /></Button>
          </form>
          {(wa || email || phone) && (
            <div className="flex flex-wrap gap-1 border-t p-2 text-xs">
              <span className="w-full text-muted-foreground">Prefer a person?</span>
              {wa && <Button variant="ghost" size="sm" asChild><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>}
              {email && <Button variant="ghost" size="sm" asChild><a href={`mailto:${encodeURIComponent(email)}`}><Mail />Email</a></Button>}
              {phone && <Button variant="ghost" size="sm" asChild><a href={`tel:${phone}`}><Phone />Call</a></Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
