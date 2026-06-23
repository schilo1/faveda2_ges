"use client";

import { useState } from "react";
import { Mail, Save } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface Props {
  enabled: boolean;
  recipients: string;
  minSeverity: string;
  isAdmin: boolean;
}

export function AlertEmailSettingsForm({ enabled, recipients, minSeverity, isAdmin }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    enabled,
    recipients,
    minSeverity: minSeverity || "WARNING",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert_email_enabled: String(form.enabled),
        alert_email_recipients: form.recipients,
        alert_email_min_severity: form.minSeverity,
      }),
    });

    setLoading(false);
    const message = res.ok ? "Configuration email enregistrée." : "Impossible d'enregistrer la configuration.";
    setMessage(message);
    if (res.ok) toast.success("Réglages enregistrés", "La configuration email des alertes est à jour.");
    else toast.error("Réglages non enregistrés", message);
  }

  return (
    <div className="card mb-5 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#596744]/10 text-[#596744]">
          <Mail size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Emails d&apos;alerte</h2>
          <p className="text-sm text-gray-500">Envoyer automatiquement les alertes aux personnes configurées.</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/70 px-4 py-3 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={!isAdmin}
            onChange={e => setForm(current => ({ ...current, enabled: e.target.checked }))}
            className="rounded"
          />
          Activer l&apos;envoi automatique des emails d&apos;alerte
        </label>

        <div>
          <label className="label">Destinataires</label>
          <textarea
            value={form.recipients}
            disabled={!isAdmin}
            onChange={e => setForm(current => ({ ...current, recipients: e.target.value }))}
            rows={3}
            className="input resize-none"
            placeholder="exemple@faveda.ci, manager@faveda.ci"
          />
          <p className="mt-1 text-xs text-gray-400">Séparez les emails par virgule, point-virgule ou nouvelle ligne.</p>
        </div>

        <div>
          <label className="label">Sévérité minimale</label>
          <select
            value={form.minSeverity}
            disabled={!isAdmin}
            onChange={e => setForm(current => ({ ...current, minSeverity: e.target.value }))}
            className="input"
          >
            <option value="INFO">Info</option>
            <option value="WARNING">Attention</option>
            <option value="CRITICAL">Critique uniquement</option>
          </select>
        </div>

        {isAdmin && (
          <button type="button" onClick={save} disabled={loading} className="btn-primary gap-2">
            <Save size={16} />
            {loading ? "Enregistrement..." : "Enregistrer les emails d'alerte"}
          </button>
        )}

        {message && <p className="text-sm font-medium text-[#596744]">{message}</p>}
      </div>
    </div>
  );
}
