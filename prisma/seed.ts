try {
  process.loadEnvFile?.(".env");
} catch {
  // Environment variables are injected directly in production.
}

const GLOBAL_SENSITIVE_WORDS: Array<{
  word: string;
  action: "block" | "replace" | "review";
  replacement?: string;
}> = [
  { word: "加微信", action: "review" },
  { word: "代刷", action: "block" },
  { word: "刷单", action: "block" },
  { word: "博彩", action: "block" },
  { word: "色情", action: "block" },
  { word: "发票", action: "review" },
  { word: "广告", action: "review" },
];

async function main(): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  for (const item of GLOBAL_SENSITIVE_WORDS) {
    const existing = await prisma.sensitiveWord.findFirst({
      where: { scope: "global", word: item.word },
    });
    if (existing) {
      await prisma.sensitiveWord.update({
        where: { id: existing.id },
        data: { action: item.action, replacement: item.replacement, enabled: true },
      });
    } else {
      await prisma.sensitiveWord.create({
        data: {
          scope: "global",
          word: item.word,
          action: item.action,
          replacement: item.replacement,
          enabled: true,
        },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        isAdmin: true,
        name: process.env.ADMIN_NAME || undefined,
      },
      create: {
        email: adminEmail,
        name: process.env.ADMIN_NAME || "管理员",
        isAdmin: true,
      },
    });
    console.log(`Admin user ready: ${adminEmail}`);
  }

  console.log(`Seeded ${GLOBAL_SENSITIVE_WORDS.length} global sensitive words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
