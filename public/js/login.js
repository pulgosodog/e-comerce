document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const body = {
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Error');
        return;
      }

      const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (localCart.length) {
        await fetch('/auth/merge-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: localCart })
        });
        localStorage.removeItem('cart');
      }
      window.location.href = '/';
    } catch (err) {
      console.error('Login failed', err);
      alert('Error al iniciar sesión');
    }
  });
});
