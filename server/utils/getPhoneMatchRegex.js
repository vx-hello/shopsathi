const getPhoneMatchRegex = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;

  const lastTenDigits = digits.slice(-10);
  return new RegExp(`${lastTenDigits.split('').join('\\D*')}\\D*$`);
};

module.exports = getPhoneMatchRegex;