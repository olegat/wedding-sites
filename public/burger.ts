document.addEventListener('DOMContentLoaded', () => {
    const burger: HTMLElement = document.getElementById('burgerMenu')!;
    const links: HTMLElement = document.getElementById('burgerLinks')!;

    burger.addEventListener('click', () => {
        if (links.style.display === 'flex') {
            links.style.display = 'none';
        } else {
            links.style.display = 'flex';
        }
    });

    // Optional: hide menu if clicking outside
    document.addEventListener('click', (ev: MouseEvent) => {
        const target = ev.target as Node | null;
        if (!burger.contains(target) && !links.contains(target)) {
            links.style.display = 'none';
        }
    });
});
