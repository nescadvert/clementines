import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import AdminLoginForm from "./AdminLoginForm";
import LogoutButton from "./LogoutButton";
import PointManager from "./PointManager";
import ProductManager from "./ProductManager";
import BroadcastManager from "./BroadcastManager";
import OrderList from "./OrderList";
import WebhookConfig from "./WebhookConfig";


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

        {/* Module d'automatisation Make (SMS & Webhooks) */}
        <WebhookConfig currentWebhookUrl={process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/rfim44e728nrsx16wxpai8o40j2k0b4e"} />


        {/* 1. Module de Relance par Tournée */}
        <BroadcastManager orders={orders} points={points} />


        {/* 2. Liste des Commandes Reçues (avec filtres, tri, masquage des passées et suppression) */}
        <OrderList orders={orders} products={products} points={points} />

        {/* 3. Gestionnaire des Points de livraison & Tournées */}
        <PointManager points={points} />

        {/* 4. Gestionnaire des Produits */}
        <ProductManager products={products} />

      </div>
    </div>
  );
}
