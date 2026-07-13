import { PROVIDERS } from "./providers";

export const MODELS = PROVIDERS[0].models.map((m) => ({ id: m.id, label: m.label }));

export const TRIAL_LIMIT = 2;

export const ALL_PROVIDER_IDS = PROVIDERS.map((p) => p.id);
