import { prisma } from "../src/lib/prisma";

const categories = [
  "Tabac",
  "Cigarettes électroniques",
  "Presse",
  "Jeux / Grattage",
  "Épicerie",
  "Boissons",
  "Confiserie",
  "Accessoires",
];

async function main() {
  for (const nom of categories) {
    await prisma.category.upsert({
      where: { nom },
      update: {},
      create: { nom },
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
