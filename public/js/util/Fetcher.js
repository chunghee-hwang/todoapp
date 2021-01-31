export async function ajax(url, method, data) {
  if (!url || !method) return { error: 'url and method is nessasary' };
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
      body: data && JSON.stringify(data),
    });
    if (res.status === 200) {
      return await res.json();
    } else {
      throw new Error(`Fail to fetch: ${url}`);
    }
  } catch (error) {
    return {
      error,
    };
  }
}
