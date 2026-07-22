import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.STOCKROOM_PERSIST = 'off';

import { calculateShipping, resolveZone, volumetricWeight } from '../logic/shipping.js';

test('volumetric weight uses the 5000 divisor', () => {
  // 50 x 40 x 30 = 60000 cm^3 / 5000 = 12 kg
  assert.equal(volumetricWeight(50, 40, 30), 12);
});

test('unknown pincode falls back to the remote zone', () => {
  const zone = resolveZone('999999');
  assert.equal(zone.id, 'D');
  assert.equal(zone.ratePerKg, 120);
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

test('returns alternatives sorted by cost', () => {
  const res = calculateShipping({
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 150, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.ok(res.alternatives.length >= 1, 'should have at least one alternative');
  // All alternatives should cost more than or equal to the cheapest
  for (const alt of res.alternatives) {
    assert.ok(alt.totalCost >= res.cheapestOption.totalCost, `alternative ${alt.vehicle} should cost >= cheapest`);
  }
});

test('includes zone info in response', () => {
  const res = calculateShipping({
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 5, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  assert.equal(res.zoneInfo.id, 'A');
  assert.equal(res.zoneInfo.name, 'Metro / Local');
  assert.equal(res.zoneInfo.ratePerKg, 30);
  assert.ok(res.zoneInfo.description.length > 0);
});

test('zone B has higher rate than zone A', () => {
  const resA = calculateShipping({
    destinationPincode: '110001', // Zone A
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  const resB = calculateShipping({
    destinationPincode: '300001', // Zone B
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  assert.ok(resB.zoneInfo.ratePerKg > resA.zoneInfo.ratePerKg, 'Zone B rate should be higher than Zone A');
});

test('zone C has higher rate than zone B', () => {
  const resB = calculateShipping({
    destinationPincode: '300001', // Zone B
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  const resC = calculateShipping({
    destinationPincode: '130001', // Zone C
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  assert.ok(resC.zoneInfo.ratePerKg > resB.zoneInfo.ratePerKg, 'Zone C rate should be higher than Zone B');
});
