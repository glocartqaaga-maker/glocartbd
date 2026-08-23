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
  const DEFAULT_STEADFAST_API_KEY = process.env.STEADFAST_API_KEY || "emud5zhwfadjuyljkwxvqan2czrqn8si";
  const DEFAULT_STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY || "igkruxuikw9ykrbkftr9qgme";

  app.get("/api/courier/steadfast/balance", async (req, res) => {
    const apiKey = (req.headers["api-key"] as string) || (req.headers["x-api-key"] as string) || (req.query.apiKey as string) || DEFAULT_STEADFAST_API_KEY;
    const secretKey = (req.headers["secret-key"] as string) || (req.headers["x-secret-key"] as string) || (req.query.secretKey as string) || DEFAULT_STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.json({
        success: true,
        configured: false,
        status: 200,
        message: "Steadfast Courier ready (Simulation Mode). Configure API keys in Settings to connect live account.",
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
      const data: any = await response.json();
      if (data.status === 200 || response.ok) {
        res.json({ success: true, configured: true, ...data });
      } else {
        res.json({ success: false, configured: true, message: data.message || "Failed to retrieve balance from Steadfast", ...data });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to connect to Steadfast Courier API", message: err.message });
    }
  });

  app.post("/api/courier/steadfast/create-order", async (req, res) => {
    const apiKey = (req.headers["api-key"] as string) || (req.headers["x-api-key"] as string) || req.body.apiKey || DEFAULT_STEADFAST_API_KEY;
    const secretKey = (req.headers["secret-key"] as string) || (req.headers["x-secret-key"] as string) || req.body.secretKey || DEFAULT_STEADFAST_SECRET_KEY;
    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = req.body;

    // Sanitize phone number (Steadfast strictly requires 11 digits: 01XXXXXXXXX)
    let cleanPhone = String(recipient_phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("880") && cleanPhone.length >= 13) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (!cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      cleanPhone = "0" + cleanPhone;
    }
    if (!cleanPhone) {
      cleanPhone = "01700000000";
    }

    // Sanitize address (Steadfast requires >= 10 characters)
    let cleanAddress = String(recipient_address || "").trim();
    if (cleanAddress.length < 10) {
      cleanAddress = `${cleanAddress}, Delivery Address, Bangladesh`;
    }

    const codNumber = Number(cod_amount) || 0;

    if (!apiKey || !secretKey) {
      // In sandbox / unconfigured mode, provide a mock consignment ID so the admin can test the entire workflow seamlessly
      const mockConsignmentId = "SF" + Date.now().toString().slice(-7);
      const mockTrackingCode = "TRK" + Date.now().toString().slice(-8);
      return res.json({
        success: true,
        status: 200,
        simulated: true,
        message: "Order dispatched to Steadfast Courier (Simulation Mode).",
        consignment: {
          consignment_id: mockConsignmentId,
          tracking_code: mockTrackingCode,
          invoice: invoice || "INV-" + Date.now(),
          recipient_name: recipient_name || "Customer",
          recipient_phone: cleanPhone,
          recipient_address: cleanAddress,
          cod_amount: codNumber,
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
          invoice: String(invoice || `GC-${Date.now()}`),
          recipient_name: String(recipient_name || "Customer"),
          recipient_phone: cleanPhone,
          recipient_address: cleanAddress,
          cod_amount: codNumber,
          note: String(note || "GloCart BD Delivery")
        })
      });

      const data: any = await response.json();

      if (data.status === 200 || (data.consignment && data.consignment.consignment_id)) {
        res.json({
          success: true,
          status: 200,
          ...data
        });
      } else {
        // Collect detailed error message if Steadfast returns errors object
        let errMsg = data.message || "Steadfast order creation failed.";
        if (data.errors && typeof data.errors === "object") {
          const detailed = Object.values(data.errors).flat().join(", ");
          if (detailed) errMsg += ` (${detailed})`;
        }
        res.status(400).json({
          success: false,
          status: data.status || 400,
          message: errMsg,
          details: data
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to dispatch order to Steadfast", message: err.message });
    }
  });

  app.get("/api/courier/steadfast/status/:tracking_code", async (req, res) => {
    const apiKey = (req.headers["api-key"] as string) || (req.headers["x-api-key"] as string) || (req.query.apiKey as string) || DEFAULT_STEADFAST_API_KEY;
    const secretKey = (req.headers["secret-key"] as string) || (req.headers["x-secret-key"] as string) || (req.query.secretKey as string) || DEFAULT_STEADFAST_SECRET_KEY;
    const { tracking_code } = req.params;

    if (!apiKey || !secretKey || tracking_code.startsWith("TRK") || tracking_code.startsWith("SF")) {
      return res.json({
        success: true,
        status: 200,
        simulated: true,
        delivery_status: "in_review",
        tracking_code,
        message: "Steadfast Courier package is in review / in transit"
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
      const data: any = await response.json();
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: "Failed to fetch Steadfast status", message: err.message });
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
