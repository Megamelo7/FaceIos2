import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Rutas HTTP que necesita Convex Auth (login, callbacks, JWKS, etc.).
auth.addHttpRoutes(http);

export default http;
