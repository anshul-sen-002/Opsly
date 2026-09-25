/** Shared frontend constants */
const API_SWAGGER_FALLBACK =
  (typeof window !== "undefined" ? window.location.origin : "") || "http://localhost:8080";
export const API_SWAGGER_URL = `${API_SWAGGER_FALLBACK}/swagger-ui.html`;

/** Storage keys */
export const THEME_STORAGE_KEY = "opsly-theme";
