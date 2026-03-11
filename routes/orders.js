const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("buyer"), async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    const orderItems = [];
    let subtotal = 0;
    let discountTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      if (product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const lineSubtotal = product.price * quantity;
      const lineDiscount = lineSubtotal * ((product.discount || 0) / 100);

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        discount: product.discount,
        quantity
      });

      product.stock -= quantity;
      await product.save();
    }

    const total = Number((subtotal - discountTotal).toFixed(2));

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      total,
      shippingAddress
    });

    return res.status(201).json({
      message: "Order confirmed",
      orderId: order._id,
      total
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/my", protect, authorize("buyer"), async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
