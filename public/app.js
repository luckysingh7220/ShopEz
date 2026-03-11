const state = {
  products: [],
  cart: [],
  wishlist: [],
  authMode: "login",
  token: localStorage.getItem("shopez_token") || "",
  user: JSON.parse(localStorage.getItem("shopez_user") || "null"),
  currentView: "browse",
  currentOrder: null
};

const refs = {
  navBrowse: document.getElementById("nav-browse"),
  navSeller: document.getElementById("nav-seller"),
  navProfile: document.getElementById("nav-profile"),
  browseSection: document.getElementById("browse-section"),
  profileSection: document.getElementById("profile-section"),
  sellerSection: document.getElementById("seller-section"),
  productGrid: document.getElementById("product-grid"),
  metricProducts: document.getElementById("metric-products"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  sortFilter: document.getElementById("sort-filter"),
  refreshProducts: document.getElementById("refresh-products"),
  openCart: document.getElementById("open-cart"),
  closeCart: document.getElementById("close-cart"),
  cartPanel: document.getElementById("cart-panel"),
  cartItems: document.getElementById("cart-items"),
  cartSummary: document.getElementById("cart-summary"),
  cartCount: document.getElementById("cart-count"),
  checkoutForm: document.getElementById("checkout-form"),
  shippingAddress: document.getElementById("shipping-address"),
  checkoutStatus: document.getElementById("checkout-status"),
  openAuth: document.getElementById("open-auth"),
  authModal: document.getElementById("auth-modal"),
  authForm: document.getElementById("auth-form"),
  authTitle: document.getElementById("auth-title"),
  authName: document.getElementById("auth-name"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authRole: document.getElementById("auth-role"),
  authStatus: document.getElementById("auth-status"),
  toggleAuth: document.getElementById("toggle-auth"),
  profileForm: document.getElementById("profile-form"),
  profileName: document.getElementById("profile-name"),
  profileEmail: document.getElementById("profile-email"),
  wishlistGrid: document.getElementById("wishlist-grid"),
  orderHistory: document.getElementById("order-history"),
  addProductBtn: document.getElementById("add-product-btn"),
  sellerProducts: document.getElementById("seller-products"),
  sellerOrders: document.getElementById("seller-orders"),
  orderStatusForm: document.getElementById("order-status-form"),
  orderStatusSelect: document.getElementById("order-status-select"),
  sellerDashboardCards: document.getElementById("seller-dashboard-cards"),
  productModal: document.getElementById("product-modal"),
  productForm: document.getElementById("product-form"),
  productName: document.getElementById("product-name"),
  productDescription: document.getElementById("product-description"),
  productCategory: document.getElementById("product-category"),
  productPrice: document.getElementById("product-price"),
  productDiscount: document.getElementById("product-discount"),
  productStock: document.getElementById("product-stock"),
  productImageUrl: document.getElementById("product-imageUrl"),
  closeProductModal: document.getElementById("close-product-modal"),
  productStatus: document.getElementById("product-status")
};

const formatMoney = (value) => `$${Number(value).toFixed(2)}`;

const api = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

const calculateFinalPrice = (product) => product.price - product.price * ((product.discount || 0) / 100);

const setView = (view) => {
  state.currentView = view;
  refs.browseSection.classList.toggle("hidden", view !== "browse");
  refs.profileSection.classList.toggle("hidden", view !== "profile");
  refs.sellerSection.classList.toggle("hidden", view !== "seller");
  refs.navBrowse.classList.toggle("active", view === "browse");
  refs.navProfile.classList.toggle("active", view === "profile");
  refs.navSeller.classList.toggle("active", view === "seller");
  if (view === "profile" && state.user) loadProfile();
  if (view === "seller" && state.user?.role === "seller") loadSellerDashboard();
};

const renderProducts = () => {
  refs.metricProducts.textContent = state.products.length;
  refs.productGrid.innerHTML = state.products
    .map((product) => {
      const discounted = calculateFinalPrice(product);
      const wishlistBtn = state.wishlist.includes(product._id) ? "❤️ Wishlisted" : "🤍 Wishlist";
      return `<article class="product-card"><img src="${product.imageUrl}" alt="${product.name}" /><div class="product-content"><h3>${product.name}</h3><p class="small">${product.category} | ${Number(product.rating||0).toFixed(1)}⭐</p><div class="price-line"><span class="new-price">${formatMoney(discounted)}</span>${product.discount?`<span class="old-price">${formatMoney(product.price)}</span>`:""}</div><p class="small">${product.description.slice(0,60)}...</p><p class="small">Stock: ${product.stock}</p><button class="btn solid" data-add="${product._id}">Add to Cart</button><button class="btn ghost" data-wishlist="${product._id}">${wishlistBtn}</button></div></article>`;
    })
    .join("");

  document.querySelectorAll("[data-add]").forEach((btn) => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
  document.querySelectorAll("[data-wishlist]").forEach((btn) => btn.addEventListener("click", () => toggleWishlist(btn.dataset.wishlist)));
};

const renderCart = () => {
  refs.cartCount.textContent = state.cart.reduce((a, i) => a + i.quantity, 0);
  if (!state.cart.length) {
    refs.cartItems.innerHTML = "<li>Cart is empty</li>";
    refs.cartSummary.innerHTML = "";
    return;
  }
  refs.cartItems.innerHTML = state.cart.map(i => `<li><strong>${i.name}</strong> x${i.quantity}<br/>${formatMoney(i.finalPrice)}</li>`).join("");
  refs.cartSummary.innerHTML = `<strong>Total: ${formatMoney(state.cart.reduce((a, i) => a + i.finalPrice * i.quantity, 0))}</strong>`;
};

const addToCart = (productId) => {
  const product = state.products.find((p) => p._id === productId);
  if (!product || product.stock <= 0) return;
  const existing = state.cart.find((item) => item.productId === productId);
  const finalPrice = calculateFinalPrice(product);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, product.stock);
  } else {
    state.cart.push({ productId, name: product.name, finalPrice, quantity: 1 });
  }
  renderCart();
};

const toggleWishlist = async (productId) => {
  try {
    if (state.wishlist.includes(productId)) {
      await api(`/api/profile/wishlist/${productId}`, { method: "DELETE" });
      state.wishlist = state.wishlist.filter((id) => id !== productId);
    } else {
      await api("/api/profile/wishlist/add", { method: "POST", body: JSON.stringify({ productId }) });
      state.wishlist.push(productId);
    }
    renderProducts();
  } catch (error) {
    alert(error.message);
  }
};

const loadProducts = async () => {
  const params = new URLSearchParams();
  if (refs.searchInput.value.trim()) params.set("q", refs.searchInput.value.trim());
  if (refs.categoryFilter.value) params.set("category", refs.categoryFilter.value);
  if (refs.sortFilter.value) params.set("sort", refs.sortFilter.value);
  const data = await api(`/api/products${params.toString() ? `?${params}` : ""}`);
  state.products = data.products || [];
  renderProducts();
};

const persistAuth = () => {
  if (state.token && state.user) {
    localStorage.setItem("shopez_token", state.token);
    localStorage.setItem("shopez_user", JSON.stringify(state.user));
  } else {
    localStorage.removeItem("shopez_token");
    localStorage.removeItem("shopez_user");
  }
};

const updateAuthUI = () => {
  if (state.user) {
    refs.openAuth.textContent = `${state.user.name} (Logout)`;
    refs.navProfile.style.display = "block";
    refs.navSeller.style.display = state.user.role === "seller" ? "block" : "none";
  } else {
    refs.openAuth.textContent = "Sign In";
    refs.navProfile.style.display = "none";
    refs.navSeller.style.display = "none";
  }
};

const setStatus = (el, message, type = "") => {
  el.textContent = message;
  el.className = `status ${type}`.trim();
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();
  try {
    const payload = { email: refs.authEmail.value, password: refs.authPassword.value };
    let endpoint = "/api/auth/login";
    if (state.authMode === "register") {
      payload.name = refs.authName.value;
      payload.role = refs.authRole.value;
      endpoint = "/api/auth/register";
    }
    const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    persistAuth();
    updateAuthUI();
    setStatus(refs.authStatus, "Signed in", "ok");
    setTimeout(() => {
      refs.authModal.close();
      setStatus(refs.authStatus, "");
      setView("browse");
    }, 650);
    await loadWishlist();
  } catch (error) {
    setStatus(refs.authStatus, error.message, "error");
  }
};

const loadProfile = async () => {
  try {
    if (!state.user) return;
    refs.profileName.value = state.user.name;
    refs.profileEmail.value = state.user.email;
    const orders = await api("/api/orders/my");
    refs.orderHistory.innerHTML = (orders.orders || []).map(o => `<li><strong>Order #${o._id}</strong><div class="small">Items: ${o.items.length} | ${formatMoney(o.total)}</div><div class="small">Status: <strong>${o.status}</strong></div></li>`).join("");
    await loadWishlist();
    renderWishlist();
  } catch (error) {
    console.error(error);
  }
};

const loadWishlist = async () => {
  try {
    const data = await api("/api/profile/wishlist");
    state.wishlist = (data.products || []).map((p) => p._id);
  } catch (error) {
    console.error(error);
  }
};

const renderWishlist = () => {
  const products = state.products.filter((p) => state.wishlist.includes(p._id));
  refs.wishlistGrid.innerHTML = products.length === 0 ? "<p>Wishlist empty</p>" : products.map(p => {
    const price = calculateFinalPrice(p);
    return `<article class="product-card"><img src="${p.imageUrl}" alt="${p.name}" /><div class="product-content"><h3>${p.name}</h3><div class="price-line"><span class="new-price">${formatMoney(price)}</span></div><button class="btn solid" data-add="${p._id}">Add to Cart</button><button class="btn ghost" data-remove="${p._id}">Remove</button></div></article>`;
  }).join("");
  document.querySelectorAll("[data-add]").forEach((btn) => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
  document.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => toggleWishlist(btn.dataset.remove)));
};

