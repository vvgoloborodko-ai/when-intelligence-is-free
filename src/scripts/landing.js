const copyEmail = document.querySelector('[data-copy-email]');
if (copyEmail) {
  let reset;
  copyEmail.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(copyEmail.dataset.copyEmail);
      clearTimeout(reset);
      status.textContent = 'Copied.';
      reset = setTimeout(() => { status.textContent = ''; }, 2000);
    } catch {
      status.textContent = 'Could not copy. Please select the address.';
    }
  });
}
