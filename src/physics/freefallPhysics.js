/**
 * Freefall Physics Engine
 * Part of "The Thinking Experiment" PhysicsKit
 * Zero DOM dependencies - pure mathematical modeling
 */

export const STANDARD_G = 9.80; // m/s^2

/**
 * Simulates an object falling through a set of photogates.
 * 
 * In standard high school physics setups, dual-sensor photogates have two
 * optical gates (Gate 1 and Gate 2) separated by a fixed distance (typically 0.020 m / 2 cm).
 * 
 * @param {Object} options
 * @param {Array<{id: number, y1: number, y2: number}>} options.gates - Heights of sensor beams (in meters from datum)
 * @param {number} options.dropHeight - Release height in meters
 * @param {number} [options.g=9.80] - Gravitational acceleration (m/s^2)
 * @param {number} [options.initialVelocity=0] - Initial release velocity (m/s)
 * @param {number} [options.objectLength=0.12] - Length of dropped object (m)
 * @param {boolean} [options.applyUncertainty=true] - Whether to apply realistic release jitter & noise
 * @param {number} [options.jitter=0] - Randomization factor
 * @returns {Object} Simulation results including event logs and gate-block timestamps
 */
export function simulatePhotogateDrop({
  gates = [
    { id: 1, y1: 0.800, y2: 0.780 },
    { id: 2, y1: 0.600, y2: 0.580 },
    { id: 3, y1: 0.400, y2: 0.380 },
    { id: 4, y1: 0.200, y2: 0.180 }
  ],
  dropHeight = 0.950,
  g = STANDARD_G,
  initialVelocity = 0,
  objectLength = 0.120,
  applyUncertainty = true,
  jitter = 0
}) {
  // Realistic experimental variations:
  // Slight human release variance (drop height slightly varied by +/- 2mm, tiny initial release nudge)
  const effDropHeight = applyUncertainty ? dropHeight + (jitter * 0.003) : dropHeight;
  const effV0 = applyUncertainty ? initialVelocity + (jitter * 0.035) : initialVelocity;
  // Subtle air drag effect on lightweight object
  const effG = applyUncertainty ? g * (1 - Math.abs(jitter) * 0.004) : g;

  const events = [];
  const gateMeasurements = [];

  // Each gate beam is at absolute height y relative to floor.
  // When falling from effDropHeight, the distance fallen to reach height y is:
  // d = effDropHeight - y
  // Using d(t) = effV0 * t + 0.5 * effG * t^2
  // 0.5 * effG * t^2 + effV0 * t - d = 0
  // t = (-effV0 + sqrt(effV0^2 + 2 * effG * d)) / effG

  const calculateFallTime = (d) => {
    if (d <= 0) return 0;
    const discriminant = (effV0 * effV0) + (2 * effG * d);
    if (discriminant < 0) return null;
    return (-effV0 + Math.sqrt(discriminant)) / effG;
  };

  gates.forEach((gate, index) => {
    // Top beam (Gate 1)
    const d1_block = effDropHeight - gate.y1;
    const t1_block = calculateFallTime(d1_block);
    const d1_unblock = effDropHeight - (gate.y1 - objectLength);
    const t1_unblock = calculateFallTime(d1_unblock);

    // Bottom beam (Gate 2)
    const d2_block = effDropHeight - gate.y2;
    const t2_block = calculateFallTime(d2_block);
    const d2_unblock = effDropHeight - (gate.y2 - objectLength);
    const t2_unblock = calculateFallTime(d2_unblock);

    // Add tiny sensor timing jitter (~10-20 microseconds) if uncertainty is enabled
    const timeJitter = applyUncertainty ? (Math.sin(index * 7 + jitter) * 0.00004) : 0;

    const t1Blocked = t1_block !== null ? Math.max(0, t1_block + timeJitter) : null;
    const t1Unblocked = t1_unblock !== null ? Math.max(0, t1_unblock + timeJitter) : null;
    const t2Blocked = t2_block !== null ? Math.max(0, t2_block + timeJitter) : null;
    const t2Unblocked = t2_unblock !== null ? Math.max(0, t2_unblock + timeJitter) : null;

    if (t1Blocked !== null) {
      events.push({
        time: t1Blocked,
        gateId: gate.id,
        channel: 'Gate 1',
        sensorName: `Photogate ${gate.id} - Gate 1`,
        state: 1,
        height: gate.y1
      });
      events.push({
        time: t1Unblocked,
        gateId: gate.id,
        channel: 'Gate 1',
        sensorName: `Photogate ${gate.id} - Gate 1`,
        state: 0,
        height: gate.y1
      });
    }

    if (t2Blocked !== null) {
      events.push({
        time: t2Blocked,
        gateId: gate.id,
        channel: 'Gate 2',
        sensorName: `Photogate ${gate.id} - Gate 2`,
        state: 1,
        height: gate.y2
      });
      events.push({
        time: t2Unblocked,
        gateId: gate.id,
        channel: 'Gate 2',
        sensorName: `Photogate ${gate.id} - Gate 2`,
        state: 0,
        height: gate.y2
      });
    }

    gateMeasurements.push({
      photogateId: gate.id,
      gate1: { height: gate.y1, blockedTime: t1Blocked, unblockedTime: t1Unblocked },
      gate2: { height: gate.y2, blockedTime: t2Blocked, unblockedTime: t2Unblocked }
    });
  });

  // Sort events chronologically
  events.sort((a, b) => a.time - b.time);

  // Time zero reference: Timing begins the exact instant the object interrupts Gate 1!
  const firstBlock = events.find(e => e.state === 1);
  const tRef = firstBlock ? firstBlock.time : 0;

  events.forEach(e => {
    e.time = Math.max(0, e.time - tRef);
  });

  gateMeasurements.forEach(m => {
    if (m.gate1.blockedTime !== null) m.gate1.blockedTime = Math.max(0, m.gate1.blockedTime - tRef);
    if (m.gate1.unblockedTime !== null) m.gate1.unblockedTime = Math.max(0, m.gate1.unblockedTime - tRef);
    if (m.gate2.blockedTime !== null) m.gate2.blockedTime = Math.max(0, m.gate2.blockedTime - tRef);
    if (m.gate2.unblockedTime !== null) m.gate2.unblockedTime = Math.max(0, m.gate2.unblockedTime - tRef);
  });

  // Velocity when reaching Gate 1 (top beam of first gate)
  const dToGate1 = Math.max(0, effDropHeight - (gates[0] ? gates[0].y1 : effDropHeight));
  const vAtGate1 = Math.sqrt((effV0 * effV0) + (2 * effG * dToGate1));

  return {
    effDropHeight,
    effV0,
    effG,
    vAtGate1,
    tRef,
    events,
    gateMeasurements
  };
}

