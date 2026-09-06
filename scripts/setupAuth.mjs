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

async function generateKeys() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  return { JWT_PRIVATE_KEY: privateKey, JWKS: jwks };
}

function setEnv(name, value) {
  const res = spawnSync(process.execPath, [convexBin, "env", "set", name, value], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (res.status !== 0) {
    console.error(
      `\n❌ No se pudo configurar ${name}.\n` +
        "   Asegurate de haber corrido 'npx convex dev' al menos una vez.\n",
    );
    process.exit(1);
  }
}

const { JWT_PRIVATE_KEY, JWKS } = await generateKeys();
console.log("🔑 Configurando claves de autenticación en Convex…\n");
setEnv("JWT_PRIVATE_KEY", JWT_PRIVATE_KEY);
setEnv("JWKS", JWKS);
setEnv("SITE_URL", process.env.SITE_URL || "http://localhost:5173");
console.log("\n✅ Listo. El login ya está habilitado. Recargá la app y creá tu cuenta admin.");
