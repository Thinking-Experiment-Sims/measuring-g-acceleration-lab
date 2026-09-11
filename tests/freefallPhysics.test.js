import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_G,
  simulatePhotogateDrop,
  simulateTickerTape,
  extract12DotDataset
} from '../src/physics/freefallPhysics.js';
import {
  fitQuadratic,
  calculatePercentDifference
} from '../src/physics/regression.js';

test('Physics: Freefall through photogates in ideal conditions', () => {
  const gates = [
    { id: 1, y1: 0.800, y2: 0.780 },
    { id: 2, y1: 0.600, y2: 0.580 },
    { id: 3, y1: 0.400, y2: 0.380 },
    { id: 4, y1: 0.200, y2: 0.180 }
  ];

  const result = simulatePhotogateDrop({
    gates,
    dropHeight: 1.000,
    g: 9.80,
    initialVelocity: 0,
    applyUncertainty: false
  });

  // Verify that all 8 gate transitions exist
  assert.equal(result.events.length, 16); // 8 blocks (1) + 8 unblocks (0)
  
  // Verify chronological order
  for (let i = 1; i < result.events.length; i++) {
    assert.ok(result.events[i].time >= result.events[i - 1].time);
  }

  // Check top gate 1 block time: d = 1.0 - 0.8 = 0.2m => t = sqrt(2 * 0.2 / 9.8) = ~0.2020 s
  const expectedT1 = Math.sqrt(2 * 0.2 / 9.8);
  const eventG1 = result.events.find(e => e.gateId === 1 && e.channel === 'Gate 1' && e.state === 1);
  assert.ok(eventG1);
  assert.ok(Math.abs(eventG1.time - expectedT1) < 0.001);
});

test('Regression: Perfect quadratic data recovers exact acceleration and g', () => {
  // y = 0.5 * 9.80 * t^2 + 0.15 * t + 0.05
  // A = 4.90, B = 0.15, C = 0.05
  const points = [];
  for (let i = 0; i < 10; i++) {
    const t = i * 0.05;
    const y = 4.90 * t * t + 0.15 * t + 0.05;
    points.push({ t, y });
  }

  const fit = fitQuadratic(points);
  assert.ok(fit);
  assert.ok(Math.abs(fit.A - 4.90) < 1e-6);
  assert.ok(Math.abs(fit.B - 0.15) < 1e-6);
  assert.ok(Math.abs(fit.C - 0.05) < 1e-6);
  assert.ok(Math.abs(fit.acceleration - 9.80) < 1e-6);
  assert.ok(Math.abs(fit.gMeasured - 9.80) < 1e-6);
  assert.ok(Math.abs(fit.r2 - 1.0) < 1e-6);
});

test('Physics: Ticker tape produces 60 Hz dot spacing with friction', () => {
  const result = simulateTickerTape({
    numDots: 16,
    frequency: 60,
    g: 9.80,
    frictionDecel: 0.18,
    applyUncertainty: true,
    jitter: 0.1
  });

  assert.equal(result.rawDots.length, 16);
  assert.equal(result.dt, 1 / 60);

  // Spacing between consecutive dots should increase (acceleration)
  for (let i = 2; i < result.rawDots.length; i++) {
    const gapCurrent = result.rawDots[i].posMeters - result.rawDots[i - 1].posMeters;
    const gapPrev = result.rawDots[i - 1].posMeters - result.rawDots[i - 2].posMeters;
    assert.ok(gapCurrent >= gapPrev, `Gap at dot ${i} (${gapCurrent}) should be >= gap at dot ${i-1} (${gapPrev})`);
  }

  // Extract 12-dot dataset starting at dot 0
  const dataset = extract12DotDataset(result.rawDots, 0, 12);
  assert.equal(dataset.length, 12);
  assert.equal(dataset[0].time, 0);
  assert.equal(dataset[0].position, 0);

  // Perform quadratic fit on extracted dots
  const fit = fitQuadratic(dataset.map(d => ({ t: d.time, y: d.position })));
  assert.ok(fit);
  // Realistic acceleration with friction should be around 9.5 to 9.7 m/s^2
  assert.ok(fit.gMeasured >= 9.2 && fit.gMeasured <= 9.9, `Measured g (${fit.gMeasured}) is within realistic range`);
  assert.ok(fit.r2 > 0.99, `R2 (${fit.r2}) is high`);
});

test('Analysis: Percent difference calculation matches lab formula', () => {
  const percentDiff = calculatePercentDifference(9.65, 9.80);
  // |9.65 - 9.80| / 9.80 * 100 = 0.15 / 9.80 * 100 = 1.5306%
  assert.ok(Math.abs(percentDiff - 1.5306) < 0.01);
});