/**
 * Simulates a 60 Hz ticker tape timer recording the free fall of a weight.
 * 
 * Standard classroom ticker timers produce 60 dots per second (dt = 1/60 s = 0.016667 s).
 * Due to mechanical friction against the tape guide, carbon paper disc, and the
 * vibrating clapper pin, real acceleration is slightly lower than theoretical g
 * (typically ~9.5 to 9.7 m/s^2).
 * 
 * @param {Object} options
 * @param {number} [options.numDots=16] - Total dots generated on tape
 * @param {number} [options.frequency=60] - Ticker frequency in Hz (default 60 Hz)
 * @param {number} [options.g=STANDARD_G] - Gravitational constant
 * @param {number} [options.frictionDecel=0.16] - Effective deceleration due to friction (m/s^2)
 * @param {boolean} [options.applyUncertainty=true] - Add mechanical noise & ruler measurement jitter
 * @param {number} [options.jitter=0] - Randomization seed
 * @returns {Object} Generated dots array and metadata
 */
export function simulateTickerTape({
  numDots = 16,
  frequency = 60,
  g = STANDARD_G,
  frictionDecel = 0.16, // m/s^2 friction slowing down the tape
  applyUncertainty = true,
  jitter = 0
}) {
  const dt = 1 / frequency;
  const netA = applyUncertainty ? Math.max(8.0, (g - frictionDecel) * (1 + jitter * 0.008)) : g;
  
  // Initial release may have a tiny crawl before full detachment
  const initialV = applyUncertainty ? Math.max(0.01, 0.02 + jitter * 0.01) : 0;
  
  const rawDots = [];
  for (let n = 0; n < numDots; n++) {
    const t = n * dt;
    // Pure kinematic displacement: y = v0*t + 0.5*a*t^2
    let pos = (initialV * t) + (0.5 * netA * t * t);
    
    // Add tiny physical clapper strike position variation (+/- 0.15 mm)
    if (applyUncertainty && n > 0) {
      const strikeNoise = Math.sin(n * 4.3 + jitter) * 0.00018;
      pos = Math.max(rawDots[n - 1].posMeters + 0.0005, pos + strikeNoise);
    }

    // Realistic carbon disc strike quality:
    // In student mode, some marks are fainter or slightly smudged (e.g. dots 3, 7, 11)
    let clarity = 1.0;
    let isFaint = false;
    if (applyUncertainty) {
      const noise = Math.abs(Math.sin(n * 2.71 + jitter * 3.14));
      if (noise < 0.28 && n > 1) {
        clarity = 0.35 + (noise * 0.4);
        isFaint = true;
      } else {
        clarity = 0.80 + (noise * 0.20);
      }
    }
    
    rawDots.push({
      dotIndex: n,
      timeSeconds: t,
      posMeters: pos,
      posCm: pos * 100,
      clarity,
      faint: isFaint
    });
  }

  return {
    frequency,
    dt,
    netAcceleration: netA,
    theoreticalG: g,
    rawDots
  };
}

/**
 * Extracts 12 consecutive dots starting from a chosen origin dot (Dot 0 = 0 s, 0 m).
 * 
 * @param {Array} rawDots 
 * @param {number} originIndex 
 * @param {number} count 
 * @returns {Array<{n: number, dotNumber: number, time: number, position: number, positionCm: number}>}
 */
export function extract12DotDataset(rawDots, originIndex = 0, count = 12) {
  if (!rawDots || rawDots.length <= originIndex) return [];
  const baseDot = rawDots[originIndex];
  const dt = rawDots.length > 1 ? rawDots[1].timeSeconds - rawDots[0].timeSeconds : (1 / 60);

  const dataset = [];
  for (let i = 0; i < count; i++) {
    const currentIdx = originIndex + i;
    if (currentIdx >= rawDots.length) break;
    const currentDot = rawDots[currentIdx];
    const relTime = i * dt;
    const relPos = Math.max(0, currentDot.posMeters - baseDot.posMeters);
    
    dataset.push({
      n: i,
      dotNumber: currentIdx,
      time: relTime,
      position: relPos,
      positionCm: relPos * 100
    });
  }

  return dataset;
}