const handleProfileSubmit = async (event) => {
  event.preventDefault();
  try {
    await api("/api/profile/me", { method: "PUT", body: JSON.stringify({ name: refs.profileName.value, email: refs.profileEmail.value }) });
    alert("Profile updated");
  } catch (error) {
    alert(error.message);
  }
};

const loadSellerDashboard = async () => {
  try {
    const data = await api("/api/vendor/dashboard");
    refs.sellerDashboardCards.innerHTML = [
      { label: "Products", value: data.totalProducts },
      { label: "Low Stock", value: data.lowStockProducts },
      { label: "Orders", value: data.totalOrders },
      { label: "Revenue", value: formatMoney(data.totalRevenue) }
    ].map(e => `<article><div class="small">${e.label}</div><strong>${e.value}</strong></article>`).join("");
    await loadSellerProducts();
    await loadSellerOrders();
  } catch (error) {
    alert(error.message);
  }
};

const loadSellerProducts = async () => {
  try {
    const data = await api(`/api/product-management/seller/${state.user._id}`);
    refs.sellerProducts.innerHTML = (data.products || []).map(p => `<article class="product-card"><img src="${p.imageUrl}" /><div class="product-content"><h3>${p.name}</h3><p class="small">Stock: ${p.stock} | ${formatMoney(p.price)}</p><button class="btn ghost" data-edit="${p._id}">Edit</button><button class="btn ghost" data-delete="${p._id}">Delete</button></div></article>`).join("");
    document.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editProduct(btn.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteProduct(btn.dataset.delete)));
  } catch (error) {
    alert(error.message);
  }
};

