// Open the appropriate confirmation dialog on each step of the results flow.
document.addEventListener("DOMContentLoaded", () => {
  const start = document.getElementById("startResults");
  const paymentDialog = document.getElementById("paymentDialog");
  if (start && paymentDialog) {
    start.addEventListener("click", () => paymentDialog.showModal());
  }

  const finish = document.getElementById("finishResults");
  const finishDialog = document.getElementById("finishDialog");
  if (finish && finishDialog) {
    finish.addEventListener("click", () => finishDialog.showModal());
  }
});
