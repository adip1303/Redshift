import { DEFAULT_PALETTE } from '../palettes/palettes.js';

const DEFAULTS = {
  paletteKey: DEFAULT_PALETTE,
  minSize: 1.5,
  maxSize: 4.0,
  speed: 1.0,
  count: 5000,
};

function applyStyles(element, styles) {
  Object.assign(element.style, styles);
}

function createLabel(text, valueElement) {
  const label = document.createElement('div');
  applyStyles(label, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  });

  const textElement = document.createElement('span');
  textElement.textContent = text;
  label.appendChild(textElement);

  if (valueElement) {
    applyStyles(valueElement, {
      color: '#ffffff',
      textAlign: 'right',
    });
    label.appendChild(valueElement);
  }

  return label;
}

function createSection() {
  const section = document.createElement('div');
  section.style.marginBottom = '12px';
  return section;
}

function createSlider({ label, min, max, step, value, onInput }) {
  const section = createSection();
  const valueElement = document.createElement('span');
  valueElement.textContent = value;
  section.appendChild(createLabel(label, valueElement));

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  applyStyles(slider, {
    width: '100%',
    accentColor: '#888888',
  });

  slider.addEventListener('input', () => {
    const nextValue = Number(slider.value);
    valueElement.textContent = nextValue.toFixed(step < 1 ? 1 : 0);
    onInput(nextValue, slider, valueElement);
  });

  section.appendChild(slider);
  return { section, slider, valueElement };
}

