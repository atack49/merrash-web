import { prisma } from '@/lib/db';
import { MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE, MAX_APPOINTMENTS_PER_HOUR_TOTAL } from '@/lib/appointments/capacityRules';

const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;

type SlotCapacityInput = {
    preferredDate?: string | null;
    preferredTime?: string | null;
    service?: string | null;
    excludeId?: string;
};

export type SlotCapacity = {
    totalCount: number;
    serviceCount: number;
    totalFull: boolean;
    serviceFull: boolean;
};

export async function getSlotCapacity(input: SlotCapacityInput): Promise<SlotCapacity> {
    const preferredDate = input.preferredDate?.trim();
    const preferredTime = input.preferredTime?.trim();
    const service = input.service?.trim();

    if (!preferredDate || !preferredTime) {
        return {
            totalCount: 0,
            serviceCount: 0,
            totalFull: false,
            serviceFull: false,
        };
    }

    const baseWhere = {
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
        preferredDate,
        preferredTime,
        status: { in: ACTIVE_STATUSES as unknown as string[] },
    };

    const [totalCount, serviceCount] = await Promise.all([
        prisma.appointment.count({ where: baseWhere }),
        service
            ? prisma.appointment.count({
                  where: {
                      ...baseWhere,
                      service,
                  },
              })
            : Promise.resolve(0),
    ]);

    return {
        totalCount,
        serviceCount,
        totalFull: totalCount >= MAX_APPOINTMENTS_PER_HOUR_TOTAL,
        serviceFull: Boolean(service) && serviceCount >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE,
    };
}
