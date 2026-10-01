function showMessage(selector, message) {
  const element = document.querySelector(selector);
  element.hidden = false;
  element.textContent = message;
}

function clearMessages() {
  document.querySelector('#profile-error').hidden = true;
  document.querySelector('#profile-success').hidden = true;
}

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
    document.querySelector('#profile-form [name="store_name"]').value = data.store_name;
  } catch (error) { showMessage('#profile-error', error.message); }
}

document.querySelector('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessages();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store_name: form.elements.store_name.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Profile could not be updated.');
    document.querySelector('#profile-store').textContent = data.store_name;
    showMessage('#profile-success', 'Profile updated successfully.');
  } catch (error) { showMessage('#profile-error', error.message); }
  finally { button.disabled = false; }
});

document.querySelector('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessages();
  const form = event.currentTarget;
  if (form.elements.new_password.value !== form.elements.confirm_password.value) {
    showMessage('#profile-error', 'The new passwords do not match.');
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: form.elements.current_password.value, new_password: form.elements.new_password.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Password could not be changed.');
    form.reset();
    showMessage('#profile-success', data.message);
  } catch (error) { showMessage('#profile-error', error.message); }
  finally { button.disabled = false; }
});

document.querySelector('#logout').addEventListener('click', async () => {
  const button = document.querySelector('#logout'); button.disabled = true;
  try { await fetch('/auth/logout', { method: 'POST' }); window.location.href = '/login.html'; }
  catch (error) { button.disabled = false; showMessage('#profile-error', 'Logout could not be completed.'); }
});
if (window.lucide) window.lucide.createIcons();
loadProfile();