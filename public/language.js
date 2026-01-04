document.addEventListener('DOMContentLoaded', () => {
  const langLinks = document.querySelectorAll('.lang-menu a');
  let currentLang;

  function getLangFromHash() {
    const match = location.hash.match(/lang=([a-z]{2})/i);
    return match ? match[1].toLowerCase() : null;
  }

  function setLangHash(lang) {
    history.replaceState(null, '', `#lang=${lang}`);
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateMenuHighlight(lang);
    document.documentElement.lang = lang;
    return lang;
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
  applyLanguage(getLangFromHash() || localStorage.getItem('lang') || 'en');

  // Add listener for URL # hash changes
  window.addEventListener('hashchange', () => {
    const hashLang = getLangFromHash();
    if (hashLang && hashLang !== currentLang) {
      applyLanguage(hashLang);
    }
  });

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
