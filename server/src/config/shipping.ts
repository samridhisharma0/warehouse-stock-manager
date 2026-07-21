// -----------------------------------------------------------------------------
// Static configuration for the Tier 3 rate & routing engine.
//
// These values are illustrative business config. In a real system they would
// live in a database / admin panel; here they are hard-coded and documented so
// the reviewer can trace every number in the cost breakdown.
// -----------------------------------------------------------------------------

// Volumetric weight = (L x W x H) / divisor, with dimensions in cm and the
// result in kg. 5000 is the industry-standard courier divisor.
export const VOLUMETRIC_DIVISOR = 5000;

export const CURRENCY = 'INR';

export interface Zone {
  id: string;
  name: string;
  ratePerKg: number;
  // 2-digit pincode prefixes that map to this zone.
  prefixes: string[];
}

// Zones are matched by the first two digits of a 6-digit Indian pincode.
// Anything that does not match falls back to the REMOTE zone below.
export const ZONES: Zone[] = [
  { id: 'A', name: 'Metro / Local', ratePerKg: 30, prefixes: ['11', '20', '12', '40', '56', '60', '70'] },
  { id: 'B', name: 'Regional', ratePerKg: 50, prefixes: ['30', '38', '39', '41', '44', '50', '62', '68'] },
  { id: 'C', name: 'National', ratePerKg: 80, prefixes: ['13', '14', '15', '24', '25', '26', '80', '82', '84'] },
];

export const REMOTE_ZONE: Zone = {
  id: 'D',
  name: 'Remote / Unmapped',
  ratePerKg: 120,
  prefixes: [],
};

export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
  // Flat dispatch cost per vehicle deployed ("Base Rate" in the brief's formula).
  dispatchCost: number;
}

// Ordered smallest-to-largest so the engine can pick the cheapest vehicle that fits.
export const VEHICLES: Vehicle[] = [
  { id: 'bike', name: 'Bike', capacityKg: 20, dispatchCost: 50 },
  { id: 'van', name: 'Van', capacityKg: 200, dispatchCost: 300 },
  { id: 'truck', name: 'Truck', capacityKg: 1000, dispatchCost: 1200 },
];

export const LARGEST_VEHICLE = VEHICLES[VEHICLES.length - 1];
