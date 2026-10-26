import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";
import { Button } from "@/components/ui/button";

/** Step 1 of onboarding: verify the mobile number with a one-time code. */
export function PhoneVerify({ onDone, initialPhone = "" }: { onDone: () => void; initialPhone?: string }) {
  const send = useServerFn(sendPhoneOtp);
  const verify = useServerFn(verifyPhoneOtp);
  const qc = useQueryClient();
  const [phone, setPhone] = useState(initialPhone.replace(/^\+91/, ""));
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setBusy(true);
    try {
      const r = await send({ data: { phone } });
      setDevCode(r.devCode);
      setStep("code");
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const confirm = async () => {
    setBusy(true);
    try {
      await verify({ data: { phone, code } });
      toast.success("Mobile verified!");
      await qc.invalidateQueries({ queryKey: ["profile"] });
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
      <div className="max-w-md py-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Smartphone className="h-7 w-7" /></span>
        <h1 className="mt-5 font-display text-3xl font-extrabold">Verify your mobile</h1>
        <p className="mt-1 text-muted-foreground">We use it for pickup updates and OTP delivery.</p>
        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div key="p" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-6 space-y-3">
              <div className="flex h-14 items-center rounded-2xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <span className="mr-2 font-bold text-muted-foreground">+91</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={10} placeholder="98765 43210" className="flex-1 bg-transparent text-lg font-bold outline-none" />
              </div>
               <Button type="button" onClick={request} disabled={busy} className="h-12 w-full">{busy && <Loader2 className="h-5 w-5 animate-spin" />} Send OTP</Button>
            </motion.div>
          ) : (
            <motion.div key="c" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="mt-6 space-y-4">
              {devCode && (
                <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Development mode · SMS not sent</p>
                  <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em]">{devCode}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Enter the 6-digit code for +91 {phone}</p>
              <InputOTP autoFocus maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup className="w-full justify-between">{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-14 w-12 rounded-xl border text-xl font-bold" />)}</InputOTPGroup>
              </InputOTP>
               <Button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="h-12 w-full">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Verify</Button>
               <Button type="button" variant="ghost" onClick={() => { setStep("phone"); setCode(""); }} className="w-full">Change number</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
