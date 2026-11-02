export async function collectPages(fetchPage, pageSize = 100) {
  const items = [];
  let page = 1;
  let result;
  do {
    result = await fetchPage(page, pageSize);
    items.push(...result.items);
    page += 1;
  } while (result.hasMore && result.items.length);
  return { items, total: result.total ?? items.length };
}
