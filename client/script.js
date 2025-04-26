const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('login-error-message');
const registerError = document.getElementById('register-error-message');
const toggleButtons = document.querySelectorAll('.toggle-button');
const loginContainer = document.getElementById('login');
const registerContainer = document.getElementById('register');

// Form Geçişi
toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const target = button.dataset.target;
        loginContainer.classList.toggle('active', target === 'login');
        registerContainer.classList.toggle('active', target === 'register');
    });
});

// Şifre Göster/Gizle
function togglePasswordVisibility(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const passwordToggleIcon = document.getElementById(iconId);

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggleIcon.classList.remove('fa-eye');
        passwordToggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordToggleIcon.classList.remove('fa-eye-slash');
        passwordToggleIcon.classList.add('fa-eye');
    }
}

// Ortak Hata İşleme Fonksiyonu
function handleAuthErrors(errorElement, error) {
    errorElement.textContent = error || 'Bir hata oluştu.';
    errorElement.style.color = 'red';
}

// Giriş Formu Gönderme İşlemi
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${window.BACKEND_URL}/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Giriş başarılı!');
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'map.html'; // veya anasayfa sayfanızın doğru URL'sini buraya yazın
        } else {
            handleAuthErrors(loginError, data.error);
        }

    } catch (error) {
        handleAuthErrors(loginError, 'Sunucuya bağlanırken bir hata oluştu.');
    }
});

// Kayıt Formu Gönderme İşlemi
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const surname = document.getElementById('register-surname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${window.BACKEND_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Kayıt başarılı!');
            // Kayıt başarılıysa yapılacak işlemler, örneğin giriş formuna geçiş veya anasayfaya yönlendirme
            loginContainer.classList.add('active');
            registerContainer.classList.remove('active');
            toggleButtons[0].classList.add('active');
            toggleButtons[1].classList.remove('active');
        } else {
            handleAuthErrors(registerError, data.error);
        }

    } catch (error) {
        handleAuthErrors(registerError, 'Sunucuya bağlanırken bir hata oluştu.');
    }
});