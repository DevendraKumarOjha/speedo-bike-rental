export default function getFriendlyErrorMessage(
  error,
  fallbackMessage = 'Something went wrong. Please try again.'
) {
  if (
    error?.code === 'ECONNABORTED' ||
    error?.message?.includes('timeout')
  ) {
    return 'The server is taking too long to respond. Please check that the backend is running and try again.';
  }

  const responseData = error?.response?.data;
  const responseMessage =
    typeof responseData === 'string'
      ? responseData
      : responseData?.message || '';
  const serverMessage =
    typeof responseMessage === 'string' ? responseMessage : '';

  if (/imunify360|bot-protection/i.test(serverMessage)) {
    return 'The hosting firewall blocked this API request. For local testing, use the local backend. For production, ask your hosting provider to allow legitimate mobile API traffic.';
  }

  if (
    error?.message === 'Network Error' ||
    !error?.response
  ) {
    const requestUrl =
      error?.config?.baseURL && error?.config?.url
        ? `${error.config.baseURL.replace(/\/$/, '')}/${error.config.url.replace(/^\//, '')}`
        : error?.config?.baseURL;
    const request = error?.config?.method
      ? `${error.config.method.toUpperCase()} `
      : '';
    const endpointMessage = requestUrl ? ` for ${request}${requestUrl}` : '';
    const errorCode = error?.code || error?.message;

    return `The app received no response${endpointMessage} (${errorCode || 'network error'}). Check the Expo log for [LOGIN API ERROR] or [BIKES API ERROR].`;
  }

  if (
    serverMessage.toLowerCase().includes('bike already booked') ||
    serverMessage.toLowerCase().includes('already taken')
  ) {
    return 'Sorry, this bike was just booked by someone else. Please choose another available bike.';
  }

  if (
    serverMessage.toLowerCase().includes('payment') ||
    serverMessage.toLowerCase().includes('failed')
  ) {
    return 'Payment could not be completed. No booking was created. Please try again.';
  }

  return serverMessage || fallbackMessage;
}
