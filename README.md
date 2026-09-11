# Lab Simulation: Measuring the Acceleration Due to Gravity on Earth’s Surface “g”

An interactive virtual laboratory and pedagogical demonstration tool designed for high school and AP Physics classrooms. Authored as part of **The Thinking Experiment** (PhysicsKit).

---

## 🎯 Pedagogical Purpose & Lab Alignment

This simulation directly supports the laboratory investigation **"Measuring the Acceleration Due to Gravity on Earth’s Surface 'g'"**, comparing two distinct classical experimental methodologies:

1. **Method I: Digital Photogates**
   - Uses a vertical stand equipped with **4 dual-sensor photogates** (each containing two optical beams, *Gate 1* and *Gate 2*, spaced 2.0 cm apart).
   - Students measure the height of each gate sensor eye using a precision metric scale.
   - Dropping the test object triggers digital state transitions (`0` $\rightarrow$ `1` when blocked) recorded in a digital event log table.
   - Evaluates human release variability ($v_{0y} \neq 0$) and parallax measurement uncertainty.

2. **Method II: 60 Hz Ticker Tape Timer**
   - Uses an AC electromagnetic ticker timer vibrating at **60 Hz** ($\Delta t = 1/60\text{ s} \approx 0.01667\text{ s}$).
   - A paper tape threaded beneath a rotating carbon transfer disc is pulled downward by a falling mass.
   - Students select the first clear mark as **Dot 0 (Origin)**, and use a draggable calibrated metric ruler to measure 12 consecutive points without skipping.
   - Explores mechanical friction (clapper pin resistance and guide drag) which systematically lowers measured acceleration ($a \approx 9.5\text{--}9.7\text{ m/s}^2$).

3. **Parabolic Modeling & Mathematical Kinematics**
   - Graphs **Position vs. Time** ($y\text{--}t$) for both methods.
   - Applies a quadratic fit:
     $$y(t) = A t^2 + B t + C$$
   - Corresponds directly to the kinematic freefall equation:
     $$y(t) = \frac{1}{2} a t^2 + v_{0y} t + y_0$$
     - Acceleration: $a = 2A \implies g = |a|$
     - Initial velocity: $v_{0y} = B$
     - Initial position: $y_0 = C$
   - Computes percentage difference against reference $g = 9.80\text{ m/s}^2$:
     $$\% \text{ difference} = \frac{|\text{Experimental Value} - \text{Reference Value}|}{\text{Reference Value}} \times 100\%$$
   - Guides 3-point experimental error analysis with teacher rubric notes.

---

## 🛠️ Technology & Architecture Standards

- **No-Build Standard**: Pure vanilla HTML5, Canvas 2D API, and modular ES6 JavaScript.
- **Design System Strict Compliance**:
  - **Teal Headers**: `#0f7e9b` (structural anchors, branding, primary controls).
  - **Amber Accents**: `#d67b19` (interactive elements, laser beams, data points).
  - **Surfaces**: `#ffffff` on `#f4f9fc` blueprint grid.
  - **Zero Prohibited Colors**: Strictly NO Purple (`#59118e`) and NO Gold (`#ffc61e`).
  - **Cross-Browser Canvas**: Path rendering via `arcTo`, responsive DPR handling.
  - **SI / Metric Only**: Meters ($m$), centimeters ($cm$), seconds ($s$), $m/s$, $m/s^2$.
- **Print & PDF Ready**: High-resolution print CSS allowing students to print or export their 3-page lab report directly to PDF.

---

## 🧪 Running Automated Tests

Run the pure physics and regression test suite:

```bash
node --test tests/freefallPhysics.test.js
```

All tests verify freefall kinematics, gate pass timings, 60 Hz ticker tape spacing, and quadratic matrix inversion without DOM dependencies.
