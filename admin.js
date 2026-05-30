import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Auth Guard
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('admin-body').classList.remove('hidden');
        loadAdminProducts();
        lucide.createIcons();
    }
});

window.logout = () => { signOut(auth); }

let products = [];

async function loadAdminProducts() {
    const tbody = document.getElementById('admin-product-rows');
    const loading = document.getElementById('loading-state');
    
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        loading.classList.add('hidden');
        tbody.innerHTML = '';
        
        products.forEach(prod => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-4"><img src="${prod.img}" class="w-12 h-12 object-cover rounded-lg border"></td>
                    <td class="p-4"><div class="font-bold">${prod.name}</div><div class="text-xs text-slate-400 truncate w-48">${prod.desc}</div></td>
                    <td class="p-4 font-bold">฿${prod.price}</td>
                    <td class="p-4 text-center">
                        <button onclick="window.editProduct('${prod.id}')" class="p-1.5 text-blue-500 bg-blue-50 rounded-lg mr-1"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button onclick="window.deleteProduct('${prod.id}')" class="p-1.5 text-red-500 bg-red-50 rounded-lg"><i data-lucide="trash" class="w-4 h-4"></i></button>
                    </td>
                </tr>`;
        });
        lucide.createIcons();
    } catch (error) {
        Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ กรุณาเช็ค Rules ของ Firestore', 'error');
    }
}

window.saveProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.innerHTML = 'กำลังบันทึก...'; btn.disabled = true;

    const id = document.getElementById('prod-id').value;
    const data = {
        name: document.getElementById('prod-name').value,
        price: parseInt(document.getElementById('prod-price').value),
        img: document.getElementById('prod-img').value,
        desc: document.getElementById('prod-desc').value
    };

    try {
        if (id) {
            await updateDoc(doc(db, "products", id), data);
            Swal.fire('สำเร็จ', 'อัปเดตข้อมูลบน Cloud แล้ว', 'success');
        } else {
            await addDoc(collection(db, "products"), data);
            Swal.fire('สำเร็จ', 'เพิ่มสินค้าใหม่ขึ้น Cloud แล้ว', 'success');
        }
        window.resetForm();
        loadAdminProducts();
    } catch (error) {
        Swal.fire('Error', 'ไม่สามารถบันทึกได้ กรุณาตรวจสอบสิทธิ์', 'error');
    } finally {
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึก'; btn.disabled = false; lucide.createIcons();
    }
}

window.editProduct = (id) => {
    const prod = products.find(p => p.id === id);
    if(!prod) return;
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-img').value = prod.img;
    document.getElementById('prod-desc').value = prod.desc;
    document.getElementById('form-title').innerHTML = `<i data-lucide="pencil" class="text-blue-500"></i> แก้ไขสินค้า`;
    lucide.createIcons();
}

window.deleteProduct = (id) => {
    Swal.fire({
        title: 'ลบสินค้า?', text: "ข้อมูลจะถูกลบออกจาก Cloud ถาวร!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบเลย!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "products", id));
            Swal.fire('ลบแล้ว!', '', 'success');
            loadAdminProducts();
        }
    });
}

window.resetForm = () => {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('form-title').innerHTML = `<i data-lucide="cloud-upload" class="text-blue-500"></i> อัปโหลดสินค้าขึ้น Cloud`;
    lucide.createIcons();
}
