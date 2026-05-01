export const getRawBodyString = (body) => {
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  return typeof body === "string" ? body : "";
};
