/**
 * visual.ts — Profil visuel du projet (couleurs, éclairage, post-traitement)
 * Utilisé par le moteur de rendu et le HUD.
 */

export interface ProjectVisualProfile {
  readonly schemaVersion: 1;
  readonly sky?: 'solid' | 'gradient';
  readonly presetId:
    | 'neutral'
    | 'realistic'
    | 'stylized-toon'
    | 'graphic-ink'
    | 'ink-wash'
    | 'pixel-screen'
    | 'crosshatch'
    | 'one-bit'
    | 'phosphor'
    | 'retro-warm'
    | 'horror'
    | 'custom';
  readonly palette: {
    readonly sky: string;
    readonly ground: string;
    readonly road: string;
    readonly accent: string;
  };
  readonly lighting: {
    readonly key: { readonly color: string; readonly intensity: number; readonly azimuth: number; readonly elevation: number };
    readonly fill: { readonly color: string; readonly intensity: number };
    readonly rim: { readonly color: string; readonly intensity: number };
    readonly shadowMode: 'off' | 'hard' | 'soft';
  };
  readonly atmosphere: {
    readonly fog: { readonly enabled: boolean; readonly color: string; readonly near: number; readonly far: number };
    readonly weather: { readonly kind: 'clear' | 'rain' | 'snow'; readonly amount: number; readonly wind: number };
  };
  readonly environment: {
    readonly kind: 'color' | 'exr';
    readonly assetId: string | null;
    readonly intensity: number;
    readonly rotation: number;
  };
  readonly post: { readonly exposure: number; readonly bloom: number; readonly saturation: number; readonly contrast: number; readonly vignette: number };
  readonly materialTheme: { readonly tintableRoles: readonly ('road' | 'ground' | 'accent')[] };
  readonly shading: {
    readonly model: 'standard' | 'cel';
    readonly ink: boolean;
    readonly look?: 'none' | 'graphic' | 'wash' | 'pixel' | 'hatch' | 'dither' | 'crt';
    readonly inkThickness?: number;
    readonly pixelResolution?: number;
  };
}

export const visualProfile = {
  schemaVersion: 1,
  presetId: 'stylized-toon',
  sky: 'solid',
  palette: {
    sky: '#1b0a33',
    ground: '#2c1552',
    road: '#432a72',
    accent: '#ffcf3f',
  },
  lighting: {
    key: { color: '#ffe0bd', intensity: 2.0, azimuth: 24, elevation: 58 },
    fill: { color: '#8f7bff', intensity: 1.15 },
    rim: { color: '#ff5aa8', intensity: 1.45 },
    shadowMode: 'soft',
  },
  atmosphere: {
    fog: { enabled: true, color: '#2b1250', near: 30, far: 110 },
    weather: { kind: 'clear', amount: 0, wind: 0.05 },
  },
  environment: { kind: 'color', assetId: null, intensity: 1, rotation: 0 },
  post: { exposure: 0.12, bloom: 0.3, saturation: 1.16, contrast: 1.08, vignette: 0.4 },
  materialTheme: { tintableRoles: ['road', 'ground', 'accent'] },
  shading: { model: 'standard', ink: false, look: 'none' },
} satisfies ProjectVisualProfile;
