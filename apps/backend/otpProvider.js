const crypto = require('crypto');

const OTP_MODE = process.env.OTP_MODE || 'mock';
const MOCK_OTP_TTL_MS = 5 * 60 * 1000;
const mockOtps = new Map();

if (!['mock', 'msg91'].includes(OTP_MODE)) {
  throw new Error('OTP_MODE must be either "mock" or "msg91"');
}

const getMsg91Config = () => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const countryCode = process.env.MSG91_COUNTRY_CODE || '91';

  if (!authKey || !templateId) {
    throw new Error(
      'MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required when OTP_MODE=msg91'
    );
  }

  if (!/^\d{1,4}$/.test(countryCode)) {
    throw new Error('MSG91_COUNTRY_CODE must contain 1 to 4 digits');
  }

  return { authKey, templateId, countryCode };
};

const getMsg91OtpUrl = (path, params) => {
  const { authKey } = getMsg91Config();
  const endpoint = path ? `/otp/${path}` : '/otp';
  const query = new URLSearchParams({
    ...params,
    authkey: authKey,
  });

  return `https://control.msg91.com/api/v5${endpoint}?${query}`;
};

const readProviderResponse = async (response) => {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error('MSG91 returned an unreadable response');
  }
};

const callMsg91 = async (url, options) => {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(`Unable to reach MSG91: ${error.message}`);
  }

  const result = await readProviderResponse(response);

  if (!response.ok) {
    if (response.status === 400 || response.status === 422) {
      return { ...result, type: 'error' };
    }

    throw new Error(`MSG91 request failed with status ${response.status}`);
  }

  return result;
};

const sendOtp = async (mobile) => {
  if (OTP_MODE === 'mock') {
    const otp = crypto.randomInt(100000, 1000000).toString();
    mockOtps.set(mobile, {
      otp,
      expiresAt: Date.now() + MOCK_OTP_TTL_MS,
    });

    return { otp };
  }

  if (OTP_MODE !== 'msg91') {
    throw new Error('OTP_MODE must be either "mock" or "msg91"');
  }

  const { templateId, countryCode } = getMsg91Config();
  const response = await callMsg91(
    getMsg91OtpUrl('', {
      template_id: templateId,
      mobile: `${countryCode}${mobile}`,
      otp_length: '6',
      otp_expiry: '5',
    }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );

  if (String(response.type).toLowerCase() !== 'success') {
    throw new Error(response.message || 'MSG91 could not send the OTP');
  }

  const result = {
    type: String(response.type),
    message:
      typeof response.message === 'string'
        ? response.message
        : '',
    requestId:
      typeof response.request_id === 'string'
        ? response.request_id
        : typeof response.requestId === 'string'
          ? response.requestId
          : '',
  };

  console.info('MSG91 accepted OTP request:', result);
  return result;
};

const verifyOtp = async (mobile, otp) => {
  if (OTP_MODE === 'mock') {
    const storedOtp = mockOtps.get(mobile);

    if (!storedOtp || storedOtp.expiresAt <= Date.now()) {
      mockOtps.delete(mobile);
      return false;
    }

    if (storedOtp.otp !== otp) {
      return false;
    }

    mockOtps.delete(mobile);
    return true;
  }

  if (OTP_MODE !== 'msg91') {
    throw new Error('OTP_MODE must be either "mock" or "msg91"');
  }

  const { countryCode } = getMsg91Config();
  const response = await callMsg91(
    getMsg91OtpUrl('verify', {
      mobile: `${countryCode}${mobile}`,
      otp,
    }),
    { method: 'GET' }
  );

  return String(response.type).toLowerCase() === 'success';
};

module.exports = {
  mode: OTP_MODE,
  sendOtp,
  verifyOtp,
};