export function initControls(params) {
  const panel = document.getElementById('control-panel') || document.createElement('div');
  panel.id = 'control-panel';
  panel.innerHTML = '';
  applyStyles(panel, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '240px',
    background: 'rgba(0,0,0,0.75)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '16px 16px 8px 16px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#aaaaaa',
    zIndex: '10',
    boxSizing: 'border-box',
  });

  if (!panel.parentElement) {
    document.body.appendChild(panel);
  }

  const titleBar = document.createElement('div');
  titleBar.textContent = 'Control Panel';
  applyStyles(titleBar, {
    fontSize: '12px',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '12px',
  });
  panel.appendChild(titleBar);

  const contentWrap = document.createElement('div');
  contentWrap.style.overflow = 'hidden';
  contentWrap.style.height = '0px';
  contentWrap.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
  panel.appendChild(contentWrap);

  const panelContent = document.createElement('div');
  panelContent.id = 'panel-content';
  panelContent.style.transformOrigin = 'top';
  panelContent.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
  panelContent.style.transform = 'scaleY(1)';
  panelContent.style.opacity = '1';
  panelContent.style.pointerEvents = 'auto';
  contentWrap.appendChild(panelContent);

  const paletteSection = createSection();
  paletteSection.appendChild(createLabel('Palette'));

  const paletteSelect = document.createElement('select');
  applyStyles(paletteSelect, {
    width: '100%',
    background: '#1a1a1a',
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#cccccc',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '11px',
  });

  for (const key of Object.keys(params.palettes)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = params.palettes[key].name;
    option.style.backgroundColor = '#1a1a1a';
    option.style.color = '#cccccc';
    paletteSelect.appendChild(option);
  }

  paletteSelect.value = DEFAULTS.paletteKey;
  paletteSelect.addEventListener('change', () => {
    params.onPaletteChange(paletteSelect.value);
  });

  paletteSection.appendChild(paletteSelect);
  panelContent.appendChild(paletteSection);

  let currentMin = DEFAULTS.minSize;
  let currentMax = DEFAULTS.maxSize;

  const minSlider = createSlider({
    label: 'Min particle size',
    min: 0.5,
    max: 4.0,
    step: 0.1,
    value: DEFAULTS.minSize,
    onInput(value, slider, valueElement) {
      currentMin = Math.min(value, currentMax);
      slider.value = currentMin;
      valueElement.textContent = currentMin.toFixed(1);
      params.onParticleSizeChange(currentMin, currentMax);
    },
  });
  panelContent.appendChild(minSlider.section);

  const maxSlider = createSlider({
    label: 'Max particle size',
    min: 2.0,
    max: 15.0,
    step: 0.1,
    value: DEFAULTS.maxSize,
    onInput(value, slider, valueElement) {
      currentMax = Math.max(value, currentMin);
      slider.value = currentMax;
      valueElement.textContent = currentMax.toFixed(1);
      params.onParticleSizeChange(currentMin, currentMax);
    },
  });
  panelContent.appendChild(maxSlider.section);

  const speedSlider = createSlider({
    label: 'Flow speed',
    min: 0.1,
    max: 12.0,
    step: 0.1,
    value: DEFAULTS.speed,
    onInput(value) {
      params.onParticleSpeedChange(value);
    },
  });
  panelContent.appendChild(speedSlider.section);

  const countSlider = createSlider({
    label: 'Particle count',
    min: 1000,
    max: 250000,
    step: 1000,
    value: DEFAULTS.count,
    onInput(value, slider, valueElement) {
      valueElement.textContent = value.toFixed(0);
      params.onParticleCountChange(value);
    },
  });
  panelContent.appendChild(countSlider.section);

  const seedSection = createSection();
  const seedValue = document.createElement('span');
  seedValue.textContent = params.currentSeed;
  seedSection.appendChild(createLabel('Seed', seedValue));

  const button = document.createElement('button');
  button.textContent = 'New Web';
  applyStyles(button, {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#cccccc',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
  });

  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(255,255,255,0.1)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(255,255,255,0.06)';
  });
  button.addEventListener('click', () => {
    const seed = Math.floor(Math.random() * 9999) + 1;
    seedValue.textContent = seed;
    params.onSeedChange(seed);
  });

  seedSection.appendChild(button);
  panelContent.appendChild(seedSection);

  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'expand ↓';
  applyStyles(toggleButton, {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    color: '#555555',
    fontFamily: 'monospace',
    fontSize: '10px',
    padding: '8px 0 0 0',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '12px',
  });

  let expanded = false;

  function expandFromCollapsedPanel(event) {
    if (event.target === toggleButton) return;
    setExpanded(true);
  }

  function setExpanded(nextExpanded) {
    expanded = nextExpanded;
    panelContent.style.transform = expanded ? 'scaleY(1)' : 'scaleY(0)';
    panelContent.style.opacity = expanded ? '1' : '0';
    panelContent.style.pointerEvents = expanded ? 'auto' : 'none';
    contentWrap.style.height = expanded ? `${panelContent.scrollHeight}px` : '0px';
    panel.style.paddingBottom = expanded ? '16px' : '8px';
    toggleButton.textContent = expanded ? 'collapse ↑' : 'expand ↓';
    panel.style.cursor = expanded ? 'default' : 'pointer';

    if (expanded) {
      panel.removeEventListener('click', expandFromCollapsedPanel);
    } else {
      panel.addEventListener('click', expandFromCollapsedPanel);
    }
  }

  toggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setExpanded(!expanded);
  });
  panel.appendChild(toggleButton);

  paletteSelect.value = DEFAULTS.paletteKey;
  minSlider.slider.value = DEFAULTS.minSize;
  minSlider.valueElement.textContent = DEFAULTS.minSize.toFixed(1);
  maxSlider.slider.value = DEFAULTS.maxSize;
  maxSlider.valueElement.textContent = DEFAULTS.maxSize.toFixed(1);
  speedSlider.slider.value = DEFAULTS.speed;
  speedSlider.valueElement.textContent = DEFAULTS.speed.toFixed(1);
  countSlider.slider.value = DEFAULTS.count;
  countSlider.valueElement.textContent = DEFAULTS.count.toFixed(0);

  setExpanded(false);
  params.onPaletteChange(DEFAULTS.paletteKey);
  params.onParticleSizeChange(DEFAULTS.minSize, DEFAULTS.maxSize);
  params.onParticleSpeedChange(DEFAULTS.speed);
  params.onParticleCountChange(DEFAULTS.count);

  return panel;
}
