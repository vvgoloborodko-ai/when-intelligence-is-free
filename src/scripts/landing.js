const copyEmail = document.querySelector('.email-link');
if (copyEmail) {
  let reset;
  const status = document.querySelector('.copy-status');
  const address = decodeURIComponent(copyEmail.getAttribute('href').slice(7).split('?')[0]);
  const copyWithSelection = () => {
    const field = document.createElement('textarea');
    field.value = address;
    field.readOnly = true;
    field.setAttribute('aria-hidden', 'true');
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(field);
    try {
      field.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      field.remove();
      copyEmail.focus({ preventScroll: true });
    }
  };
  // Keep the anchor's native mailto action. Copy independently so a blocked
  // or unconfigured email client still leaves the address on the clipboard.
  copyEmail.addEventListener('click', async () => {
    clearTimeout(reset);
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(address);
        } catch {
          copyWithSelection();
        }
      } else {
        copyWithSelection();
      }
      status.textContent = 'Copied';
      reset = setTimeout(() => { status.textContent = ''; }, 3000);
    } catch {
      status.textContent = `Copy manually: ${address}`;
    }
  });
}
