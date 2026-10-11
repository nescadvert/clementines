"use client";
import { useState, useMemo } from "react";

const DAYS_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Customer {
  name: string;
  phone: string;
  cleanPhone: string;
  intlPhone: string;
  pointId: string;
  pointName: string;
  dayOfWeek: number;
  totalOrders: number;
}

export default function BroadcastManager({
  orders,
  points,
}: {
  orders: any[];
  points: any[];
}) {
  // 1. Extraire les clients uniques
  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, Customer>();

    orders.forEach((o) => {
      const rawPhone = o.customerPhone || "";
      const clean = rawPhone.replace(/[\s.-]/g, "");
      if (!clean) return;

      const intl = clean.startsWith("0") ? "33" + clean.slice(1) : clean;
      const point = points.find((p) => p.id === o.deliveryPointId) || o.deliveryPoint;

      if (!map.has(clean)) {
        map.set(clean, {
          name: o.customerName,
          phone: rawPhone,
          cleanPhone: clean,
          intlPhone: intl,
          pointId: o.deliveryPointId,
          pointName: point?.name || "Point inconnu",
          dayOfWeek: point?.dayOfWeek ?? 2,
          totalOrders: 1,
        });
      } else {
        const existing = map.get(clean)!;
        existing.totalOrders += 1;
      }
    });

    return Array.from(map.values());
  }, [orders, points]);

  // 2. Identifier les tournées existantes (groupées par jour de la semaine)
  const tournees = useMemo(() => {
    const daysSet = new Set<number>();
    points.forEach((p) => {
      if (p.dayOfWeek !== undefined) daysSet.add(p.dayOfWeek);
    });

    return Array.from(daysSet)
      .sort((a, b) => a - b)
      .map((dayNum) => {
        const dayPoints = points.filter((p) => p.dayOfWeek === dayNum);
        const villageNames = dayPoints.map((p) => p.name.split(" ")[0].replace("(", "")).join(", ");
        const dayCustomers = uniqueCustomers.filter((c) => c.dayOfWeek === dayNum);

        return {
          dayNum,
          label: `Tournée du ${DAYS_NAMES[dayNum]}`,
          villages: villageNames,
          customersCount: dayCustomers.length,
        };
      });
  }, [points, uniqueCustomers]);

  // État de sélection
  const [filterType, setFilterType] = useState<string>("all"); // "all" | "tournee_X" | "point_ID"
  const [customText, setCustomText] = useState<string>("");
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Filtrer les clients cibles
  const targetCustomers = useMemo(() => {
    if (filterType === "all") return uniqueCustomers;
    if (filterType.startsWith("tournee_")) {
      const day = parseInt(filterType.replace("tournee_", ""));
      return uniqueCustomers.filter((c) => c.dayOfWeek === day);
    }
    if (filterType.startsWith("point_")) {
      const pId = filterType.replace("point_", "");
      return uniqueCustomers.filter((c) => c.pointId === pId);
    }
    return uniqueCustomers;
  }, [filterType, uniqueCustomers]);

  // Générer le message par défaut adapté à la tournée
  const generatedMessage = useMemo(() => {
    const siteUrl = "https://clementines.vercel.app";

    if (filterType.startsWith("tournee_")) {
      const day = parseInt(filterType.replace("tournee_", ""));
      const dayName = DAYS_NAMES[day];
      const t = tournees.find((tour) => tour.dayNum === day);
      const villagesStr = t?.villages ? ` (${t.villages})` : "";
      return `Bonjour ! Le camion EARL Mangani passe ce ${dayName.toLowerCase()}${villagesStr}. Pensez à réserver vos clémentines sur : ${siteUrl}`;
    }

    if (filterType.startsWith("point_")) {
      const pId = filterType.replace("point_", "");
      const p = points.find((pt) => pt.id === pId);
      const dayName = p?.dayOfWeek !== undefined ? DAYS_NAMES[p.dayOfWeek] : "bientôt";
      return `Bonjour ! Le camion EARL Mangani passe à ${p?.name || "votre point"} ce ${dayName.toLowerCase()}. Pensez à réserver vos clémentines sur : ${siteUrl}`;
    }

    return `Bonjour ! Pensez à commander vos clémentines de Corse pour nos prochaines tournées sur : ${siteUrl} - EARL Mangani`;
  }, [filterType, tournees, points]);

  const activeMessage = customText || generatedMessage;

  // Chaîne pour SMS groupé (séparés par virgule pour iOS/Android)
  const phoneNumbersList = targetCustomers.map((c) => c.cleanPhone).join(",");

  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(targetCustomers.map((c) => c.phone).join("\n"));
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>📢</span> Relance Tournée & Annonces Clients
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prévenez vos anciens clients par tournée pour qu'ils commandent avant votre passage
          </p>
        </div>
        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full">
          👥 {uniqueCustomers.length} clients enregistrés
        </span>
      </div>

      {/* 1. Sélection de la Tournée */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          1. Choisissez la tournée à relancer
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setFilterType("all");
              setCustomText("");
            }}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
              filterType === "all"
                ? "border-orange-500 bg-orange-50/70 text-slate-900 shadow-sm"
                : "border-slate-100 bg-slate-50 text-slate-600 hover:border-orange-200"
            }`}
          >
            <p className="font-bold text-sm">🌐 Tous mes clients</p>
            <p className="text-xs text-slate-400 mt-0.5">{uniqueCustomers.length} contacts au total</p>
          </button>

          {tournees.map((t) => (
            <button
              key={t.dayNum}
              type="button"
              onClick={() => {
                setFilterType(`tournee_${t.dayNum}`);
                setCustomText("");
              }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                filterType === `tournee_${t.dayNum}`
                  ? "border-orange-500 bg-orange-50/70 text-slate-900 shadow-sm"
                  : "border-slate-100 bg-slate-50 text-slate-600 hover:border-orange-200"
              }`}
            >
              <p className="font-bold text-sm text-orange-700">🚚 {t.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{t.villages || "Villages"}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">{t.customersCount} clients</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Message à envoyer */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            2. Message qui sera envoyé ({targetCustomers.length} destinataires)
          </label>
          <button
            onClick={() => setCustomText(generatedMessage)}
            className="text-[11px] text-orange-600 hover:underline font-bold"
          >
            Réinitialiser le texte
          </button>
        </div>

        <textarea
          rows={3}
          value={activeMessage}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
          placeholder="Rédigez votre message d'annonce..."
        />
      </div>

      {/* 3. Boutons d'action pour envoyer */}
      <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-5 mb-6">
        <h4 className="font-black text-sm text-slate-800 mb-3">3. Envoyez vos messages</h4>
        
        <div className="flex items-center gap-3 flex-wrap">
          {phoneNumbersList ? (
            <a
              href={`sms:${phoneNumbersList}?body=${encodeURIComponent(activeMessage)}`}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-md shadow-orange-200 inline-flex items-center gap-2 active:scale-95"
            >
              <span>📲</span>
              <span>Lancer le SMS groupé ({targetCustomers.length} clients)</span>
            </a>
          ) : (
            <button
              disabled
              className="bg-slate-200 text-slate-400 font-bold text-sm px-5 py-3 rounded-xl cursor-not-allowed"
            >
              Aucun client pour cette tournée
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyNumbers}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>{copiedNumbers ? "Numéros copiés !" : "Copier les numéros (WhatsApp)"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>{copiedText ? "Message copié !" : "Copier le texte"}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          💡 <strong>Sur smartphone :</strong> Cliquez sur « Lancer le SMS groupé » : votre application SMS s'ouvre avec tous les numéros de la tournée et le message déjà inséré ! Vous pouvez aussi copier les numéros pour votre liste de diffusion WhatsApp.
        </p>
      </div>

      {/* 4. Liste détaillée des clients ciblés */}
      {targetCustomers.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Contacts ciblés pour cette relance ({targetCustomers.length}) :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {targetCustomers.map((c, i) => (
              <div
                key={i}
                className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{c.name}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{c.phone}</p>
                  <p className="text-[10px] text-orange-600 font-medium">📍 {c.pointName}</p>
                </div>
                <div className="flex gap-1">
                  <a
                    href={`sms:${c.cleanPhone}?body=${encodeURIComponent(activeMessage)}`}
                    className="p-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                    title="SMS individuel"
                  >
                    💬
                  </a>
                  <a
                    href={`https://wa.me/${c.intlPhone}?text=${encodeURIComponent(activeMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                    title="WhatsApp individuel"
                  >
                    🟢
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
