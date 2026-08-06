const printButton = document.querySelector('[data-print-report]');
if (printButton instanceof HTMLButtonElement) {
  printButton.addEventListener('click', () => window.print());
}
