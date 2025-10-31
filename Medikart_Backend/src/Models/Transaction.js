const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentLink: { type: String },
    status: { type: String, default: "PENDING" },
    referenceId: { type: String },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
