const express = require("express");
const User = require("../models/User");
const Wishlist = require("../models/Wishlist");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

router.put("/me", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Profile updated",
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/wishlist/add", protect, async (req, res) => {
  try {
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ buyer: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ buyer: req.user._id, products: [productId] });
    } else {
      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
        await wishlist.save();
      }
    }

    res.json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/wishlist", protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ buyer: req.user._id }).populate("products");
    res.json(wishlist || { products: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/wishlist/:productId", protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { buyer: req.user._id },
      { $pull: { products: req.params.productId } },
      { new: true }
    );

    res.json({ message: "Product removed from wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
