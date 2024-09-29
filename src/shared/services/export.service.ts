import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';
import { Response } from 'express';
import {
  Document,
  Packer,
  Paragraph,
  PageBreak,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/modules/prisma/prisma.service';

import { groupByArray } from '../helpers/utill.helpers';

import { S3Service } from './s3.service';

@Injectable()
export class ExportService {
  constructor(private s3Service: S3Service, private prisma: PrismaService) {}

  async exportToPpt(data: any[], res: Response) {
    const pptx = new PptxGenJS();
    const maxYOffset = 5.5; // Maximum y-offset before creating a new slide

    data.forEach((item, index) => {
      let slide = pptx.addSlide();
      let yOffset = 1;

      const addText = (text: string, options: any) => {
        if (yOffset > maxYOffset) {
          slide = pptx.addSlide();
          yOffset = 1; // Reset yOffset for new slide
        }
        slide.addText(text, { ...options, y: yOffset });
        yOffset += (options.fontSize / 72) * 1.2; // Increment yOffset based on fontSize
      };

      const addShape = (options: any) => {
        if (yOffset > maxYOffset) {
          slide = pptx.addSlide();
          yOffset = 1; // Reset yOffset for new slide
        }
        slide.addShape(pptx.ShapeType.line, { ...options, y: yOffset });
        yOffset += 0.2; // Increment yOffset for next text
      };

      addText(`Plan ${index + 1}`, {
        x: 0.5,
        y: yOffset,
        fontSize: 20,
        bold: true,
      });
      addText(`Plan Name: ${item.name}`, { x: 0.5, y: yOffset, fontSize: 16 });
      addText(`Status: ${item.status}`, { x: 0.5, y: yOffset, fontSize: 14 });
      addText(
        `Created By: ${item.partnerPlanManager.firstName} ${item.partnerPlanManager.lastName}`,
        { x: 0.5, y: yOffset, fontSize: 14 },
      );
      addText(`Organization: ${item.partner.partnerOrganization.companyName}`, {
        x: 0.5,
        y: yOffset,
        fontSize: 16,
      });

      if (item.xattrs) {
        Object.entries(item.xattrs).forEach(([key, data]) => {
          addText(`${key}: ${data}`, {
            x: 0.5,
            y: yOffset,
            fontSize: 14,
          });
        });
      }

      yOffset += 0.5; // Add extra space before  initiative or section

      if (item.Initiative && item.Initiative.length > 0) {
        addText(`Initiative Details`, {
          x: 0.5,
          y: yOffset,
          fontSize: 16,
          bold: true,
        });
        addShape({
          x: 0.5,
          y: yOffset + 0.3,
          w: 8.5,
          h: 0,
          line: { color: '000000' },
        });

        item.Initiative.forEach((initiative, i) => {
          addText(`Initiative ${i + 1}: ${initiative.name}`, {
            x: 0.5,
            y: yOffset,
            fontSize: 14,
          });
          addText(`Description: ${initiative.description}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Status: ${initiative.status}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Category: ${initiative.category}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Industry: ${initiative.industry}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(
            `Completion Date: ${new Date(
              initiative.completionDate,
            ).toDateString()}`,
            { x: 1, y: yOffset, fontSize: 12 },
          );
          addText(`Progress: ${initiative.progress}%`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Tags: ${initiative.tags}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          yOffset += 0.5; // Add extra space before next initiative or section
        });
      }

      if (item.Goal && item.Goal.length > 0) {
        addText(`Goal Details`, {
          x: 0.5,
          y: yOffset,
          fontSize: 16,
          bold: true,
        });
        addShape({
          x: 0.5,
          y: yOffset + 0.3,
          w: 8.5,
          h: 0,
          line: { color: '000000' },
        });

        item.Goal.forEach((goal, i) => {
          addText(`Goal ${i + 1}: ${goal.name}`, {
            x: 0.5,
            y: yOffset,
            fontSize: 14,
          });
          addText(`Description: ${goal.description}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Status: ${goal.status}`, { x: 1, y: yOffset, fontSize: 14 });
          addText(`Category: ${goal.category}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Industry: ${goal.industry}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(
            `Completion Date: ${new Date(goal.completionDate).toDateString()}`,
            { x: 1, y: yOffset, fontSize: 12 },
          );
          addText(`Target Value: ${goal.targetValue}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Start Value: ${goal.startValue}`, {
            x: 1,
            y: yOffset,
            fontSize: 12,
          });
          addText(`Tags: ${goal.tags}`, { x: 1, y: yOffset, fontSize: 12 });
          yOffset += 0.5; // Add extra space before next goal or section
        });
      }
    });

    const filePath = path.join(
      __dirname,
      `${data[0].partner.partnerOrganization.companyName}_plan_export.pptx`,
    );

    await pptx.writeFile({ fileName: filePath });

    res.download(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      } else {
        fs.unlinkSync(filePath); // Delete the file after sending it
      }
    });
  }

  async exportToWord(data: any[], res: Response) {
    const sections = data.map(async (item, index) => {
      const planParagraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: `Plan ${index + 1}`,
              bold: true,
              size: 32,
              underline: {}, // Add underline
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Plan Name: ${item.name}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Created By: ${item.partnerPlanManager.firstName} ${item.partnerPlanManager.lastName}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Partner Name: ${item.partner.partnerOrganization.companyName}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({}),
      ];

      if (item.xattrs) {
        Object.entries(item.xattrs).forEach(([key, data]: [string, string]) => {
          planParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${key}:`,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: data,
                  size: 24,
                }),
              ],
              indent: { left: 720 }, // 720 twips = 0.5 inches
            }),
            new Paragraph({}),
          );
        });
      }

      if (item.Initiative && item.Initiative.length > 0) {
        planParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }), // Add space after Plan Details

          new Paragraph({
            children: [
              new TextRun({
                text: `Initiative Details`,
                bold: true,
                size: 28,
                underline: {}, // Add underline
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }), // Add space after Initiative Details
        );
        const tableArray = await this.prepareInitiativeData(item.Initiative);

        planParagraphs.push(...tableArray);
      }

      if (item.Goal && item.Goal.length > 0) {
        planParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Goal Details`,
                bold: true,
                size: 28,
                underline: {}, // Add underline
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }), // Add space after Goal Details
        );

        const goalTableArray = await this.prepareGoalData(item.Goal);
        planParagraphs.push(...goalTableArray);
      }

      // Add a page break after each plan
      planParagraphs.push(new Paragraph({ children: [new PageBreak()] }));

      return {
        properties: {},
        children: planParagraphs,
      };
    });

    const sectionsP = await Promise.all(sections);

    const doc = new Document({
      sections: sectionsP,
    });

    try {
      // Generate the document and write it to a file
      const buffer = await Packer.toBuffer(doc);
      const fileName = `${data[0].partner.partnerOrganization.companyName}_plan_export.docx`;
      const filePath = path.join(__dirname, fileName);
      fs.writeFileSync(filePath, buffer);

      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedFileToS3(
        filePath,
        fileName,
      );

      // Send the file URL to the client
      res.json({ url: fileUrl });

      // Delete the local file
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Failed to export initiatives to Word' });
    }
  }

  async prepareInitiativeData(initiatives) {
    // Define table headers with column widths
    const headers = [
      { text: 'Category', width: 3000 },
      { text: 'Name', width: 3000 },
      { text: 'Description', width: 4000 },
      { text: 'Industry', width: 3000 },
      { text: 'Owner', width: 3000 },
      { text: 'Completion Date', width: 3000 },
      { text: 'Progress', width: 3000 },
      { text: 'Country', width: 3000 },
      { text: 'Region', width: 3000 },
    ];

    // Create header row
    const headerRow = new TableRow({
      children: headers.map(
        (header) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: header.text, bold: true })],
              }),
            ],
            width: { size: header.width, type: WidthType.DXA },
          }),
      ),
    });

    const groupedByGeo = groupByArray(initiatives, ({ geo }) => geo);
    const tableArray: any[] = [];
    // Iterate through each geo
    let index = 0;
    for (const [geo, initiatives] of Object.entries(groupedByGeo)) {
      // Iterate through each initiative in the geo

      const initiativeRows: any = initiatives.map(
        (initiative: any) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(initiative.category)],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(initiative.name)],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(initiative.description)],
                width: { size: 4000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(initiative.industry ? initiative.industry : ''),
                ],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    initiative.initiativeOwner.firstName +
                      ' ' +
                      initiative.initiativeOwner.lastName,
                  ),
                ],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    new Date(initiative.completionDate).toLocaleDateString(),
                  ),
                ],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(String(initiative.progress) + '%')],
                width: { size: 2000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(initiative.country ? initiative.country : ''),
                ],
                width: { size: 2500, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(initiative.region ? initiative.region : ''),
                ],
                width: { size: 2500, type: WidthType.DXA },
              }),
            ],
          }),
      );

      const geoValue =
        geo !== null && geo !== 'null' && geo !== undefined ? geo : '';
      const geoLabel =
        geoValue === ''
          ? {}
          : new Paragraph({
              children: [
                new TextRun({
                  text: `Geo: ${geoValue}`,
                  bold: true,
                  size: 26,
                }),
              ],
              spacing: {
                after: 400,
              },
            });

      tableArray[index] = [
        geoLabel,
        new Table({
          rows: [headerRow, ...initiativeRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: '',
          spacing: {
            after: 720, // 1440 twentieths of a point = 1 inch
          },
        }),
      ];
      index++;
    }

    // Create a document and add the table
    return tableArray.flat();
  }

  async exportInitiativesToWord(initiatives, planName: string, res) {
    const tableArray = await this.prepareInitiativeData(initiatives);
    const doc = new Document({
      sections: [
        {
          children: tableArray,
        },
      ],
    });

    try {
      // Generate the document and write it to a file
      const buffer = await Packer.toBuffer(doc);
      const fileName = `${planName}_initiative.docx`;
      const filePath = path.join(__dirname, fileName);
      fs.writeFileSync(filePath, buffer);

      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedFileToS3(
        filePath,
        fileName,
      );

      // Send the file URL to the client
      res.json({ url: fileUrl });

      // Delete the local file
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Failed to export initiatives to Word' });
    }
  }
  async prepareGoalData(goals) {
    // Define table headers with column widths
    const headers = [
      { text: 'Category', width: 3000 },
      { text: 'Name', width: 3000 },
      { text: 'Description', width: 4000 },
      { text: 'Industry', width: 3000 },
      { text: 'Owner', width: 3000 },
      { text: 'Completion Date', width: 3000 },
      { text: 'Attainment', width: 3000 },
      { text: 'Target', width: 3000 },
      { text: 'Country', width: 3000 },
      { text: 'Region', width: 3000 },
    ];

    // Create header row
    const headerRow = new TableRow({
      children: headers.map(
        (header) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: header.text, bold: true })],
              }),
            ],
            width: { size: header.width, type: WidthType.DXA },
          }),
      ),
    });

    const groupedByGeo = groupByArray(goals, ({ geo }) => geo);
    const tableArray: any[] = [];
    // Iterate through each geo
    let index = 0;
    for (const [geo, goals] of Object.entries(groupedByGeo)) {
      // Iterate through each initiative in the geo

      const goalRows: any = goals.map(
        (goal: any) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(goal.category ? goal.category : '')],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(goal.name)],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(goal.description)],
                width: { size: 4000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(goal.industry ? goal.industry : '')],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    goal.goalOwner.firstName + '' + goal.goalOwner.lastName,
                  ),
                ],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    new Date(goal.completionDate).toLocaleDateString(),
                  ),
                ],
                width: { size: 3000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(String(goal.startValue || 0))],
                width: { size: 2000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(String(goal.targetValue || 0))],
                width: { size: 2000, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(goal.country ? goal.country : '')],
                width: { size: 2500, type: WidthType.DXA },
              }),
              new TableCell({
                children: [new Paragraph(goal.region ? goal.region : '')],
                width: { size: 2500, type: WidthType.DXA },
              }),
            ],
          }),
      );

      const geoValue =
        geo !== null && geo !== 'null' && geo !== undefined ? geo : '';

      const geoLabel =
        geoValue === ''
          ? {}
          : new Paragraph({
              children: [
                new TextRun({
                  text: `Geo: ${geoValue}`,
                  bold: true,
                  size: 26,
                }),
              ],
              spacing: {
                after: 400,
              },
            });

      tableArray[index] = [
        geoLabel,
        new Table({
          rows: [headerRow, ...goalRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({
          text: '',
          spacing: {
            after: 720, // 1440 twentieths of a point = 1 inch
          },
        }),
      ];
      index++;
    }

    // Create a document and add the table
    return tableArray.flat();
  }

  async exportGoalsToWord(goals, planId, res) {
    const planDetail = await this.prisma.plan.findFirst({
      where: { id: +planId },
    });
    const tableArray = await this.prepareGoalData(goals);

    const doc = new Document({
      sections: [
        {
          children: tableArray,
        },
      ],
    });

    try {
      // Generate the document and write it to a file
      const buffer = await Packer.toBuffer(doc);
      const fileName = `${planDetail.name}_goal.docx`;
      const filePath = path.join(__dirname, fileName);
      fs.writeFileSync(filePath, buffer);

      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedFileToS3(
        filePath,
        fileName,
      );

      // Send the file URL to the client
      res.json({ url: fileUrl });

      // Delete the local file
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Failed to export initiatives to Word' });
    }
  }

  async exportScoreCardCategoryReportToExcel(
    data: any[],
    res: any,
  ): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ScoreCard Report');

    // Add scorecard name and partner manager at the top
    worksheet.addRow(['Scorecard Name', data[0].scoreCard.name]);
    worksheet.addRow([
      'Partner Manager',
      `${data[0].scoreCard.partnerScoreCardUser.firstName} ${data[0].scoreCard.partnerScoreCardUser.lastName}`,
    ]);
    worksheet.addRow([]); // Empty row for spacing

    // Define columns
    worksheet.columns = [
      { key: 'category', width: 32 },
      { key: 'requirement', width: 50 },
      { key: 'target', width: 50 },
      { key: 'attainment', width: 50 },
      { key: 'score', width: 50 },
    ];

    // Define columns with headers
    const headerRow = worksheet.addRow([
      'Category',
      'Requirement',
      'Target',
      'Attainment',
      'Score',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }, // Light grey background
      };
    });

    // Add rows
    data.forEach((scorecard) => {
      worksheet.addRow({
        name: scorecard.name,
        category: scorecard.category,
        target: scorecard.target,
        attainment: scorecard.attainment,
        requirement: scorecard.requirement,
        score: scorecard.score,
      });
    });

    // Generate the Excel file in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // Create a unique filename
    let fileName = `scorecard_report_`;

    if (data.length > 0) {
      fileName += `${data[0].scoreCard.name}`;
    }

    fileName += `.xlsx`;

    try {
      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedBufferFileToS3(
        buffer,
        fileName,
      );

      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }

  async exportScoreCardToExcel(data: any[], res: any): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ScoreCard');

    // Define columns
    worksheet.columns = [
      { header: 'Scorecard', key: 'name', width: 32 },
      { header: 'Category', key: 'categories', width: 32 },
      { header: 'Partner Manager', key: 'partner_manager', width: 32 },
    ];

    // Add rows
    data.forEach((scorecard) => {
      worksheet.addRow({
        name: scorecard.name,
        partner_manager: scorecard.partnerManager,
        categories: scorecard.categories,
      });
    });

    // Generate the Excel file in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // Create a unique filename
    let fileName = `scorecard_`;

    if (data.length > 0) {
      fileName += `${data[0].name}_${data[0].id}`;
    }

    fileName += `.xlsx`;

    try {
      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedBufferFileToS3(
        buffer,
        fileName,
      );

      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }

  async exportProjectToExcel(data: any[], res: any): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Project');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Owner', key: 'owner', width: 32 },
      { header: 'Description', key: 'description', width: 32 },
      { header: 'Initiatives', key: 'initiative', width: 32 },
      { header: 'Goals', key: 'goal', width: 32 },
    ];

    // Add rows
    data.forEach((project) => {
      worksheet.addRow({
        id: project.id,
        name: project.name,
        owner: project.owner,
        description: project.description,
        initiative: project.initiative,
        goal: project.goal,
      });
    });

    // Generate the Excel file in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // Create a unique filename
    let fileName = `projects_`;

    if (data.length > 0) {
      fileName += `${Date.now()}`;
    }

    fileName += `.xlsx`;

    try {
      // Upload the file to S3
      const fileUrl = await this.s3Service.uploadExportedBufferFileToS3(
        buffer,
        fileName,
      );

      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }
}
