const messages = {
  load: 'We could not reach this creator store. Check your connection and try again.',
  checkout: 'Checkout could not start. Try again or contact the creator.',
  leadCapture: 'We could not send this resource right now. Try again.'
};

export function publicFailureMessage(operation) {
  return messages[operation] || 'Something went wrong. Try again.';
}
