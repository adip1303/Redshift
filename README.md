# Redshift

An interactive 3D visualization of the cosmic web — the largest known structure in the universe, where galaxies, clusters, and superclusters are strung together by filaments of dark matter spanning hundreds of millions of light-years, separated by vast empty voids.

## What is the cosmic web?

On the largest scales, matter in the universe isn't distributed randomly or evenly. Gravity has spent over 13 billion years pulling matter into a web-like architecture: dense knots where galaxies cluster, connected by thinner filaments of gas and dark matter, surrounded by enormous voids that are nearly empty. This structure is the cosmic web — sometimes called the "large-scale structure" of the universe.

The web didn't form by accident. In the very early universe, the cosmic microwave background shows tiny density fluctuations — regions only slightly denser than their surroundings, by about one part in 100,000. Gravity amplified those tiny differences over billions of years. Slightly denser regions pulled in more matter, which made them denser still, while underdense regions emptied out further as their matter drained toward the nearest overdensity. The result is the foam-like, filamentary structure cosmologists observe today: matter has collapsed into sheets, sheets have collapsed into filaments, and filaments have collapsed into nodes, while voids have expanded to fill most of the volume of the universe.

Cosmologists formally classify this structure into four components — voids, sheets, filaments, and nodes — known as the T-web classification. This visualization represents all four.

## What is redshift?

Redshift is how astronomers measure both distance and motion across the universe. As the universe expands, light traveling from distant galaxies gets stretched — its wavelength increases, shifting it toward the red end of the spectrum. The further away a galaxy is, the more its light has been stretched on its journey to us, and the higher its redshift.

Redshift surveys — large astronomical projects that measure the redshift of millions of galaxies — are how the cosmic web was actually discovered and mapped. By converting redshift into distance, astronomers can plot the 3D positions of galaxies across the observable universe. When you do this at scale, the filamentary structure becomes visible: it isn't a smooth, even scatter of galaxies, it's a web. Surveys like the Sloan Digital Sky Survey (SDSS) and the 2-degree Field Galaxy Redshift Survey (2dF) produced the datasets that first revealed this structure clearly, and they remain the scientific basis for how the cosmic web is understood today.

## What you're actually looking at

Every visual element in this scene maps to something real in large-scale cosmic structure:

**Filaments (the glowing threads)** — These represent the dark matter and gas filaments that form the skeleton of the cosmic web. Dark matter, which makes up roughly 85% of all matter in the universe, doesn't interact with light, so it's invisible directly. But its gravity sculpts the visible matter — galaxies and gas — into the same filamentary shape, which is what astronomers can actually observe and what's being represented here.

**Nodes (the bright points)** — These mark galaxy clusters and superclusters, the densest regions of the cosmic web, sitting at the intersections of multiple filaments. In reality, a single node in this visualization could represent a structure containing thousands of individual galaxies, each with billions of stars. The brightest, largest nodes — rendered with a warm glow halo — represent superclusters: the largest gravitationally associated structures in the universe, sometimes spanning hundreds of millions of light-years. Our own galaxy, the Milky Way, sits inside one such structure (Laniakea).

**The fog (subtle haze near filaments and nodes)** — This represents the warm-hot intergalactic medium: extremely diffuse gas that exists between galaxies, tracing the same filamentary structure as dark matter but at far lower density. Most of the normal (non-dark) matter in the universe exists in this state — not locked up in stars or galaxies, but spread thin across the cosmic web.

**The flowing particles** — These represent matter actively flowing along filaments toward gravitational overdensities, exactly as gas and dark matter do in reality. Nothing in the cosmic web is static — galaxies and gas are continuously funneled along filaments toward the nodes where clusters form, a process that has been ongoing since the early universe and continues today.

**The empty space (voids)** — The dark regions between filaments aren't just empty backdrop — they're voids, and they make up the overwhelming majority of the universe's volume by far. Voids are sparse, but not perfectly empty; a small number of galaxies do exist within them, just at vastly lower density than in filaments or nodes.

## Why "generate new web" exists

The cosmic web you can observe — within the boundaries of the observable universe — is just one particular arrangement of structure out of an effectively unlimited number of arrangements that could exist. The universe is, as far as we can tell, vastly larger than the observable portion we can ever measure, and statistically, structures similar to but distinct from our own cosmic web almost certainly exist elsewhere, both within regions we simply haven't observed and within regions that are permanently unobservable due to the limits of the speed of light and cosmic expansion.

This visualization is procedurally generated rather than built from a single fixed dataset, specifically to reflect that idea. Each seed produces a structurally valid, scientifically consistent cosmic web — but a different one, the same way a different region of an unfathomably large universe would look different in its specific arrangement while still following the same underlying physical principles. There's no single "correct" cosmic web to render; there are infinite plausible ones, and clicking "New Web" generates another one of them.

## Features

- **Free orbit camera** — click and drag to rotate, scroll to zoom, bounded within a reasonable range
- **Procedural generation** — each seed produces a unique, deterministic web structure
- **Multiple palettes** — color schemes inspired by real observational modalities (dark matter gravitational lensing, thermal infrared, cosmic microwave background temperature anisotropy)
- **Animated particle flow** — particles drift along filaments toward gravitational overdensities, with ambient particles orbiting near nodes
- **Tiered structure** — superclusters, clusters, and galaxies rendered at different scales and brightness, each with its own connectivity density
- **Adjustable controls** — particle size, flow speed, and particle count are all tunable in real time

## Tech stack

- [Three.js](https://threejs.org/) for 3D rendering
- Vite for build tooling
- Custom GLSL shaders for filament glow, node breathing, and particle flow
- No external datasets — everything is procedurally generated using a seeded PRNG

## Running locally

```bash
npm install
npm run dev
```

## Credit

Inspired by [Laniakea](https://laniakea.vibe-coded.com/), a visualization of the Laniakea Supercluster. Redshift takes a different subject — the cosmic web at large-scale structure rather than a single supercluster — built independently from scratch.

## License

MIT
