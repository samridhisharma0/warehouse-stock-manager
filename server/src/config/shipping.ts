// -----------------------------------------------------------------------------
// Static configuration for the Tier 3 rate & routing engine.
//
// Zone-rate matrix: warehouses are assigned to zones by 2-digit pincode prefix.
// Vehicles are ordered smallest-to-largest so the optimizer can pick the cheapest
// that fits, or split across multiple vehicles when needed.
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
  // Human-readable description of the zone for the UI.
  description: string;
}

// Zones are matched by the first two digits of a 6-digit Indian pincode.
// Anything that does not match falls back to the REMOTE zone below.
//
// Zone A — Metro / Local: major metros (Delhi, Mumbai, Bangalore, Chennai, Kolkata, Pune)
// Zone B — Regional: state capitals and large cities within 500 km of a metro
// Zone C — National: mid-tier cities across the country
// Zone D — Remote / Unmapped: anything that doesn't match above
export const ZONES: Zone[] = [
  {
    id: 'A',
    name: 'Metro / Local',
    ratePerKg: 30,
    prefixes: ['11', '20', '12', '40', '56', '60', '70', '41', '50'],
    description: 'Major metros — fastest delivery, lowest rates.',
  },
  {
    id: 'B',
    name: 'Regional',
    ratePerKg: 50,
    prefixes: ['30', '38', '39', '44', '62', '68', '74', '76', '78'],
    description: 'State capitals and large regional hubs.',
  },
  {
    id: 'C',
    name: 'National',
    ratePerKg: 80,
    prefixes: ['13', '14', '15', '24', '25', '26', '80', '82', '84', '85', '17', '18', '19', '36', '37'],
    description: 'Mid-tier cities — standard nationwide delivery.',
  },
];

export const REMOTE_ZONE: Zone = {
  id: 'D',
  name: 'Remote / Unmapped',
  ratePerKg: 120,
  prefixes: [],
  description: 'Remote areas — premium rates apply.',
};

export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
  // Flat dispatch cost per vehicle deployed ("Base Rate" in the brief's formula).
  dispatchCost: number;
  // Cost per km for this vehicle type (for multi-vehicle routing).
  costPerKm: number;
  // Max distance in km for this vehicle type.
  maxRangeKm: number;
}

// Ordered smallest-to-largest so the engine can pick the cheapest vehicle that fits.
// The optimizer tries every feasible combination and picks the minimum total cost.
export const VEHICLES: Vehicle[] = [
  { id: 'bike', name: 'Bike', capacityKg: 20, dispatchCost: 50, costPerKm: 5, maxRangeKm: 150 },
  { id: 'van', name: 'Van', capacityKg: 200, dispatchCost: 300, costPerKm: 12, maxRangeKm: 500 },
  { id: 'truck', name: 'Truck', capacityKg: 1000, dispatchCost: 1200, costPerKm: 25, maxRangeKm: 2000 },
];

export const LARGEST_VEHICLE = VEHICLES[VEHICLES.length - 1];
