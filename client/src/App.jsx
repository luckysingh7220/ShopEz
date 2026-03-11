import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const initialProductForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  discount: "0",
  stock: "",
  imageUrl: ""
};

function App() {
  const [view, setView] = useState("browse");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerStats, setSellerStats] = useState(null);
  const [myOrders, setMyOrders] = useState([]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");

  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "buyer" });
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [productForm, setProductForm] = useState(initialProductForm);
  const [editingProductId, setEditingProductId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("processing");

  const [status, setStatus] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const [token, setToken] = useState(localStorage.getItem("shopez_token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("shopez_user") || "null");
    } catch {
      return null;
    }
  });

  const isSeller = user?.role === "seller";
  const isBuyer = user?.role === "buyer";

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0),
    [cart]
  );

  const request = async (url, options = {}) => {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  };

  const loadProducts = async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    const result = await request(`/api/products${params.toString() ? `?${params}` : ""}`);
    setProducts(result.products || []);
  };

  const loadWishlist = async () => {
    if (!token) return;
    try {
      const data = await request("/api/profile/wishlist");
      setWishlist((data.products || []).map((p) => p._id));
    } catch {
      setWishlist([]);
    }
  };

  const loadBuyerData = async () => {
    if (!isBuyer) return;
    const orders = await request("/api/orders/my");
    setMyOrders(orders.orders || []);
  };

  const loadSellerData = async () => {
    if (!isSeller || !user?.id) return;
    const [prod, orders, dashboard] = await Promise.all([
      request(`/api/product-management/seller/${user.id}`),
      request("/api/vendor/orders"),
      request("/api/vendor/dashboard")
    ]);
    setSellerProducts(prod.products || []);
    setSellerOrders(orders.orders || []);
    setSellerStats(dashboard);
  };

  useEffect(() => {
    loadProducts().catch((e) => setStatus(e.message));
  }, [query, category, sort]);

  useEffect(() => {
    if (!token || !user) return;
    loadWishlist();
    if (isBuyer) {
      loadBuyerData().catch((e) => setStatus(e.message));
    }
    if (isSeller) {
      loadSellerData().catch((e) => setStatus(e.message));
    }
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("shopez_user", JSON.stringify(user));
      localStorage.setItem("shopez_token", token);
      setProfileForm({ name: user.name, email: user.email });
    } else {
      localStorage.removeItem("shopez_user");
      localStorage.removeItem("shopez_token");
    }
  }, [user, token]);

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      const finalPrice = product.price - product.price * ((product.discount || 0) / 100);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      return [...prev, { productId: product._id, name: product.name, finalPrice, quantity: 1 }];
    });
  };

  const toggleWishlist = async (productId) => {
    if (!token) {
      setStatus("Please sign in first");
      return;
    }

    try {
      if (wishlist.includes(productId)) {
        await request(`/api/profile/wishlist/${productId}`, { method: "DELETE" });
        setWishlist((prev) => prev.filter((id) => id !== productId));
      } else {
        await request("/api/profile/wishlist/add", {
          method: "POST",
          body: JSON.stringify({ productId })
        });
        setWishlist((prev) => [...prev, productId]);
      }
    } catch (e) {
      setStatus(e.message);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              role: authForm.role
            };

      const data = await request(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setToken(data.token);
      setUser(data.user);
      setAuthOpen(false);
      setAuthForm({ name: "", email: "", password: "", role: "buyer" });
      setStatus("Signed in successfully");
    } catch (e) {
      setStatus(e.message);
    }
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setWishlist([]);
    setCart([]);
    setMyOrders([]);
    setSellerProducts([]);
    setSellerOrders([]);
    setSellerStats(null);
    setView("browse");
  };

  const submitCheckout = async (event) => {
    event.preventDefault();
    if (!isBuyer) return setStatus("Checkout requires buyer account");
    if (!cart.length) return setStatus("Cart is empty");

    try {
      const data = await request("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          shippingAddress
        })
      });
      setCart([]);
      setShippingAddress("");
      setStatus(`Order confirmed. ID: ${data.orderId}`);
      await loadProducts();
      await loadBuyerData();
    } catch (e) {
      setStatus(e.message);
    }
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    try {
      const data = await request("/api/profile/me", {
        method: "PUT",
        body: JSON.stringify(profileForm)
      });
      const updated = data.user;
      setUser({ id: updated._id, name: updated.name, email: updated.email, role: updated.role });
      setStatus("Profile updated");
    } catch (e) {
      setStatus(e.message);
    }
  };

  const startCreateProduct = () => {
    setEditingProductId("");
    setProductForm(initialProductForm);
    setProductOpen(true);
  };

  const startEditProduct = (product) => {
    setEditingProductId(product._id);
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      discount: String(product.discount || 0),
      stock: String(product.stock),
      imageUrl: product.imageUrl || ""
    });
    setProductOpen(true);
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      discount: Number(productForm.discount || 0),
      stock: Number(productForm.stock)
    };

    try {
      if (editingProductId) {
        await request(`/api/product-management/${editingProductId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/api/product-management", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setProductOpen(false);
      setProductForm(initialProductForm);
      await loadProducts();
      await loadSellerData();
      setStatus("Product saved");
    } catch (e) {
      setStatus(e.message);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await request(`/api/product-management/${id}`, { method: "DELETE" });
      await loadProducts();
      await loadSellerData();
      setStatus("Product deleted");
    } catch (e) {
      setStatus(e.message);
    }
  };

  const updateOrderStatus = async (event) => {
    event.preventDefault();
    if (!selectedOrderId) return;
    try {
      await request(`/api/vendor/orders/${selectedOrderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: selectedStatus })
      });
      await loadSellerData();
      setStatus("Order status updated");
    } catch (e) {
      setStatus(e.message);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="logo">ShopEZ</div>
        <div className="actions">
          <button className={view === "browse" ? "tab active" : "tab"} onClick={() => setView("browse")}>Browse</button>
          {user && <button className={view === "profile" ? "tab active" : "tab"} onClick={() => setView("profile")}>Profile</button>}
          {isSeller && <button className={view === "seller" ? "tab active" : "tab"} onClick={() => setView("seller")}>Seller</button>}
          {user ? (
            <button onClick={logout} className="btn ghost">{user.name} (Logout)</button>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn ghost">Sign In</button>
          )}
          <button onClick={() => setCartOpen(true)} className="btn solid">Cart {cartCount}</button>
        </div>
      </header>

      <main className="container">
        {status && <p className="status">{status}</p>}

        {view === "browse" && (
          <>
            <section className="hero">
              <h1>MERN ShopEZ</h1>
              <p>Same functionality, now with a React frontend.</p>
            </section>
            <section className="controls">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." />
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Wearables">Wearables</option>
                <option value="Home">Home</option>
                <option value="Fashion">Fashion</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="discount">Best Discount</option>
              </select>
            </section>
            <section className="grid">
              {products.map((product) => {
                const discounted = product.price - product.price * ((product.discount || 0) / 100);
                return (
                  <article key={product._id} className="card">
                    <img src={product.imageUrl} alt={product.name} />
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                    <p>
                      <strong>${discounted.toFixed(2)}</strong>{" "}
                      {product.discount > 0 && <span className="strike">${Number(product.price).toFixed(2)}</span>}
                    </p>
                    <p>Stock: {product.stock}</p>
                    <div className="row">
                      <button className="btn solid" onClick={() => addToCart(product)}>Add</button>
                      <button className="btn ghost" onClick={() => toggleWishlist(product._id)}>
                        {wishlist.includes(product._id) ? "Wishlisted" : "Wishlist"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {view === "profile" && user && (
          <section className="panel">
            <h2>My Profile</h2>
            <form onSubmit={submitProfile} className="form">
              <input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} required />
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} required />
              <button className="btn solid" type="submit">Update Profile</button>
            </form>

            <h3>Wishlist</h3>
            <div className="grid small-grid">
              {products.filter((p) => wishlist.includes(p._id)).map((product) => (
                <article key={product._id} className="card compact">
                  <img src={product.imageUrl} alt={product.name} />
                  <h4>{product.name}</h4>
                  <div className="row">
                    <button className="btn solid" onClick={() => addToCart(product)}>Add</button>
                    <button className="btn ghost" onClick={() => toggleWishlist(product._id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>

            {isBuyer && (
              <>
                <h3>Order History</h3>
                <ul className="list">
                  {myOrders.map((order) => (
                    <li key={order._id}>
                      <strong>{order._id}</strong> | {order.items.length} items | ${order.total.toFixed(2)} | {order.status}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {view === "seller" && isSeller && (
          <section className="panel">
            <h2>Seller Dashboard</h2>
            <div className="stats">
              <div>Products: {sellerStats?.totalProducts ?? 0}</div>
              <div>Low Stock: {sellerStats?.lowStockProducts ?? 0}</div>
              <div>Orders: {sellerStats?.totalOrders ?? 0}</div>
              <div>Revenue: ${Number(sellerStats?.totalRevenue || 0).toFixed(2)}</div>
            </div>

            <div className="row space-between">
              <h3>My Products</h3>
              <button className="btn solid" onClick={startCreateProduct}>+ Add Product</button>
            </div>
            <div className="grid small-grid">
              {sellerProducts.map((product) => (
                <article key={product._id} className="card compact">
                  <img src={product.imageUrl} alt={product.name} />
                  <h4>{product.name}</h4>
                  <p>${Number(product.price).toFixed(2)} | Stock {product.stock}</p>
                  <div className="row">
                    <button className="btn ghost" onClick={() => startEditProduct(product)}>Edit</button>
                    <button className="btn ghost" onClick={() => deleteProduct(product._id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>

            <h3>Orders</h3>
            <ul className="list">
              {sellerOrders.map((order) => (
                <li key={order._id}>
                  <label>
                    <input
                      type="radio"
                      name="orderPick"
                      value={order._id}
                      checked={selectedOrderId === order._id}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                    />
                    {order._id} | Buyer: {order?.buyer?.name || "Unknown"} | ${order.total.toFixed(2)} | {order.status}
                  </label>
                </li>
              ))}
            </ul>
            <form onSubmit={updateOrderStatus} className="row">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="confirmed">confirmed</option>
                <option value="processing">processing</option>
                <option value="shipped">shipped</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button className="btn solid" type="submit">Update Status</button>
            </form>
          </section>
        )}
      </main>

      {authOpen && (
        <div className="modal">
          <form onSubmit={submitAuth} className="modal-body">
            <h3>{authMode === "login" ? "Sign In" : "Register"}</h3>
            {authMode === "register" && (
              <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))} required />
            )}
            <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))} required />
            <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))} required />
            {authMode === "register" && (
              <select value={authForm.role} onChange={(e) => setAuthForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            )}
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => setAuthMode((m) => (m === "login" ? "register" : "login"))}>
                {authMode === "login" ? "Switch to Register" : "Switch to Login"}
              </button>
              <button className="btn solid" type="submit">Continue</button>
              <button className="btn ghost" type="button" onClick={() => setAuthOpen(false)}>Close</button>
            </div>
          </form>
        </div>
      )}

      {cartOpen && (
        <div className="drawer">
          <div className="drawer-body">
            <h3>Your Cart</h3>
            <ul className="list">
              {cart.map((item) => (
                <li key={item.productId}>{item.name} x {item.quantity} (${item.finalPrice.toFixed(2)})</li>
              ))}
            </ul>
            <p>Total: ${cartTotal.toFixed(2)}</p>
            <form onSubmit={submitCheckout} className="form">
              <textarea
                rows={3}
                placeholder="Shipping address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
              />
              <button className="btn solid" type="submit">Checkout</button>
            </form>
            <button className="btn ghost" onClick={() => setCartOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {productOpen && (
        <div className="modal">
          <form onSubmit={submitProduct} className="modal-body">
            <h3>{editingProductId ? "Edit Product" : "Add Product"}</h3>
            <input placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
            <textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} required />
            <input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} required />
            <input type="number" step="0.01" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required />
            <input type="number" min="0" max="90" placeholder="Discount" value={productForm.discount} onChange={(e) => setProductForm((p) => ({ ...p, discount: e.target.value }))} />
            <input type="number" min="0" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} required />
            <input placeholder="Image URL" value={productForm.imageUrl} onChange={(e) => setProductForm((p) => ({ ...p, imageUrl: e.target.value }))} />
            <div className="row">
              <button className="btn solid" type="submit">Save</button>
              <button className="btn ghost" type="button" onClick={() => setProductOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
