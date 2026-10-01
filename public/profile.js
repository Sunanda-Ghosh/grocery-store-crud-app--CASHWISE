if (window.lucide) window.lucide.createIcons();
async function loadProfile() {
  try {
    const response = await fetch('/auth/me');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Profile could not be loaded.');
    document.querySelector('#profile-store').textContent = data.store_name;
    document.querySelector('#profile-email').textContent = data.email;
  } catch (error) { const element = document.querySelector('#profile-error'); element.hidden = false; element.textContent = error.message; }
}
document.querySelector('#logout').addEventListener('click', async () => {
  const button = document.querySelector('#logout'); button.disabled = true;
  try { await fetch('/auth/logout', { method: 'POST' }); window.location.href = '/login.html'; }
  catch (error) { button.disabled = false; const element = document.querySelector('#profile-error'); element.hidden = false; element.textContent = 'Logout could not be completed.'; }
});
loadProfile();