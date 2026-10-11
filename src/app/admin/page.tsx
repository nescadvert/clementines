import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const instant = false;

export default async function AdminPage() {
  const orders = await prisma.order.findMany({
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

  const products = await prisma.product.findMany();

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <Link href="/" className="text-orange-600 hover:underline mb-2 inline-block">&larr; Retour au site</Link>
            <h1 className="text-3xl font-bold">Tableau de Bord Administrateur</h1>
          </div>
          <div className="text-right flex gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Commandes</p>
              <p className="text-2xl font-bold text-orange-600">{orders.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Revenu attendu</p>
              <p className="text-2xl font-bold text-green-600">{totalRevenue} €</p>
            </div>
          </div>
        </div>

        <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold mb-4">Vos Produits Actifs</h2>
          <div className="flex gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex-1">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-slate-500">{p.description}</p>
                <p className="text-orange-600 font-bold mt-2">{p.price} €</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">* Pour ajouter/modifier des produits pour l'instant, cela se passe dans la base de données directement.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700">Client</th>
                <th className="p-4 font-semibold text-slate-700">Téléphone</th>
                <th className="p-4 font-semibold text-slate-700">Point de livraison</th>
                <th className="p-4 font-semibold text-slate-700">Détail</th>
                <th className="p-4 font-semibold text-slate-700 text-right">Total</th>
                <th className="p-4 font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Aucune commande pour le moment.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium">{order.customerName}</td>
                    <td className="p-4">{order.customerPhone}</td>
                    <td className="p-4">
                      <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                        {order.deliveryPoint.name}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {order.items.map(item => (
                        <div key={item.id}>{item.quantity}x {item.product.name}</div>
                      ))}
                    </td>
                    <td className="p-4 text-right font-bold text-green-600">{order.totalPrice} €</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString('fr-FR')} à {new Date(order.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
