import { ServiceOrderStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function getDashboardSummary({ tenantId, branchId }) {
  const branchFilter = branchId ? { branchId } : {};

  const [orders, lowStockItems, paymentsAgg, posAgg, customersCount] = await Promise.all([
    prisma.serviceOrder.groupBy({
      by: ["status"],
      where: { tenantId, ...branchFilter },
      _count: { _all: true }
    }),
    prisma.inventoryItem.count({
      where: {
        tenantId,
        ...branchFilter,
        OR: [{ stock: 0 }, { stock: { lte: 3 } }]
      }
    }),
    prisma.payment.aggregate({
      where: { tenantId, ...branchFilter },
      _sum: { amount: true }
    }),
    prisma.posSale.aggregate({
      where: { tenantId, ...branchFilter },
      _sum: { total: true }
    }),
    prisma.customer.count({ where: { tenantId } })
  ]);

  const pipeline = Object.values(ServiceOrderStatus).map((status) => {
    const row = orders.find((item) => item.status === status);
    return { status, total: row?._count?._all ?? 0 };
  });

  const openOrders = pipeline
    .filter((item) => !["DELIVERED", "CANCELED"].includes(item.status))
    .reduce((total, item) => total + item.total, 0);

  return {
    metrics: {
      customersCount,
      openOrders,
      lowStockItems,
      serviceRevenue: Number(paymentsAgg._sum.amount ?? 0),
      posRevenue: Number(posAgg._sum.total ?? 0)
    },
    pipeline
  };
}
