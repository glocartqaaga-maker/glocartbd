import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "GloCart BD Server", time: new Date().toISOString() });
  });

  // Steadfast Courier API Integration Proxy
  // Secure server-side Steadfast integration - credentials never leak to browser
  app.get("/api/courier/steadfast/balance", async (req, res) => {
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.json({
        configured: false,
        message: "Steadfast API credentials not set in server environment. Enter them in Settings or .env to enable live sync.",
        current_balance: 0
      });
    }

    try {
      const response = await fetch("https://portal.steadfast.com.bd/api/v1/get_balance", {
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json({ configured: true, ...data });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to connect to Steadfast Courier API", details: err.message });
    }
  });

  app.post("/api/courier/steadfast/create-order", async (req, res) => {
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = req.body;

    if (!apiKey || !secretKey) {
      // In sandbox / unconfigured mode, provide a mock consignment ID so the admin can test the entire workflow seamlessly
      const mockConsignmentId = "SF-SIM-" + Math.floor(100000 + Math.random() * 900000);
      const mockTrackingCode = "TRK" + Date.now().toString().slice(-8);
      return res.json({
        status: 200,
        simulated: true,
        message: "Order placed in Steadfast simulation mode (API credentials pending).",
        consignment: {
          consignment_id: mockConsignmentId,
          tracking_code: mockTrackingCode,
          invoice: invoice || "INV-" + Date.now(),
          recipient_name,
          recipient_phone,
          recipient_address,
          cod_amount,
          status: "in_review",
          created_at: new Date().toISOString()
        }
      });
    }

    try {
      const response = await fetch("https://portal.steadfast.com.bd/api/v1/create_order", {
        method: "POST",
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invoice,
          recipient_name,
          recipient_phone,
          recipient_address,
          cod_amount,
          note: note || "GloCart BD Delivery"
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to dispatch order to Steadfast", details: err.message });
    }
  });

  app.get("/api/courier/steadfast/status/:tracking_code", async (req, res) => {
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const { tracking_code } = req.params;

    if (!apiKey || !secretKey || tracking_code.startsWith("TRK")) {
      return res.json({
        status: 200,
        simulated: true,
        delivery_status: "in_review",
        tracking_code,
        message: "Steadfast Courier package in transit"
      });
    }

    try {
      const response = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/${tracking_code}`, {
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch Steadfast status", details: err.message });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GloCart BD Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
