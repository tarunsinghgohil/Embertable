// Config comes from the environment first, then the seed fixture (local stub only).
export function loadConfig(seed) {
  return {
    API_KEY: process.env.API_KEY ?? seed.config.API_KEY,
    notification_mode: seed.config.notification_mode,
  };
}
