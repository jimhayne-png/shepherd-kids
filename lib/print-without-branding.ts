// Browsers print the document <title> (and often the URL) in their native
// print header/footer, independent of the page's own rendered content. Since
// printed labels must show only the church's identity, swap the tab title to
// the church name for the duration of the print and restore it afterward.
export function printWithoutBranding(churchName: string | null) {
  if (typeof document === "undefined") return;
  const previousTitle = document.title;
  document.title = churchName || "Labels";

  function restore() {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  }
  window.addEventListener("afterprint", restore);

  window.print();
}
