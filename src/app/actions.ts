"use server";
import { prisma } from "@/lib/prisma";

const FALLBACK_PRICES: Record<string, number> = {
  prod1: 2.50,
  prod2: 12.00,
  prod3: 5.00
};

export async function createOrder(data: {
  name: string;
  phone: string;
  items: Record<string, number>;
  deliveryPointId: string;
  deliveryDate?: string;
}) {
  let totalPrice = 0;
  let deliveryPointName = "Point de livraison";

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: Object.keys(data.items) } }
    });

    for (const [productId, quantity] of Object.entries(data.items)) {
      const product = products.find(p => p.id === productId);
      const price = product?.price ?? FALLBACK_PRICES[productId] ?? 0;
      totalPrice += price * quantity;
    }

    const order = await prisma.order.create({
      data: {
        customerName: data.name,
        customerPhone: data.phone,
        totalPrice: totalPrice,
        deliveryPointId: data.deliveryPointId,
        deliveryDate: data.deliveryDate || null,
        items: {
          create: Object.entries(data.items).map(([productId, quantity]) => ({
            productId,
            quantity
          }))
        }
      },
      include: {
        deliveryPoint: true
      }
    });

    deliveryPointName = order.deliveryPoint?.name || deliveryPointName;
  } catch (err) {
    console.warn("Prisma non disponible pour sauvegarder l'ordre (mode prévisualisation / Vercel éphémère) :", err);
    // Calcul de secours
    for (const [productId, quantity] of Object.entries(data.items)) {
      totalPrice += (FALLBACK_PRICES[productId] || 10) * quantity;
    }
  }

  // Simulation notification avec date
  const dateInfo = data.deliveryDate ? `pour le ${data.deliveryDate}` : "";
  console.log(`\n======================================`);
  console.log(`📱 SMS ACHETEUR (${data.phone}) : Bonjour ${data.name}, commande de ${totalPrice}€ validée à ${deliveryPointName} ${dateInfo} !`);
  console.log(`📱 SMS VENDEUR : Nouvelle commande de ${data.name} (${data.phone}) - ${deliveryPointName} ${dateInfo} - Total: ${totalPrice}€`);
  console.log(`======================================\n`);

  return { success: true };
}
