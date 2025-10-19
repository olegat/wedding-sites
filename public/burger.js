document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burgerMenu');
  const links = document.getElementById('burgerLinks');

  burger.addEventListener('click', () => {
    if (links.style.display === 'flex') {
      links.style.display = 'none';
    } else {
      links.style.display = 'flex';
    }
  });

  // Optional: hide menu if clicking outside
  document.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !links.contains(e.target)) {
      links.style.display = 'none';
    }
  });
});
