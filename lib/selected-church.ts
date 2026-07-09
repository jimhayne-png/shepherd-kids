export function selectedChurchHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const id = localStorage.getItem("selected_church_id");
  return id ? { "x-selected-church-id": id } : {};
}
