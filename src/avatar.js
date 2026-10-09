// Layered SVG Avatar Generator

const DEFAULT_RECIPE = {
  skin: 'tone-2',
  face: 'round',
  hair: 'short',
  hairColor: '#1a1a1a',
  eyes: 'normal',
  outfit: 'tshirt',
  outfitColor: '#FF3100',
  accessory: 'none'
};

const SKIN_TONES = {
  'tone-1': '#FCD5CE',
  'tone-2': '#F8AD9D',
  'tone-3': '#D08C5F',
  'tone-4': '#8A5A36',
  'tone-5': '#4A2E1A'
};

function renderAvatarSvg(recipe = {}) {
  const r = { ...DEFAULT_RECIPE, ...recipe };
  const skinColor = SKIN_TONES[r.skin] || SKIN_TONES['tone-2'];
  const hairColor = r.hairColor || '#1a1a1a';
  const outfitColor = r.outfitColor || '#FF3100';

  // SVG viewBox 0 0 100 100
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">`;

  // Background circle / base
  svg += `<rect width="100" height="100" rx="50" fill="#1C1C1C"/>`;

  // Body / Outfit
  if (r.outfit === 'hoodie') {
    svg += `<path d="M 15,100 C 15,70 30,62 50,62 C 70,62 85,70 85,100 Z" fill="${outfitColor}"/>`;
    svg += `<path d="M 40,62 L 50,75 L 60,62 Z" fill="#0C0C0C" opacity="0.3"/>`;
  } else if (r.outfit === 'jacket') {
    svg += `<path d="M 15,100 C 15,70 30,62 50,62 C 70,62 85,70 85,100 Z" fill="${outfitColor}"/>`;
    svg += `<path d="M 45,62 L 50,100 L 55,62 Z" fill="#FFFFFF" opacity="0.8"/>`;
  } else {
    // tshirt default
    svg += `<path d="M 15,100 C 15,72 30,65 50,65 C 70,65 85,72 85,100 Z" fill="${outfitColor}"/>`;
    svg += `<path d="M 38,65 C 42,72 58,72 62,65 Z" fill="${skinColor}"/>`;
  }

  // Neck
  svg += `<rect x="42" y="52" width="16" height="16" rx="4" fill="${skinColor}"/>`;

  // Head / Face Shape
  if (r.face === 'oval') {
    svg += `<ellipse cx="50" cy="40" rx="22" ry="26" fill="${skinColor}"/>`;
  } else if (r.face === 'square') {
    svg += `<rect x="28" y="16" width="44" height="48" rx="14" fill="${skinColor}"/>`;
  } else {
    // round default
    svg += `<circle cx="50" cy="40" r="24" fill="${skinColor}"/>`;
  }

  // Eyes
  if (r.eyes === 'happy') {
    svg += `<path d="M 38,38 C 40,34 44,34 46,38" stroke="#111111" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
    svg += `<path d="M 54,38 C 56,34 60,34 62,38" stroke="#111111" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
  } else if (r.eyes === 'cool') {
    svg += `<rect x="35" y="35" width="12" height="4" rx="2" fill="#111111"/>`;
    svg += `<rect x="53" y="35" width="12" height="4" rx="2" fill="#111111"/>`;
  } else if (r.eyes === 'sparkle') {
    svg += `<circle cx="41" cy="37" r="3.5" fill="#111111"/>`;
    svg += `<circle cx="59" cy="37" r="3.5" fill="#111111"/>`;
    svg += `<circle cx="42" cy="36" r="1" fill="#FFFFFF"/>`;
    svg += `<circle cx="60" cy="36" r="1" fill="#FFFFFF"/>`;
  } else {
    // normal
    svg += `<circle cx="41" cy="37" r="3" fill="#111111"/>`;
    svg += `<circle cx="59" cy="37" r="3" fill="#111111"/>`;
  }

  // Mouth
  svg += `<path d="M 43,47 C 47,52 53,52 57,47" stroke="#111111" stroke-width="2" stroke-linecap="round" fill="none"/>`;

  // Hair
  if (r.hair === 'afro') {
    svg += `<circle cx="50" cy="24" r="28" fill="${hairColor}"/>`;
  } else if (r.hair === 'braids') {
    svg += `<path d="M 22,25 C 25,12 75,12 78,25 L 80,55 L 72,55 L 72,25 L 28,25 L 28,55 L 20,55 Z" fill="${hairColor}"/>`;
  } else if (r.hair === 'wavy') {
    svg += `<path d="M 24,35 C 24,15 76,15 76,35 C 76,20 60,12 50,12 C 40,12 24,20 24,35 Z" fill="${hairColor}"/>`;
    svg += `<path d="M 24,30 C 20,40 22,55 26,58 L 30,58 C 26,50 26,40 28,30 Z" fill="${hairColor}"/>`;
    svg += `<path d="M 76,30 C 80,40 78,55 74,58 L 70,58 C 74,50 74,40 72,30 Z" fill="${hairColor}"/>`;
  } else if (r.hair === 'short') {
    svg += `<path d="M 26,32 C 26,18 74,18 74,32 C 74,22 62,15 50,15 C 38,15 26,22 26,32 Z" fill="${hairColor}"/>`;
  }
  // bald: no hair paths added

  // Accessories
  if (r.accessory === 'glasses') {
    svg += `<rect x="33" y="32" width="15" height="11" rx="3" stroke="#FFFFFF" stroke-width="2" fill="none"/>`;
    svg += `<rect x="52" y="33" width="15" height="11" rx="3" stroke="#FFFFFF" stroke-width="2" fill="none"/>`;
    svg += `<line x1="48" y1="37" x2="52" y2="37" stroke="#FFFFFF" stroke-width="2"/>`;
  } else if (r.accessory === 'sunglasses') {
    svg += `<rect x="32" y="32" width="17" height="11" rx="3" fill="#111111"/>`;
    svg += `<rect x="51" y="32" width="17" height="11" rx="3" fill="#111111"/>`;
    svg += `<line x1="49" y1="36" x2="51" y2="36" stroke="#111111" stroke-width="2"/>`;
  } else if (r.accessory === 'crown') {
    svg += `<path d="M 32,20 L 38,10 L 50,18 L 62,10 L 68,20 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/>`;
    svg += `<circle cx="38" cy="10" r="2" fill="#FF3100"/>`;
    svg += `<circle cx="50" cy="18" r="2" fill="#0090FF"/>`;
    svg += `<circle cx="62" cy="10" r="2" fill="#6CFF00"/>`;
  } else if (r.accessory === 'hat') {
    svg += `<path d="M 20,24 Q 50,18 80,24 L 70,12 Q 50,8 30,12 Z" fill="#FF3100"/>`;
    svg += `<rect x="18" y="22" width="64" height="4" rx="2" fill="#1C1C1C"/>`;
  }

  svg += `</svg>`;
  return svg;
}

module.exports = {
  DEFAULT_RECIPE,
  SKIN_TONES,
  renderAvatarSvg
};
