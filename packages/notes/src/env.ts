export const env: {
  apiURL: string;
  replicacheLicenseKey: string;
  replicachePullURL: string;
  replicachePushURL: string;
  wsURL: string;
} = Object.freeze({
  apiURL: import.meta.env.VITE_API_URL,
  replicacheLicenseKey: import.meta.env.VITE_REPLICACHE_LICENSE_KEY,
  replicachePullURL: import.meta.env.VITE_API_URL + "pull",
  replicachePushURL: import.meta.env.VITE_API_URL + "push",
  wsURL: import.meta.env.VITE_WS_URL,
});
