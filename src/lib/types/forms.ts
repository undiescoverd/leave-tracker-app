/**
 * Form validation and error types
 */

/**
 * Generic form field error
 */
export interface FormFieldError {
  message: string;
  type?: string;
}

/**
 * Form validation errors structure
 */
export interface FormErrors {
  [fieldName: string]: FormFieldError | undefined;
}

/**
 * TOIL form specific errors
 */
export interface TOILFormErrors {
  travelDate?: FormFieldError;
  returnDate?: FormFieldError;
  scenario?: FormFieldError;
  reason?: FormFieldError;
  coveringUserId?: FormFieldError;
  calculatedHours?: FormFieldError;
  root?: FormFieldError;
}

/**
 * Leave request form errors
 */
export interface LeaveRequestFormErrors {
  dateRange?: FormFieldError;
  type?: FormFieldError;
  comments?: FormFieldError;
  hours?: FormFieldError;
  root?: FormFieldError;
}

/**
 * API response with form validation errors
 */
export interface FormValidationResponse {
  success: boolean;
  errors?: FormErrors;
  message?: string;
}