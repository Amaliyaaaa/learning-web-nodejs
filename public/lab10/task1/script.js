const API = '/api/lab10';
let currentPage = 1;
let currentOrdersPage = 1;
const productsCache = {};
let currentUser = null;

const formatPrice = (cents) => {
  return (cents / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  });
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getCart() {
  const cartJson = localStorage.getItem('cart');
  return cartJson ? JSON.parse(cartJson) : {};
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartLink();
}

function updateCartLink() {
  const cart = getCart();
  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartLink').textContent = `Корзина (${totalItems})`;
}

function addToCartInternal(productId, product) {
  const productIdStr = String(productId);

  if (!product || !product.id || !product.title || product.price === undefined) {
    throw new Error('Неверные данные товара');
  }

  const cart = getCart();

  if (cart[productIdStr]) {
    cart[productIdStr].quantity++;
  } else {
    cart[productIdStr] = {
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: 1
    };
  }

  saveCart(cart);
}

function addToCart(productId, product) {
  try {
    return addToCartInternal(productId, product);
  } catch (error) {
    console.error('Ошибка в addToCart:', error);
    throw error;
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API}/categories`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const categories = await res.json();

    if (!Array.isArray(categories)) {
      throw new Error('Invalid response format');
    }

    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">Все категории</option>';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    const select = document.getElementById('categoryFilter');
    if (select) {
      select.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
    }
  }
}

async function loadProducts(page = 1) {
  currentPage = page;
  const category = document.getElementById('categoryFilter').value;
  const search = document.getElementById('searchInput').value;

  try {
    const params = new URLSearchParams({ page });
    if (category) params.append('category', category);
    if (search) params.append('q', search);

    const res = await fetch(`${API}/products?${params}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format');
    }

    displayProducts(data.data);
    displayPagination(data.total, data.limit, data.page, 'pagination');
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    document.getElementById('products-list').innerHTML = `<p style="color: red;">Ошибка при загрузке товаров: ${error.message}</p>`;
  }
}

function displayProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    document.getElementById('products-list').innerHTML = '<p>Товары не найдены</p>';
    return;
  }

  products.forEach(p => {
    productsCache[p.id] = p;
  });

  document.getElementById('products-list').innerHTML = `
    <div class="products-grid">
      ${products.map(p => `
        <div class="product-card" onclick="showProduct(${p.id})">
          <div class="product-title">${p.title}</div>
          <div class="product-price">${formatPrice(p.price)}</div>
          <div class="product-category">${p.category_title || 'Без категории'}</div>
          <div class="product-amount">Остаток: ${p.amount} шт.</div>
          ${p.amount > 0 ? `<button onclick="event.stopPropagation(); addToCartById(${p.id})">В корзину</button>` : '<span style="color: red;">Нет в наличии</span>'}
        </div>
      `).join('')}
    </div>
  `;
}

function displayPagination(total, limit, page, paginationId) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    document.getElementById(paginationId).innerHTML = '';
    return;
  }

  let html = '';
  if (page > 1) {
    html += `<button onclick="loadProducts(${page - 1})">Предыдущая</button>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += `<span>...</span>`;
    }
  }

  if (page < totalPages) {
    html += `<button onclick="loadProducts(${page + 1})">Следующая</button>`;
  }

  document.getElementById(paginationId).innerHTML = html;
}

async function showProduct(id) {
  try {
    const res = await fetch(`${API}/task1/product/${id}`);
    if (res.status === 404) {
      alert('Товар не найден');
      return;
    }
    const product = await res.json();

    productsCache[product.id] = product;

    document.getElementById('product-details').innerHTML = `
      <h2>${product.title}</h2>
      <p><strong>Цена:</strong> ${formatPrice(product.price)}</p>
      <p><strong>Категория:</strong> ${product.category_title || 'Без категории'}</p>
      <p><strong>Остаток:</strong> ${product.amount} шт.</p>
      ${product.image ? `<img src="${product.image}" alt="${product.title}" style="max-width: 100%; margin-top: 1rem;">` : ''}
      ${product.amount > 0 ? `<button class="btn-primary" onclick="addToCartById(${product.id}); closeProductModal();">Добавить в корзину</button>` : '<p style="color: red;">Товар закончился</p>'}
    `;
    document.getElementById('product-modal').style.display = 'block';
  } catch (error) {
    console.error('Ошибка загрузки товара:', error);
    alert('Ошибка при загрузке товара');
  }
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

async function loadOrders(page = 1) {
  currentOrdersPage = page;
  try {
    const res = await fetch(`${API}/orders?page=${page}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format');
    }

    displayOrders(data.data);
    displayPagination(data.total, data.limit, data.page, 'orders-pagination');
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    document.getElementById('orders-list').innerHTML = `<p style="color: red;">Ошибка при загрузке заказов: ${error.message}</p>`;
  }
}

function displayOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    document.getElementById('orders-list').innerHTML = '<p>Заказов нет</p>';
    return;
  }

  document.getElementById('orders-list').innerHTML = `
    <div class="orders-list">
      ${orders.map(o => `
        <div class="order-card" onclick="showOrder(${o.id})">
          <div><strong>Заказ #${o.id}</strong></div>
          <div>Товар: ${o.product_title}</div>
          <div>Цена: ${formatPrice(o.price)}</div>
          <div>Дата: ${new Date(o.created_at).toLocaleString('ru-RU')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function showOrder(id) {
  try {
    const res = await fetch(`${API}/task1/orders/${id}`);
    if (res.status === 404) {
      alert('Заказ не найден');
      return;
    }
    const order = await res.json();

    document.getElementById('order-details').innerHTML = `
      <h2>Заказ #${order.id}</h2>
      <p><strong>Дата и время:</strong> ${new Date(order.created_at).toLocaleString('ru-RU')}</p>
      <h3>Товары:</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.product_title} - ${formatPrice(item.price)} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}</li>
        `).join('')}
      </ul>
      <p><strong>Общая сумма:</strong> ${formatPrice(order.total_amount)}</p>
    `;
    document.getElementById('order-modal').style.display = 'block';
  } catch (error) {
    console.error('Ошибка загрузки заказа:', error);
    alert('Ошибка при загрузке заказа');
  }
}

function closeOrderModal() {
  document.getElementById('order-modal').style.display = 'none';
}

function showCart() {
  const cart = getCart();
  const items = Object.entries(cart).map(([productId, item]) => ({
    productId: productId,
    ...item
  }));

  if (items.length === 0) {
    document.getElementById('cart-items').innerHTML = '<p>Корзина пуста</p>';
    document.getElementById('cart-summary').innerHTML = '';
    return;
  }

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  document.getElementById('cart-items').innerHTML = items.map(item => {
    const escapedProductId = escapeHtml(String(item.productId));
    const escapedTitle = escapeHtml(item.title);
    return `
    <div class="cart-item">
      <div>
        <strong>${escapedTitle}</strong><br>
        ${formatPrice(item.price)} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}
      </div>
      <button onclick="removeFromCart('${escapedProductId}')">Удалить</button>
    </div>
  `;
  }).join('');

  document.getElementById('cart-summary').innerHTML = `
    <div class="cart-summary">
      <h3>Итого: ${formatPrice(total)}</h3>
      <button class="btn-primary" onclick="buyCart()">Оформить заказ</button>
    </div>
  `;
}

function removeFromCart(productId) {
  const cart = getCart();
  const productIdStr = String(productId);
  delete cart[productIdStr];
  saveCart(cart);
  showCart();
}

async function buyCart() {
  const cart = getCart();
  const items = Object.values(cart).map(item => ({
    productId: item.id,
    quantity: item.quantity
  }));

  if (items.length === 0) {
    alert('Корзина пуста');
    return;
  }

  try {
    const res = await fetch(`${API}/products/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (res.ok) {
      const result = await res.json();
      alert(`Заказ оформлен! Создано заказов: ${result.orderIds.length}`);
      localStorage.removeItem('cart');
      updateCartLink();
      showCart();
      loadOrders();
    } else {
      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error('Ошибка покупки:', error);
    alert(`Ошибка при оформлении заказа: ${error.message}`);
  }
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');

  if (section === 'catalog') {
    document.getElementById('catalog-section').style.display = 'block';
    loadProducts();
  } else if (section === 'orders') {
    document.getElementById('orders-section').style.display = 'block';
    loadOrders();
  } else if (section === 'cart') {
    document.getElementById('cart-section').style.display = 'block';
    showCart();
  } else if (section === 'admin') {
    currentUser = checkAuthStatus();
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Требуется авторизация администратора. Пожалуйста, войдите через lab11 как администратор.');
      showSection('catalog');
      return;
    }
    document.getElementById('admin-section').style.display = 'block';
  }
}

window.addToCartById = function (productId) {
  try {
    const product = productsCache[productId];

    if (!product) {
      alert('Ошибка: товар не найден. Попробуйте обновить страницу.');
      return;
    }

    addToCartInternal(productId, product);

    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 5px; z-index: 10000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
    notification.textContent = `Товар "${product.title}" добавлен в корзину`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);

  } catch (error) {
    console.error('Ошибка при добавлении в корзину:', error);
    alert(`Ошибка при добавлении товара в корзину: ${error.message}`);
  }
};

window.addToCart = function (productId, product) {
  if (!product || (typeof product !== 'string' && typeof product !== 'object')) {
    return window.addToCartById(productId);
  }

  try {
    let productObj;
    if (typeof product === 'string') {
      const unescaped = product
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      productObj = JSON.parse(unescaped);
    } else if (typeof product === 'object' && product !== null) {
      productObj = product;
    } else {
      productObj = productsCache[productId];
      if (!productObj) {
        throw new Error('Неверный тип данных товара');
      }
    }

    addToCartInternal(productId, productObj);

    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 5px; z-index: 10000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
    notification.textContent = `Товар "${productObj.title}" добавлен в корзину`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);

  } catch (error) {
    console.error('Ошибка при добавлении в корзину:', error);
    alert(`Ошибка при добавлении товара в корзину: ${error.message}`);
  }
};

