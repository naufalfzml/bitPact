require("dotenv").config();

const express = require("express");
const cors = require("cors");
const eventsRouter = require("./routes/events");
const reputationRouter = require("./routes/reputation");
const socialConnectRouter = require("./routes/socialConnect");
const { startAutoAbstainCron } = require("./cron/autoAbstain");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/events", eventsRouter);
app.use("/api/reputation", reputationRouter);
app.use("/api/social-connect", socialConnectRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "bitpact-backend", timestamp: new Date().toISOString() });
});

// Start cron scheduler
startAutoAbstainCron();

// Start server
app.listen(PORT, () => {
  console.log(`bitPact backend running on http://localhost:${PORT}`);
});
