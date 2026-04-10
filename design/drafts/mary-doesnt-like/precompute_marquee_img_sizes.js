/**
 * The .log-marque <div> has a bug:
 *
 * It includes some CSS animation, but that animation relies on knowledge the
 * rendered widths of the images, but the browser cannot know the widths before
 * the images are downloaded. Add the CSS downloads before the images (which
 * means that the browser initialises the animation before the image width,
 * resulting in incorrect animation). Refreshing the page fixes the animation
 * (because the images are in the browser cache).
 *
 * I'm going to use the "width" attribute of the <img> to tell the browser what
 * the rendered widths will be. However, I need to recompute the
 * widths. Generate injectable JS code (that I can paste into the web
 * inspector), that finds all those IMG tags using a selector, and prints: the
 * url, the rendered width, the rendered height.
 */
(() => {
  const imgs = document.querySelectorAll('.logo-marquee img');

  const results = [];

  imgs.forEach(img => {
    const rect = img.getBoundingClientRect();
    results.push({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  });

  console.log(
    results
      .map(r =>
        `        <img src="${r.src}" width="${r.width}" height="${r.height}" alt="${r.alt}"> \\`
      )
      .join('\n')
  );
})();
