const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await Product.deleteMany({});
    await User.deleteMany({});

    const seller = await User.create({
      name: "ShopEZ Seller",
      email: "seller@shopez.com",
      password: "password123",
      role: "seller"
    });

    await User.create({
      name: "ShopEZ Buyer",
      email: "buyer@shopez.com",
      password: "password123",
      role: "buyer"
    });

    await Product.insertMany([
      {
        name: "Nimbus Wireless Headphones",
        description: "Immersive sound, all-day comfort, and active noise cancellation.",
        category: "Electronics",
        price: 149.99,
        discount: 15,
        stock: 24,
        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200",
        seller: seller._id
      },
      {
        name: "AeroFit Smartwatch",
        description: "Track workouts, sleep quality, and notifications in one sleek device.",
        category: "Wearables",
        price: 119.0,
        discount: 10,
        stock: 18,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200",
        seller: seller._id
      },
      {
        name: "Luma Desk Lamp",
        description: "Minimal design with adjustable color temperature and USB charging.",
        category: "Home",
        price: 49.5,
        discount: 5,
        stock: 42,
        imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200",
        seller: seller._id
      },
      {
        name: "Stride Runner Shoes",
        description: "Breathable knit upper and responsive cushioning for daily runs.",
        category: "Fashion",
        price: 89.99,
        discount: 20,
        stock: 30,
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200",
        seller: seller._id
      }
    ]);

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
