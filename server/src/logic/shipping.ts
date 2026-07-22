import type { ShippingRequest, ShippingResponse, ShippingBreakdownStep, ShippingOption, ZoneInfo } from '@shared/types';
import {
  CURRENCY,
  LARGEST_VEHICLE,
  REMOTE_ZONE,
  VEHICLES,
  VOLUMETRIC_DIVISOR,
  ZONES,
  type Zone,
  type Vehicle,
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
 * Evaluate a single vehicle option for a given chargeable weight and zone rate.
 * Returns the total cost and a human-readable justification.
 */
function evaluateVehicle(
  vehicle: Vehicle,
  count: number,
  totalChargeable: number,
  zoneRatePerKg: number,
): { cost: number; justification: string } {
  const dispatchCost = round(vehicle.dispatchCost * count);
  const weightCost = round(totalChargeable * zoneRatePerKg);
  const totalCost = round(dispatchCost + weightCost);

  const justification =
    count === 1
      ? `${totalChargeable} kg fits a single ${vehicle.name} (capacity ${vehicle.capacityKg} kg). ` +
        `Cost = ${CURRENCY} ${vehicle.dispatchCost} dispatch + ${totalChargeable} kg × ${CURRENCY} ${zoneRatePerKg} = ${CURRENCY} ${totalCost}.`
      : `${totalChargeable} kg exceeds a single ${vehicle.name} (capacity ${vehicle.capacityKg} kg), ` +
        `split across ${count} vehicles. ` +
        `Cost = ${count} × ${CURRENCY} ${vehicle.dispatchCost} dispatch + ${totalChargeable} kg × ${CURRENCY} ${zoneRatePerKg} = ${CURRENCY} ${totalCost}.`;

  return { cost: totalCost, justification };
}

/**
 * Generate all feasible vehicle combinations for a given total chargeable weight.
 *
 * For each vehicle type:
 *   - If totalWeight <= capacity: 1 vehicle of that type
 *   - If totalWeight > capacity but <= largest.capacity: N vehicles of that type
 *   - Always consider the largest vehicle as the fallback split
 *
 * Returns all options sorted by total cost (cheapest first).
 */
function generateVehicleOptions(
  totalChargeable: number,
  zoneRatePerKg: number,
): ShippingOption[] {
  const options: ShippingOption[] = [];

  for (const vehicle of VEHICLES) {
    const count = Math.ceil(totalChargeable / vehicle.capacityKg);
    // Skip if this vehicle type can't handle the load even in multiples
    // and there's a larger vehicle available (the larger one would be tried below).
    // But always include the largest vehicle as a valid split option.
    if (vehicle.id !== LARGEST_VEHICLE.id && count * vehicle.capacityKg > LARGEST_VEHICLE.capacityKg * 3) {
      continue; // Skip absurdly large splits of small vehicles
    }

    const { cost, justification } = evaluateVehicle(vehicle, count, totalChargeable, zoneRatePerKg);

    options.push({
      vehicle: vehicle.name,
      vehicleCount: count,
      dispatchCost: round(vehicle.dispatchCost * count),
      weightCost: round(totalChargeable * zoneRatePerKg),
      totalCost: cost,
      justification,
    });
  }

  // Sort by total cost ascending — cheapest first.
  options.sort((a, b) => a.totalCost - b.totalCost);

  return options;
}

/**
 * Core constraint-satisfaction routine.
 *
 * 1. Resolve destination zone from the pincode.
 * 2. For every line, chargeable weight = max(actual, volumetric) × quantity.
 * 3. Generate all feasible vehicle combinations and pick the cheapest.
 * 4. Return the optimal option plus all alternatives ranked by cost.
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

  // Generate all feasible vehicle options and pick the cheapest.
  const allOptions = generateVehicleOptions(totalChargeable, zone.ratePerKg);

  if (allOptions.length === 0) {
    // Should never happen, but safety fallback.
    const { cost, justification } = evaluateVehicle(LARGEST_VEHICLE, 1, totalChargeable, zone.ratePerKg);
    allOptions.push({
      vehicle: LARGEST_VEHICLE.name,
      vehicleCount: 1,
      dispatchCost: LARGEST_VEHICLE.dispatchCost,
      weightCost: round(totalChargeable * zone.ratePerKg),
      totalCost: cost,
      justification,
    });
  }

  const cheapest = allOptions[0];
  const alternatives = allOptions.slice(1);

  const chosenVehicle = VEHICLES.find((v) => v.name === cheapest.vehicle) ?? LARGEST_VEHICLE;

  const zoneInfo: ZoneInfo = {
    id: zone.id,
    name: zone.name,
    ratePerKg: zone.ratePerKg,
    description: zone.description,
  };

  const breakdown: ShippingBreakdownStep[] = [
    {
      label: 'Destination zone',
      detail: `Pincode ${req.destinationPincode} → Zone ${zone.id} (${zone.name}) at ${CURRENCY} ${zone.ratePerKg}/kg. ${zone.description}`,
    },
    {
      label: 'Chargeable weight',
      detail: `max(actual ${totalActual} kg, volumetric ${totalVolumetric} kg) → ${totalChargeable} kg chargeable.`,
    },
    {
      label: 'Vehicle assignment',
      detail:
        cheapest.vehicleCount === 1
          ? `${totalChargeable} kg fits a single ${cheapest.vehicle} (max ${chosenVehicle.capacityKg} kg).`
          : `${totalChargeable} kg exceeds the largest single vehicle, split across ${cheapest.vehicleCount} × ${cheapest.vehicle}.`,
    },
    {
      label: 'Cost',
      detail: `(${cheapest.vehicleCount} × ${CURRENCY} ${chosenVehicle.dispatchCost} dispatch) + (${totalChargeable} kg × ${CURRENCY} ${zone.ratePerKg}) = ${CURRENCY} ${cheapest.dispatchCost} + ${CURRENCY} ${cheapest.weightCost} = ${CURRENCY} ${cheapest.totalCost}.`,
    },
    ...(alternatives.length > 0
      ? [
          {
            label: 'Alternatives considered',
            detail: alternatives
              .map((a) => `${a.vehicle} (×${a.vehicleCount}): ${CURRENCY} ${a.totalCost}`)
              .join(', ') + ` — ${cheapest.vehicle} chosen as cheapest.`,
          },
        ]
      : []),
  ];

  const justification =
    `Shipping to pincode ${req.destinationPincode} falls in Zone ${zone.id} (${zone.name}, ${CURRENCY} ${zone.ratePerKg}/kg). ` +
    `Total chargeable weight is ${totalChargeable} kg (actual ${totalActual} kg vs volumetric ${totalVolumetric} kg — the higher wins). ` +
    cheapest.justification +
    (alternatives.length > 0
      ? `Alternatives: ${alternatives.map((a) => `${a.vehicle} (×${a.vehicleCount}) at ${CURRENCY} ${a.totalCost}`).join(', ')}. ` +
        `${cheapest.vehicle} chosen as cheapest viable option.`
      : '');

  return {
    destinationPincode: req.destinationPincode,
    zone: `${zone.id} — ${zone.name}`,
    zoneRatePerKg: zone.ratePerKg,
    zoneInfo,
    totalActualWeightKg: totalActual,
    totalVolumetricWeightKg: totalVolumetric,
    totalChargeableWeightKg: totalChargeable,
    vehicle: cheapest.vehicle,
    vehicleCount: cheapest.vehicleCount,
    vehicleDispatchCost: cheapest.dispatchCost,
    weightCost: cheapest.weightCost,
    totalCost: cheapest.totalCost,
    currency: CURRENCY,
    justification,
    breakdown,
    alternatives,
    cheapestOption: cheapest,
  };
}
