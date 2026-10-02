/**
 * Claude Tab Colorist - Color System & Palette
 * Designed to complement Claude's warm, literary aesthetic.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClaudeColors = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 16 curated Claude-complementary pigments inspired by bookcloth, minerals, and earth tones
  const PRESET_COLORS = [
    {
      id: 'terracotta',
      name: 'Terracotta',
      hex: '#CC785C',
      lightBg: 'rgba(204, 120, 92, 0.12)',
      darkBg: 'rgba(204, 120, 92, 0.22)',
      border: 'rgba(204, 120, 92, 0.35)',
      description: "Claude's signature warm clay"
    },
    {
      id: 'warm-amber',
      name: 'Sunlit Amber',
      hex: '#D97706',
      lightBg: 'rgba(217, 119, 6, 0.12)',
      darkBg: 'rgba(217, 119, 6, 0.22)',
      border: 'rgba(217, 119, 6, 0.35)',
      description: 'Luminous golden ochre'
    },
    {
      id: 'sienna',
      name: 'Burnt Sienna',
      hex: '#C15F3C',
      lightBg: 'rgba(193, 95, 60, 0.12)',
      darkBg: 'rgba(193, 95, 60, 0.22)',
      border: 'rgba(193, 95, 60, 0.35)',
      description: 'Deep mineral red-brown'
    },
    {
      id: 'sandstone',
      name: 'Sandstone Gold',
      hex: '#B48425',
      lightBg: 'rgba(180, 132, 37, 0.12)',
      darkBg: 'rgba(180, 132, 37, 0.22)',
      border: 'rgba(180, 132, 37, 0.35)',
      description: 'Warm antique bronze'
    },
    {
      id: 'olive',
      name: 'Spanish Olive',
      hex: '#606C38',
      lightBg: 'rgba(96, 108, 56, 0.12)',
      darkBg: 'rgba(96, 108, 56, 0.22)',
      border: 'rgba(96, 108, 56, 0.35)',
      description: 'Subtle vegetative olive'
    },
    {
      id: 'sage',
      name: 'Earthy Sage',
      hex: '#588157',
      lightBg: 'rgba(88, 129, 87, 0.12)',
      darkBg: 'rgba(88, 129, 87, 0.22)',
      border: 'rgba(88, 129, 87, 0.35)',
      description: 'Restful botanical sage'
    },
    {
      id: 'forest',
      name: 'Deep Forest',
      hex: '#2D6A4F',
      lightBg: 'rgba(45, 106, 79, 0.12)',
      darkBg: 'rgba(45, 106, 79, 0.22)',
      border: 'rgba(45, 106, 79, 0.35)',
      description: 'Rich evergreen spruce'
    },
    {
      id: 'persian-teal',
      name: 'Persian Teal',
      hex: '#2A9D8F',
      lightBg: 'rgba(42, 157, 143, 0.12)',
      darkBg: 'rgba(42, 157, 143, 0.22)',
      border: 'rgba(42, 157, 143, 0.35)',
      description: 'Balanced mineral turquoise'
    },
    {
      id: 'aegean',
      name: 'Aegean Slate',
      hex: '#4A6FA5',
      lightBg: 'rgba(74, 111, 165, 0.12)',
      darkBg: 'rgba(74, 111, 165, 0.22)',
      border: 'rgba(74, 111, 165, 0.35)',
      description: 'Refined ocean blue'
    },
    {
      id: 'indigo',
      name: 'Deep Indigo',
      hex: '#3D5A80',
      lightBg: 'rgba(61, 90, 128, 0.12)',
      darkBg: 'rgba(61, 90, 128, 0.22)',
      border: 'rgba(61, 90, 128, 0.35)',
      description: 'Moody architectural denim'
    },
    {
      id: 'heather',
      name: 'Dusty Heather',
      hex: '#6D597A',
      lightBg: 'rgba(109, 89, 122, 0.12)',
      darkBg: 'rgba(109, 89, 122, 0.22)',
      border: 'rgba(109, 89, 122, 0.35)',
      description: 'Muted slate violet'
    },
    {
      id: 'mulberry',
      name: 'Warm Mulberry',
      hex: '#8E5572',
      lightBg: 'rgba(142, 85, 114, 0.12)',
      darkBg: 'rgba(142, 85, 114, 0.22)',
      border: 'rgba(142, 85, 114, 0.35)',
      description: 'Vintage plum tint'
    },
    {
      id: 'rose',
      name: 'Vintage Rose',
      hex: '#B56576',
      lightBg: 'rgba(181, 101, 118, 0.12)',
      darkBg: 'rgba(181, 101, 118, 0.22)',
      border: 'rgba(181, 101, 118, 0.35)',
      description: 'Soft dried petal rose'
    },
    {
      id: 'coral',
      name: 'Muted Coral',
      hex: '#E07A5F',
      lightBg: 'rgba(224, 122, 95, 0.12)',
      darkBg: 'rgba(224, 122, 95, 0.22)',
      border: 'rgba(224, 122, 95, 0.35)',
      description: 'Warm sunset terracotta'
    },
    {
      id: 'espresso',
      name: 'Warm Espresso',
      hex: '#6F4E37',
      lightBg: 'rgba(111, 78, 55, 0.12)',
      darkBg: 'rgba(111, 78, 55, 0.22)',
      border: 'rgba(111, 78, 55, 0.35)',
      description: 'Bookbinder leather brown'
    },
    {
      id: 'mineral',
      name: 'Mineral Charcoal',
      hex: '#495057',
      lightBg: 'rgba(73, 80, 87, 0.12)',
      darkBg: 'rgba(73, 80, 87, 0.22)',
      border: 'rgba(73, 80, 87, 0.35)',
      description: 'Deep stone slate'
    }
  ];

  /**
   * Deterministic 32-bit FNV-1a hash algorithm.
   * Efficiently maps any string (like a Claude chat UUID) to an index.
   */
  function hashString(str) {
    if (!str || typeof str !== 'string') return 0;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  /**
   * Returns a deterministic preset color for any chat identifier or text.
   */
  function hashStringToColor(str) {
    if (!str) return PRESET_COLORS[0];
    const index = hashString(str) % PRESET_COLORS.length;
    return PRESET_COLORS[index];
  }

  /**
   * Hex color parser. Accepts "#RGB" or "#RRGGBB".
   */
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 204, g: 120, b: 92 };
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) return { r: 204, g: 120, b: 92 };
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Converts RGB to Hex.
   */
  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Converts Hex to RGBA string.
   */
  function hexToRgba(hex, alpha = 1) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Determines whether black or white text has higher contrast against the color.
   */
  function getContrastColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    // YIQ formula
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#1F1E1D' : '#FFFFFF';
  }

  /**
   * Lightens or darkens a hex color by a factor (-1.0 to 1.0).
   */
  function adjustLightness(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    let target = factor > 0 ? 255 : 0;
    let amt = Math.abs(factor);
    return rgbToHex(
      r + (target - r) * amt,
      g + (target - g) * amt,
      b + (target - b) * amt
    );
  }

  /**
   * Finds preset color by hex value.
   */
  function findPreset(hex) {
    if (!hex) return null;
    const clean = hex.toLowerCase().trim();
    return PRESET_COLORS.find(p => p.hex.toLowerCase() === clean) || null;
  }

  /**
   * Returns human-readable label for a color hex (either preset name or formatted hex).
   */
  function getColorName(hex) {
    const preset = findPreset(hex);
    return preset ? preset.name : (hex ? hex.toUpperCase() : 'Default');
  }

  return {
    PRESET_COLORS,
    hashString,
    hashStringToColor,
    hexToRgb,
    rgbToHex,
    hexToRgba,
    getContrastColor,
    adjustLightness,
    findPreset,
    getColorName
  };
});
