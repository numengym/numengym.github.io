// Keep startup artwork visible until the game has initialized and rendered its first frame.
try {
  await import('./main.js');
  // Two frames in, the game is drawn: the artwork fades away, then goes.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    screen.classList.add('done');
    setTimeout(() => screen.remove(), 500);
  }));
} catch (error) {
  console.error('Numen Gym could not start', error);
  document.getElementById('loading-message').textContent = 'Could not load the gym. Please refresh to try again.';
  document.querySelector('.loading-track')?.remove();
}
