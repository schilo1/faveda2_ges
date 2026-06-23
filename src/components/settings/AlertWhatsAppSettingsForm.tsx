"use client";

import { useState } from "react";
import { MessageCircle, Save, Send } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface Props {
  enabled: boolean;
  phone: string;
  minSeverity: string;
  isAdmin: boolean;
}

function readableError(value: any) {
  return value?.reason || value?.error || "Action impossible.";
}

export function AlertWhatsAppSettingsForm({ enabled, phone, minSeverity, isAdmin }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    enabled,
    phone,
    minSeverity: minSeverity || "WARNING",
  });
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    setLoading("save");
    setMessage("");
    const normalizedPhone = form.phone.replace(/\D/g, "");

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert_whatsapp_enabled: String(form.enabled),
        alert_whatsapp_phone: normalizedPhone,
        alert_whatsapp_min_severity: form.minSeverity,
      }),
    });

    setLoading("");
    const nextMessage = res.ok ? "Configuration WhatsApp enregistrée." : "Impossible d'enregistrer la configuration WhatsApp.";
    setMessage(nextMessage);
    if (res.ok) {
      setForm(current => ({ ...current, phone: normalizedPhone }));
      toast.success("Réglages enregistrés", "La configuration WhatsApp des alertes est à jour.");
    } else {
      toast.error("Réglages non enregistrés", nextMessage);
    }
  }

  async function testHelloWorld() {
    setLoading("test");
    setMessage("");
    const normalizedPhone = form.phone.replace(/\D/g, "");

    const res = await fetch("/api/whatsapp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizedPhone }),
    });
    const data = await res.json().catch(() => null);
    setLoading("");

    if (res.ok) {
      setMessage("Message WhatsApp test envoyé.");
      toast.success("WhatsApp envoyé", "Le message test hello_world a été envoyé.");
    } else {
      const error = readableError(data);
      setMessage(error);
      toast.error("WhatsApp non envoyé", error);
    }
  }

  async function sendActiveAlerts() {
    setLoading("alerts");
    setMessage("");

    const res = await fetch("/api/alerts/whatsapp", { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading("");

    if (res.ok) {
      setMessage(`${data.count ?? 1} alerte(s) envoyée(s) par WhatsApp.`);
      toast.success("Alertes envoyées", "Les alertes actives ont été envoyées par WhatsApp.");
    } else {
      const error = readableError(data);
      setMessage(error);
      toast.error("Alertes non envoyées", error);
    }
  }

  return (
    <div className="card mb-5 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <MessageCircle size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Alertes WhatsApp</h2>
          <p className="text-sm text-gray-500">Envoyer les alertes importantes au numéro WhatsApp configuré.</p>
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
          Activer l&apos;envoi automatique des alertes WhatsApp
        </label>

        <div>
          <label className="label">Numéro WhatsApp destinataire</label>
          <input
            value={form.phone}
            disabled={!isAdmin}
            onChange={e => setForm(current => ({ ...current, phone: e.target.value }))}
            className="input"
            placeholder="2250584185367"
          />
          <p className="mt-1 text-xs text-gray-400">Format recommandé : pays + numéro, sans + ni espaces.</p>
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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={!!loading} className="btn-primary gap-2">
              <Save size={16} />
              {loading === "save" ? "Enregistrement..." : "Enregistrer WhatsApp"}
            </button>
            <button type="button" onClick={testHelloWorld} disabled={!!loading} className="btn-secondary gap-2">
              <Send size={16} />
              {loading === "test" ? "Envoi..." : "Tester WhatsApp"}
            </button>
            <button type="button" onClick={sendActiveAlerts} disabled={!!loading} className="btn-secondary gap-2">
              <MessageCircle size={16} />
              {loading === "alerts" ? "Envoi..." : "Envoyer les alertes actives"}
            </button>
          </div>
        )}

        {message && <p className="text-sm font-medium text-[#596744]">{message}</p>}
      </div>
    </div>
  );
}
