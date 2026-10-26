import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createSupportTicket } from "@/lib/support.functions";

/** Customer help desk: open a ticket and get an instant AI answer; staff can follow up. */
export function HelpTickets() {
  const qc = useQueryClient();
  const send = useServerFn(createSupportTicket);
  const [f, setF] = useState({ subject: "", message: "", tracking_number: "" });
  const [busy, setBusy] = useState(false);
  const { data: rows = [] } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => (await supabase.from("support_tickets").select("id,subject,message,ai_answer,staff_reply,status,created_at").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const inp = "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm";
  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><LifeBuoy className="h-5 w-5 text-primary" />Need help? Open a ticket</h2>
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { await send({ data: { ...f, tracking_number: f.tracking_number || undefined } }); toast.success("Ticket sent"); setF({ subject: "", message: "", tracking_number: "" }); qc.invalidateQueries({ queryKey: ["my-tickets"] }); }
        catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
      }}>
        <label className="text-sm">Subject<input required minLength={3} maxLength={140} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className={inp} /></label>
        <label className="text-sm">Tracking no. (optional)<input maxLength={40} value={f.tracking_number} onChange={(e) => setF({ ...f, tracking_number: e.target.value })} className={inp} /></label>
        <label className="text-sm sm:col-span-2">Your question<textarea required minLength={5} maxLength={3000} rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className={inp} /></label>
        <Button type="submit" disabled={busy} className="sm:w-fit">{busy ? "Getting an answer…" : "Send ticket"}</Button>
      </form>
      <div className="mt-5 space-y-3">
        {rows.map((t) => (
          <article key={t.id} className="rounded-xl border p-4 text-sm">
            <div className="flex justify-between gap-2"><p className="font-bold">{t.subject}</p><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t.status}</span></div>
            <p className="mt-1 text-muted-foreground">{t.message}</p>
            {t.ai_answer && <p className="mt-3 whitespace-pre-line rounded-lg bg-primary/5 p-3"><Sparkles className="mr-1 inline h-4 w-4 text-primary" />{t.ai_answer.split(/\*\*(.+?)\*\*/g).map((part, i) => i % 2 ? <b key={i}>{part}</b> : part)}</p>}
            {t.staff_reply && <p className="mt-2 rounded-lg bg-muted p-3"><b>GetXpress team:</b> {t.staff_reply}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
