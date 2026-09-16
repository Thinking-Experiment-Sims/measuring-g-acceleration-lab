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
  fitLinearizedT2,
  calculatePercentDifference
} from '../src/physics/regression.js';

test('Physics: Freefall through photogates starts time counting at Gate 1 (t = 0)', () => {
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

  // Check top gate 1 block time: MUST be 0.00000 s!
  const eventG1 = result.events.find(e => e.gateId === 1 && e.channel === 'Gate 1' && e.state === 1);
  assert.ok(eventG1);
  assert.equal(eventG1.time, 0, 'Gate 1 block time must be exactly zero');

  // Verify entrance velocity at Gate 1: v1 = sqrt(2 * g * d1) = sqrt(2 * 9.8 * 0.2) ~= 1.9799 m/s
  assert.ok(Math.abs(result.vAtGate1 - Math.sqrt(2 * 9.8 * 0.2)) < 0.001);

  // Gate 2 block time relative to Gate 1:
  // Total fall distance to Gate 2: 1.0 - 0.6 = 0.4 m => total t = sqrt(2 * 0.4 / 9.8) = ~0.2857 s
  // Fall distance to Gate 1: 0.2 m => t1 = sqrt(2 * 0.2 / 9.8) = ~0.2020 s
  // Relative t at Gate 2 = 0.2857 - 0.2020 = ~0.0837 s
  const eventG2 = result.events.find(e => e.gateId === 2 && e.channel === 'Gate 1' && e.state === 1);
  assert.ok(eventG2);
  const expectedRelT2 = Math.sqrt(2 * 0.4 / 9.8) - Math.sqrt(2 * 0.2 / 9.8);
  assert.ok(Math.abs(eventG2.time - expectedRelT2) < 0.001);
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

test('Regression: Linearization y vs. t^2 correctly evaluates model assumptions', () => {
  // Ideal case where v0 = 0: y(t) = 0.5 * 9.80 * t^2 + 0.80 = 4.90 * (t^2) + 0.80
  const idealPoints = [];
  for (let i = 0; i < 8; i++) {
    const t = i * 0.04;
    idealPoints.push({ t, y: 4.90 * t * t + 0.80 });
  }
  const linFitIdeal = fitLinearizedT2(idealPoints);
  assert.ok(linFitIdeal);
  assert.ok(Math.abs(linFitIdeal.slope - 4.90) < 1e-6);
  assert.ok(Math.abs(linFitIdeal.intercept - 0.80) < 1e-6);
  assert.ok(Math.abs(linFitIdeal.acceleration - 9.80) < 1e-6);
  assert.ok(Math.abs(linFitIdeal.r2 - 1.0) < 1e-6);

  // Case where v0 != 0 (as in photogates starting at gate 1): y(t) = 4.90*t^2 + 1.20*t + 0.80
  const v0Points = [];
  for (let i = 0; i < 8; i++) {
    const t = i * 0.04;
    v0Points.push({ t, y: 4.90 * t * t + 1.20 * t + 0.80 });
  }
  const linFitV0 = fitLinearizedT2(v0Points);
  assert.ok(linFitV0);
  // Linear fit cannot separate v0, so slope will deviate from 4.90 and R2 will be < 1.0
  assert.ok(linFitV0.r2 < 1.0, 'R2 should reflect curvature when v0 != 0');
  assert.ok(linFitV0.slope > 4.90, 'Slope absorbs initial velocity contribution');
});

test('Physics: Ticker tape produces 60 Hz dot spacing with friction and visual clarity', () => {
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

  // Verify that dots contain clarity metadata
  assert.ok(result.rawDots.every(d => typeof d.clarity === 'number' && d.clarity > 0));

  // Extract 12-dot dataset starting at dot 0
  const dataset = extract12DotDataset(result.rawDots, 0, 12);
  assert.equal(dataset.length, 12);
  assert.equal(dataset[0].time, 0);
  assert.equal(dataset[0].position, 0);

  // Perform quadratic fit on extracted dots
  const fit = fitQuadratic(dataset.map(d => ({ t: d.time, y: d.position })));
  assert.ok(fit);
  assert.ok(fit.gMeasured >= 9.2 && fit.gMeasured <= 9.9, `Measured g (${fit.gMeasured}) is within realistic range`);
  assert.ok(fit.r2 > 0.99, `R2 (${fit.r2}) is high`);
});

test('Analysis: Percent difference calculation matches lab formula', () => {
  const percentDiff = calculatePercentDifference(9.65, 9.80);
  // |9.65 - 9.80| / 9.80 * 100 = 0.15 / 9.80 * 100 = 1.5306%
  assert.ok(Math.abs(percentDiff - 1.5306) < 0.01);
});

test('Physics: Photogate flush drop (y_drop = Gate 1) yields realistic g ~ 9.80 m/s^2 in linearization', () => {
  const gates = [
    { id: 1, y1: 0.800, y2: 0.780 },
    { id: 2, y1: 0.600, y2: 0.580 },
    { id: 3, y1: 0.400, y2: 0.380 },
    { id: 4, y1: 0.200, y2: 0.180 }
  ];

  // Flush release at Gate 1 height
  const sim = simulatePhotogateDrop({
    gates,
    dropHeight: 0.800,
    g: 9.80,
    initialVelocity: 0,
    applyUncertainty: true,
    jitter: 0.2
  });

  // Extract blocked times for top beam of each gate
  const points = [];
  gates.forEach(g => {
    const ev = sim.events.find(e => e.gateId === g.id && e.channel === 'Gate 1' && e.state === 1);
    if (ev) points.push({ t: ev.time, y: g.y1 });
  });

  assert.equal(points.length, 4);
  assert.equal(points[0].t, 0, 'Gate 1 block time is reference t=0');

  // Linearized fit y vs t^2
  const linFit = fitLinearizedT2(points);
  assert.ok(linFit);
  assert.ok(linFit.gMeasured >= 9.65 && linFit.gMeasured <= 9.85,
    `Photogate flush linearization gMeasured (${linFit.gMeasured}) is near 9.80 m/s^2`);
  assert.ok(linFit.r2 > 0.999, `High linearity R2 = ${linFit.r2}`);
});

test('Physics: Ticker tape from Dot 0 yields acceleration lower than g due to friction', () => {
  const result = simulateTickerTape({
    numDots: 18,
    frequency: 60,
    g: 9.80,
    frictionDecel: 0.35,
    applyUncertainty: true,
    jitter: 0.15
  });

  // Extract 12 dots starting from Dot 0
  const dataset = extract12DotDataset(result.rawDots, 0, 12);
  assert.equal(dataset.length, 12);
  assert.equal(dataset[0].dotNumber, 0);

  const points = dataset.map(d => ({ t: d.time, y: d.position }));
  const linFit = fitLinearizedT2(points);
  assert.ok(linFit);

  // In real experiments, mechanical friction (clapper + tape guides) lowers a below 9.80
  assert.ok(linFit.acceleration < 9.80, `Acceleration (${linFit.acceleration}) must be lower than 9.80 m/s^2`);
  assert.ok(linFit.acceleration >= 9.20 && linFit.acceleration <= 9.65,
    `Realistic ticker tape acceleration (${linFit.acceleration}) between 9.20 and 9.65 m/s^2`);
  assert.ok(linFit.r2 > 0.998, `Linearity R2 = ${linFit.r2}`);
});

