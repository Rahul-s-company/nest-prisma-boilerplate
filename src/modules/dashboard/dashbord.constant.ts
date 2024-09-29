export const dashboardConfig = [
  {
    module: 'opportunity',
    features: {
      byCompany: true,
      byMonth: true,
      byIndustry: true,
      byCountry: true,
      byStage: true,
      byStatus: true,
      byUser: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'initiatives',
    features: {
      byOwners: true,
      byProgress: true,
      byCountry: true,
      byGeo: true,
      byRegion: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'goals',
    features: {
      byOwners: true,
      byProgress: true,
      byCountry: true,
      byGeo: true,
      byRegion: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'kpi',
    features: {
      byOwners: true,
      byProgress: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'partners',
    features: {
      byIndustry: true,
      byPartnerType: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'scoreCard',
    features: {
      byPartner: true,
      byCategory: true,
    },
    chartType: 'barChart',
  },
  {
    module: 'project',
    features: {
      byOwners: true,
    },
    chartType: 'barChart',
  },
];
