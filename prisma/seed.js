const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deliveryPoint.deleteMany();
  await prisma.product.deleteMany();
  
  await prisma.deliveryPoint.createMany({
    data: [
      { name: 'Bastia (Place Saint-Nicolas)', lat: 42.7028, lng: 9.4500 },
      { name: 'Ajaccio (Marché)', lat: 41.9267, lng: 8.7369 },
      { name: 'Porto-Vecchio (Port)', lat: 41.5910, lng: 9.2795 },
      { name: 'Corte (Centre-ville)', lat: 42.3094, lng: 9.1490 }
    ]
  });

  await prisma.product.createMany({
    data: [
      { name: 'Cagette 5kg', description: 'Clémentines de Corse IGP - Petit calibre', price: 15.00 },
      { name: 'Cagette 10kg', description: 'Clémentines de Corse IGP - Calibre standard', price: 28.00 }
    ]
  });

  console.log('Seed terminé ! Villes et Produits ajoutés.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
