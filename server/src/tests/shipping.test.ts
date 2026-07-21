import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.STOCKROOM_PERSIST = 'off';

import { calculateShipping, resolveZone, volumetricWeight } from '../logic/shipping.js';

test('volumetric weight uses the 5000 divisor', () => {
  // 50 x 40 x 30 = 60000 cm^3 / 5000 = 12 kg
  assert.equal(volumetricWeight(50, 40, 30), 12);
});

test('unknown pincode falls back to the remote zone', () => {
  assert.equal(resolveZone('999999').id, 'D');
});

test('chargeable weight is the greater of actual and volumetric', () => {
  const res = calculateShipping({
    destinationPincode: '110001', // Zone A, 30/kg
    items: [{ quantity: 1, weightKg: 2, lengthCm: 50, widthCm: 40, heightCm: 30 }], // vol = 12kg
  });
  assert.equal(res.totalChargeableWeightKg, 12); // volumetric wins over 2kg actual
  assert.equal(res.vehicle, 'Bike'); // 12kg fits a bike (<=20)
  // cost = 1 x 50 dispatch + 12 x 30 = 50 + 360 = 410
  assert.equal(res.totalCost, 410);
});

test('picks the cheapest vehicle that fits the weight', () => {
  const res = calculateShipping({
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 150, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.equal(res.vehicle, 'Van'); // 150kg > bike(20), fits van(200)
  assert.equal(res.vehicleCount, 1);
});

test('splits across multiple trucks when over the largest capacity', () => {
  const res = calculateShipping({
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 2500, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.equal(res.vehicle, 'Truck');
  assert.equal(res.vehicleCount, 3); // ceil(2500 / 1000)
  // cost = 3 x 1200 + 2500 x 30 = 3600 + 75000 = 78600
  assert.equal(res.totalCost, 78600);
});

test('rejects invalid pincodes', () => {
  assert.throws(() =>
    calculateShipping({ destinationPincode: 'abc', items: [{ quantity: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }] }),
  );
});
