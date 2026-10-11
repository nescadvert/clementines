import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/CheckoutClient";

export const instant = false;

const DEFAULT_POINTS = [
  { id: "p1", name: "Bastia (Place Saint-Nicolas)", lat: 42.7028, lng: 9.4500, dayOfWeek: 2, timeSlot: "16h00 - 18h00" },
  { id: "p2", name: "Ajaccio (Marché)", lat: 41.9267, lng: 8.7369, dayOfWeek: 4, timeSlot: "14h30 - 17h00" },
  { id: "p3", name: "Porto-Vecchio (Port)", lat: 41.5910, lng: 9.2795, dayOfWeek: 4, timeSlot: "09h00 - 11h30" },
  { id: "p4", name: "Corte (Centre-ville)", lat: 42.3094, lng: 9.1490, dayOfWeek: 2, timeSlot: "10h30 - 12h00" }
];

const DEFAULT_PRODUCTS = [
  { id: "prod1", name: "Clémentines de Corse", description: "au kg", price: 2.50 },
  { id: "prod2", name: "Clémentines de Corse", description: "caisse de 6kg", price: 12.00 },
  { id: "prod3", name: "Noisettes", description: "au kg", price: 5.00 }
];

type Point = { id: string; name: string; lat: number; lng: number; dayOfWeek: number; timeSlot: string };
type Product = { id: string; name: string; description: string | null; price: number };

export default async function Home() {
  let points: Point[] = [];
  let products: Product[] = [];
  
  try {
    points = await prisma.deliveryPoint.findMany();
    products = await prisma.product.findMany({ where: { active: true } });
  } catch (err) {
    console.error("Erreur lecture base de données :", err);
  }

  // Si la base est vide ou en cours d'initialisation, on affiche les données par défaut
  const finalPoints = points.length > 0 ? points : DEFAULT_POINTS;
  const finalProducts = products.length > 0 ? products : DEFAULT_PRODUCTS;
  
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-800">
      <CheckoutClient points={finalPoints} products={finalProducts} />
    </div>
  );
}
