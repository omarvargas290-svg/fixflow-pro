import { prisma } from "./prisma.js";

export async function syncTenantSubscription(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) return null;

  const now = new Date();
  let nextStatus = tenant.subscriptionStatus;

  if (tenant.subscriptionStatus === "TRIAL" && tenant.trialEndsAt && tenant.trialEndsAt < now) {
    nextStatus = "PAST_DUE";
  }

  if (tenant.subscriptionStatus === "ACTIVE" && tenant.currentPeriodEndsAt && tenant.currentPeriodEndsAt < now) {
    nextStatus = "PAST_DUE";
  }

  if (nextStatus !== tenant.subscriptionStatus) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: nextStatus }
    });
  }

  return tenant;
}
