import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Json } from 'aws-sdk/clients/robomaker';
import { IsArray } from 'class-validator';

type chartTypeData = {
  barChart;
  lineChart;
  pieChart;
  listView;
};

export interface dashboardConfigInfo {
  module: string;
  chartType: chartTypeData;
  features: Json;
}

export class CreateDashboardDto {
  @IsArray()
  @ApiProperty({
    example: [
      {
        module: 'opportunity',
        chartType: 'barChart',
        features: {
          date: true,
          company: true,
        },
      },
    ],
  })
  dataConfig: Json;

  userId: number;
  createdBy: number;
}

export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {
  updatedBy: number;
}
