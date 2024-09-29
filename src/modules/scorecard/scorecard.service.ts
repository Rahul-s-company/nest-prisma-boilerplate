import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ScoreCard, ScoreCardCategory } from '@prisma/client';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';

import { PrismaService } from '../prisma/prisma.service';

import {
  CreateScorecardDto,
  ScoreCardPlanDTO,
  UpdateScoreCardPlanDTO,
  UpdateScorecardDto,
} from './scorecard.dto';

@Injectable()
export class ScorecardService {
  constructor(private prisma: PrismaService) {}

  async createScoreCard(data: CreateScorecardDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const scorecard: any = await this.create(
          {
            name: data.name,
            partnerManagerId: data.partnerManagerId,
            partnerCompanyId: data.partnerCompanyId,
            createdBy: data.createdBy,
            partnerId: data.partnerId,
          },
          tx,
        );

        if (data.scoreCardCategory) {
          const scoreCardCategoryData: any = data.scoreCardCategory.map(
            (item) => {
              item.scoreCardId = scorecard.id;
              return item;
            },
          );

          await this.createScoreCardCategory(scoreCardCategoryData, tx);
        }

        return scorecard;
      });
    } catch (error) {
      console.error('Error create scorecard:', error);
      throw error;
    }
  }

  async create(
    data: Prisma.ScoreCardUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ScoreCard | HttpException> {
    const prisma = tx || this.prisma;

    return prisma.scoreCard.create({ data });
  }

  async createScoreCardCategory(
    data: Prisma.ScoreCardCategoryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    return prisma.scoreCardCategory.createMany({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ScoreCardWhereUniqueInput;
    where?: Prisma.ScoreCardWhereInput;
    orderBy?: Prisma.ScoreCardOrderByWithRelationInput;
  }): Promise<any> {
    const { where } = params;

    const scorecards = await this.prisma.scoreCard.findMany({
      where,
      include: {
        ScoreCardCategory: {
          select: {
            category: true,
          },
        },
        partnerCompany: {
          select: {
            companyName: true,
          },
        },
        partnerScoreCardUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Process the results to format the category names
    const formattedScorecards = scorecards.map((scorecard) => ({
      id: scorecard.id,
      name: scorecard.name,
      partnerManagerId: scorecard.partnerManagerId,
      companyName: scorecard.partnerCompany.companyName,
      createdAt: scorecard.createdAt,
      createdBy: scorecard.createdBy,
      partnerManager: `${scorecard.partnerScoreCardUser.firstName} ${scorecard.partnerScoreCardUser.lastName}`,
      categories: [
        ...new Set(scorecard.ScoreCardCategory.map((cat) => cat.category)),
      ].join(', '),
    }));

    return formattedScorecards;
  }

  async findAllScoreCardCategoryReport(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ScoreCardCategoryWhereUniqueInput;
    where?: Prisma.ScoreCardCategoryWhereInput;
    orderBy?: Prisma.ScoreCardCategoryOrderByWithRelationInput;
  }): Promise<any> {
    const { where } = params;

    const scorecardsReport = await this.prisma.scoreCardCategory.findMany({
      where,
      include: {
        scoreCard: {
          select: {
            name: true,
            partnerScoreCardUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        goalInfo: {
          select: {
            planId: true,
          },
        },
      },
    });

    return scorecardsReport;
  }

  async findAllScoreCardByPartner(params: {
    where?: Prisma.ScoreCardWhereInput;
  }): Promise<any> {
    const { where } = params;
    const scoreCards = await this.prisma.scoreCard.findMany({
      where,
      include: {
        ScoreCardCategory: {
          select: {
            category: true,
            id: true,
            target: true,
            requirement: true,
            attainment: true,
            goalId: true,
          },
        },
        partnerScoreCardUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group the ScoreCardCategory by 'category' field
    const groupedScoreCards = scoreCards.map((scoreCard) => {
      const groupedCategories = scoreCard.ScoreCardCategory.reduce(
        (acc, category) => {
          if (!acc[category.category]) {
            acc[category.category] = [];
          }

          if (category.goalId === null) {
            acc[category.category].push(category);
          }

          return acc;
        },
        {},
      );

      delete scoreCard.ScoreCardCategory;

      return {
        ...scoreCard,
        groupedCategories,
      };
    });

    return groupedScoreCards;
  }

  findOne(id: number): Promise<ScoreCard | null> {
    return this.prisma.scoreCard.findFirst({
      where: { id: id },
      include: {
        ScoreCardCategory: {
          select: {
            id: true,
            category: true,
            requirement: true,
            target: true,
            attainment: true,
            goalId: true,
          },
        },
        partnerCompany: {
          select: {
            companyName: true,
          },
        },
        partnerScoreCardUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async update(id: number, updateData: UpdateScorecardDto) {
    const scoreCardInfo: any = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const scoreCardUpdate = await tx.scoreCard.update({
        data: {
          name: updateData.name,
          partnerManagerId: updateData.partnerManagerId,
          updatedBy: updateData.updatedBy,
        },
        where: { id: id },
      });

      if (updateData.scoreCardCategory) {
        const scoreCardIds = updateData.scoreCardCategory
          .map((data) => data.id)
          .join(',');

        const excludeIds = scoreCardInfo.ScoreCardCategory.filter(
          (data) => !scoreCardIds.includes(data.id.toString()),
        ).map((data) => data.id);

        const excludeGoalIds = scoreCardInfo.ScoreCardCategory.filter(
          (data) =>
            !scoreCardIds.includes(data.id.toString()) && data.goalId !== null,
        ).map((data) => data.goalId);

        if (excludeIds.length > 0) {
          await tx.scoreCardCategory.deleteMany({
            where: { id: { in: excludeIds } },
          });

          await tx.goal.updateMany({
            where: { id: { in: excludeGoalIds } },
            data: { scoreCardCategoryId: null },
          });
        }

        if (updateData.scoreCardCategory.length > 0) {
          const CreateScoreCardCategoryArr = [];
          for (const data of updateData.scoreCardCategory) {
            if (data.id) {
              if (data.attainment > data.target) {
                throw new HttpException(
                  { message: ERROR_MESSAGES.TARGET_INVALID },
                  HttpStatus.BAD_REQUEST,
                );
              }
              const updatedScore = parseFloat(
                ((data.attainment / data.target) * 100).toFixed(2),
              );

              await this.updateScoreCardCategory(
                {
                  id: data.id,
                  attainment: data.attainment,
                  score: updatedScore,
                  updatedBy: updateData.updatedBy,
                },
                tx,
              );
            } else {
              CreateScoreCardCategoryArr.push({ ...data, scoreCardId: id });
            }
          }

          if (CreateScoreCardCategoryArr.length > 0) {
            await tx.scoreCardCategory.createMany({
              data: CreateScoreCardCategoryArr,
            });
          }
        }
      }

      return scoreCardUpdate;
    });
  }

  findOneScoreCardCategory(id: number): Promise<ScoreCardCategory | null> {
    return this.prisma.scoreCardCategory.findFirst({
      where: { id: id },
    });
  }

  //create report card from initiative or goal
  async createReportCard(
    planData: ScoreCardPlanDTO,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    let attainment = 0;
    let score = 0;

    const scoreCardCategory = await this.findOneScoreCardCategory(
      planData.scoreCardCategoryId,
    );

    if (!scoreCardCategory) {
      throw new HttpException(
        { message: 'Score card is not found' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (planData?.goalId) {
      const goalInfo = await prisma.goal.findFirst({
        where: { id: planData?.goalId },
      });

      if (
        goalInfo?.targetValue &&
        goalInfo.targetValue !== scoreCardCategory.target
      ) {
        throw new HttpException(
          {
            message: `Score card target (${scoreCardCategory.target}) is not matching with Goal target value(${goalInfo.targetValue}). It should match if you want to associate score card with Goal.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (goalInfo.startValue > 0) {
        const updatedScore = parseFloat(
          ((goalInfo.startValue / goalInfo.targetValue) * 100).toFixed(2),
        );

        attainment = goalInfo.startValue;
        score = updatedScore;
      }
    }

    return prisma.scoreCardCategory.update({
      data: {
        goalId: planData?.goalId,
        attainment: attainment,
        score: score,
      },
      where: {
        id: planData.scoreCardCategoryId,
      },
    });
  }

  //update report card from initiative or goal
  async updateReportCard(
    planData: UpdateScoreCardPlanDTO,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;

    const scoreCardCategory = await this.prisma.scoreCardCategory.findFirst({
      where: {
        id: planData.id,
      },
    });

    if (!scoreCardCategory) {
      throw new HttpException(
        { message: 'Score card category is not associated' },
        HttpStatus.BAD_REQUEST,
      );
    }

    let updatedScore = 0;
    if (planData.score) {
      updatedScore = planData.score;
    } else {
      updatedScore = parseFloat(
        ((planData.attainment / scoreCardCategory.target) * 100).toFixed(2),
      );
    }

    return prisma.scoreCardCategory.update({
      data: {
        attainment: planData.attainment,
        score: updatedScore,
      },
      where: {
        id: planData.id,
      },
    });
  }

  async updateScoreCardCategory(
    data: UpdateScoreCardPlanDTO,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    return prisma.scoreCardCategory.update({
      data: {
        attainment: data.attainment,
        score: data.score,
      },
      where: {
        id: data.id,
      },
    });
  }

  async remove(id: number, userId: number) {
    try {
      const scoreCardInfo = await this.findOne(Number(id));

      if (!scoreCardInfo) {
        throw new HttpException(
          { message: ERROR_MESSAGES.INVALID_DATA + ' Scorecard' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (scoreCardInfo.createdBy !== userId) {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALLOW_DELETE_KPI },
          HttpStatus.FORBIDDEN,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        await tx.scoreCardCategory.deleteMany({
          where: { scoreCardId: id },
        });

        const deleteKpi = await tx.scoreCard.delete({
          where: { id: id },
        });

        return deleteKpi;
      });
    } catch (error) {
      console.error('Error deleting scorecard:', error);
      throw error;
    }
  }

  async removeScoreCardCategory(id: number, tx?: Prisma.TransactionClient) {
    try {
      const prisma = tx || this.prisma;
      const deleteScoreCardCategory = await prisma.scoreCardCategory.deleteMany(
        {
          where: {
            scoreCardId: id,
          },
        },
      );

      return deleteScoreCardCategory;
    } catch (error) {
      console.error('Error deleting scorecard:', error);
      throw error;
    }
  }
}
