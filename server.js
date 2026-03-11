const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/seller", require("./routes/seller"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/product-management", require("./routes/product-management"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/vendor", require("./routes/vendor"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "ShopEZ API", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "client", "dist");
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const startServer = (portToUse) => {
  const server = app.listen(portToUse, () => {
    console.log(`ShopEZ server running on http://localhost:${portToUse}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const fallbackPort = Number(portToUse) + 1;
      console.warn(`Port ${portToUse} is in use. Retrying on ${fallbackPort}...`);
      startServer(fallbackPort);
      return;
    }

    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
};

startServer(Number(PORT));
