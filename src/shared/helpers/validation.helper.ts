export const opportunityValidations = [
  {
    field: 'customerEmail',
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return value && (value.length > 80 || !emailRegex.test(value));
    },
    message: 'Must be a valid email and not exceed 80 characters',
  },
  {
    field: 'partnerEmail',
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return value && (value.length > 80 || !emailRegex.test(value));
    },
    message: 'Must be a valid email and not exceed 80 characters',
  },
  {
    field: 'customerPhoneNo',
    validator: (value) => value && value.length > 14,
    message: 'Must not exceed 14 characters',
  },
  {
    field: 'partnerPhoneNo',
    validator: (value) => value && value.length > 14,
    message: 'Must not exceed 14 characters',
  },
  {
    field: 'customerCompanyPostalCode',
    validator: (value) => value && value.length > 6,
    message: 'Must not exceed 6 characters',
  },
  {
    field: 'probability',
    validator: (value) => {
      const probabilityValue = parseFloat(value);
      return (
        isNaN(probabilityValue) ||
        probabilityValue < 0 ||
        probabilityValue > 100
      );
    },
    message: 'Must be a number between 0 and 100',
  },
  {
    field: 'opportunity',
    validator: (value) => value && value.length > 125,
    message: 'Must not exceed 125 characters',
  },
  {
    field: 'typeOfSupportNeedFromPartnerCompany',
    validator: (value) => value && value.length > 125,
    message: 'Must not exceed 125 characters',
  },
  {
    field: 'nextStep',
    validator: (value) => value && value.length > 125,
    message: 'Must not exceed 125 characters',
  },
  {
    field: 'targetCloseDate',
    validator: (value) => {
      const closeDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      if (isNaN(closeDate.getTime())) {
        return true;
      }
      return closeDate <= today;
    },
    message: 'Must be a valid future date',
  },
  {
    field: 'customerFirstName',
    validator: (value) => value && value.length > 25,
    message: 'Must not exceed 25 characters',
  },
  {
    field: 'customerLastName',
    validator: (value) => value && value.length > 25,
    message: 'Must not exceed 25 characters',
  },
  {
    field: 'alertMessage',
    validator: (value) => value && value.length > 25,
    message: 'Must not exceed 25 characters',
  },
  {
    field: 'customerCompanyName',
    validator: (value) => value && value.length > 80,
    message: 'Must not exceed 80 characters',
  },
  {
    field: 'customerCompanyAddress',
    validator: (value) => value && value.length > 180,
    message: 'Must not exceed 180 characters',
  },
  {
    field: 'customerCompanyWebsite',
    validator: (value) => value && value.length > 80,
    message: 'Must not exceed 80 characters',
  },
  {
    field: 'businessProblem',
    validator: (value) => value && value.length > 80,
    message: 'Must not exceed 80 characters',
  },
  {
    field: 'solutionOffered',
    validator: (value) => value && value.length > 80,
    message: 'Must not exceed 80 characters',
  },
  {
    field: 'value',
    validator: (value) => value && value.length > 80,
    message: 'Must not exceed 8 digit',
  },
];

export const opportunityFieldDisplayNames = {
  customerEmail: 'Customer Email',
  partnerEmail: 'Partner Email',
  customerPhoneNo: 'Customer Phone Number',
  partnerPhoneNo: 'Partner Phone Number',
  customerCompanyPostalCode: 'Customer Company Postal Code',
  probability: 'Probability',
  opportunity: 'Opportunity',
  typeOfSupportNeedFromPartnerCompany:
    'Type of Support Needed from Partner Company',
  nextStep: 'Next Step',
  targetCloseDate: 'Target Close Date',
  customerFirstName: 'Customer First Name',
  customerLastName: 'Customer Last Name',
  alertMessage: 'Alert Message',
  customerCompanyName: 'Customer Company Name',
  customerCompanyAddress: 'Customer Company Address',
  customerCompanyWebsite: 'Customer Company Website',
  businessProblem: 'Business Problem',
  solutionOffered: 'Solution Offered',
  value: 'Value',
};
