import { Controller, Get, Post, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ResultsService } from './results.service';
import { ReportCardService } from './report-card.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles, Public } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('results')
@Controller('results')
@ApiBearerAuth()
export class ResultsController {
  constructor(
    private resultsService: ResultsService,
    private reportCards: ReportCardService,
  ) {}

  @Get('report-card/:studentId')
  @Roles(RoleName.PARENT, RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download a PDF report card' })
  async downloadReportCard(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Query('termId') termId: string | undefined,
    @Res() res: Response,
  ) {
    const pdf = await this.reportCards.generate(studentId, user, termId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sombetini-report-${studentId}.pdf"`);
    res.send(pdf);
  }

  @Get('student/:studentId')
  @Roles(RoleName.PARENT, RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get student results' })
  getStudentResults(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthUser,
    @Query('termId') termId?: string,
  ) {
    return this.resultsService.getStudentResults(studentId, user, termId);
  }

  @Public()
  @Get('verify/:referenceNo')
  @ApiOperation({ summary: 'Verify result by reference number' })
  verifyResult(@Param('referenceNo') referenceNo: string) {
    return this.resultsService.verifyResult(referenceNo);
  }

  @Post('marks')
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN)
  @ApiOperation({ summary: 'Enter student marks' })
  enterMarks(@Body() body: {
    studentId: string; subjectId: string; examinationId: string;
    academicYearId: string; termId: string; marks: number; remarks?: string;
  }, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.resultsService.enterMarks(body, user, req.ip);
  }

  @Post('submit')
  @Roles(RoleName.TEACHER)
  submitMarks(
    @Body() body: { examinationId: string; classId: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.resultsService.submitMarks(body.examinationId, body.classId, user);
  }

  @Post('approve')
  @Roles(RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  approveMarks(
    @Body() body: { examinationId: string; classId: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.resultsService.approveMarks(body.examinationId, body.classId, user);
  }

  @Post('publish')
  @Roles(RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Publish report cards for a class and term; PDFs render in the background and parents are notified' })
  publishReportCards(
    @Body() body: { termId: string; classId: string; headComment?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportCards.publish(body.termId, body.classId, user, { headComment: body.headComment });
  }

  @Get('pending')
  @Roles(RoleName.TEACHER, RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN)
  getPendingMarks(@CurrentUser() user: AuthUser) {
    return this.resultsService.getPendingMarks(user);
  }
}
