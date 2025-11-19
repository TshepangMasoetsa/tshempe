// --- SLIDESHOW --- //
let slideIndex = 0;
function showSlides() {
  const slides = document.getElementsByClassName("slides");
  for (let s of slides) s.style.display = "none";
  slideIndex++;
  if (slideIndex > slides.length) slideIndex = 1;
  if (slides[slideIndex - 1]) slides[slideIndex - 1].style.display = "block";
  setTimeout(showSlides, 4000);
}
showSlides();

function nextSlide(n){
  slideIndex += n - 1;
  if (slideIndex < 0) slideIndex = 0;
  showSlides();
}

// --- THEME TOGGLE --- //
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark-mode");
  const pressed = themeToggle.getAttribute("aria-pressed") === "true";
  themeToggle.setAttribute("aria-pressed", !pressed);
  themeToggle.textContent = !pressed ? "☀️" : "🌙";
});

// --- SEARCH FILTER --- //
const searchInput = document.getElementById("search");
searchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const rows = document.querySelectorAll(".product-row");
  rows.forEach(row => {
    const name = (row.dataset.name || "").toLowerCase();
    const notes = (row.dataset.notes || "").toLowerCase();
    if (!q || name.includes(q) || notes.includes(q)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});

// --- MODAL HELPERS --- //
function openModal(modal) {
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
document.querySelectorAll(".close-modal").forEach(btn => {
  btn.addEventListener("click", () => {
    let modal = btn.closest(".modal");
    closeModal(modal);
  });
});

// Close modals by clicking overlay
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", (ev) => {
    if (ev.target === m) closeModal(m);
  });
});

// --- DETAILS POPUP --- //
const detailsModal = document.getElementById("detailsModal");
const detailImg = document.getElementById("detailImg");
const detailName = document.getElementById("detailName");
const detailNotes = document.getElementById("detailNotes");
const detailDesc = document.getElementById("detailDesc");
const detailSizes = document.getElementById("detailSizes");
const detailPrices = document.getElementById("detailPrices");
const detailAdd = document.getElementById("detailAdd");

let activeProduct = null;

document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const row = e.target.closest(".product-row");
    if (!row) return;
    activeProduct = row;
    detailImg.src = row.dataset.img || "images/placeholder.jpg";
    detailImg.alt = row.dataset.name || "product image";
    detailName.textContent = row.dataset.name || "";
    detailNotes.textContent = row.dataset.notes || "";
    detailDesc.textContent = row.dataset.desc || "";
    detailSizes.textContent = row.dataset.sizes || "";
    const prices = [];
    if (row.dataset.price50) prices.push(`50ml: $${row.dataset.price50}`);
    if (row.dataset.price100) prices.push(`100ml: $${row.dataset.price100}`);
    if (row.dataset.price) prices.push(`$${row.dataset.price}`);
    detailPrices.textContent = prices.join(" • ") || "—";
    openModal(detailsModal);
  });
});

// If user clicks add from details modal, add default size if available
detailAdd.addEventListener("click", () => {
  if (!activeProduct) return;
  // prefer 50ml if available then fallback to any price
  let price = activeProduct.dataset.price50 || activeProduct.dataset.price || activeProduct.dataset.price100 || 0;
  let size = activeProduct.dataset.price50 ? "50" : (activeProduct.dataset.price ? "" : "100");
  addToCart({
    id: activeProduct.dataset.name + "-" + size + "-" + price,
    name: activeProduct.dataset.name,
    size: size,
    price: Number(price),
    img: activeProduct.dataset.img
  }, null);
  closeModal(detailsModal);
});

// --- CART LOGIC --- //
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const cartItemsList = document.getElementById("cartItems");
const cartTotalBottom = document.getElementById("cartTotalBottom");
const clearCartBtn = document.getElementById("clearCart");
const checkoutBtn = document.getElementById("checkout");

let cart = []; // {id,name,size,price,qty,img}

