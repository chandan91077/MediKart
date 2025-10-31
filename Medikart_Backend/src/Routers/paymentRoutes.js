const express = require("express");
const {
  createOrder,
  verify,
} = require("../Routes/paymentController.js");
const { userVerification } = require("../Middleware/AuthMiddleware");

const router = express.Router();

// ✅ Create order and save transaction (frontend will use orderId)
router.post("/create-order", userVerification, createOrder);
router.post("/verify", userVerification, verify);

module.exports = router;
