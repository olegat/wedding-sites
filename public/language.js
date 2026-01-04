document.addEventListener('DOMContentLoaded', () => {
  const langLinks = document.querySelectorAll('.lang-menu a');
  let currentLang;

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateMenuHighlight(lang);
    document.documentElement.lang = lang;
  }

  function updateMenuHighlight(lang) {
    langLinks.forEach(link => {
      if (link.dataset.lang === lang) {
        link.style.fontWeight = 'bold';
        link.style.textDecoration = 'underline';
      } else {
        link.style.fontWeight = '';
        link.style.textDecoration = '';
      }
    });
    return lang;
  }

  // Get persisted language, default to 'en'
  currentLang = (() => {
    const lang = localStorage.getItem('lang') || 'en';
    return updateMenuHighlight(lang);
  })();

  // Add click handlers
  langLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedLang = link.dataset.lang;
      if (selectedLang !== currentLang) {
        applyLanguage(selectedLang);
      }
    });
  });

});
