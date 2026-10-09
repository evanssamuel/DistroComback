const avatar = require('../src/avatar');

console.log('Testing Avatar Generator...');

const svg1 = avatar.renderAvatarSvg({});
console.log('Default avatar SVG generated. Length:', svg1.length);
if (!svg1.includes('<svg') || !svg1.includes('</svg>')) throw new Error('Invalid SVG output');

const svg2 = avatar.renderAvatarSvg({
  skin: 'tone-4',
  hair: 'afro',
  hairColor: '#000',
  accessory: 'crown',
  outfit: 'hoodie',
  outfitColor: '#0090FF'
});
console.log('Custom avatar SVG generated. Length:', svg2.length);
if (!svg2.includes('#FFD700') || !svg2.includes('#0090FF')) throw new Error('Missing crown or outfit color in custom SVG');

console.log('Avatar tests passed!');
