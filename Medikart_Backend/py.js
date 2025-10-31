const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");
const Transaction = require("../Models/Transaction.js");

dotenv.config();

const {
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  CASHFREE_BASE_URL,
  WEBHOOK_SECRET,
} = process.env;

// 1. Create Payment Link & Store Transaction
const createPaymentLink = async (req, res) => {
  console.log(
    req.body,
    CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY,
    CASHFREE_BASE_URL
  );
  try {
    const { customerName, customerEmail, customerPhone, amount } = req.body;
    const linkId = "LINK_" + Date.now();

    const headers = {
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
      "x-api-version": "2022-09-01",
      "Content-Type": "application/json",
    };

    const data = {
      link_id: linkId,
      link_amount: amount,
      link_currency: "INR",
      link_purpose: "Service Payment",
      customer_details: {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      // link_meta: {
      //   notify_url: "https://yourdomain.com/api/payment/webhook",
      //   return_url: "https://yourfrontend.com/payment-success",
      // },
    };

    const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, data, {
      headers,
    });
    // const response = await axios.post(`${CASHFREE_BASE_URL}/links`, data, {
    //   headers,
    // });
    console.log(response);

    // Save transaction in MongoDB
    await Transaction.create({
      linkId,
      customerName,
      customerEmail,
      customerPhone,
      amount,
      paymentLink: response.data.link_url,
    });

    res.status(200).json({
      success: true,
      link_id: linkId,
      payment_link: response.data.link_url,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res
      .status(500)
      .json({ success: false, message: "Payment link creation failed" });
  }
};

// 2. Verify Webhook Signature (for security)
const verifyWebhookSignature = (req) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);
  const computedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");
  return signature === computedSignature;
};

// 3. Handle Cashfree Webhook — Auto-update Payment Status
const handleWebhook = async (req, res) => {
  try {
    // Verify authenticity
    if (!verifyWebhookSignature(req)) {
      console.warn("⚠️ Invalid webhook signature received!");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    const { link_id, payment_status, cf_payment_id, payment_time } = event.data;

    const txn = await Transaction.findOne({ linkId: link_id });
    if (!txn) {
      console.warn("No transaction found for link_id:", link_id);
      return res.status(404).send("Transaction not found");
    }

    txn.status = payment_status === "SUCCESS" ? "PAID" : payment_status;
    txn.referenceId = cf_payment_id;
    txn.paymentDate = payment_time;
    await txn.save();

    res.status(200).send("Webhook received successfully");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error processing webhook");
  }
};

// 4. Manually Verify Payment Link Status
const verifyPaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    const headers = {
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
      "x-api-version": "2022-09-01",
    };

    const response = await axios.get(`${CASHFREE_BASE_URL}/links/${linkId}`, {
      headers,
    });

    const txn = await Transaction.findOne({ linkId });
    if (txn) {
      txn.status = response.data.link_status;
      txn.referenceId = response.data.cf_payment_id || txn.referenceId;
      await txn.save();
    }

    res.json({
      success: true,
      linkId,
      status: response.data.link_status,
      data: response.data,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// 5. Get All Transactions (for Admin Dashboard)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};

module.exports = {
  createPaymentLink,
  handleWebhook,
  verifyPaymentLink,
  getAllTransactions,
};
