// Genera las claves RS256 que necesita Convex Auth y las configura en el
// deployment de Convex (JWT_PRIVATE_KEY, JWKS, SITE_URL).
//
// Requiere haber corrido antes `npx convex dev` (para crear el deployment).
// Uso:  npm run setup:auth
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const convexBin = path.join(scriptDir, "..", "node_modules", "convex", "bin", "main.js");
const PROD = process.argv.includes("--prod");

async function generateKeys() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  return { JWT_PRIVATE_KEY: privateKey, JWKS: jwks };
}

function setEnv(name, value) {
  // El separador "--" evita que valores que empiezan con "-" (p. ej. la clave
  // PEM "-----BEGIN...") sean interpretados como opciones por el CLI.
  const res = spawnSync(
    process.execPath,
    [convexBin, "env", "set", ...(PROD ? ["--prod"] : []), name, "--", value],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (res.status !== 0) {
    console.error(
      `\n❌ No se pudo configurar ${name}.\n` +
        "   Asegurate de haber corrido 'npx convex dev' al menos una vez.\n",
    );
    process.exit(1);
  }
}

const { JWT_PRIVATE_KEY, JWKS } = await generateKeys();
console.log(
  `🔑 Configurando claves de autenticación en Convex (${PROD ? "PRODUCCIÓN" : "desarrollo"})…\n`,
);
setEnv("JWT_PRIVATE_KEY", JWT_PRIVATE_KEY);
setEnv("JWKS", JWKS);
// SITE_URL: en dev usa localhost; en prod sólo se setea si se provee (la URL de Vercel).
const siteUrl = process.env.SITE_URL || (PROD ? "" : "http://localhost:5173");
if (siteUrl) setEnv("SITE_URL", siteUrl);
console.log("\n✅ Listo. El login ya está habilitado.");
