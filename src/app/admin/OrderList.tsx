"use client";
import { useState, useMemo } from "react";
import { deleteOrder } from "./actions";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

function parseOrderDeliveryDate(deliveryDateStr?: string | null): Date | null {
  if (!deliveryDateStr) return null;

  // Exemple: "Mardi 20 octobre (16h30 - 18h00)" ou "20 octobre"
  const match = deliveryDateStr.match(/(\d{1,2})\s+([a-zA-Zàâäéèêëîïôöùûüç]+)/i);
  if (!match) return null;

  const day = parseInt(match[1]);
  const monthName = match[2].toLowerCase();
  const month = FRENCH_MONTHS[monthName];

  if (month === undefined) return null;

  const currentYear = new Date().getFullYear();
  // Fin de journée pour ce jour de livraison (23h59)
  const d = new Date(currentYear, month, day, 23, 59, 59);

  return d;
}

export default function OrderList({
  orders,
  products,
  points,
}: {
  orders: any[];
  products: any[];
  points: any[];
}) {
  const [statusFilter, setStatusFilter] = useState<"active" | "past" | "all">("active");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [pointFilter, setPointFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"deliveryDate" | "createdAt" | "amount" | "name">("deliveryDate");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = new Date();

  // 1. Enrichir chaque commande avec sa date parsée et si elle est passée
  const enrichedOrders = useMemo(() => {
    return orders.map((o) => {
      const parsedDate = parseOrderDeliveryDate(o.deliveryDate);
      const isPast = parsedDate ? parsedDate < now : false;
      return {
        ...o,
        parsedDeliveryDate: parsedDate,
        isPast,
      };
    });
  }, [orders, now]);

  // 2. Filtrer
  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter((o) => {
      // Filtre statut (actives vs passées)
      if (statusFilter === "active" && o.isPast) return false;
      if (statusFilter === "past" && !o.isPast) return false;

      // Filtre lieu
      if (pointFilter !== "all" && o.deliveryPointId !== pointFilter) return false;

      // Filtre produit
      if (productFilter !== "all") {
        const hasProd = o.items?.some((it: any) => it.productId === productFilter);
        if (!hasProd) return false;
      }

      return true;
    });
  }, [enrichedOrders, statusFilter, pointFilter, productFilter]);

  // 3. Trier
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (sortBy === "deliveryDate") {
        const timeA = a.parsedDeliveryDate ? a.parsedDeliveryDate.getTime() : 9999999999999;
        const timeB = b.parsedDeliveryDate ? b.parsedDeliveryDate.getTime() : 9999999999999;
        return timeA - timeB;
      }
      if (sortBy === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "amount") {
        return b.totalPrice - a.totalPrice;
      }
      if (sortBy === "name") {
        return a.customerName.localeCompare(b.customerName);
      }
      return 0;
    });
  }, [filteredOrders, sortBy]);

  // 4. Calcul du chargement camion pour la sélection actuelle
  const truckSummary = useMemo(() => {
    const summary: Record<string, { name: string; qty: number }> = {};

    sortedOrders.forEach((o) => {
      o.items?.forEach((it: any) => {
        const pName = it.product?.name || "Produit";
        const pId = it.productId;
        if (!summary[pId]) {
          summary[pId] = { name: pName, qty: 0 };
        }
        summary[pId].qty += it.quantity;
      });
    });

    const totalMoney = sortedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      items: Object.values(summary),
      totalMoney,
    };
  }, [sortedOrders]);

  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Voulez-vous vraiment supprimer la commande de ${customerName} ?`)) {
      setDeletingId(id);
      const res = await deleteOrder(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Erreur lors de la suppression : " + res.error);
        setDeletingId(null);
      }
    }
  };

  const activeCount = enrichedOrders.filter((o) => !o.isPast).length;
  const pastCount = enrichedOrders.filter((o) => o.isPast).length;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>📦</span> Commandes Reçues ({sortedOrders.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez vos commandes, préparez votre camion et supprimez les commandes terminées
          </p>
        </div>

        {/* Onglets de Statut (Masquage automatique des commandes passées) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold gap-1">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              statusFilter === "active"
                ? "bg-white text-orange-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🚚 À livrer ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("past")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              statusFilter === "past"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📜 Passées ({pastCount})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              statusFilter === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Toutes ({orders.length})
          </button>
        </div>
      </div>

      {/* Barre de Filtres & Tri */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-wrap items-center gap-3 text-xs">
        {/* Tri */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Trier par :</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="deliveryDate">📅 Date de livraison (prochaine)</option>
            <option value="createdAt">🕒 Date de commande (récente)</option>
            <option value="amount">💶 Montant (€ décroissant)</option>
            <option value="name">👤 Nom client (A-Z)</option>
          </select>
        </div>

        {/* Filtrer par Produit */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Produit :</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tous les produits</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.description || "—"})
              </option>
            ))}
          </select>
        </div>

        {/* Filtrer par Lieu */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Lieu :</span>
          <select
            value={pointFilter}
            onChange={(e) => setPointFilter(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tous les villages</option>
            {points.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>

        {(productFilter !== "all" || pointFilter !== "all") && (
          <button
            onClick={() => {
              setProductFilter("all");
              setPointFilter("all");
            }}
            className="text-orange-600 hover:underline font-bold ml-auto"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Résumé de chargement pour le camion */}
      {sortedOrders.length > 0 && truckSummary.items.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl mb-6 flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              🚚 À charger dans le camion ({statusFilter === "active" ? "Pour les livraisons à venir" : "Sélection filtrée"}) :
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {truckSummary.items.map((it, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-amber-300 text-slate-800 font-bold px-3 py-1 rounded-xl text-xs shadow-xs"
                >
                  <strong>{it.qty}x</strong> {it.name}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total à encaisser</p>
            <p className="text-xl font-black text-green-700">{truckSummary.totalMoney} €</p>
          </div>
        </div>
      )}

      {/* Tableau des Commandes */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 tracking-wider">
              <th className="p-4">Client</th>
              <th className="p-4">Téléphone</th>
              <th className="p-4">Lieu de livraison</th>
              <th className="p-4">Date de livraison</th>
              <th className="p-4">Détail cagettes</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4">Rappels en 1 clic</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                  {statusFilter === "active"
                    ? "Aucune commande à venir. Toutes les commandes passées sont masquées !"
                    : "Aucune commande trouvée pour ces critères."}
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                const cleanPhone = order.customerPhone ? order.customerPhone.replace(/[\s.-]/g, "") : "";
                const intlPhone = cleanPhone.startsWith("0") ? "33" + cleanPhone.slice(1) : cleanPhone;
                const reminderText = `Bonjour ${order.customerName} ! Petit rappel : votre commande de clémentines (${order.totalPrice}€) vous attend à ${order.deliveryPoint?.name || "votre point de retrait"}. À tout à l'heure ! EARL Mangani`;

                return (
                  <tr
                    key={order.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                      order.isPast ? "opacity-60 bg-slate-50/30" : ""
                    }`}
                  >
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{order.customerName}</p>
                      <p className="text-[10px] text-slate-400">
                        Commandé le {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </td>

                    <td className="p-4 text-slate-600 font-mono text-xs">{order.customerPhone}</td>

                    <td className="p-4">
                      <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">
                        {order.deliveryPoint?.name || "Point inconnu"}
                      </span>
                    </td>

                    <td className="p-4">
                      {order.deliveryDate ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                              order.isPast
                                ? "bg-slate-100 text-slate-500 border-slate-200 line-through"
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            }`}
                          >
                            📅 {order.deliveryDate}
                          </span>
                          {order.isPast && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Terminée</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Non précisée</span>
                      )}
                    </td>

                    <td className="p-4 text-sm text-slate-700">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="text-xs">
                          <strong>{item.quantity}x</strong> {item.product?.name}
                          {item.product?.description && (
                            <span className="text-slate-400 ml-1">({item.product.description})</span>
                          )}
                        </div>
                      ))}
                    </td>

                    <td className="p-4 text-right font-black text-green-600 text-base">
                      {order.totalPrice} €
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={`sms:${cleanPhone}?body=${encodeURIComponent(reminderText)}`}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          title="Ouvrir SMS"
                        >
                          💬 SMS
                        </a>
                        <a
                          href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(reminderText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          title="Ouvrir WhatsApp"
                        >
                          🟢 WhatsApp
                        </a>
                      </div>
                    </td>

                    {/* Bouton de suppression */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(order.id, order.customerName)}
                        disabled={deletingId === order.id}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer cette commande"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
