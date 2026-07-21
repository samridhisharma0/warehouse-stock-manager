import type { ShippingRequest, ShippingResponse, ShippingBreakdownStep } from '@shared/types';
import {
  CURRENCY,
  LARGEST_VEHICLE,
  REMOTE_ZONE,
  VEHICLES,
  VOLUMETRIC_DIVISOR,
  ZONES,
  type Zone,
} from '../config/shipping.js';

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Map a pincode to a delivery zone using its first two digits.
export function resolveZone(pincode: string): Zone {
  const prefix = pincode.trim().slice(0, 2);
  const match = ZONES.find((z) => z.prefixes.includes(prefix));
  return match ?? REMOTE_ZONE;
}

// Volumetric (dimensional) weight for a single unit, in kg.
export function volumetricWeight(lengthCm: number, widthCm: number, heightCm: number): number {
  return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
}

/**
 * Core constraint-satisfaction routine.
 *
 * 1. Resolve destination zone from the pincode.
 * 2. For every line, chargeable weight = max(actual, volumetric) x quantity.
 * 3. Pick the cheapest single vehicle that fits the total; if nothing fits,
 *    split across N of the largest vehicle (N = ceil(total / largestCapacity)).
 * 4. cost = (vehicleCount x dispatchCost) + (totalChargeableWeight x zoneRate).
 */
export function calculateShipping(req: ShippingRequest): ShippingResponse {
  if (!req.items || req.items.length === 0) {
    throw new Error('At least one item is required to calculate shipping.');
  }
  if (!/^\d{6}$/.test(req.destinationPincode.trim())) {
    throw new Error('Destination pincode must be a 6-digit number.');
  }

  const zone = resolveZone(req.destinationPincode);

  let totalActual = 0;
  let totalVolumetric = 0;
  let totalChargeable = 0;

  for (const item of req.items) {
    if (item.quantity <= 0) throw new Error('Item quantity must be greater than zero.');
    const vol = volumetricWeight(item.lengthCm, item.widthCm, item.heightCm);
    const chargeablePerUnit = Math.max(item.weightKg, vol);
    totalActual += item.weightKg * item.quantity;
    totalVolumetric += vol * item.quantity;
    totalChargeable += chargeablePerUnit * item.quantity;
  }

  totalActual = round(totalActual);
  totalVolumetric = round(totalVolumetric);
  totalChargeable = round(totalChargeable);

  // Vehicle selection.
  let chosenVehicle = VEHICLES.find((v) => totalChargeable <= v.capacityKg);
  let vehicleCount = 1;

  if (!chosenVehicle) {
    // Exceeds even the largest vehicle → split into multiple trips of the largest.
    chosenVehicle = LARGEST_VEHICLE;
    vehicleCount = Math.ceil(totalChargeable / LARGEST_VEHICLE.capacityKg);
  }

  const vehicleDispatchCost = round(chosenVehicle.dispatchCost * vehicleCount);
  const weightCost = round(totalChargeable * zone.ratePerKg);
  const totalCost = round(vehicleDispatchCost + weightCost);

  const breakdown: ShippingBreakdownStep[] = [
    {
      label: 'Destination zone',
      detail: `Pincode ${req.destinationPincode} → Zone ${zone.id} (${zone.name}) at ${CURRENCY} ${zone.ratePerKg}/kg.`,
    },
    {
      label: 'Chargeable weight',
      detail: `max(actual ${totalActual} kg, volumetric ${totalVolumetric} kg) → ${totalChargeable} kg chargeable.`,
    },
    {
      label: 'Vehicle assignment',
      detail:
        vehicleCount === 1
          ? `${totalChargeable} kg fits a ${chosenVehicle.name} (max ${chosenVehicle.capacityKg} kg).`
          : `${totalChargeable} kg exceeds the largest vehicle (${LARGEST_VEHICLE.capacityKg} kg), split across ${vehicleCount} × ${chosenVehicle.name}.`,
    },
    {
      label: 'Cost',
      detail: `(${vehicleCount} × ${CURRENCY} ${chosenVehicle.dispatchCost} dispatch) + (${totalChargeable} kg × ${CURRENCY} ${zone.ratePerKg}) = ${CURRENCY} ${vehicleDispatchCost} + ${CURRENCY} ${weightCost} = ${CURRENCY} ${totalCost}.`,
    },
  ];

  const justification =
    `Shipping to pincode ${req.destinationPincode} falls in Zone ${zone.id} (${zone.name}, ${CURRENCY} ${zone.ratePerKg}/kg). ` +
    `Total chargeable weight is ${totalChargeable} kg (actual ${totalActual} kg vs volumetric ${totalVolumetric} kg — the higher wins). ` +
    (vehicleCount === 1
      ? `This fits a single ${chosenVehicle.name} (capacity ${chosenVehicle.capacityKg} kg). `
      : `This exceeds a single ${chosenVehicle.name} (capacity ${chosenVehicle.capacityKg} kg), so the load is split across ${vehicleCount} vehicles. `) +
    `Cost = ${vehicleCount} × ${CURRENCY} ${chosenVehicle.dispatchCost} dispatch + ${totalChargeable} kg × ${CURRENCY} ${zone.ratePerKg} = ${CURRENCY} ${totalCost}.`;

  return {
    destinationPincode: req.destinationPincode,
    zone: `${zone.id} — ${zone.name}`,
    zoneRatePerKg: zone.ratePerKg,
    totalActualWeightKg: totalActual,
    totalVolumetricWeightKg: totalVolumetric,
    totalChargeableWeightKg: totalChargeable,
    vehicle: chosenVehicle.name,
    vehicleCount,
    vehicleDispatchCost,
    weightCost,
    totalCost,
    currency: CURRENCY,
    justification,
    breakdown,
  };
}
