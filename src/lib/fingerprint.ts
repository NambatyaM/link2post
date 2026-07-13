const DEVICE_KEY = "contentrep_device_id";
const TRIAL_KEY = "contentrep_trial_count";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getTrialCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10);
}

export function incrementTrialCount(): number {
  const next = getTrialCount() + 1;
  localStorage.setItem(TRIAL_KEY, String(next));
  return next;
}

export function resetTrialCount() {
  localStorage.removeItem(TRIAL_KEY);
}

export async function generateFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  const components: string[] = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.language,
    navigator.platform,
    String(!!window.indexedDB),
    String(!!window.sessionStorage),
  ];

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint", 2, 2);
      components.push(canvas.toDataURL());
    }
  } catch { /* */ }

  try {
    const webgl = document.createElement("canvas").getContext("webgl");
    if (webgl) {
      const ext = webgl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        components.push(webgl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch { /* */ }

  const raw = components.join("|||");
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
