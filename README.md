# RBH-1: Runaway Supermassive Black Hole — Interactive Visualization

An interactive web visualization of the first confirmed runaway supermassive black hole, based on [Van Dokkum et al. (2026, ApJL 998:L27)](https://arxiv.org/abs/2302.04888).

A ~20 million solar mass black hole was ejected from its host galaxy and is barreling through intergalactic space at **954 km/s (0.32% c)**, creating a 62 kpc bow shock wake of compressed gas and newborn stars.

## Features

### 3D Bow Shock Visualization
- Real-time Three.js scene with the Wilkin (1996) parametric bow shock surface
- 15,000 CGM gas particles flowing around the shock with realistic deflection
- SMBH with accretion glow and lensing halo at the apex
- Tapered wake tube with velocity-encoded colors
- Neon glow aesthetic with bloom post-processing
- OrbitControls for rotation and zoom

### Position-Velocity Diagram
- Full implementation of Equations 1-8 from the paper
- Azimuthal averaging, limb brightening, and wake baseline velocity
- Interactive sliders for v★, inclination, χ, θ, emissivity index p, and aperture radius
- Observed data points with error bars overlaid

### Wake Velocity Profile
- Delayed-mixing exponential model (Equation 19)
- Shock velocity curve (Equation 13) as dashed overlay
- Sliders for v₀, delay distance, mixing length, and curvature radius
- Observed wake velocity data overlay

### Bow Shock Schematic
- 2D side-view diagram of the complete system
- Wilkin shock profile with wireframe grid
- Animated flow arrows showing gas deflection
- Wake structure with host galaxy marker
- Scale bar and standoff radius annotation

### Planetary Encounter Mode
- "What happens to a solar system in its path" scenario
- Solar system with 8 planets at correct relative orbital radii
- Adjustable BH mass, velocity, and closest approach distance
- Timeline slider from approach through disruption to aftermath
- Tidal disruption, Hill sphere collapse, and gravitational slingshot effects
- Phase-by-phase info callouts explaining the physics

### Dashboard
Real-time derived quantities: BH mass estimate, standoff radius, Mach number, wake age, shock velocity, LOS velocity, and v/c.

## Physics

All equations implemented from Van Dokkum et al. (2026):

| Equation | Description | File |
|----------|-------------|------|
| Eq 1 | Tangential flow velocity v_t(θ) = v★ sin(θ) | `velocity.js` |
| Eq 3 | Wake LOS velocity v_LOS = v★(1-1/χ)sin(i) | `velocity.js` |
| Eq 6 | Azimuthal averaging ⟨cos φ⟩(ξ) | `velocity.js` |
| Eq 7 | Limb brightening weight W_p | `velocity.js` |
| Eq 8 | Full PV model | `velocity.js` |
| Eq 13 | Shock velocity v_s(r) | `shockvel.js` |
| Eq 19 | Delayed-mixing wake model | `wake.js` |
| Eq 23 | BH mass estimate from momentum balance | `energetics.js` |
| Wilkin (1996) | Bow shock shape R(θ) = R₀ csc(θ)√(3(1-θcot(θ))) | `bowshock.js` |

## Tech Stack

- **Single HTML page** with ES modules (no build system)
- **Three.js** (CDN) for 3D visualization with UnrealBloomPass post-processing
- **Canvas 2D** for scientific plots
- Dark space theme with neon glow aesthetic
- Google Fonts: Inter + JetBrains Mono

## Running Locally

```bash
cd BlackHoleSim
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765).

## File Structure

```
├── index.html                 # App shell, CSS Grid layout, CDN imports
├── css/
│   ├── main.css               # Dark theme, grid layout, typography
│   ├── panels.css             # Panel chrome, tabs, dashboard overlay
│   └── controls.css           # Sliders, toggles, toolbar
├── js/
│   ├── app.js                 # Bootstrap, state management, animation loop
│   ├── physics/
│   │   ├── constants.js       # Physical constants, paper defaults
│   │   ├── bowshock.js        # Wilkin bow shock geometry
│   │   ├── velocity.js        # PV model (Eq 1-8)
│   │   ├── wake.js            # Delayed-mixing model (Eq 19)
│   │   ├── shockvel.js        # Shock velocity (Eq 13)
│   │   └── energetics.js      # Mass estimate, Mach number, wake age
│   ├── viz/
│   │   ├── scene3d.js         # Three.js scene, camera, bloom, neon grid
│   │   ├── bowshock-mesh.js   # Parametric Wilkin surface mesh + shader
│   │   ├── particles.js       # 15k CGM gas particle system
│   │   ├── wake-trail.js      # 3D tapered wake tube
│   │   ├── smbh-object.js     # Black hole + accretion glow + halo
│   │   └── planetary-encounter.js  # Solar system encounter scenario
│   ├── plots/
│   │   ├── pv-diagram.js      # Position-velocity diagram (Canvas 2D)
│   │   ├── wake-profile.js    # Wake velocity profile (Canvas 2D)
│   │   └── schematic.js       # Bow shock side-view schematic
│   └── ui/
│       ├── sliders.js         # Slider factory + parameter configs
│       ├── dashboard.js       # Derived quantities overlay
│       └── tabs.js            # Panel tab switching
└── data/
    ├── observed-pv.json       # Digitized Figure 7 data
    └── observed-wake.json     # Digitized Figure 10 data
```

## Reference

Van Dokkum, P. et al. (2026). "A candidate runaway supermassive black hole identified by shocks and star formation in its wake." *The Astrophysical Journal Letters*, 998:L27.

## License

MIT
