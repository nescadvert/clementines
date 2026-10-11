"use server";
import { prisma } from "@/lib/prisma";

export async function createOrder(data: {
  name: string;
  phone: string;
  items: Record<string, number>; // productId -> quantity
  deliveryPointId: string;
}) {
  
  // Calculate total price
  const products = await prisma.product.findMany({
    where: { id: { in: Object.keys(data.items) } }
  });
  
  let totalPrice = 0;
  for (const [productId, quantity] of Object.entries(data.items)) {
    const product = products.find(p => p.id === productId);
    if (product) {
      totalPrice += product.price * quantity;
    }
  }

  // Create Order with nested items
  const order = await prisma.order.create({
    data: {
      customerName: data.name,
      customerPhone: data.phone,
      totalPrice: totalPrice,
      deliveryPointId: data.deliveryPointId,
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
  
  // --- SIMULATION D'ENVOI DE SMS ---
  // Dans un projet réel, vous utiliseriez Twilio ou Vonage ici.
  console.log(`\n======================================`);
  console.log(`📱 SMS ENVOYÉ À L'ACHETEUR (${data.phone}) :`);
  console.log(`"Bonjour ${data.name}, votre commande de ${totalPrice}€ est confirmée ! Nous vous attendons à ${order.deliveryPoint.name}. Paiement sur place."`);
  console.log(`\n📱 SMS ENVOYÉ AU VENDEUR (Vous) :`);
  console.log(`"Nouvelle commande de ${data.name} (${data.phone}) pour ${order.deliveryPoint.name} ! Total: ${totalPrice}€."`);
  console.log(`======================================\n`);
  
  return { success: true, orderId: order.id };
}
