class AppError extends Error {
  constructor(status, message, code = 'error') { super(message); this.status = status; this.code = code; }
}
// Map provider failures -> recruiter-friendly text + retry policy
const PROVIDER_ERRORS = {
  invalid_recipient:   { message: "This phone number looks invalid, so the message couldn't be delivered. Please correct the number.", retryable: false },
  rate_limited:        { message: 'Too many messages were sent at once. Please retry in a few minutes.', retryable: true },
  service_unavailable: { message: 'The communication service is temporarily unavailable. You can retry shortly.', retryable: true },
  provider_unreachable:{ message: "We couldn't reach the communication service. You can retry shortly.", retryable: true },
  handset_unreachable: { message: "The candidate's phone could not be reached (switched off or out of coverage).", retryable: true },
  provider_error:      { message: 'The communication service reported an unexpected problem.', retryable: true },
};
const describe = (code) => PROVIDER_ERRORS[code] || PROVIDER_ERRORS.provider_error;
module.exports = { AppError, describe };
