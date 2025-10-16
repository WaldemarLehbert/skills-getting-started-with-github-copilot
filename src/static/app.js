document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('activities-list');
  const selectEl = document.getElementById('activity');
  const messageEl = document.getElementById('message');

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    setTimeout(() => messageEl.classList.add('hidden'), 4500);
  }

  async function loadActivities() {
    listEl.innerHTML = '<p>Loading activities...</p>';
    try {
      const res = await fetch('/activities');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const activities = await res.json();
      renderActivities(activities);
    } catch (err) {
      listEl.innerHTML = '<p class="info">Fehler beim Laden der Aktivitäten.</p>';
      console.error(err);
    }
  }

  function renderActivities(activities) {
    listEl.innerHTML = '';
    // clear select options (keep placeholder)
    const firstOption = selectEl.querySelector('option[value=""]');
    selectEl.innerHTML = '';
    if (firstOption) selectEl.appendChild(firstOption);

    Object.entries(activities).forEach(([name, a]) => {
      // Card
      const card = document.createElement('div');
      card.className = 'activity-card';

      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(a.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHtml(a.schedule)}</p>
        <p><strong>Spots:</strong> <span class="spots">${a.participants.length}/${a.max_participants}</span></p>
        <div class="participants-section" aria-live="polite">
          <strong>Teilnehmende:</strong>
          <ul class="participants-list">
            ${a.participants.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>
      `;

      listEl.appendChild(card);

      // option for form
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
  }

  // handle signup
  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activity = document.getElementById('activity').value;
    if (!activity) { showMessage('Bitte wählen Sie eine Aktivität aus.', 'error'); return; }
    if (!email) { showMessage('Bitte geben Sie eine E-Mail-Adresse ein.', 'error'); return; }

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Fehler beim Anmelden');

      showMessage(data.message || 'Erfolgreich angemeldet!', 'success');

      // Refresh activities to update participants
      const updatedRes = await fetch('/activities');
      const updated = await updatedRes.json();

      // Update the specific card in the DOM
      const cards = Array.from(document.querySelectorAll('.activity-card'));
      const matched = cards.find(c => c.querySelector('h4') && c.querySelector('h4').textContent === activity);
      if (matched) {
        const a = updated[activity];
        const plist = matched.querySelector('.participants-list');
        if (plist) plist.innerHTML = a.participants.map(p => `<li>${escapeHtml(p)}</li>`).join('');
        const spots = matched.querySelector('.spots');
        if (spots) spots.textContent = `${a.participants.length}/${a.max_participants}`;
      }
      form.reset();
    } catch (err) {
      showMessage(err.message || 'Fehler beim Anmelden.', 'error');
      console.error(err);
    }
  });

  // initial load
  loadActivities();
});
