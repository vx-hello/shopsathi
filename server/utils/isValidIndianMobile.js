const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

const isValidIndianMobile = (value) =>
  INDIAN_MOBILE_PATTERN.test(String(value || '').trim());

module.exports = isValidIndianMobile;
