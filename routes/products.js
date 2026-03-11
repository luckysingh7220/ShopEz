const express = require("express");
const Product = require("../models/Product");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ];
    }
    if (category) {
      filter.category = { $regex: `^${category}$`, $options: "i" };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "rating") sortOption = { rating: -1 };
    if (sort === "discount") sortOption = { discount: -1 };

    const products = await Product.find(filter).sort(sortOption).limit(100).populate("seller", "name");

    res.json({ count: products.length, products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("seller", "name");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Invalid product id" });
  }
});

router.post("/", protect, authorize("seller"), async (req, res) => {
  try {
    const { name, description, category, price, discount, stock, imageUrl } = req.body;

    if (!name || !description || !category || price == null || stock == null) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const product = await Product.create({
      name,
      description,
      category,
      price,
      discount: discount || 0,
      stock,
      imageUrl,
      seller: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/reviews", protect, authorize("buyer"), async (req, res) => {
  try {
    const { comment, rating } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.reviews.push({
      author: req.user.name,
      comment,
      rating: Number(rating) || 5
    });

    const ratingTotal = product.reviews.reduce((acc, review) => acc + review.rating, 0);
    product.rating = ratingTotal / product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added", rating: product.rating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
