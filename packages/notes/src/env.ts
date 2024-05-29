import { z } from "zod";

const processEnv = z
  .object({
    VITE_API_URL: z.string(),
    VITE_REPLICACHE_LICENSE_KEY: z.string(),
    VITE_WS_URL: z.string(),
  })
  .parse(import.meta.env);

export const env: {
  apiURL: string;
  replicacheLicenseKey: string;
  wsURL: string;
} = Object.freeze({
  apiURL: processEnv.VITE_API_URL,
  replicacheLicenseKey: processEnv.VITE_REPLICACHE_LICENSE_KEY,
  wsURL: processEnv.VITE_WS_URL,
});