function updateCartUI(){
  const totalQty = cart.reduce((s,i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s,i) => s + i.price * i.qty, 0);
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = `$${totalPrice.toFixed(2)}`;
  cartTotalBottom.textContent = `$${totalPrice.toFixed(2)}`;

  // list items
  cartItemsList.innerHTML = "";
  if (cart.length === 0) {
    cartItemsList.innerHTML = `<li class="muted">Your cart is empty</li>`;
    return;
  }
  cart.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${item.img || 'images/placeholder.jpg'}" alt="${item.name}" style="width:48px;height:48px;object-fit:cover;border-radius:6px">
        <div>
          <div style="font-weight:600">${item.name} ${item.size ? '· ' + item.size + 'ml' : ''}</div>
          <div class="muted" style="font-size:13px">$${item.price.toFixed(2)} × ${item.qty}</div>
        </div>
      </div>
      <div>
        <button class="qty-dec" data-id="${item.id}">−</button>
        <span style="padding:0 8px">${item.qty}</span>
        <button class="qty-inc" data-id="${item.id}">+</button>
        <button class="remove-item" data-id="${item.id}" style="margin-left:8px">Remove</button>
      </div>
    `;
    cartItemsList.appendChild(li);
  });

  // attach qty handlers
  cartItemsList.querySelectorAll(".qty-inc").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      changeQty(id, 1);
    });
  });
  cartItemsList.querySelectorAll(".qty-dec").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      changeQty(id, -1);
    });
  });
  cartItemsList.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      removeItem(id);
    });
  });
}

function changeQty(id, delta){
  const idx = cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx,1);
  updateCartUI();
}

function removeItem(id){
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
}

function clearCart(){
  cart = [];
  updateCartUI();
}

clearCartBtn.addEventListener("click", () => clearCart());

// Checkout handler (placeholder)
checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }
  alert("Checkout is a placeholder in this demo. Implement backend or payment gateway to complete purchases.");
});

// open cart
cartBtn.addEventListener("click", () => {
  openModal(cartModal);
});

// close cart by clicking overlay handled earlier

// Add to cart from table buttons
document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const row = e.target.closest(".product-row");
    if (!row) return;
    const name = row.dataset.name;
    const size = e.target.dataset.size || row.dataset.size || "";
    const price = Number(e.target.dataset.price || row.dataset.price || 0);
    const img = row.dataset.img || "images/placeholder.jpg";

    // animation: flying clone
    createFlyingClone(e.target, img);

    addToCart({
      id: `${name}-${size}-${price}`,
      name, size, price, img
    }, e.target);
  });
});

function addToCart(item, clickEl){
  const idx = cart.findIndex(i => i.id === item.id);
  if (idx === -1){
    cart.push({...item, qty:1});
  } else {
    cart[idx].qty += 1;
  }
  updateCartUI();
  // briefly pulse cart button
  cartBtn.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:320});
}

// flying clone animation for visual add-to-cart
function createFlyingClone(sourceEl, imgSrc){
  const clone = document.createElement("img");
  clone.src = imgSrc || "images/placeholder.jpg";
  clone.style.width = "64px";
  clone.style.height = "64px";
  clone.style.objectFit = "cover";
  clone.style.borderRadius = "8px";
  clone.style.position = "fixed";
  clone.style.zIndex = 9999;
  clone.style.transition = "transform 700ms cubic-bezier(.2,.8,.2,1), opacity 300ms";
  const rect = sourceEl.getBoundingClientRect();
  clone.style.left = rect.left + "px";
  clone.style.top = rect.top + "px";
  document.body.appendChild(clone);

  const cartRect = cartBtn.getBoundingClientRect();
  // force reflow
  clone.getBoundingClientRect();
  clone.style.transform = `translate(${cartRect.left - rect.left + 8}px, ${cartRect.top - rect.top + 8}px) scale(0.25)`;
  clone.style.opacity = '0.9';

  setTimeout(()=> {
    clone.style.opacity = '0';
    setTimeout(()=> document.body.removeChild(clone), 650);
  }, 700);
}

// --- CART ITEM QTY keyboard accessibility (optional) --- //
// Already wired in updateCartUI handlers

// --- Persist to localStorage (simple) --- //
function persistCart(){
  try{
    localStorage.setItem("ee_cart_v1", JSON.stringify(cart));
  }catch(e){}
}
function loadCart(){
  try{
    const saved = JSON.parse(localStorage.getItem("ee_cart_v1") || "[]");
    if (Array.isArray(saved)) cart = saved;
  }catch(e){ cart = []; }
  updateCartUI();
}
window.addEventListener("beforeunload", persistCart);
loadCart();

// --- EXTRA: allow clicking product image in details to add --- //
// Already provided via detailAdd

// --- Accessibility: ESC closes modals --- //
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal[aria-hidden='false']").forEach(m => closeModal(m));
  }
});























document.addEventListener("DOMContentLoaded", function() {
  const buttons = document.querySelectorAll('.fragrance-card button');
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  let cart = [];

  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const card = btn.closest('.fragrance-card');
      const img = card.querySelector('img');
      const name = card.querySelector('h3').textContent;
      const price = parseFloat(card.querySelector('.price').textContent.replace('$',''));

      // Flying image animation
      const clone = img.cloneNode(true);
      const rect = img.getBoundingClientRect();
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.transition = 'all 0.8s ease-in-out';
      clone.style.zIndex = 1000;
      document.body.appendChild(clone);

      const cartIcon = document.querySelector('.cart-icon svg');
      const targetRect = cartIcon.getBoundingClientRect();
      const targetX = targetRect.left;
      const targetY = targetRect.top;

      setTimeout(() => {
        clone.style.left = targetX + 'px';
        clone.style.top = targetY + 'px';
        clone.style.width = '30px';
        clone.style.height = '30px';
        clone.style.opacity = '0.5';
      }, 50);

      setTimeout(() => document.body.removeChild(clone), 850);

      // Update cart array
      let item = cart.find(i => i.name === name);
      if (item) {
        item.qty += 1;
      } else {
        cart.push({ name, price, qty: 1 });
      }

      updateCartUI();
    });
  });

  function updateCartUI() {
    cartItems.innerHTML = '';
    let totalQty = 0;
    let totalPrice = 0;
    cart.forEach(item => {
      totalQty += item.qty;
      totalPrice += item.price * item.qty;
      const li = document.createElement('li');
      li.textContent = `${item.name} x${item.qty} - $${(item.price*item.qty).toFixed(2)}`;
      cartItems.appendChild(li);
    });
    cartCount.textContent = totalQty;
    cartTotal.textContent = totalPrice.toFixed(2);
  }
});





document.addEventListener("DOMContentLoaded", function() {
  const buttons = document.querySelectorAll('.fragrance-card button');
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  let cart = [];

  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const card = btn.closest('.fragrance-card');
      const name = card.querySelector('h3').textContent;
      const price = parseFloat(card.querySelector('.price').textContent);

      // Check if item is already in cart
      let item = cart.find(i => i.name === name);
      if(item) {
        item.qty += 1;
      } else {
        cart.push({ name: name, price: price, qty: 1 });
      }

      updateCart();
    });
  });

  function updateCart() {
    cartItems.innerHTML = '';
    let totalQty = 0;
    let totalPrice = 0;

    cart.forEach(item => {
      totalQty += item.qty;
      totalPrice += item.price * item.qty;
      const li = document.createElement('li');
      li.textContent = `${item.name} x${item.qty} - $${(item.price*item.qty).toFixed(2)}`;
      cartItems.appendChild(li);
    });

    cartCount.textContent = totalQty;
    cartTotal.textContent = totalPrice.toFixed(2);
  }
});






document.addEventListener("DOMContentLoaded", function() {
  const buttons = document.querySelectorAll('.fragrance-card button');
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  let cart = [];

  buttons.forEach(button => {
    button.addEventListener('click', function() {
      const card = button.closest('.fragrance-card');
      const name = card.querySelector('h3').textContent;
      const price = parseFloat(card.querySelector('.price').textContent);

      // Check if item already exists
      const existing = cart.find(item => item.name === name);
      if(existing) {
        existing.qty += 1;
      } else {
        cart.push({ name: name, price: price, qty: 1 });
      }

      updateCart();
    });
  });

  function updateCart() {
    cartItems.innerHTML = '';
    let totalQty = 0;
    let totalPrice = 0;

    cart.forEach(item => {
      totalQty += item.qty;
      totalPrice += item.price * item.qty;

      const li = document.createElement('li');
      li.textContent = `${item.name} x${item.qty} - $${(item.price*item.qty).toFixed(2)}`;
      cartItems.appendChild(li);
    });

    cartCount.textContent = totalQty;
    cartTotal.textContent = totalPrice.toFixed(2);
  }
});









document.addEventListener("DOMContentLoaded", () => {
  const cartCount = document.getElementById("cartCount");
  const cartTotal = document.getElementById("cartTotal");
  const cartItems = document.getElementById("cartItems");
  const cartTotalBottom = document.getElementById("cartTotalBottom");
  const cartBtn = document.getElementById("cartBtn");
  const cartModal = document.getElementById("cartModal");
  const closeModalBtns = document.querySelectorAll(".close-modal");
  const clearCartBtn = document.getElementById("clearCart");

  let cart = [];

  // Add to cart buttons
  const addBtns = document.querySelectorAll(".add-btn");
  addBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".product-row");
      const name = row.dataset.name;
      const size = btn.dataset.size;
      const price = parseFloat(btn.dataset.price);

      // Check if item exists
      const existing = cart.find(item => item.name === name && item.size === size);
      if(existing) {
        existing.qty += 1;
      } else {
        cart.push({ name, size, price, qty:1 });
      }
      updateCart();
    });
  });

  // Update cart display
  function updateCart() {
    cartItems.innerHTML = '';
    let totalQty = 0;
    let totalPrice = 0;

    cart.forEach(item => {
      totalQty += item.qty;
      totalPrice += item.price * item.qty;
      const li = document.createElement("li");
      li.textContent = `${item.name} (${item.size}) x${item.qty} - $${(item.price*item.qty).toFixed(2)}`;
      cartItems.appendChild(li);
    });

    cartCount.textContent = totalQty;
    cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
    cartTotalBottom.textContent = `$${totalPrice.toFixed(2)}`;
  }

  // Cart modal toggle
  cartBtn.addEventListener("click", () => cartModal.style.display = "flex");
  closeModalBtns.forEach(btn => btn.addEventListener("click", () => cartModal.style.display = "none"));
  clearCartBtn.addEventListener("click", () => { cart = []; updateCart(); });

});















// -----------------------------
// PAGE FADE-IN
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    document.body.style.opacity = 0;
    setTimeout(() => {
        document.body.style.transition = "opacity 1s";
        document.body.style.opacity = 1;
    }, 100);
});

// -----------------------------
// FRAGRANCE CARD HOVER EFFECT
// -----------------------------
const fragranceCards = document.querySelectorAll('.fragrance-card');

fragranceCards.forEach(card => {
    const img = card.querySelector('img');
    card.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.05)';
        img.style.transition = 'transform 0.3s';
    });
    card.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
    });
});

// -----------------------------
// ADD TO CART BUTTON ANIMATION
// -----------------------------
const addButtons = document.querySelectorAll('.fragrance-card button');

addButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Animate button
        button.classList.add('added');
        let originalText = button.textContent;
        button.textContent = '✓ Added';

        // Optional: log to console
        const productName = button.parentElement.querySelector('h3').textContent;
        console.log(`Added to cart: ${productName}`);

        setTimeout(() => {
            button.classList.remove('added');
            button.textContent = originalText;
        }, 1500);
    });
});

// -----------------------------
// OPTIONAL: FRAGRANCE DETAILS POPUP
// -----------------------------
fragranceCards.forEach(card => {
    card.addEventListener('dblclick', () => {
        const title = card.querySelector('h3').textContent;
        const description = card.querySelector('p:nth-of-type(2)').textContent;

        alert(`Fragrance: ${title}\nDescription: ${description}`);
    });
});








// --- CART LOGIC ---
const cartCountE = document.getElementById("cart-count");
const cartTotalE = document.getElementById("cart-total");
const cartItemsLis = document.getElementById("cart-items");
const clearCartBt = document.getElementById("clear-cart");
let car = [];

// Update cart UI
function updateCartUI() {
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = totalPrice.toFixed(2);

  cartItemsList.innerHTML = "";
  if (cart.length === 0) {
    cartItemsList.innerHTML = `<li>Your cart is empty</li>`;
    return;
  }

  cart.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `${item.name} - $${item.price} × ${item.qty}`;
    cartItemsList.appendChild(li);
  });
}

// Add to cart function
function addToCart(item) {
  const idx = cart.findIndex(i => i.name === item.name);
  if (idx === -1) {
    cart.push({...item, qty: 1});
  } else {
    cart[idx].qty += 1;
  }
  updateCartUI();
}

// Clear cart
clearCartBtn.addEventListener("click", () => {
  cart = [];
  updateCartUI();
});

// --- PRODUCT MODAL ---
const productModal = document.getElementById("productModal");
const modalImg = document.getElementById("modal-img");
const modalName = document.getElementById("modal-name");
const modalDesc = document.getElementById("modal-desc");
const modalPrice = document.getElementById("modal-price");
const modalAddBtn = document.getElementById("modal-add-btn");

// Open modal
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    const card = e.target.closest(".fashion-card");
    modalImg.src = card.dataset.img;
    modalImg.alt = card.dataset.name;
    modalName.textContent = card.dataset.name;
    modalDesc.textContent = card.dataset.desc;
    modalPrice.textContent = card.dataset.price;
    modalAddBtn.dataset.name = card.dataset.name;
    modalAddBtn.dataset.price = card.dataset.price;
    productModal.setAttribute("aria-hidden", "false");
  });
});

// Close modal
document.querySelectorAll(".close-modal").forEach(btn => {
  btn.addEventListener("click", () => {
    productModal.setAttribute("aria-hidden", "true");
  });
});

// Click outside modal to close
productModal.addEventListener("click", e => {
  if (e.target === productModal) productModal.setAttribute("aria-hidden", "true");
});

// Add to cart from modal
modalAddBtn.addEventListener("click", () => {
  addToCart({name: modalAddBtn.dataset.name, price: Number(modalAddBtn.dataset.price)});
  productModal.setAttribute("aria-hidden", "true");
});

// Add to cart from card buttons directly
document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    const card = e.target.closest(".fashion-card");
    addToCart({name: card.dataset.name, price: Number(card.dataset.price)});
  });
});

// Initialize cart
updateCartUI();









let Cart = [];
let cartCount = document.getElementById("cart-count");
let cartItems = document.getElementById("cart-items");
let cartTotal = document.getElementById("cart-total");

document.querySelectorAll(".add-cart").forEach(button => {
  button.addEventListener("click", (event) => {
    let card = event.target.parentElement;
    let name = card.querySelector("h3").textContent;
    let price = parseFloat(card.querySelector(".price").textContent);

    cart.push({ name, price });
    updateCart();
  });
});

function updateCart() {
  cartCount.textContent = cart.length;

  cartItems.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    let li = document.createElement("li");
    li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
    cartItems.appendChild(li);
    total += item.price;
  });

  cartTotal.textContent = total.toFixed(2);
}






document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("contactForm");
  const success = document.getElementById("success");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const message = document.getElementById("message").value.trim();

      if (name === "" || email === "" || message === "") {
        success.style.color = "red";
        success.textContent = "Please fill in all fields.";
        success.style.display = "block";
        return;
      }

      success.style.color = "green";
      success.textContent = "Thank you! Your message has been sent.";
      success.style.display = "block";

      form.reset();
    });
  }

});




// Floating icons small bounce animation on hover
document.querySelectorAll('.floating-icons .icon').forEach(icon => {
  icon.addEventListener("mouseenter", () => {
    icon.style.transform = "translateY(-6px) scale(1.15)";
  });
  icon.addEventListener("mouseleave", () => {
    icon.style.transform = "translateY(0) scale(1)";
  });
});





// Fade-in effect on scroll
const elements = document.querySelectorAll(".team-member, .mission, .faq-table");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.3 });

elements.forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translateY(40px)";
  el.style.transition = "1s ease";
  observer.observe(el);
});

// FAQ expandable rows
document.querySelectorAll(".faq-table tr").forEach(row => {
  row.addEventListener("click", () => {
    row.classList.toggle("open");
  });
});





/* ----------------------------- */
/* BACKGROUND MUSIC CONTROLLER */
/* ----------------------------- */
const musicBtn = document.getElementById("music-btn");
const bgMusic = document.getElementById("bg-music");

let isPlaying = false;

musicBtn.addEventListener("click", () => {
  if (!isPlaying) {
    bgMusic.play();
    musicBtn.textContent = "⏸ Pause Music";
    isPlaying = true;
  } else {
    bgMusic.pause();
    musicBtn.textContent = "▶ Play Music";
    isPlaying = false;
  }
});





document.getElementById("registerForm").addEventListener("submit", function(e) {
    e.preventDefault();

    let fullname = document.getElementById("fullname").value.trim();
    let email = document.getElementById("email").value.trim();
    let phone = document.getElementById("phone").value.trim();
    let password = document.getElementById("password").value.trim();
    let confirmPassword = document.getElementById("confirmPassword").value.trim();
    let msg = document.getElementById("message");

    // Validation
    if (!fullname || !email || !phone || !password || !confirmPassword) {
        alert("Please fill in all fields");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }

    // Email validation popup
    if (!email.includes("@") || !email.includes(".")) {
        alert("Invalid email address!");
        return;
    }

    // Save to localStorage
    let user = {
        fullname: fullname,
        email: email,
        phone: phone,
        password: password
    };

    localStorage.setItem("user", JSON.stringify(user));

    // Generate OTP
    let otp = Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem("otp", otp);

    alert("Your OTP is: " + otp);

    // Redirect to OTP page
    window.location.href = "otp.html";
});








const form = document.getElementById("registerForm");
const messageEl = document.getElementById("message");

form.addEventListener("submit", function(e) {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!fullname || !email || !phone || !password || !confirmPassword) {
        messageEl.textContent = "All fields are required!";
        messageEl.style.color = "red";
        return;
    }

    if (password !== confirmPassword) {
        messageEl.textContent = "Passwords do not match!";
        messageEl.style.color = "red";
        return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = { fullname, email, phone, password };
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("otp", otp);

    console.log("Generated OTP:", otp); // For testing

    messageEl.textContent = "Registration successful! Redirecting to OTP verification...";
    messageEl.style.color = "green";

    setTimeout(() => {
        window.location.href = "otp.html";
    }, 1500);
});