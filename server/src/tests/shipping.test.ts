import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.STOCKROOM_PERSIST = 'off';

import { calculateShipping, resolveZone, volumetricWeight } from '../logic/shipping.js';

test('volumetric weight uses the 5000 divisor', () => {
  assert.equal(volumetricWeight(50, 40, 30), 12);
});

test('unknown pincode falls back to the remote zone', () => {
  const zone = resolveZone('999999');
  assert.equal(zone.id, 'D');
  assert.equal(zone.ratePerKg, 120);
});

test('chargeable weight is the greater of actual and volumetric', () => {
  const res = calculateShipping({
    originPincode: '110001',
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 2, lengthCm: 50, widthCm: 40, heightCm: 30 }],
  });
  assert.equal(res.totalChargeableWeightKg, 12);
  assert.equal(res.vehicle, 'Bike');
  assert.equal(res.totalCost, 410);
});

test('picks the cheapest vehicle that fits the weight', () => {
  const res = calculateShipping({
    originPincode: '110001',
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 150, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.equal(res.vehicle, 'Van');
  assert.equal(res.vehicleCount, 1);
});

test('splits across multiple trucks when over the largest capacity', () => {
  const res = calculateShipping({
    originPincode: '110001',
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 2500, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.equal(res.vehicle, 'Truck');
  assert.equal(res.vehicleCount, 3);
  assert.equal(res.totalCost, 78600);
});

test('rejects invalid destination pincodes', () => {
  assert.throws(() =>
    calculateShipping({ originPincode: '110001', destinationPincode: 'abc', items: [{ quantity: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }] }),
  );
});

test('rejects invalid origin pincodes', () => {
  assert.throws(() =>
    calculateShipping({ originPincode: 'abc', destinationPincode: '110001', items: [{ quantity: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }] }),
  );
});

test('rejects unknown origin pincodes with no warehouse match', () => {
  assert.throws(() =>
    calculateShipping({ originPincode: '999999', destinationPincode: '110001', items: [{ quantity: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }] }),
  );
});

test('returns alternatives sorted by cost', () => {
  const res = calculateShipping({
    originPincode: '110001',
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 150, lengthCm: 1, widthCm: 1, heightCm: 1 }],
  });
  assert.ok(res.alternatives.length >= 1, 'should have at least one alternative');
  for (const alt of res.alternatives) {
    assert.ok(alt.totalCost >= res.cheapestOption.totalCost, `alternative ${alt.vehicle} should cost >= cheapest`);
  }
});

test('includes zone info in response', () => {
  const res = calculateShipping({
    originPincode: '110001',
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
    originPincode: '110001',
    destinationPincode: '110001',
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  const resB = calculateShipping({
    originPincode: '110001',
    destinationPincode: '300001',
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  assert.ok(resB.zoneInfo.ratePerKg > resA.zoneInfo.ratePerKg, 'Zone B rate should be higher than Zone A');
});

test('zone C has higher rate than zone B', () => {
  const resB = calculateShipping({
    originPincode: '110001',
    destinationPincode: '300001',
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  const resC = calculateShipping({
    originPincode: '110001',
    destinationPincode: '130001',
    items: [{ quantity: 1, weightKg: 10, lengthCm: 10, widthCm: 10, heightCm: 10 }],
  });
  assert.ok(resC.zoneInfo.ratePerKg > resB.zoneInfo.ratePerKg, 'Zone C rate should be higher than Zone B');
});
