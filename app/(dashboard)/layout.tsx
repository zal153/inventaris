import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Get low stock count for notification badge
  const lowStockCount = await prisma.product.count({
    where: {
      isActive: true,
      OR: [
        { stok: 0 },
        {
          stok: {
            lte: prisma.product.fields.minimumStok as unknown as number,
          },
        },
      ],
    },
  }).catch(() => 0);

  // Simpler approach: get all products and filter in JS
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { stok: true, minimumStok: true },
  });
  const actualLowStockCount = products.filter(p => p.stok <= p.minimumStok).length;

  return (
    <DashboardShell userName={user.name} lowStockCount={actualLowStockCount}>
      {children}
    </DashboardShell>
  );
}
