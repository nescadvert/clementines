"use client";

import { useState } from "react";
import { testMakeWebhook } from "./actions";

export default function WebhookConfig({ currentWebhookUrl }: { currentWebhookUrl?: string }) {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setTestStatus(null);
    try {
      const res = await testMakeWebhook();
      if (res.success) {
        setTestStatus("✅ Requête test envoyée avec succès à Make ! Vérifiez votre historique dans Make.");
      } else {
        setTestStatus(`⚠️ ${res.error || "Échec de l'envoi."}`);
      }
    } catch (e: any) {
      setTestStatus("❌ Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = !!currentWebhookUrl;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚡</span>
            <h2 className="text-lg font-bold text-slate-800">Automatisation Make (SMS & Alertes)</h2>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isConfigured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {isConfigured ? "Connecté" : "En attente d'URL"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Chaque nouvelle commande validée par un client est automatiquement transmise à votre scénario Make pour l'envoi d'un vrai SMS.
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !isConfigured}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 shadow-sm"
        >
          {loading ? "Envoi test..." : "🧪 Tester l'envoi vers Make"}
        </button>
      </div>

      {testStatus && (
        <div className={`p-3 rounded-xl text-xs font-medium mb-4 ${testStatus.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
          {testStatus}
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <p className="font-bold text-slate-700">📦 Données transmises à votre webhook Make à chaque commande :</p>
        <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
{`{
  "event": "NEW_ORDER",
  "customerName": "Jean Dupont",
  "customerPhone": "0612345678",
  "totalPrice": 30,
  "deliveryPoint": "Place du Village, Moriani",
  "deliveryDate": "Mardi 14 Octobre (16h30 - 18h00)",
  "items": "2x Plateau 5kg"
}`}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          👉 Dans Make, créez un déclencheur <strong>Webhooks &gt; Custom webhook</strong>, copiez l'URL obtenue, et ajoutez la variable <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">MAKE_WEBHOOK_URL</code> dans vos paramètres Vercel ou dans votre fichier <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">.env</code>.
        </p>
      </div>
    </div>
  );
}
