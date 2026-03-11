const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET || "sk_test_placeholder");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/create-intent", protect, authorize("buyer"), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.body.orderId, buyer: req.user._id });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: "usd",
      metadata: { orderId: order._id.toString() }
    });

    const payment = await Payment.create({
      order: order._id,
      stripePaymentIntentId: paymentIntent.id,
      amount: order.total,
      status: "pending"
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/confirm", protect, authorize("buyer"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.body.paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    if (paymentIntent.status === "succeeded") {
      payment.status = "succeeded";
      payment.receiptUrl = paymentIntent.charges.data[0]?.receipt_url || "";
      await payment.save();

      const order = await Order.findByIdAndUpdate(
        payment.order,
        { status: "processing" },
        { new: true }
      );

      return res.json({
        message: "Payment successful",
        order
      });
    }

    res.status(400).json({ message: "Payment not yet completed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
