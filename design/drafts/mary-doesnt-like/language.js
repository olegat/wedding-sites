document.addEventListener('DOMContentLoaded', () => {
  const langLinks = document.querySelectorAll('.lang-menu a');
  const langSelect = document.getElementById("lang-select");
  let currentLang = undefined;

  function getLangFromHash() {
    const match = location.hash.match(/lang=([a-z]{2})/i);
    return match ? match[1].toLowerCase() : null;
  }

  function setLangHash(lang) {
    history.replaceState(null, '', `#lang=${lang}`);
  }

  function applyLanguage(lang) {
    if (lang !== currentLang) {
      currentLang = lang;
      localStorage.setItem('lang', lang);
      updateMenuHighlight(lang);
      document.documentElement.lang = lang;
    }
    return lang;
  }

  function updateMenuHighlight(lang) {
    // For rsvp.html:
    if (langSelect) {
      langSelect.value = lang;
    }
    // For all other HTML pages:
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
      applyLanguage(link.dataset.lang);
    });
  });
  // Add change-listener for drop-down (in rsvp.html):
  langSelect && langSelect.addEventListener("change", e => {
    applyLanguage(e.target.value);
  });
});
