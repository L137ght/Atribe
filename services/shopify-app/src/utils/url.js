export const appendQueryParams = (inputUrl, params) => {
  const url = new URL(inputUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};
