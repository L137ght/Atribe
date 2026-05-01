---
name: Nocturne Editorial
colors:
  surface: '#1b1015'
  surface-dim: '#1b1015'
  surface-bright: '#43363b'
  surface-container-lowest: '#150b10'
  surface-container-low: '#24181e'
  surface-container: '#281c21'
  surface-container-high: '#33272c'
  surface-container-highest: '#3e3137'
  on-surface: '#f2dde4'
  on-surface-variant: '#dbbfca'
  inverse-surface: '#f2dde4'
  inverse-on-surface: '#3a2d32'
  outline: '#a38a94'
  outline-variant: '#55414a'
  surface-tint: '#ffafd6'
  primary: '#ffafd6'
  on-primary: '#620043'
  primary-container: '#8f0164'
  on-primary-container: '#ff99ce'
  inverse-primary: '#aa247a'
  secondary: '#e2bdcb'
  on-secondary: '#422934'
  secondary-container: '#5a3f4b'
  on-secondary-container: '#cfacb9'
  tertiary: '#99d776'
  on-tertiary: '#123800'
  tertiary-container: '#1f5500'
  on-tertiary-container: '#8cca6b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd8e8'
  primary-fixed-dim: '#ffafd6'
  on-primary-fixed: '#3c0028'
  on-primary-fixed-variant: '#8a0060'
  secondary-fixed: '#ffd8e7'
  secondary-fixed-dim: '#e2bdcb'
  on-secondary-fixed: '#2a151f'
  on-secondary-fixed-variant: '#5a3f4b'
  tertiary-fixed: '#b4f490'
  tertiary-fixed-dim: '#99d776'
  on-tertiary-fixed: '#082100'
  on-tertiary-fixed-variant: '#1d5200'
  background: '#1b1015'
  on-background: '#f2dde4'
  surface-variant: '#3e3137'
  midnight-violet-base: '#120a0e'
  midnight-violet-elevated: '#1d1116'
  dark-raspberry: '#8f0164'
  alabaster-grey: '#d7dedc'
  outline-muted: '#55414a'
typography:
  display:
    fontFamily: Newsreader
    fontSize: 4.5rem
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Newsreader
    fontSize: 3rem
    fontWeight: '400'
    lineHeight: '1.2'
  h2:
    fontFamily: Newsreader
    fontSize: 2.25rem
    fontWeight: '400'
    lineHeight: '1.3'
  h3:
    fontFamily: Newsreader
    fontSize: 1.5rem
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Manrope
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 24px
  margin: max(5vw, 24px)
---

## Brand & Style
The design system embodies a "Premium Editorial Minimalist" aesthetic, reimagined for a deep, immersive dark mode experience. It targets a sophisticated audience that values long-form content, intellectual depth, and a high-end digital reading experience.
The visual language is rooted in **Minimalism** with a focus on negative space and intentional hierarchy. By pairing the traditional, authoritative qualities of serif typography with a modern, utilitarian sans-serif, the system creates a bridge between classical publishing and contemporary digital interfaces. The emotional response is one of calm, focus, and exclusivity—mimicking the feel of a high-end print journal read in low light.
## Colors
The palette is built on a foundation of "Midnight Violet," utilizing a range of deep, desaturated purples to create depth without relying on pure blacks. 
- **Primary:** The "Dark Raspberry" (#8f0164) is used sparingly for high-impact calls to action, active states, and editorial highlights.
- **Backgrounds:** The base layer is a near-black violet (#120a0e). Layered surfaces use the core Midnight Violet (#351e29) to create a subtle sense of elevation.
- **Typography:** Alabaster Grey (#d7dedc) provides a high-contrast but "soft" reading experience, reducing eye strain compared to pure white. Secondary text utilizes a muted mauve-grey to maintain hierarchy.
## Typography
Typography is the cornerstone of this design system. It employs a high-contrast pairing strategy:
- **Headings (Newsreader):** Use the serif for all editorial titles and storytelling elements. Tighten letter spacing on larger sizes to maintain a bespoke, printed look.
- **Body (Manrope):** Use this modern sans-serif for all functional text, long-form reading, and UI labels. The generous x-height ensures legibility against dark backgrounds.
- **Hierarchy:** Lean heavily on size and weight differentiation rather than color. Use the "label-caps" style for metadata and small navigation elements to provide a structural contrast to the fluid serif headings.
## Layout & Spacing
The system utilizes a **Fixed Grid** for content-heavy pages and a **Fluid Grid** for dashboard-style interfaces. 
- **The Golden Ratio:** Use generous vertical margins (XL) between major sections to emphasize the minimalist editorial feel. 
- **The 8pt Grid:** All components and internal spacing should align to a 4px/8px baseline to maintain mathematical harmony.
- **Information Density:** Keep density low. White space (or in this case, "dark space") is treated as a functional element to guide the eye and provide breathing room for complex text.
## Elevation & Depth
In this dark mode environment, depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.
- **Surface Tiers:** Higher elevation is represented by lighter tints of the Midnight Violet palette. A card sitting "above" the background should move from #120a0e to #1d1116.
- **Borders:** Use subtle 1px borders (#351e29 or a 10% opacity Alabaster) to define edges. This maintains a crisp, architectural feel.
- **Backdrop Blurs:** For overlays or navigation bars, use a 20px blur with a 70% opaque Midnight Violet fill to maintain context while ensuring legibility.
## Shapes
The shape language is "Soft" (0.25rem base radius). This subtle rounding takes the edge off the high-contrast typography, making the interface feel premium and modern without becoming overly playful or "bubbly."
- **Buttons & Inputs:** Use the base radius (4px) to maintain a sharp, professional appearance.
- **Large Cards & Containers:** Use `rounded-lg` (8px) for major content blocks to create a distinct visual container.
- **Icons:** Use linear, 1.5pt stroke icons that match the weight of the Manrope typeface.
## Components
- **Buttons:** Primary buttons are solid Dark Raspberry (#8f0164) with Alabaster text. Secondary buttons are outlined with a 1px Alabaster stroke at 20% opacity.
- **Input Fields:** Use a dark fill (#1a0f14) with a subtle bottom border. On focus, the border transitions to Dark Raspberry.
- **Chips/Tags:** Use the Midnight Violet (#351e29) as a background with Alabaster text in the "label-caps" typography style.
- **Cards:** Cards should not have shadows. Instead, use a background color one step lighter than the page background and a very thin, low-opacity border.
- **Editorial Quotes:** Pull-quotes should use Newsreader Italic, set in a larger font size, with a Dark Raspberry vertical accent bar to the left.
- **Progress Bars/Selection Controls:** Use Dark Raspberry for the active state to provide a singular, vibrating point of focus against the dark background.