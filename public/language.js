document.addEventListener('DOMContentLoaded', () => {
  const langLinks = document.querySelectorAll('.lang-menu a');

  // Get persisted language, default to 'en'
  let currentLang = localStorage.getItem('lang') || 'en';

  // Apply initial highlight
  updateMenuHighlight();

  // Add click handlers
  langLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedLang = link.dataset.lang;

      if (selectedLang === currentLang) return;

      currentLang = selectedLang;
      localStorage.setItem('lang', currentLang);

      // Here you would trigger content translation logic
      // For now, just update highlight
      updateMenuHighlight();
    });
  });

  function updateMenuHighlight() {
    langLinks.forEach(link => {
      if (link.dataset.lang === currentLang) {
        link.style.fontWeight = 'bold';
        link.style.textDecoration = 'underline';
      } else {
        link.style.fontWeight = '';
        link.style.textDecoration = '';
      }
    });

    document.documentElement.lang = currentLang;
  }
});
