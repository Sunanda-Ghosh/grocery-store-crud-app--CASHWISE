(async () => {
  try {
    const response = await fetch('/auth/me', { credentials: 'same-origin' });
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    if (!response.ok) return;
    const data = await response.json();
    document.querySelectorAll('.brand').forEach((brand) => {
      brand.textContent = data.store_name;
      brand.setAttribute('aria-label', `${data.store_name} home`);
    });
  } catch (error) {
    // Individual screens display their own request errors.
  }
})();