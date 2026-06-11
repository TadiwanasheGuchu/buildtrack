---
name: Modern Earth
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#56423c'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#8a726b'
  outline-variant: '#ddc0b8'
  surface-tint: '#a04021'
  primary: '#9c3c1e'
  on-primary: '#ffffff'
  primary-container: '#bc5434'
  on-primary-container: '#fffaf9'
  inverse-primary: '#ffb59f'
  secondary: '#5b623e'
  on-secondary: '#ffffff'
  secondary-container: '#e0e7b9'
  on-secondary-container: '#616843'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cca830'
  on-tertiary-container: '#4f3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb59f'
  on-primary-fixed: '#3a0a00'
  on-primary-fixed-variant: '#81290c'
  secondary-fixed: '#e0e7b9'
  secondary-fixed-dim: '#c3cb9f'
  on-secondary-fixed: '#181e03'
  on-secondary-fixed-variant: '#434a28'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  headline-xl:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is rooted in the concept of "Grounded Professionalism." It moves away from the clinical, cold aesthetics of traditional SaaS to embrace the warmth and tactile nature of the Southern African landscape. The brand personality is that of a reliable partner—one who understands the heat of the site and the precision of the boardroom. 

The visual style is **Modern/Corporate** infused with **Tactile/Natural** elements. It prioritizes clarity and high-contrast legibility for outdoor use while maintaining a premium, trustworthy feel through sophisticated color theory and airy layouts. Every interface element should feel solid and intentional, echoing the structural integrity of the construction projects it manages.

**Key Aesthetic Principles:**
- **Organic Airiness:** High use of whitespace (reimagined as "sand-space") to reduce cognitive load.
- **Human-Centered Utility:** Focus on large touch targets and clear visual paths for contractors in the field.
- **Authentic Texture:** Use of realistic imagery featuring local landscapes and diverse project sites to foster a sense of belonging and local pride.

## Colors

The palette is a tribute to the Southern African terrain, moving from the rich clays of the Highveld to the pale sands of the Kalahari. 

- **Primary (Clay Red - #BC5434):** Used for primary actions and brand emphasis. It represents the earth and the literal foundation of construction.
- **Secondary (Savanna Green - #7D845D):** Used for secondary actions, progress indicators, and balanced visual accents.
- **Tertiary (Kalahari Gold - #D4AF37):** Reserved for high-value highlights, awards, or "premium" status indicators.
- **Neutral (Sand & Stone):** The background is not a pure white but a warm, light sand (#FAF9F6). This reduces glare in bright sunlight and feels more inviting. Text uses a deep charcoal (#2D2926) rather than pure black for a softer, more sophisticated contrast.

## Typography

The design system utilizes **Public Sans** for all typographic roles. This choice provides an institutional, trustworthy foundation that remains highly readable under various lighting conditions. 

Headlines are bold and authoritative, using tighter letter spacing to create a sense of strength. Body text is set with generous line heights to ensure readability during long sessions of report-reading or data entry. Labels use a slight tracking increase and a medium-to-semibold weight to ensure they remain distinct from body content. For mobile devices, heading sizes are scaled down to ensure they do not overwhelm the smaller viewport while maintaining their hierarchical dominance.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The layout philosophy is built on "Deep Breath" spacing—ensuring that elements have significant padding to avoid a cluttered, overwhelming interface.

- **Grid:** On desktop, the grid has a 1280px max-width to keep line lengths readable. Gutters are fixed at 24px to provide a consistent vertical rhythm.
- **Rhythm:** An 8px linear scale governs all padding and margins. 
- **Adaptation:** On mobile, margins reduce to 16px. Complex data tables should reflow into card-based layouts to ensure they remain accessible for site managers using smartphones or ruggedized tablets in the field.

## Elevation & Depth

To maintain a grounded, non-digital feel, the design system avoids artificial glass or neon effects. Instead, it uses **Ambient Shadows** and **Tonal Layering** to create a sense of physical objects resting on a surface.

- **Shadows:** Use low-opacity, wide-dispersion shadows with a slight warm tint (matching the Primary color at 5% opacity). This mimics the soft, diffused light of a savanna sunset rather than harsh, artificial studio lighting.
- **Surfaces:** Depth is primarily communicated through subtle shifts in background color. The base canvas is "Kalahari Sand," while elevated cards or containers use pure white to "lift" off the page.
- **Interactive Depth:** When pressed, buttons should lose their shadow and shift slightly downward, providing a tactile, mechanical feedback loop reminiscent of physical controls.

## Shapes

The shape language is defined as **Rounded (Level 2)**. This balance avoids the clinical sharpness of 0px corners while staying professional enough for a technical SaaS.

- **Base Radius (8px):** Applied to buttons, input fields, and small components.
- **Large Radius (16px):** Applied to cards, modals, and primary containers.
- **Extra Large (24px):** Used sparingly for featured sections or "call-to-action" banners to create a softer, more inviting focal point.

Icons should follow a similar language, featuring slightly rounded terminals rather than sharp points to maintain visual harmony with the UI components.

## Components

### Buttons
Buttons are the primary tactile element.
- **Primary:** Solid Clay Red with white text. High contrast, slightly bold typography.
- **Secondary:** Outlined in Savanna Green with a subtle Sand background on hover.
- **Tertiary:** Text-only in Clay Red, used for less critical actions to reduce visual noise.

### Cards
Cards are the workhorse of the project management view. They use a pure white background, an 8px radius, and a very soft, warm-tinted shadow. Headers within cards should be separated by a thin, light-gray divider.

### Input Fields
Inputs use a subtle 1px border in a "Stone" color. When focused, the border thickens to 2px and changes to Clay Red, with a very faint Primary-colored glow.

### Chips & Badges
Used for project status (e.g., "In Progress," "Delayed"). These should use the Secondary (Green) and Tertiary (Gold) colors with low-opacity backgrounds and high-opacity text to ensure they are legible but secondary to the main content.

### Realistic Imagery
All empty states and dashboard headers should feature high-quality, realistic photography of Southern African construction sites or landscapes. Avoid generic 3D illustrations or abstract gradients.