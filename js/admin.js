import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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

// Compress รูปก่อน upload
async function compressImage(file, maxSizeKB = 800) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > 1200) {
                    height = Math.round((height * 1200) / width);
                    width = 1200;
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                let compressed = canvas.toDataURL('image/jpeg', quality);
                while (compressed.length / 1024 > maxSizeKB && quality > 0.2) {
                    quality -= 0.1;
                    compressed = canvas.toDataURL('image/jpeg', quality);
                }

                const arr = compressed.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                resolve(new File([u8arr], file.name, { type: mime }));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Preview รูปก่อนอัปโหลด
window.previewImage = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('img-preview');
        preview.src = ev.target.result;
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function uploadImage(file) {
    file = await compressImage(file);
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const progressBar = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        progressBar.classList.remove('hidden');

        uploadTask.on('state_changed',
            (snapshot) => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                progressFill.style.width = pct + '%';
                progressFill.innerText = pct + '%';
            },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                progressBar.classList.add('hidden');
                resolve(url);
            }
        );
    });
}

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
    const fileInput = document.getElementById('prod-img-file');
    const file = fileInput.files[0];

    let imgUrl = document.getElementById('current-img-url').value;

    try {
        if (file) {
            imgUrl = await uploadImage(file);
        }

        if (!imgUrl) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกรูปภาพสินค้า', 'warning');
            btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึก'; btn.disabled = false;
            lucide.createIcons();
            return;
        }

        const data = {
            name: document.getElementById('prod-name').value,
            price: parseInt(document.getElementById('prod-price').value),
            img: imgUrl,
            desc: document.getElementById('prod-desc').value
        };

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
        Swal.fire('Error', 'ไม่สามารถบันทึกได้: ' + error.message, 'error');
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
    document.getElementById('prod-desc').value = prod.desc;
    document.getElementById('current-img-url').value = prod.img;
    const preview = document.getElementById('img-preview');
    preview.src = prod.img;
    preview.classList.remove('hidden');
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
    document.getElementById('current-img-url').value = '';
    document.getElementById('img-preview').classList.add('hidden');
    document.getElementById('upload-progress').classList.add('hidden');
    document.getElementById('form-title').innerHTML = `<i data-lucide="cloud-upload" class="text-blue-500"></i> อัปโหลดสินค้าขึ้น Cloud`;
    lucide.createIcons();
}
