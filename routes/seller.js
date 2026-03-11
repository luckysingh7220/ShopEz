const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/overview", protect, authorize("seller"), async (req, res) => {
  try {
    const sellerProducts = await Product.find({ seller: req.user._id }).select("_id name stock");
    const productIds = sellerProducts.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({
        totalProducts: 0,
        lowStockProducts: 0,
        totalSales: 0,
        totalOrders: 0,
        recentOrders: [],
        topProducts: []
      });
    }

    const orders = await Order.find({ "items.product": { $in: productIds } })
      .sort({ createdAt: -1 })
      .populate("buyer", "name email")
      .limit(20);

    let totalSales = 0;
    for (const order of orders) {
      for (const item of order.items) {
        if (productIds.some((id) => id.equals(item.product))) {
          const gross = item.price * item.quantity;
          const discount = gross * ((item.discount || 0) / 100);
          totalSales += gross - discount;
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
      totalOrders: orders.length,
      recentOrders: orders.slice(0, 5),
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/products", protect, authorize("seller"), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, seller: req.user._id });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
