function initSuggestedProductForms() {
  const forms = document.querySelectorAll('.suggested-add-form');
  if (!forms.length) return;

  forms.forEach((form) => {
    form.addEventListener('submit', handleSuggestedAddFormSubmit);
  });
}

async function handleSuggestedAddFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;

  const originalText = button.textContent;
  setButtonState(button, { disabled: true, text: 'Agregando…' });
  clearFormFeedback(form);

  try {
    const response = await fetch(form.action, {
      method: form.method.toUpperCase(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form))
    });

    const payload = await parseJsonSafe(response);
    if (!response.ok || (payload && payload.ok === false)) {
      showFormFeedback(form, payload?.message || 'No se pudo agregar el producto.');
      return;
    }

    button.textContent = '✓ Agregado';
    button.classList.add('success');
    window.location.href = '/cart';
  } catch (error) {
    console.error('Error al agregar producto sugerido:', error);
    showFormFeedback(form, 'Error de red. Intenta de nuevo.');
  } finally {
    setTimeout(() => {
      setButtonState(button, { disabled: false, text: originalText });
    }, 800);
  }
}

function setButtonState(button, { disabled, text }) {
  button.disabled = disabled;
  button.textContent = text;
}

function showFormFeedback(form, message) {
  let feedback = form.querySelector('.suggested-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'suggested-feedback';
    feedback.style.cssText = 'margin-top:0.6rem;color:#c0392b;font-size:0.9rem;';
    form.appendChild(feedback);
  }
  feedback.textContent = message;
}

function clearFormFeedback(form) {
  const feedback = form.querySelector('.suggested-feedback');
  if (feedback) feedback.remove();
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', initSuggestedProductForms);
