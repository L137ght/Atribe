const getNoteAttributeValue = (attributes, key) => {
  if (!Array.isArray(attributes)) {
    return "";
  }

  const match = attributes.find(
    (attribute) => attribute?.name === key || attribute?.key === key
  );

  return String(match?.value || "").trim();
};

export const orderWebhookService = {
  extractOrderData(orderPayload) {
    const noteAttributes = Array.isArray(orderPayload?.note_attributes)
      ? orderPayload.note_attributes
      : [];

    // Some payloads may expose cart attributes under alternative keys.
    const cartAttributes = Array.isArray(orderPayload?.cart_attributes)
      ? orderPayload.cart_attributes
      : [];

    return {
      orderId: String(orderPayload?.id || "").trim(),
      totalPrice: String(orderPayload?.total_price || "").trim(),
      currency: String(orderPayload?.currency || "").trim() || null,
      discountCodes: Array.isArray(orderPayload?.discount_codes) ? orderPayload.discount_codes : [],
      atribeUser:
        getNoteAttributeValue(noteAttributes, "atribe_user") ||
        getNoteAttributeValue(cartAttributes, "atribe_user"),
      clickId:
        getNoteAttributeValue(noteAttributes, "atribe_click") ||
        getNoteAttributeValue(cartAttributes, "atribe_click"),
      snapshotId:
        getNoteAttributeValue(noteAttributes, "atribe_snapshot") ||
        getNoteAttributeValue(cartAttributes, "atribe_snapshot"),
      atribeCreator:
        getNoteAttributeValue(noteAttributes, "atribe_creator") ||
        getNoteAttributeValue(cartAttributes, "atribe_creator"),
      atribeRef:
        getNoteAttributeValue(noteAttributes, "atribe_ref") ||
        getNoteAttributeValue(cartAttributes, "atribe_ref")
    };
  }
};
