const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const getIndianMobileError = (value) =>
  INDIAN_MOBILE_PATTERN.test(String(value || '').trim())
    ? ''
    : 'Enter a valid 10-digit Indian mobile number starting with 6-9.';
