import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import AdminLoginForm from "./AdminLoginForm";
import LogoutButton from "./LogoutButton";
import PointManager from "./PointManager";
import ProductManager from "./ProductManager";
import BroadcastManager from "./BroadcastManager";

export const instant = false;

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (token !== "corse2026") {
    return <AdminLoginForm />;
  }

  let orders: any[] = [];
  let products: any[] = [];
  let points: any[] = [];

  try {
    orders = await prisma.order.findMany({
      include: {
        deliveryPoint: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    products = await prisma.product.findMany();
    points = await prisma.deliveryPoint.findMany({
      orderBy: { dayOfWeek: 'asc' }
    });
  } catch (err) {
    console.error("Erreur lecture admin DB :", err);
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="text-orange-600 hover:underline text-sm font-medium">&larr; Retour au site</Link>
              <span className="text-slate-300">|</span>
              <LogoutButton />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">Tableau de Bord — EARL Mangani</h1>
          </div>
          <div className="text-right flex gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Commandes</p>
              <p className="text-2xl font-black text-orange-600">{orders.length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenu attendu</p>
              <p className="text-2xl font-black text-green-600">{totalRevenue} €</p>
            </div>
          </div>
        </div>

        {/* 1. Module de Relance par Tournée */}
        <BroadcastManager orders={orders} points={points} />

        {/* 2. Gestionnaire des Points de livraison & Tournées */}
        <PointManager points={points} />

        {/* 2. Gestionnaire des Produits */}
        <ProductManager products={products} />

        {/* 3. Tableau des Commandes reçues */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8 overflow-x-auto">
          <h2 className="text-xl font-black text-slate-800 mb-4">Commandes Reçues ({orders.length})</h2>
          
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 tracking-wider">
                <th className="p-4">Client</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4">Lieu de livraison</th>
                <th className="p-4">Date choisie</th>
                <th className="p-4">Détail</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Rappel en 1 clic</th>
                <th className="p-4">Commandé le</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">Aucune commande pour le moment.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const cleanPhone = order.customerPhone.replace(/[\s.-]/g, '');
                  const intlPhone = cleanPhone.startsWith('0') ? '33' + cleanPhone.slice(1) : cleanPhone;
                  const reminderText = `Bonjour ${order.customerName} ! Petit rappel : votre commande de clémentines (${order.totalPrice}€) vous attend aujourd'hui à ${order.deliveryPoint?.name || "votre point de retrait"}. À tout à l'heure ! EARL Mangani`;

                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{order.customerName}</td>
                      <td className="p-4 text-slate-600 font-mono text-sm">{order.customerPhone}</td>
                      <td className="p-4">
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {order.deliveryPoint?.name || "Point inconnu"}
                        </span>
                      </td>
                      <td className="p-4">
                        {order.deliveryDate ? (
                          <span className="inline-block bg-amber-50 text-amber-900 border border-amber-200 text-xs px-2.5 py-1 rounded-lg font-bold">
                            📅 {order.deliveryDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Non précisée</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {order.items?.map((item: any) => (
                          <div key={item.id}>
                            <strong>{item.quantity}x</strong> {item.product?.name}
                          </div>
                        ))}
                      </td>
                      <td className="p-4 text-right font-black text-green-600 text-base">{order.totalPrice} €</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <a
                            href={`sms:${cleanPhone}?body=${encodeURIComponent(reminderText)}`}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                            title="Ouvrir l'application SMS"
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
                      <td className="p-4 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
