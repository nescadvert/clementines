import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/CheckoutClient";

export const instant = false;

export default async function Home() {
  const points = await prisma.deliveryPoint.findMany();
  const products = await prisma.product.findMany({ where: { active: true } });
  
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-800">
      {/* Mobile-first layout: 1 column everywhere, full width */}
      <CheckoutClient points={points} products={products} />
    </div>
  );
}
