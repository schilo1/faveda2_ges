"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export function SendAlertsEmailButton({ disabled }: { disabled: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/alerts/email", { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (res.ok) {
      const message = `Email envoyé à ${data.recipients?.length ?? 0} destinataire(s).`;
      setMessage(message);
      toast.success("Alertes envoyées", message);
      return;
    }

    const message = data?.reason ?? data?.error ?? "Impossible d'envoyer les alertes.";
    setMessage(message);
    toast.error("Envoi impossible", message);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={send} disabled={disabled || loading} className="btn-primary gap-2">
        <Mail size={16} />
        {loading ? "Envoi..." : "Envoyer par email"}
      </button>
      {message && <p className="max-w-xs text-right text-xs font-medium text-[#596744]">{message}</p>}
    </div>
  );
}
