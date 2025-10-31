require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

/* ---------- middleware ---------- */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("uploads"));

const corsOptions = {
   origin: ["https://prabhatanvik.shop", "https://www.prabhatanvik.shop"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};
app.use(cors(corsOptions));

/* ----------DB ---------- */
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ---------- routes ---------- */
app.get("/", (_req, res) => res.json({ msg: "medi-cart API is awake 🚀" }));

app.use("/auth", require("./Routers/authRoute"));
app.use("/pharmacist", require("./Routers/pharmacistRoute"));
app.use("/admin", require("./Routers/adminRoute"));
app.use("/patient", require("./Routers/patientRoute"));
app.use("/cart", require("./Routers/cartRoute"));
app.use("/order", require("./Routers/orderRoute"));
app.use("/payment", require("./Routers/paymentRoutes"));

module.exports = app;
