const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/orders", protect, authorize("seller"), async (req, res) => {
  try {
    const sellerProducts = await require("../models/Product")
      .find({ seller: req.user._id })
      .select("_id");
    const productIds = sellerProducts.map((p) => p._id);

    const orders = await Order.find({ "items.product": { $in: productIds } })
      .sort({ createdAt: -1 })
      .populate("buyer", "name email")
      .populate("items.product", "name");

    res.json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/orders/:orderId/status", protect, authorize("seller"), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/dashboard", protect, authorize("seller"), async (req, res) => {
  try {
    const Product = require("../models/Product");
    const MongoDB = require("mongoose");

    const sellerProducts = await Product.find({ seller: req.user._id }).select("_id name stock");
    const productIds = sellerProducts.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({
        totalProducts: 0,
        lowStockProducts: 0,
        totalSales: 0,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: [],
        topProducts: [],
        monthlyChart: []
      });
    }

    const orders = await Order.find({ "items.product": { $in: productIds } })
      .sort({ createdAt: -1 })
      .populate("buyer", "name email")
      .limit(50);

    let totalSales = 0;
    let totalOrders = 0;
    for (const order of orders) {
      if (order.status !== "cancelled") {
        for (const item of order.items) {
          if (productIds.some((id) => id.equals(item.product._id || item.product))) {
            const gross = item.price * item.quantity;
            const discount = gross * ((item.discount || 0) / 100);
            totalSales += gross - discount;
            totalOrders += 1;
          }
        }
      }
    }

    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          unitsSold: { $sum: "$items.quantity" },
          revenue: {
            $sum: {
              $subtract: [
                { $multiply: ["$items.price", "$items.quantity"] },
                {
                  $multiply: [
                    { $multiply: ["$items.price", "$items.quantity"] },
                    { $divide: ["$items.discount", 100] }
                  ]
                }
              ]
            }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      {
        $project: {
          _id: 1,
          unitsSold: 1,
          revenue: { $round: ["$revenue", 2] },
          name: { $ifNull: [{ $arrayElemAt: ["$product.name", 0] }, "Unknown"] }
        }
      }
    ]);

    const lowStockProducts = sellerProducts.filter((p) => p.stock <= 5).length;

    res.json({
      totalProducts: sellerProducts.length,
      lowStockProducts,
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders,
      totalRevenue: Number(totalSales.toFixed(2)),
      recentOrders: orders.slice(0, 10),
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