const loadSellerOrders = async () => {
  try {
    const data = await api("/api/vendor/orders");
    refs.sellerOrders.innerHTML = (data.orders || []).map(o => `<li data-order="${o._id}"><strong>Order #${o._id}</strong><div class="small">Buyer: ${o.buyer.name}</div><div class="small">Items: ${o.items.length} | ${formatMoney(o.total)}</div><div class="small">Status: <strong>${o.status}</strong></div><button class="update-status-btn" data-update="${o._id}">Update Status</button></li>`).join("");
    document.querySelectorAll(".update-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentOrder = btn.dataset.update;
        refs.orderStatusForm.classList.remove("hidden");
      });
    });
  } catch (error) {
    alert(error.message);
  }
};

const editProduct = (productId) => {
  const product = state.products.find((p) => p._id === productId);
  if (product) {
    refs.productName.value = product.name;
    refs.productDescription.value = product.description;
    refs.productCategory.value = product.category;
    refs.productPrice.value = product.price;
    refs.productDiscount.value = product.discount || 0;
    refs.productStock.value = product.stock;
    refs.productImageUrl.value = product.imageUrl;
    refs.productModal.dataset.editId = productId;
    refs.productModal.showModal();
  }
};

const deleteProduct = async (productId) => {
  if (!confirm("Delete this product?")) return;
  try {
    await api(`/api/product-management/${productId}`, { method: "DELETE" });
    await loadSellerProducts();
  } catch (error) {
    alert(error.message);
  }
};

