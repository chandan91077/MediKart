const { Cashfree, CFEnvironment } = require("cashfree-pg");
const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");
const Transaction = require("../Models/Transaction.js");
const { response } = require("express");
const { error } = require("console");

dotenv.config();

const {
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  CASHFREE_BASE_URL,
  WEBHOOK_SECRET,
} = process.env;

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX, // Use PRODUCTION when going live
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY
);

/**
 * 1️⃣ Create Order
 */
const createOrder = async (req, res) => {
  try {
    const userId = req?.user?.id;
    const { customerName, customerEmail, customerPhone, amount } = req.body;
    const orderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const request = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
    };

    console.log(request);

    // Create order on Cashfree using SDK instance
    const response = await cashfree.PGCreateOrder(request);

    console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmmm",response);
    // Save transaction in DB
    const txn = await Transaction.create({
      orderId: orderId,
      userId: userId,
      customerName,
      customerEmail,
      customerPhone,
      amount,
      status: "PENDING",
    });
    console.log(txn);

    res.status(200).json({
      success: true,
      data: response.data,
      amount,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error(
      "Error creating order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.response?.data || error.message,
    });
  }
};

const verify = async (req, res) => {
  try {
    const userId = req?.user?.id;
    console.log(userId);
    const { orderId } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });
    }

    // Fetch payment details from Cashfree
    const response = await cashfree.PGOrderFetchPayments(orderId);
    const payments = response.data; // Array of payment info

    if (!payments || payments.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No payment found for this order" });
    }

    const payment = payments[0]; // Take first payment info
    console.log("adfasdf", payment, payments);

    // Find the transaction in DB by order linkId
    const txn = await Transaction.findOne({ orderId: orderId });
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // Determine final status
    const paymentStatus = payment.payment_status || "PENDING";
    let finalStatus;

    switch (paymentStatus.toUpperCase()) {
      case "SUCCESS":
        finalStatus = "SUCCESS";
        break;
      case "NOT_ATTEMPTED":
        finalStatus = "FAILED";
        break;
      case "FAILED":
        finalStatus = "FAILED";
        break;
      case "USER_DROPPED":
      case "VOID":
        finalStatus = "FAILED";
        break;
      default:
        finalStatus = "PENDING";
    }

    txn.status = finalStatus || "PENDING";
    txn.referenceId = payment.cf_payment_id || null;
    txn.paymentDate = payment.payment_time || null;
    txn.amount = payment.payment_amount || txn.amount; // In case updated in payment response
    txn.userId = userId; // Optional: link user with txn if not already present

    await txn.save();

    // Send updated transaction object back
    res.status(200).json({
      success: true,
      data: txn,
      message: "Transaction verified and updated",
    });
  } catch (error) {
    console.error(
      "Verification error:",
      error?.response?.data?.message || error.message
    );
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error?.response?.data?.message || error.message,
    });
  }
};



module.exports = { createOrder, verify };
