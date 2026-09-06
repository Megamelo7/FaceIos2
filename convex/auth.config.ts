export default {
  providers: [
    {
      // Convex expone CONVEX_SITE_URL automáticamente en el deployment.
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
