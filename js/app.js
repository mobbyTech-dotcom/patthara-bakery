import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let products = [];
let cart = JSON.parse(localStorage.getItem('cakes_cart_firebase')) || [];

async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        document.getElementById('loading-spinner').classList.add('hidden');
        const grid = document.getElementById('product-grid');
        grid.classList.remove('hidden');
        grid.innerHTML = '';

        if(products.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">ยังไม่มีสินค้าในระบบ แอดมินกรุณาเพิ่มสินค้าหลังบ้านครับ ✨</div>`;
            return;
        }

        products.forEach(prod => {
            grid.innerHTML += `
                <div class="bg-white rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-all group flex flex-col">
                    <div class="h-52 bg-rose-50 overflow-hidden relative">
                        <img src="${prod.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                        <span class="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-rose-600 font-bold px-3 py-1 rounded-xl shadow-sm text-sm">฿${prod.price}</span>
                    </div>
                    <div class="p-5 flex flex-col justify-between flex-1">
                        <div class="mb-4">
                            <h4 class="font-bold text-gray-800">${prod.name}</h4>
                            <p class="text-xs text-gray-500 mt-1.5">${prod.desc}</p>
                        </div>
                        <button onclick="window.addToCart('${prod.id}')" class="mt-auto w-full bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white font-medium py-2.5 rounded-xl text-xs transition-all flex justify-center gap-1.5">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i> ใส่ตะกร้า
                        </button>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    } catch (error) {
        console.error("Error loading products: ", error);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
}

window.toggleCart = function(open) {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (open) {
        overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.add('opacity-100'), 10);
        drawer.classList.remove('translate-x-full');
    } else {
        overlay.classList.remove('opacity-100'); setTimeout(() => overlay.classList.add('hidden'), 30);
        drawer.classList.add('translate-x-full');
    }
}

window.addToCart = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const cartItem = cart.find(item => item.id === id);
    if (cartItem) cartItem.qty += 1;
    else cart.push({ ...product, qty: 1 });
    localStorage.setItem('cakes_cart_firebase', JSON.stringify(cart));
    updateCartUI();
    Swal.fire({ title: 'เพิ่มลงตะกร้า!', text: product.name, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
}

window.changeQty = function(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    localStorage.setItem('cakes_cart_firebase', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const countElement = document.getElementById('cart-count');
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if(countElement) countElement.innerText = totalCount;
    
    document.getElementById('btn-checkout').disabled = cart.length === 0;
    
    const container = document.getElementById('cart-items');
    let total = 0;
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = `<div class="h-48 flex items-center justify-center text-gray-400 text-sm">ตะกร้าว่างเปล่า</div>`;
    } else {
        cart.forEach(item => {
            total += item.price * item.qty;
            container.innerHTML += `
                <div class="flex gap-3 bg-rose-50/40 border border-rose-100 p-3 rounded-xl shadow-xs">
                    <img src="${item.img}" class="w-16 h-16 object-cover rounded-lg shrink-0">
                    <div class="flex-1 flex flex-col justify-between">
                        <div><h5 class="text-xs font-bold">${item.name}</h5><p class="text-xs text-rose-500 font-bold">฿${item.price}</p></div>
                        <div class="flex justify-between mt-1">
                            <div class="flex items-center bg-white border rounded-md py-0.5 px-1.5 gap-2">
                                <button onclick="window.changeQty('${item.id}', -1)" class="text-rose-500 font-bold text-xs"><i data-lucide="minus" class="w-3 h-3"></i></button>
                                <span class="text-xs font-semibold">${item.qty}</span>
                                <button onclick="window.changeQty('${item.id}', 1)" class="text-rose-500 font-bold text-xs"><i data-lucide="plus" class="w-3 h-3"></i></button>
                            </div>
                            <span class="text-xs font-bold">฿${item.price * item.qty}</span>
                        </div>
                    </div>
                </div>`;
        });
    }
    document.getElementById('cart-total').innerText = `฿${total}`;
    lucide.createIcons();
}

window.openCheckoutModal = () => { window.toggleCart(false); document.getElementById('checkout-modal').classList.replace('hidden', 'flex'); }
window.closeCheckoutModal = () => { document.getElementById('checkout-modal').classList.replace('flex', 'hidden'); }

window.handleFormSubmit = (e) => {
    e.preventDefault();
    const dateInput = document.getElementById('cust-date').value;
    const dateObj = new Date(dateInput);
    const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';

    document.getElementById('slip-id').innerText = `ORDER: #PT-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById('slip-cust-name').innerText = document.getElementById('cust-name').value;
    document.getElementById('slip-cust-phone').innerText = document.getElementById('cust-phone').value;
    document.getElementById('slip-cust-date').innerText = formattedDate;
    document.getElementById('slip-cust-address').innerText = document.getElementById('cust-address').value;

    const slipItemsContainer = document.getElementById('slip-items');
    slipItemsContainer.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const cost = item.price * item.qty; total += cost;
        slipItemsContainer.innerHTML += `<div class="flex justify-between text-gray-600 mb-1"><span>${item.name} x${item.qty}</span><span>฿${cost}</span></div>`;
    });
    document.getElementById('slip-total').innerText = `฿${total}`;
    
    document.getElementById('promptpay-qr-img').src = `https://promptpay.io/0802707175/${total}.png`;

    window.closeCheckoutModal();
    document.getElementById('slip-modal').classList.replace('hidden', 'flex');
}

window.downloadSlipImage = () => {
    const target = document.getElementById('order-slip-card');
    Swal.fire({ title: 'กำลังประมวลผล...', didOpen: () => Swal.showLoading() });
    html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
        Swal.close();
        const link = document.createElement('a'); link.download = `Patthara-Order-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
    });
}

window.closeAllModalsAndClear = () => {
    document.getElementById('slip-modal').classList.replace('flex', 'hidden');
    cart = []; localStorage.removeItem('cakes_cart_firebase'); updateCartUI();
}

window.onload = () => { loadProducts(); updateCartUI(); };
