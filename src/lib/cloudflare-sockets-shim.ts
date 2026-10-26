// Stands in for `cloudflare:sockets` at build time. The real module is loaded at runtime:
// it exists on the deployed Cloudflare worker; elsewhere this throws and email falls back to nodemailer.
const name = "cloudflare:sockets";
const real = (await import(/* @vite-ignore */ name)) as { connect: (...args: unknown[]) => unknown };
export const connect = real.connect;
