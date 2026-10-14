"use server";
import { prisma } from "@/lib/prisma";

const FALLBACK_PRICES: Record<string, number> = {
  prod1: 2.50,
  prod2: 12.00,
  prod3: 5.00
};

// Nettoie et formate les numéros au format international attendu par Brevo/SMS (ex: 33603172991)
function formatPhoneForSms(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, ""); // Enlève espaces, points, tirets
  if (cleaned.startsWith("0033")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "33" + cleaned.slice(1);
  } else if (!cleaned.startsWith("33") && cleaned.length === 9) {
    cleaned = "33" + cleaned;
  }
  return cleaned;
}

function parseFrenchDateToIso(deliveryDateStr?: string | null): string {

  if (!deliveryDateStr) return "";
  const FRENCH_MONTHS: Record<string, string> = {
    janvier: "01", fevrier: "02", février: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", aout: "08", août: "08",
    septembre: "09", octobre: "10", novembre: "11", decembre: "12", décembre: "12"
  };
  const match = deliveryDateStr.match(/(\d{1,2})\s+([a-zA-Zàâäéèêëîïôöùûüç]+)/i);
  if (!match) return "";
  const day = parseInt(match[1]);
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthStr = FRENCH_MONTHS[match[2].toLowerCase()];
  if (!monthStr) return "";
  const year = new Date().getFullYear();
  return `${year}-${monthStr}-${dayStr}`;
}

export async function createOrder(data: {
  name: string;
  phone: string;
  items: Record<string, number>;
  deliveryPointId: string;
  deliveryDate?: string;
  deliveryDateIso?: string;
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
    const tourneeName = (order.deliveryPoint as any)?.tournee || "Bastia";


    // Récupérer le nom des produits commandés pour le SMS et générer les variables individuelles
    const productQuantities: Record<string, number> = {};
    const productDetailsList: any[] = [];

    const itemDetails = Object.entries(data.items)
      .filter(([_, q]) => q > 0)
      .map(([productId, quantity]) => {
        const prod = products.find(p => p.id === productId);
        const name = prod?.name || 'Produit';
        const desc = prod?.description ? ` (${prod.description})` : '';
        const fullName = `${name}${desc}`;

        // Clé formatée pour Make (ex: quantite_clementines, quantite_noisettes)
        const cleanKey = "quantite_" + (prod?.name || productId)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");

        productQuantities[cleanKey] = (productQuantities[cleanKey] || 0) + quantity;
        productDetailsList.push({
          nom: fullName,
          quantite: quantity,
          prixUnitaire: prod?.price || 0,
          total: (prod?.price || 0) * quantity
        });

        return `${quantity}x ${fullName}`;
      })
      .join(', ');

    // Déterminer la date calendaire exacte au format ISO (ex: 2026-10-20)
    const exactDateIso = data.deliveryDateIso || parseFrenchDateToIso(data.deliveryDate) || new Date().toISOString().split('T')[0];

    // 🔗 DÉCLENCHEMENT DU SCÉNARIO MAKE (Webhook)
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/rfim44e728nrsx16wxpai8o40j2k0b4e";
    if (makeWebhookUrl) {
      try {
        await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'NEW_ORDER',
            orderId: order.id,
            customerName: data.name,
            customerPhone: formatPhoneForSms(data.phone),
            totalPrice: totalPrice,
            montantTotal: `${totalPrice} €`,
            tournee: tourneeName,
            deliveryPoint: deliveryPointName,
            deliveryDate: data.deliveryDate || 'Prochaine tournée',
            dateLivraisonExacte: exactDateIso,
            deliveryDateIso: exactDateIso,
            items: itemDetails,
            ...productQuantities,
            produits: productDetailsList,
            createdAt: new Date().toISOString()
          })
        });
        console.log("✅ Webhook Make déclenché avec succès pour la commande", order.id);
      } catch (webhookErr) {
        console.error("⚠️ Erreur lors de l'appel au Webhook Make :", webhookErr);
      }
    }
  } catch (err) {
    console.warn("Prisma non disponible pour sauvegarder l'ordre (mode prévisualisation / Vercel éphémère) :", err);
    // Calcul de secours
    for (const [productId, quantity] of Object.entries(data.items)) {
      totalPrice += (FALLBACK_PRICES[productId] || 10) * quantity;
    }

    const exactDateIso = data.deliveryDateIso || parseFrenchDateToIso(data.deliveryDate) || new Date().toISOString().split('T')[0];

    // Même en mode secours, tenter d'envoyer à Make si configuré
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/rfim44e728nrsx16wxpai8o40j2k0b4e";
    if (makeWebhookUrl) {
      try {
        await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'NEW_ORDER',
            orderId: 'preview_' + Date.now(),
            customerName: data.name,
            customerPhone: formatPhoneForSms(data.phone),
            totalPrice: totalPrice,
            montantTotal: `${totalPrice} €`,
            tournee: "Bastia",
            deliveryPoint: deliveryPointName,

            deliveryDate: data.deliveryDate || 'Prochaine tournée',
            dateLivraisonExacte: exactDateIso,
            deliveryDateIso: exactDateIso,
            items: Object.entries(data.items).map(([id, q]) => `${q}x ${id}`).join(', '),
            createdAt: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error("Erreur Webhook Make secours :", e);
      }
    }
  }




  // Simulation notification console
  const dateInfo = data.deliveryDate ? `pour le ${data.deliveryDate}` : "";
  console.log(`\n======================================`);
  console.log(`📱 COMMANDE VALIDÉE : ${data.name} (${data.phone}) - ${deliveryPointName} ${dateInfo} - Total: ${totalPrice}€`);
  console.log(`======================================\n`);

  return { success: true };
}