const handleProductSubmit = async (event) => {
  event.preventDefault();
  const payload = {
    name: refs.productName.value,
    description: refs.productDescription.value,
    category: refs.productCategory.value,
    price: Number(refs.productPrice.value),
    discount: Number(refs.productDiscount.value) || 0,
    stock: Number(refs.productStock.value),
    imageUrl: refs.productImageUrl.value
  };
  try {
    const editId = refs.productModal.dataset.editId;
    if (editId) {
      await api(`/api/product-management/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
      delete refs.productModal.dataset.editId;
    } else {
      await api("/api/product-management", { method: "POST", body: JSON.stringify(payload) });
    }
    refs.productModal.close();
    refs.productForm.reset();
    await loadSellerProducts();
  } catch (error) {
    setStatus(refs.productStatus, error.message, "error");
  }
};

const handleOrderStatusSubmit = async (event) => {
  event.preventDefault();
  try {
    await api(`/api/vendor/orders/${state.currentOrder}/status`, { method: "PUT", body: JSON.stringify({ status: refs.orderStatusSelect.value }) });
    refs.orderStatusForm.classList.add("hidden");
    await loadSellerOrders();
  } catch (error) {
    alert(error.message);
  }
};

const handleCheckout = async (event) => {
  event.preventDefault();
  if (!state.user || state.user.role !== "buyer") {
    setStatus(refs.checkoutStatus, "Sign in as buyer", "error");
    return;
  }
  if (!state.cart.length) {
    setStatus(refs.checkoutStatus, "Cart is empty", "error");
    return;
  }
  try {
    const data = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items: state.cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: refs.shippingAddress.value
      })
    });
    state.cart = [];
    renderCart();
    refs.checkoutForm.reset();
    setStatus(refs.checkoutStatus, `Order #${data.orderId} confirmed`, "ok");
    await loadProducts();
  } catch (error) {
    setStatus(refs.checkoutStatus, error.message, "error");
  }
};

refs.navBrowse.addEventListener("click", () => setView("browse"));
refs.navProfile.addEventListener("click", () => setView("profile"));
refs.navSeller.addEventListener("click", () => setView("seller"));
refs.refreshProducts.addEventListener("click", () => loadProducts().catch((e) => alert(e.message)));
refs.searchInput.addEventListener("input", () => loadProducts().catch((e) => alert(e.message)));
refs.categoryFilter.addEventListener("change", () => loadProducts().catch((e) => alert(e.message)));
refs.sortFilter.addEventListener("change", () => loadProducts().catch((e) => alert(e.message)));
refs.openCart.addEventListener("click", () => refs.cartPanel.classList.remove("hidden"));
refs.closeCart.addEventListener("click", () => refs.cartPanel.classList.add("hidden"));

refs.openAuth.addEventListener("click", () => {
  if (state.user) {
    state.user = null;
    state.token = "";
    state.cart = [];
    persistAuth();
    updateAuthUI();
    setView("browse");
    return;
  }
  refs.authModal.showModal();
});

refs.toggleAuth.addEventListener("click", () => {
  state.authMode = state.authMode === "login" ? "register" : "login";
  refs.authTitle.textContent = state.authMode === "login" ? "Sign In" : "Create Account";
  refs.toggleAuth.textContent = state.authMode === "login" ? "Switch to Register" : "Switch to Sign In";
  refs.authName.style.display = state.authMode === "login" ? "none" : "block";
  refs.authRole.style.display = state.authMode === "login" ? "none" : "block";
  setStatus(refs.authStatus, "");
});

refs.authForm.addEventListener("submit", handleAuthSubmit);
refs.profileForm.addEventListener("submit", handleProfileSubmit);
refs.checkoutForm.addEventListener("submit", handleCheckout);
refs.productForm.addEventListener("submit", handleProductSubmit);
refs.orderStatusForm.addEventListener("submit", handleOrderStatusSubmit);
refs.addProductBtn.addEventListener("click", () => {
  delete refs.productModal.dataset.editId;
  refs.productForm.reset();
  refs.productModal.showModal();
});
refs.closeProductModal.addEventListener("click", () => refs.productModal.close());

const init = async () => {
  refs.authName.style.display = "none";
  refs.authRole.style.display = "none";
  refs.navProfile.style.display = "none";
  refs.navSeller.style.display = "none";
  refs.orderStatusForm.classList.add("hidden");
  updateAuthUI();
  renderCart();
  await loadProducts();
  if (state.user) await loadWishlist();
};

init().catch((error) => {
  console.error(error);
  alert("Failed to initialize ShopEZ");
});
