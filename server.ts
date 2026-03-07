/**
 * FILE: server.ts
 *
 * PURPOSE
 * Entry point of the backend server.
 *
 * IMPORTS FROM
 * - core/config/env.ts
 * - core/database/database.ts
 * - core/middleware/requestLogger.ts
 * - core/middleware/errorHandler.ts
 */

import express from "express";
import { ENV } from "./src/core/config/env.js";
import { connectDatabase } from "./src/core/database/database.js";
import { requestLogger } from "./src/core/middleware/requestLogger.js";
import { errorHandler } from "./src/core/middleware/errorHandler.js";
import newsletterRoutes from "./src/modules/newsletter/newsletter.routes.js";
import contactRoutes from "./src/modules/contact/contact.routes.js";
import identityRoutes from "./src/modules/identity/identity.routes.js";
import adminContactRoutes from "./src/modules/adminContact/adminContact.routes.js";
import adminAnalyticsRoutes from "./src/modules/adminAnalytics/adminAnalytics.routes.js";


const app = express();

app.use(express.json());

app.use(requestLogger);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use(errorHandler);

// Feature Routes
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/contact", contactRoutes);
// Serious Routes
app.use("/api/identity", identityRoutes);
app.use("/api/admin/messages", adminContactRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);


const startServer = async () => {
  await connectDatabase();
  
  app.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
};

startServer();