window.removeFromCart = removeFromCart;
window.buyCart = buyCart;
window.showSection = showSection;
window.showProduct = showProduct;
window.closeProductModal = closeProductModal;
window.showOrder = showOrder;
window.closeOrderModal = closeOrderModal;
window.loadProducts = loadProducts;
window.loadOrders = loadOrders;

function getAuthToken() {
  return localStorage.getItem('jwt_token');
}

function checkAuthStatus() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('jwt_token');
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

function updateAuthStatusDisplay() {
  const statusElement = document.getElementById('auth-status-text');
  const authStatusDiv = document.getElementById('auth-status');
  const adminLink = document.getElementById('adminLink');

  if (!statusElement || !authStatusDiv) return;

  currentUser = checkAuthStatus();
  if (!currentUser) {
    statusElement.textContent = '❌ Не авторизован';
    statusElement.style.color = 'red';
    authStatusDiv.style.display = 'block';
    adminLink.style.display = 'none';
  } else if (currentUser.role !== 'admin') {
    statusElement.textContent = `⚠️ Авторизован как ${currentUser.login} (${currentUser.role})`;
    statusElement.style.color = 'orange';
    authStatusDiv.style.display = 'block';
    adminLink.style.display = 'none';
  } else {
    statusElement.textContent = `✅ Авторизован как администратор (${currentUser.login})`;
    statusElement.style.color = 'green';
    authStatusDiv.style.display = 'block';
    adminLink.style.display = 'inline-block';
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function addProduct(event) {
  event.preventDefault();

  if (!currentUser || currentUser.role !== 'admin') {
    alert('Требуется авторизация администратора');
    return;
  }

  const title = document.getElementById('newProductTitle').value.trim();
  const categoryId = document.getElementById('newProductCategory').value;
  const price = parseFloat(document.getElementById('newProductPrice').value);
  const amount = parseInt(document.getElementById('newProductAmount').value);

  const messageDiv = document.getElementById('addProductMessage');

  if (!title) {
    messageDiv.innerHTML = '<p style="color: red;">Введите название товара</p>';
    return;
  }

  if (!categoryId) {
    messageDiv.innerHTML = '<p style="color: red;">Выберите категорию</p>';
    return;
  }

  if (isNaN(price) || price < 0) {
    messageDiv.innerHTML = '<p style="color: red;">Введите корректную цену</p>';
    return;
  }

  if (isNaN(amount) || amount < 0) {
    messageDiv.innerHTML = '<p style="color: red;">Введите корректное количество</p>';
    return;
  }

  try {
    messageDiv.innerHTML = '<p>Добавление товара...</p>';

    const productData = {
      title: title,
      category_id: parseInt(categoryId),
      price: Math.round(price * 100),
      amount: amount
    };

    const res = await fetch(`${API}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      const newProduct = await res.json();
      messageDiv.innerHTML = `<p style="color: green;">Товар "${newProduct.title}" успешно добавлен! (ID: ${newProduct.id})</p>`;
      document.getElementById('addProductForm').reset();
      loadProducts();
      setTimeout(() => { messageDiv.innerHTML = ''; }, 3000);
    } else {
      const error = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
      if (res.status === 401) {
        messageDiv.innerHTML = '<p style="color: red;">Ошибка: Не авторизован. Пожалуйста, войдите через lab11 как администратор.</p>';
      } else if (res.status === 403) {
        messageDiv.innerHTML = '<p style="color: red;">Ошибка: Доступ запрещен. Требуется роль администратора.</p>';
      } else {
        messageDiv.innerHTML = `<p style="color: red;">Ошибка при добавлении товара: ${error.error || 'Неизвестная ошибка'}</p>`;
      }
    }
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    messageDiv.innerHTML = `<p style="color: red;">Ошибка при добавлении товара: ${error.message}</p>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  updateAuthStatusDisplay();
  setInterval(updateAuthStatusDisplay, 5000);

  loadCategories().then(() => {
    const categorySelect = document.getElementById('newProductCategory');
    const categoryFilter = document.getElementById('categoryFilter');
    if (categorySelect && categoryFilter) {
      Array.from(categoryFilter.options).forEach(option => {
        if (option.value) {
          const newOption = document.createElement('option');
          newOption.value = option.value;
          newOption.textContent = option.textContent;
          categorySelect.appendChild(newOption);
        }
      });
    }
  });

  loadProducts();
  updateCartLink();

  const addProductForm = document.getElementById('addProductForm');
  if (addProductForm) {
    addProductForm.addEventListener('submit', addProduct);
  }
});

