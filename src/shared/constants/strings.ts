const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Missing or invalid email!',
  INVALID_CRED: 'Incorrect Username or Password. Please verify.',
  INVALID_SALESFORCE_LOGIN:
    'Please use your own credentials to login to Salesforce based on your email registered in Demo.',
  INVALID_REQ: 'Invalid Request.',
  INVALID_RESOURCE: 'Invalid Resource',
  INTERNAL_ERR_MSG:
    'please try again or send a support request to support@Demo.com',
  ACCOUNT_VERIFICATION:
    'A verification Email has been sent to your registered email address. Please check your Inbox',
  OTP_SENT: 'OTP has been sent to your registered Email address',
  ACCOUNT_EXIST: 'Your account is already registered. Please login',
  PENDING_ACCOUNT_VERIFICATION:
    'Account verification is pending. Please verify your account, we’ve sent an Email to your registered Email address',
  NO_USER_FOUND: 'No account found with this Email address. Please Sign-up.',
  INVALID_USER: 'No User Found.',
  INVALID_OTP:
    'Invalid OTP. Please enter the 6-digits code sent to your Email ID.',
  INVALID_EMAIL_LINK: 'Invalid Link. Please resent link to your Email ID.',
  WORK_EMAIL_ALLOWED: 'Please enter a valid company email address',
  OLD_PASSWORD_INCORRECT: 'Old Password incorrect, please re-enter',
  REJECT_INVITATION: 'Invitation rejected by user',
  ALREADY_ACCEPT_INVITATION: 'Invitation already accepted by user',
  ORGANIZATION_USER_INVITE: 'Only your organization user is allowed to invite',
  USER_EXIST: 'User already exists',
  COMPANY_EXIST: 'Company name already exists',
  EMAIL_LINK_EXPIRE: 'Link has expired !',
  ACCOUNT_MANAGER_EMAIL_ALLOWED: 'Only account manager email is allowed', //while add partner in opportunity
  PUBLISH_OPPORTUNITY_ERROR:
    'Please assign opportunity before publishing to partner',
  OPPORTUNITY_DATA_MISSING: 'Opportunity data is missing',
  INVALID_OPPORTUNITY: 'Invalid Opportunity',
  SALESFORCE_OPPORTUNITY_EXIST: 'Opportunity Already Exist',
  ALLOW_DELETE_OPPORTUNITY: 'Only opportunity owner can delete',
  ALLOW_DELETE_KPI: 'Only kpi owner can delete',
  ALLOW_DELETE_PLAN: 'You can not delete this resource',
  ACTIVE_OPPORTUNITY_ERROR: 'Active Opportunity can not be delete',
  OPPORTUNITY_INVITE_ERROR: 'Only invitee can update status',
  REJECT_INVITE_MESSAGE: 'Please enter a valid reason for rejection',
  INVALID_PARTNER: 'Partner not found',
  DELETE_USER_ERROR: 'Could not delete user associate with any activity',
  INVALID_KPI: 'Invalid Kpi',
  INVALID_PLAN: 'Invalid plan',
  UPDATE_KPI_DENIED: 'You can not update kpi',
  ATTAINMENT_INVALID: 'Attainment should not be greater than target',
  NO_OPPORTUNITIES_UPDATED: 'Not able to update any opportunity',
  INVALID_DATA: 'Invalid ',
  UPDATE_DENIED: 'You can not update ',
  PROGRESS_INVALID: 'Progress should not greater than 100%',
  TARGET_INVALID: 'Attainment value should not be greater than target',
  INVALID_ASSET: 'Invalid Asset',
  INITIATIVE_INPROGRESS_ERR:
    'Unable to delete the initiative while its in progress.',
  GOAL_INPROGRESS_ERR: 'Unable to delete the goal while its in progress.',
  PLAN_INPROGRESS_ERR:
    'Unable to delete the plan while its goal or initiative is in progress.',
  INVALID_INITIATIVE: 'Invalid Initiative',
  INITIATIVE_REQURIED: 'Initiave id is requried if assetType is GOAL',
  FILE_NAME_EXIST: 'File name already exist',
  CHANNEL_NOT_FOUND: 'Channel not found',
  INVALID_MEETING_ID: 'Invalid Meeting Id',
  START_DATE_END_DATE_VALIDATION:
    'Start Date and Time should be less than to End Date and Time',
  START_DATE_END_DATE_FOR_CUSTOM_VALIDATION:
    'Start Date should be less than to End Date for custom rule',
};

const SUCCESS_MESSAGES = {
  ACCOUNT_VERIFICATION_COMPLETE:
    'Your Account is verified. Please Login to access your account',
  CHANGE_PASSWORD_MSG: 'password changed successfully',
  OTP_VERIFIED: 'OTP has been verified successfully',
  LINK_VERIFIED: 'Link has been verified successfully',
  RESET_PASSWORD_EMAIL_SENT:
    'We’ve sent password reset instructions to your registered Email address. Please check your Inbox.',
  USER_DELETE: 'User removed from Demo',
  USER_INVITE: 'User has been invited successfully',
  OPPORTUNITY_UPDATE: 'opportunity updated successfully',
  OPPORTUNITY_CREATE: 'opportunity created successfully',
  OPPORTUNITY_DRAFT: 'opportunity drafted successfully',
  BULK_OPPORTUNITY_CREATE: 'Bulk opportunity created successfully',
  KPI_REMOVED: 'Kpi removed successfully !',
  KPI_UPDATED: 'Kpi updated successfully !',
  KPI_UPDATE_REQ:
    'Kpi update request placed successfully once approved data will reflect !',
  BULK_OPPORTUNITY_VALIDATED: 'Opportunity validation successfully done !',
  BULK_OPPORTUNITY_UPDATE: 'All Opportunity updated Successfully !',
  UPDATED_SUCCESS: 'updated successfully !',
  UPDATE_REQ:
    'update request placed successfully once approved data will reflect !',
  SCORECARD_REMOVED: 'Scorecard removed successfully !',
  PLAN_CREATED: 'Partner plan created successfully',
  PLAN_UPDATED: 'Plan Updated successfully',
  PLAN_DELETE: 'Plan removed successfully',
  INITIATIVE_CREATED: 'Initiative created successfully !',
  INITIATIVE_UPDATED: 'Initiative updated Successfully',
  GOAL_CREATED: 'Goal created successfully !',
  GOAL_UPDATED: 'Goal updated successfully !',
  FILE_RENAME: 'File renamed successfully !',
  MEETING_CREATED: 'Meeting created successfully !',
  MEETING_CANCELLED: 'Meeting cancelled successfully !',
  MEETING_UPDATED: 'Meeting updated successfully !',
};

const EMAIL_SUBJECTS = {
  WELCOME: 'Welcome to Demo!',
  OTP_VERIFICATION: 'Demo - OTP Verification',
  INVITE_USER: 'You’ve been invited to Demo Partner Success platform!',
  DELETE_OPPORTUNITY: 'Your opportunity sharing status has changed in Demo',
  ASSIGN_OPPORTUNITY: 'You’ve been assigned an opportunity in Demo!',
  SHARE_OPPORTUNITY: 'An opportunity has been shared with you in Demo!',
  RESET_PASSWORD: 'Reset password of your Demo Account',
  INQUIRY: 'Inquiry from Demo Website',
  INVITE_PARTNER: 'You’ve been added to a partner team in Demo!',
  CALENDAR_INVITE: 'You’ve been invited to a Demo!',
};

export { ERROR_MESSAGES, SUCCESS_MESSAGES, EMAIL_SUBJECTS };
