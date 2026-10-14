"use server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "corse2026";

export async function loginAdmin(password: string) {
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("admin_token", "corse2026", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });
    return { success: true };
  }
  return { success: false };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return { success: true };
}

export async function createDeliveryPoint(data: {
  name: string;
  lat: number;
  lng: number;
  dayOfWeek: number;
  timeSlot: string;
  tournee?: string;
}) {
  try {
    await prisma.deliveryPoint.create({
      data: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        dayOfWeek: data.dayOfWeek,
        timeSlot: data.timeSlot,
        tournee: data.tournee || "Tournée Bastia",
      },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur création point :", err);
    return { success: false, error: err.message };
  }
}

export async function updateDeliveryPoint(
  id: string,
  data: {
    name: string;
    lat: number;
    lng: number;
    dayOfWeek: number;
    timeSlot: string;
    tournee?: string;
  }
) {
  try {
    await prisma.deliveryPoint.update({
      where: { id },
      data: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        dayOfWeek: data.dayOfWeek,
        timeSlot: data.timeSlot,
        tournee: data.tournee || "Tournée Bastia",
      },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur modification point :", err);
    return { success: false, error: err.message };
  }
}


export async function deleteDeliveryPoint(id: string) {
  try {
    await prisma.deliveryPoint.delete({
      where: { id },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur suppression point :", err);
    return { success: false, error: err.message };
  }
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
}) {
  try {
    await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
      },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur création produit :", err);
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur suppression produit :", err);
    return { success: false, error: err.message };
  }
}

export async function deleteOrder(id: string) {
  try {
    await prisma.order.delete({
      where: { id },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Erreur suppression commande :", err);
    return { success: false, error: err.message };
  }
}

export async function testMakeWebhook() {
  const url = process.env.MAKE_WEBHOOK_URL || "https://hook.eu1.make.com/rfim44e728nrsx16wxpai8o40j2k0b4e";
  if (!url) {

    return { success: false, error: "Variable MAKE_WEBHOOK_URL non configurée." };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "TEST_ORDER",
        orderId: "test_12345",
        customerName: "Marie Dupont (Test)",
        customerPhone: "33603172991",
        totalPrice: 29,
        montantTotal: "29 €",
        tournee: "Tournée Bastia",
        deliveryPoint: "Place de la Mairie (Test)",
        deliveryDate: "Mardi 21 Octobre",
        items: "2x Clémentines de Corse (Les 6Kg), 1x Noisettes (Le Kg)",

        quantite_clementines_6kg: 2,
        quantite_noisettes: 1,
        produits: [
          { nom: "Clémentines de Corse (Les 6Kg)", quantite: 2, prixUnitaire: 12 },
          { nom: "Noisettes (Le Kg)", quantite: 1, prixUnitaire: 5 }
        ],
        createdAt: new Date().toISOString()


      }),
    });

    if (!res.ok) {
      return { success: false, error: `Make a répondu avec le statut ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

