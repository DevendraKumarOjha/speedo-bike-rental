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

  if (
    error?.message === 'Network Error' ||
    !error?.response
  ) {
    return 'Backend is offline or unreachable. Please start the backend server and make sure your phone is on the same Wi-Fi.';
  }

  const serverMessage =
    error?.response?.data?.message || '';

  const lowerMessage =
    serverMessage.toLowerCase();

  if (
    lowerMessage.includes('invalid otp') ||
    lowerMessage.includes('otp expired')
  ) {
    return 'The OTP is incorrect or expired. Please request a new OTP and try again.';
  }

  if (
    lowerMessage.includes('bike already booked') ||
    lowerMessage.includes('already taken')
  ) {
    return 'Sorry, this bike was just booked by someone else. Please choose another available bike.';
  }

  if (
    lowerMessage.includes('payment') ||
    lowerMessage.includes('failed')
  ) {
    return 'Payment could not be completed. No booking was created. Please try again.';
  }

  return serverMessage || fallbackMessage;
}
