function showResetMessage(message, isError = false) {
  const element = document.querySelector('#reset-message');
  element.hidden = false;
  element.className = `message ${isError ? 'error' : 'success'}`;
  element.textContent = message;
}

document.querySelector('#request-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.elements.email.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The reset request could not be completed.');
    showResetMessage(data.message);
    document.querySelector('#reset-form').hidden = false;
    document.querySelector('#reset-form [name="code"]').focus();
  } catch (error) { showResetMessage(error.message, true); }
  finally { button.disabled = false; }
});

document.querySelector('#reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const requestForm = document.querySelector('#request-form');
  const form = event.currentTarget;
  if (form.elements.new_password.value !== form.elements.confirm_password.value) {
    showResetMessage('The new passwords do not match.', true);
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: requestForm.elements.email.value, code: form.elements.code.value, new_password: form.elements.new_password.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The password could not be reset.');
    showResetMessage(data.message);
    form.reset();
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
  } catch (error) { showResetMessage(error.message, true); }
  finally { button.disabled = false; }
});