export const categories = ["Tất cả", "Áo", "Túi"];
export const normalize = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
export function filterProducts(products, category, search, sort) {
  const query = normalize(search);
  return products
    .filter(
      (p) =>
        (category === "Tất cả" || p.category === category) &&
        normalize(`${p.name} ${p.id} ${p.category}`).includes(query),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : 0,
    );
}
