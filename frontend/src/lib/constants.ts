/** Shared frontend constants */
export const API_SWAGGER_URL =
  `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "")}/swagger-ui.html`;

/** Storage keys */
export const THEME_STORAGE_KEY = "opsly-theme";
