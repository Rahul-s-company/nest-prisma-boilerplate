export const KPI_NOTIFICATION = 'New Kpi has been assigned to you !';
export const UPDATE_ACCEPT_NOTIFICATION =
  'Progress update has been accepted you can check now !';
export const UPDATE_REJECT_NOTIFICATION = 'Progress update has been rejected';
export const CREATE_PLAN_NOTIFICATION =
  'New plan created and assigned to you !';
export const OPPORTUNITY_AT_RISK = 'Opportunity at risk Please take a action!';
export const CREATE_INITIATIVE_NOTIFICATION =
  'New initiative created and assigned to you !';
export const ADD_AS_PROJECT_MANAGER =
  'New Project created and add you as project manager !';

export const getUpdateContentNotification = (module: string): string => {
  return `Place new request for update ${module}, please take a look!`;
};
