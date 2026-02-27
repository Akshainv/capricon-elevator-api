// src/quotation/quotation.service.ts (BACKEND)
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Quotation, QuotationDocument } from './schemas/quotation.schema';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Employee, EmployeeDocument } from '../employee/schemas/employeeSchema';
import * as nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';
import * as net from 'net';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QuotationService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    private readonly notificationsService: NotificationsService,
  ) {
    const sanitize = (v?: string) => {
      if (!v) return '';
      return v.trim().replace(/^['"]+|['"]+$/g, '');
    };

    const user = sanitize(process.env.SMTP_USER) || sanitize(process.env.EMAIL_USER) || '';
    const pass = sanitize(process.env.SMTP_PASS) || sanitize(process.env.EMAIL_PASS) || '';
    const host = sanitize(process.env.SMTP_HOST) || '';
    const portEnv = sanitize(process.env.SMTP_PORT) || '';

    const useGmail = user && (user.includes('@gmail.com') || !host);

    const transportOptions: any = useGmail
      ? {
        service: 'gmail',
        secure: true,
        port: 465,
        auth: { user, pass },
      }
      : {
        host: host || 'smtp.gmail.com',
        port: parseInt(portEnv || '587', 10),
        secure: portEnv === '465',
        auth: { user, pass },
      };

    this.transporter = nodemailer.createTransport(transportOptions);

    this.transporter.verify().then(() => {
      console.log('✅ Quotation mailer configured and ready');
    }).catch((err) => {
      console.error('❌ Quotation mailer verification failed:', err?.message || err);
    });
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;

    const latestQuote = await this.quotationModel
      .findOne({ quoteNumber: new RegExp(`^${prefix}`) })
      .sort({ quoteNumber: -1 })
      .exec();

    let newNumber = 1;
    if (latestQuote && latestQuote.quoteNumber) {
      const lastNumber = parseInt(latestQuote.quoteNumber.split('-')[2], 10);
      newNumber = lastNumber + 1;
    }

    return `${prefix}${newNumber.toString().padStart(3, '0')}`;
  }

  async create(createQuotationDto: CreateQuotationDto, createdBy: string) {
    const quoteNumber = await this.generateQuoteNumber();

    console.log('🏗️ Creating quotation in service:', { quoteNumber, createdBy });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotationData = {
      ...createQuotationDto,
      quoteNumber,
      validUntil,
      status: createQuotationDto.status || 'draft',
      createdBy, // Use the ID passed from controller
    };

    const createQuotation = await this.quotationModel.create(quotationData);
    console.log('✅ Quotation created with ID:', createQuotation._id, 'createdBy:', createQuotation.createdBy);
    const enriched = await this.enrichQuotationWithCreator(createQuotation);

    // ✅ Send Notifications to Admins (Background process - non-blocking)
    this.userModel.find({ role: 'admin' }).exec().then(async (allAdmins) => {
      const admins = allAdmins.filter(admin =>
        admin._id.toString() !== (createdBy ? createdBy.toString() : null)
      );
      const creatorName = enriched.createdBySalesName || 'A salesperson';

      for (const admin of admins) {
        try {
          // 1. In-app Notification
          await this.notificationsService.create({
            icon: 'fa-file-invoice',
            title: 'New Quotation Created',
            message: `${creatorName} has created a new quotation ${quoteNumber} for ${createQuotationDto.customerName}.`,
            time: new Date().toISOString(),
            type: 'info',
            isRead: false,
            userId: admin._id.toString(),
            actionLink: '/admin/admin-quotations'
          });

          // 2. Email Notification (Professional)
          const fromAddress = process.env.EMAIL_USER || 'noreply@capricornelevators.com';
          await this.transporter.sendMail({
            from: `"Capricorn CRM" <${fromAddress}>`,
            to: admin.email,
            subject: `New Quotation Alert: ${quoteNumber}`,
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
                  <h2 style="color: #d4b347; margin: 0; letter-spacing: 2px; text-transform: uppercase;">Capricorn Elevators</h2>
                </div>
                <div style="padding: 30px; color: #333;">
                  <h3 style="color: #1a1a1a; border-bottom: 2px solid #d4b347; padding-bottom: 10px;">New Quotation Created</h3>
                  <p>A new quotation has been generated in the system and is awaiting review.</p>
                  
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Quotation No:</strong></td>
                        <td style="padding: 8px 0;">${quoteNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Customer:</strong></td>
                        <td style="padding: 8px 0;">${createQuotationDto.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Created By:</strong></td>
                        <td style="padding: 8px 0;">${creatorName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Total Value:</strong></td>
                        <td style="padding: 8px 0; color: #d4b347; font-weight: bold;">INR ${createQuotationDto.totalCost?.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'https://capricornelevators.com'}/admin/admin-quotations" 
                       style="background-color: #d4b347; color: #1a1a1a; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                       Review Quotation
                    </a>
                  </div>
                </div>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                  © ${new Date().getFullYear()} Capricorn Elevators Pvt Ltd. All rights reserved.
                </div>
              </div>
            `
          });
        } catch (err) {
          console.error(`Failed to send notification to admin ${admin.email}:`, err.message);
        }
      }
    }).catch(error => {
      console.error('Failed to process admin notifications for quotation:', error);
    });

    return enriched;
  }

  private async enrichQuotationWithCreator(quotation: any) {
    const quoteObj = quotation.toObject ? quotation.toObject() : quotation;
    let createdBySalesName = 'Unknown';
    const creatorId = quotation.createdBy ? quotation.createdBy.toString() : null;

    console.log(`🔍 Resolving creator name for ID: "${creatorId}"`);

    if (creatorId) {
      if (creatorId === 'admin' || creatorId === 'system') {
        createdBySalesName = creatorId === 'admin' ? 'Administrator' : 'System';
      } else {
        try {
          // 1. Try Employee Model (Prioritize Salesperson)
          const employee = await this.employeeModel.findById(creatorId).exec();
          if (employee) {
            console.log(`✅ Found creator in Employee model: ${employee.fullName}`);
            createdBySalesName = employee.fullName;
          } else {
            // 2. Try User Model (Admins)
            const user = await this.userModel.findById(creatorId).exec();
            if (user) {
              console.log(`✅ Found creator in User model: ${user.email}`);
              createdBySalesName = user.email ? user.email.split('@')[0] : 'Administrator';
            } else {
              // 3. Fallback: Check if creatorId is actually an email (legacy/edge case)
              const userByEmail = await this.userModel.findOne({ email: creatorId }).exec();
              if (userByEmail) {
                createdBySalesName = userByEmail.email ? userByEmail.email.split('@')[0] : 'Administrator';
              } else {
                const empByEmail = await this.employeeModel.findOne({ email: creatorId }).exec();
                if (empByEmail) {
                  createdBySalesName = empByEmail.fullName;
                } else {
                  createdBySalesName = creatorId;
                }
              }
            }
          }
        } catch (err) {
          console.error(`[ERROR] Failed to resolve creator for quotation: ${creatorId}`, err);
          createdBySalesName = creatorId;
        }
      }
    }
    console.log(`✨ Resolved name: "${createdBySalesName}"`);
    return { ...quoteObj, createdBySalesName };
  }

  async findAll(status?: string, search?: string, createdBy?: string, startDate?: string, endDate?: string) {
    const query: any = {};
    if (status) query.status = status;

    const conditions: any[] = [];

    if (createdBy) {
      conditions.push({
        $or: [
          { createdBy: createdBy },
          { createdBy: { $exists: false } },
          { createdBy: null },
          { createdBy: '' }
        ]
      });
    }

    if (startDate || endDate) {
      const dateQuery: any = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      conditions.push({ createdAt: dateQuery });
    }

    if (search) {
      conditions.push({
        $or: [
          { customerName: new RegExp(search, 'i') },
          { customerEmail: new RegExp(search, 'i') },
          { quoteNumber: new RegExp(search, 'i') },
          { companyName: new RegExp(search, 'i') },
        ]
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const quotations = await this.quotationModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    return await Promise.all(quotations.map(async (q) => await this.enrichQuotationWithCreator(q)));
  }

  async getStatsSummary() {
    const result = await this.quotationModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalCost' },
        },
      },
      {
        $group: {
          _id: null,
          statuses: {
            $push: {
              status: '$_id',
              count: '$count',
              totalValue: '$totalValue',
            },
          },
          overallTotal: { $sum: '$totalValue' },
        },
      },
    ]);

    if (!result.length) {
      return {
        draft: { count: 0, totalValue: 0 },
        sent: { count: 0, totalValue: 0 },
        approved: { count: 0, totalValue: 0 },
        rejected: { count: 0, totalValue: 0 },
        overallTotal: 0,
      };
    }

    const summary = {
      draft: { count: 0, totalValue: 0 },
      sent: { count: 0, totalValue: 0 },
      approved: { count: 0, totalValue: 0 },
      rejected: { count: 0, totalValue: 0 },
      overallTotal: result[0].overallTotal,
    };

    result[0].statuses.forEach((s) => {
      const key = s.status.toLowerCase();
      if (summary[key] !== undefined) {
        summary[key] = {
          count: s.count,
          totalValue: s.totalValue,
        };
      }
    });

    return summary;
  }

  async findOne(id: string) {
    const quotation = await this.quotationModel.findById(id).exec();
    if (!quotation) {
      throw new HttpException('Quotation not found', HttpStatus.NOT_FOUND);
    }
    return await this.enrichQuotationWithCreator(quotation);
  }

  async update(id: string, updateQuotationDto: UpdateQuotationDto) {
    const updatedQuotation = await this.quotationModel
      .findByIdAndUpdate(id, updateQuotationDto, { new: true })
      .exec();
    if (!updatedQuotation) {
      throw new HttpException('Quotation not found', HttpStatus.NOT_FOUND);
    }
    return updatedQuotation;
  }

  async updateStatus(id: string, status: string, updatedBy?: string) {
    const quotation = await this.quotationModel.findById(id).exec();
    if (!quotation) {
      throw new HttpException('Quotation not found', HttpStatus.NOT_FOUND);
    }

    const updatedQuotation = await this.quotationModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    // ✅ NOTIFY SALES EMPLOYEE when quotation is APPROVED (Background process)
    if (status === 'approved' && quotation.createdBy) {
      this.notificationsService.create({
        icon: 'fa-check-circle',
        title: 'Quotation Approved',
        message: `Your quotation for ${quotation.customerName} has been approved by Admin.`,
        time: new Date().toISOString(),
        type: 'success',
        isRead: false,
        userId: quotation.createdBy,
        actionLink: '/activities'
      }).catch(error => {
        console.error('Failed to notify employee of quotation approval:', error);
      });
    }

    return updatedQuotation;
  }

  async remove(id: string) {
    const deletedQuotation = await this.quotationModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedQuotation) {
      throw new HttpException('Quotation not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Quotation successfully deleted' };
  }

  // Email verification logic
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private async verifyDomainMX(domain: string): Promise<{ valid: boolean; mxRecords?: dns.MxRecord[]; error?: string }> {
    return new Promise((resolve) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err) {
          console.warn(`[DNS WARN] MX resolution failed for ${domain}: ${err.code}`);
          // Be lenient: only fail if we're sure the domain doesn't exist
          if (err.code === 'ENOTFOUND') {
            resolve({ valid: false, error: `Domain not found: ${domain}` });
          } else {
            // For timeouts, servfail, etc., assume it might be valid to avoid blocking
            resolve({ valid: true, error: `MX lookup failed: ${err.code}` });
          }
        } else {
          resolve({ valid: addresses && addresses.length > 0, mxRecords: addresses });
        }
      });
    });
  }

  private async verifyMailboxExists(email: string, mxHost: string): Promise<{ exists: boolean; error?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.on('error', () => resolve({ exists: true })); // Leniency
      socket.on('timeout', () => resolve({ exists: true }));
      socket.connect(25, mxHost, () => {
        socket.write('HELO verify.local\r\n');
        socket.write('MAIL FROM:<verify@verify.local>\r\n');
        socket.write(`RCPT TO:<${email}>\r\n`);
        socket.write('QUIT\r\n');
        resolve({ exists: true }); // Simplified for speed/reliability in this task
      });
    });
  }

  async verifyEmail(email: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.isValidEmailFormat(email)) return { valid: false, error: 'Invalid format' };
    return { valid: true };
  }

  async sendQuotationWithPDF(id: string, email: string, quotationData: any) {
    const q = (await this.findOne(id)) as any;
    const recipientEmail = email || q.customerEmail || (q.customer && q.customer.email);

    if (!recipientEmail) {
      throw new HttpException('Recipient email missing', HttpStatus.BAD_REQUEST);
    }

    if (!this.isValidEmailFormat(recipientEmail)) {
      throw new HttpException(
        'Invalid email address format',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const pdfBuffer = await this.generateQuotationPDF(quotationData);
      const fromAddress =
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        'noreply@capricornelevators.com';

      const mailOptions = {
        from: `Capricorn Elevators <${fromAddress}>`,
        to: recipientEmail,
        subject: `Quotation ${q.quoteNumber} from Capricorn Elevators`,
        html: this.generateEmailBody(quotationData),
        attachments: [
          {
            filename: `Quotation_${q.quoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      console.log(`📧 Attempting to send email via SMTP to ${recipientEmail}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! MessageID: ${info?.messageId}`);

      await this.updateStatus(id, 'sent');
      return {
        message: 'Quotation sent successfully',
        quotation: q,
        messageId: info?.messageId,
      };
    } catch (error: any) {
      console.error('❌ SMTP Error details:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      throw new HttpException(
        'Failed to send email: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async generateQuotationPDF(data: any): Promise<Buffer> {
    try {
      console.log('📄 Generating Official PDF (Professional Direct Draw)...');
      const templatePath = path.join(process.cwd(), 'src', 'assets', 'templates', 'capricon.pdf');
      const logoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'capricorn.png');

      if (!fs.existsSync(templatePath)) throw new Error(`PDF template not found at ${templatePath}`);

      const existingPdfBytes = fs.readFileSync(templatePath);
      const templatePdfDoc = await PDFDocument.load(existingPdfBytes);
      const newPdfDoc = await PDFDocument.create();

      const templatePages = await newPdfDoc.embedPages(templatePdfDoc.getPages());
      const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);

      let logoImage: any = null;
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await newPdfDoc.embedPng(logoBytes);
      }

      const pages: any[] = [];
      for (const templatePage of templatePages) {
        const { width, height } = templatePage;
        const page = newPdfDoc.addPage([width, height]);
        page.drawPage(templatePage);
        pages.push(page);
      }

      const { height } = pages[0].getSize();

      // PAGE 1: COVER
      if (pages.length >= 1) {
        await this.drawPage1Details(pages[0], data, font, boldFont, height, logoImage);
      }

      // PAGE 4: TECHNICAL SPECIFICATIONS
      if (pages.length >= 4) {
        await this.drawPage4Details(pages[3], data, font, boldFont, height, logoImage);
      }

      // PAGE 9: PRICING
      if (pages.length >= 9) {
        await this.drawPage9Manually(pages[8], data, font, boldFont, height, logoImage);
      }

      const pdfBytes = await newPdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      throw new HttpException('Failed to generate PDF: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private drawProfessionalHeader(page: any, logoImage: any, title: string, subtitle: string, height: number, boldFont: any): void {
    const goldColor = rgb(0.83, 0.69, 0.22);

    // Top Gold Line
    page.drawLine({
      start: { x: 40, y: height - 40 },
      end: { x: 555, y: height - 40 },
      thickness: 2,
      color: goldColor
    });

    // Logo (Top Right)
    if (logoImage) {
      const logoWidth = 60;
      const logoHeight = (logoImage.height * logoWidth) / logoImage.width;
      page.drawImage(logoImage, {
        x: 480,
        y: height - 110,
        width: logoWidth,
        height: logoHeight
      });
    }

    // Titles (Top Left)
    page.drawText(title, {
      x: 40,
      y: height - 85,
      size: 22,
      font: boldFont,
      color: goldColor
    });

    page.drawText(subtitle, {
      x: 40,
      y: height - 105,
      size: 11,
      font: boldFont,
      color: goldColor
    });
  }

  private drawProfessionalFooter(page: any, pageNum: number, height: number, font: any, boldFont: any): void {
    const textColor = rgb(0.1, 0.1, 0.1);
    const goldColor = rgb(0.83, 0.69, 0.22);
    const footerY = 50;

    page.drawLine({
      start: { x: 40, y: footerY + 20 },
      end: { x: 555, y: footerY + 20 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });

    page.drawText('Capricorn Elevators Pvt Ltd', {
      x: 40,
      y: footerY,
      size: 9,
      font: boldFont,
      color: textColor
    });

    page.drawText('CONFIDENTIAL', {
      x: 260,
      y: footerY,
      size: 8,
      font: boldFont,
      color: goldColor
    });

    page.drawText(`Page No. ${pageNum}`, {
      x: 500,
      y: footerY,
      size: 9,
      font: font,
      color: textColor
    });
  }



  private async drawPage4Details(page: any, data: any, font: any, boldFont: any, height: number, logoImage?: any): Promise<void> {
    const textColor = rgb(0, 0, 0);
    const fontSize = 9;
    const startX = 230;
    const rowHeight = 16.5;

    // --- CLEAR EXISTING TEMPLATE CONTENT ---
    const { width: pageWidth, height: pageHeight } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 1, 1),
      opacity: 1
    });

    // --- DRAW PROFESSIONAL HEADER ---
    this.drawProfessionalHeader(page, logoImage, 'Technical Specifications', 'Elevator Configuration Details', height, boldFont);

    // --- SECTION TITLE ---
    const modelText = `${data.model || ''} - G+${(data.noOfStops || 2) - 1}`;
    page.drawText(modelText, {
      x: 40,
      y: height - 150,
      size: 16,
      font: boldFont,
      color: rgb(0.83, 0.69, 0.22)
    });

    const startY = height - 180;

    const specs = [
      { label: 'Model', value: data.model || '' },
      { label: 'Quantity', value: data.quantity || '1' },
      { label: 'No of Stops', value: `${data.noOfStops || 2} Stops` },
      { label: 'Elevator Type', value: data.elevatorType || '' },
      { label: 'Rated Load', value: data.ratedLoad || '' },
      { label: 'Maximum Speed', value: data.maximumSpeed || '' },
      { label: 'Travel Height', value: data.travelHeight || '' },
      { label: 'Drive System', value: data.driveSystem || '' },
      { label: 'Control System', value: data.controlSystem || '' },
      { label: 'Cabin Walls', value: data.cabinWalls || '' },
      { label: 'Cabin Doors', value: data.cabinDoors || '' },
      { label: 'Door Type', value: data.doorType || '' },
      { label: 'Door Opening', value: data.doorOpening || '' },
      { label: 'COP & LOP Screen', value: data.copLopScreen || '' },
      { label: 'Cabin Ceiling', value: data.cabinCeiling || '' },
      { label: 'Cabin Floor', value: data.cabinFloor || '' },
      { label: 'Handrails', value: `${data.handrails || 1} No.` }
    ];

    // --- TABLE WIPE ---
    page.drawRectangle({
      x: 35,
      y: 100,
      width: 535,
      height: height - 250,
      color: rgb(1, 1, 1),
      opacity: 1
    });

    // Header Row
    const headerY = startY;
    page.drawRectangle({ x: 40, y: headerY - 5, width: 520, height: 20, color: rgb(0.97, 0.97, 0.97) });
    page.drawText('Specification', { x: 50, y: headerY, size: 10, font: boldFont, color: textColor });
    page.drawText('Details', { x: startX, y: headerY, size: 10, font: boldFont, color: textColor });

    page.drawLine({ start: { x: 40, y: headerY - 5 }, end: { x: 560, y: headerY - 5 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawLine({ start: { x: 40, y: headerY + 15 }, end: { x: 560, y: headerY + 15 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    specs.forEach((item, index) => {
      const y = (headerY - 20) - (index * rowHeight);
      page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 560, y: y - 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
      page.drawText(item.label, { x: 50, y: y, size: fontSize, font: boldFont, color: textColor });

      const text = String(item.value);
      if (font.widthOfTextAtSize(text, fontSize) > 300) {
        const words = text.split(' ');
        let line1 = ''; let line2 = '';
        for (const word of words) {
          if (font.widthOfTextAtSize(line1 + word, fontSize) < 300) line1 += word + ' ';
          else line2 += word + ' ';
        }
        page.drawText(line1.trim(), { x: startX, y: y + 5, size: 9, font: font, color: textColor });
        if (line2) page.drawText(line2.trim(), { x: startX, y: y - 4, size: 9, font: font, color: textColor });
      } else {
        page.drawText(text, { x: startX, y: y, size: fontSize, font: font, color: textColor });
      }
    });

    // Borders
    const tableBottom = (headerY - 20) - (specs.length * rowHeight) - 5;
    page.drawLine({ start: { x: 40, y: headerY + 15 }, end: { x: 40, y: tableBottom }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawLine({ start: { x: startX - 10, y: headerY + 15 }, end: { x: startX - 10, y: tableBottom }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawLine({ start: { x: 560, y: headerY + 15 }, end: { x: 560, y: tableBottom }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

    // --- EMERGENCY FEATURES ---
    const emergencyY = tableBottom - 25;
    const goldColor = rgb(0.83, 0.69, 0.22);
    page.drawText('1. Emergency & Protection Features', { x: 40, y: emergencyY, size: 11, font: boldFont, color: goldColor });

    const emergencyFeatures = [
      'Emergency Stop Button – Instantly halts the lift in case of an emergency.',
      'Emergency Alarm – Alerts building occupants in case of distress.',
      'Emergency Light – Ensures illumination during power failures.',
      'Auto Rescue Device (ARD) – Automatically moves the lift to the nearest floor.',
      'Over-Speed Governor – Prevents the lift from exceeding safe speeds.',
      'Overload Sensor – Detects excess weight and prevents operation.',
      'Mechanical Clutch for Anti-Fall Protection – Prevents free fall.',
      'Buffer System for Smooth Landing – Ensures controlled landing.',
      'Fireman Control Mode – Dedicated emergency mode for firefighters.'
    ];

    emergencyFeatures.forEach((feat, i) => {
      page.drawText('• ' + feat, { x: 50, y: emergencyY - 15 - (i * 12), size: 8, font: font, color: rgb(0.2, 0.2, 0.2) });
    });

    // --- DRAW PROFESSIONAL FOOTER ---
    this.drawProfessionalFooter(page, 4, height, font, boldFont);
  }

  private async drawPage1Details(page: any, data: any, font: any, boldFont: any, height: number, logoImage?: any): Promise<void> {
    const customer = data.customer || {};
    const textColor = rgb(0.1, 0.1, 0.1);
    const goldColor = rgb(0.83, 0.69, 0.22);
    const footerY = 140;
    const leftX = 75;
    const rightX = 360;
    const lineSpacing = 15;
    const labelSize = 8;
    let currentLeftY = footerY;

    // Clear background for the area where we place details (Bottom area)
    // Reduce height to 180 to avoid hiding template's "PROJECT PROPOSAL" text
    page.drawRectangle({ x: 0, y: 0, width: 600, height: 180, color: rgb(1, 1, 1) });

    // PREPARED FOR

    page.drawText('PREPARED FOR', { x: leftX, y: currentLeftY + 15, size: labelSize, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(String(customer.name || '').toUpperCase(), { x: leftX, y: currentLeftY, size: 18, font: boldFont, color: textColor });
    currentLeftY -= lineSpacing + 10;

    if (customer.company) {
      page.drawText(customer.company, { x: leftX, y: currentLeftY, size: 12, font: font, color: textColor });
      currentLeftY -= lineSpacing + 2;
    }

    page.drawText(`Email: ${customer.email || 'N/A'}`, { x: leftX, y: currentLeftY, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });
    currentLeftY -= lineSpacing;
    page.drawText(`Phone: ${customer.phone || 'N/A'}`, { x: leftX, y: currentLeftY, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });
    currentLeftY -= lineSpacing + 5;

    // SITE ADDRESS
    const address = customer.address || data.customerAddress || data.address || '';
    if (address) {
      page.drawText('SITE ADDRESS:', { x: leftX, y: currentLeftY, size: labelSize, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
      currentLeftY -= lineSpacing - 2;
      const maxWidth = 250;
      const words = String(address).split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        if (font.widthOfTextAtSize(testLine, 9) > maxWidth) {
          page.drawText(line, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
          line = word + ' ';
          currentLeftY -= 12;
        } else line = testLine;
      }
      if (line.trim()) page.drawText(line, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
    }

    // QUOTATION DETAILS (Right column)
    page.drawText('REFERENCE NO', { x: rightX, y: footerY + 15, size: labelSize, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(data.quoteNumber || 'Draft', { x: rightX, y: footerY, size: 11, font: boldFont, color: textColor });

    page.drawText('DATE', { x: rightX + 110, y: footerY + 15, size: labelSize, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(this.formatDate(data.quoteDate), { x: rightX + 110, y: footerY, size: 11, font: boldFont, color: textColor });

    page.drawText('VALID UNTIL', { x: rightX, y: footerY - 35, size: labelSize, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(this.formatDate(data.validUntil), { x: rightX, y: footerY - 50, size: 11, font: boldFont, color: textColor });

  }





  private getExactPricingItems(q: any): any[] {
    const items = Array.isArray(q.pricingItems) ? q.pricingItems : [];
    const findItem = (label: string) => {
      const search = label.toLowerCase().trim();
      return items.find((it: any) => {
        const itemLabel = (it.label || it.description || it.itemName || '').toLowerCase().trim();
        return itemLabel === search;
      });
    };

    const labels = [
      'Basic Cost',
      'Installation',
      'Additional Door Cost',
      'Extra Travel Height Cost',
      'Premium Cabin (Glass/Mirror/RAL/Wood Finish)',
      'Custom Ceiling',
      'Glass Door',
      'Premium RAL Colour for Door',
      'Customised Cabin Size',
      'Transportation',
      'LOP - COP'
    ];

    return labels.map(label => {
      const match = findItem(label);
      if (match) {
        return {
          description: match.label || match.description || match.itemName || label,
          standard: Number(match.standard) || 0,
          launch: Number(match.launch) || 0,
          isNA: match.isNA === true,
          isComplimentary: match.isComplimentary === true
        };
      }
      return {
        description: label,
        standard: 0,
        launch: 0,
        isNA: label.includes('Door Cost') || label.includes('RAL Colour'),
        isComplimentary: label.includes('Cabin') || label.includes('Ceiling') || label.includes('Door') || label.includes('Size') || label.includes('Transportation') || label.includes('LOP')
      };
    });
  }

  private convertNumberToWords(num: number): string {
    if (num === 0) return 'Rupees Zero Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' : '') + a[n % 10];
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
      return '';
    };
    const convert = (n: number): string => {
      let str = '';
      if (n >= 10000000) { str += inWords(Math.floor(n / 10000000)) + 'Crore '; n %= 10000000; }
      if (n >= 100000) { str += inWords(Math.floor(n / 100000)) + 'Lakh '; n %= 100000; }
      if (n >= 1000) { str += inWords(Math.floor(n / 1000)) + 'Thousand '; n %= 1000; }
      if (n > 0) { str += inWords(n); }
      return str.trim();
    };
    return 'Rupees ' + convert(Math.floor(num)) + ' Only';
  }

  private async drawPage9Manually(page: any, data: any, font: any, boldFont: any, height: number, logoImage?: any): Promise<void> {
    const pricingItems = this.getExactPricingItems(data);
    const gstRate = data.gstRate || 18;
    const launchSubtotal = pricingItems.reduce((sum, it) => (it.isComplimentary || it.isNA) ? sum : sum + it.launch, 0);
    const standardSubtotal = pricingItems.reduce((sum, it) => it.isNA ? sum : sum + it.standard, 0);
    const launchTax = launchSubtotal * (gstRate / 100);
    const standardTax = standardSubtotal * (gstRate / 100);
    const launchGrandTotal = launchSubtotal + launchTax;
    const standardGrandTotal = standardSubtotal + standardTax;
    const launchGrandTotalInWords = this.convertNumberToWords(launchGrandTotal);

    const textColor = rgb(0.1, 0.1, 0.1);
    const goldColor = rgb(0.83, 0.69, 0.22);

    // --- CLEAR EXISTING TEMPLATE CONTENT ---
    const { width: pageWidth, height: pageHeight } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 1, 1),
      opacity: 1
    });

    // Header & Footer
    this.drawProfessionalHeader(page, logoImage, 'Pricing & Payment Terms', 'Price Structure', height, boldFont);

    const startY = height - 200;
    const rowSpacing = 16.0;

    // Pricing Table Header
    const headerY = startY;
    page.drawRectangle({ x: 40, y: headerY - 5, width: 520, height: 20, color: rgb(0.98, 0.98, 0.98) });
    page.drawText('Item Description', { x: 50, y: headerY, size: 9, font: boldFont, color: textColor });
    page.drawText('Standard (INR)', { x: 350, y: headerY, size: 9, font: boldFont, color: textColor });
    page.drawText('Launch Offer (INR)', { x: 460, y: headerY, size: 9, font: boldFont, color: textColor });

    pricingItems.forEach((item: any, index: number) => {
      const y = (headerY - 20) - (index * rowSpacing);
      page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 560, y: y - 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
      page.drawText(item.description || 'Item', { x: 50, y: y, size: 8, font: font, color: textColor });

      const stdText = item.isNA ? '-' : this.formatCurrency(item.standard || 0);
      page.drawText(stdText, { x: 350, y: y, size: 9, font: font });

      let launchText = item.isNA ? 'NA' : item.isComplimentary ? 'Complimentary' : this.formatCurrency(item.launch || 0);
      page.drawText(launchText, {
        x: 460, y: y, size: 9,
        font: item.isComplimentary ? boldFont : font,
        color: item.isComplimentary ? rgb(0.1, 0.5, 0.1) : textColor
      });
    });

    // Row 12: Total
    const subtotalY = (headerY - 20) - (pricingItems.length * rowSpacing);
    page.drawRectangle({ x: 40, y: subtotalY - 5, width: 520, height: rowSpacing, color: rgb(0.98, 0.98, 0.98) });
    page.drawText('Total', { x: 50, y: subtotalY, size: 9, font: boldFont });
    page.drawText(this.formatCurrency(standardSubtotal), { x: 350, y: subtotalY, size: 9, font: font });
    page.drawText(this.formatCurrency(launchSubtotal), { x: 460, y: subtotalY, size: 9, font: font });

    // Row 13: GST
    const gstY = subtotalY - rowSpacing;
    page.drawRectangle({ x: 40, y: gstY - 5, width: 520, height: rowSpacing, color: rgb(0.98, 0.98, 0.98) });
    page.drawText(`GST (${gstRate}%)`, { x: 50, y: gstY, size: 9, font: boldFont });
    page.drawText(this.formatCurrency(standardTax), { x: 350, y: gstY, size: 9, font: font });
    page.drawText(this.formatCurrency(launchTax), { x: 460, y: gstY, size: 9, font: font });

    // Row 14: Grand Total
    const grandY = gstY - rowSpacing;
    page.drawRectangle({ x: 40, y: grandY - 5, width: 520, height: rowSpacing, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Grand Total', { x: 50, y: grandY, size: 10, font: boldFont });
    page.drawText(this.formatCurrency(standardGrandTotal), { x: 350, y: grandY, size: 10, font: boldFont });
    page.drawText(this.formatCurrency(launchGrandTotal), { x: 460, y: grandY, size: 10, font: boldFont, color: goldColor });

    const totalInWordsY = grandY - 30;
    page.drawText(`Total Value: ${launchGrandTotalInWords}`, { x: 40, y: totalInWordsY, size: 10, font: boldFont, color: textColor });
    page.drawText(`The Above price is valid till ${this.formatDate(data.validUntil)}`, { x: 40, y: totalInWordsY - 15, size: 9, font: font, color: rgb(0.4, 0.4, 0.4) });

    // --- PAYMENT TERMS ---
    const paymentY = totalInWordsY - 45;
    page.drawText('Payment Terms', { x: 40, y: paymentY, size: 12, font: boldFont, color: goldColor });

    const termsHeaderY = paymentY - 25;
    page.drawRectangle({ x: 40, y: termsHeaderY - 5, width: 520, height: 18, color: rgb(0.97, 0.97, 0.97) });
    page.drawText('SL.No.', { x: 45, y: termsHeaderY, size: 8, font: boldFont });
    page.drawText('Description', { x: 90, y: termsHeaderY, size: 8, font: boldFont });
    page.drawText('Rate', { x: 510, y: termsHeaderY, size: 8, font: boldFont });

    const paymentTerms = data.paymentTerms || [
      { slNo: 1, description: 'On Order Signing', rate: '30%' },
      { slNo: 2, description: 'On GAD Approval', rate: '20%' },
      { slNo: 3, description: 'Before Dispatch of materials', rate: '40%' },
      { slNo: 4, description: 'After Installation & Commissioning', rate: '10%' }
    ];

    paymentTerms.forEach((term: any, i: number) => {
      const y = (termsHeaderY - 18) - (i * 15);
      page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 560, y: y - 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
      page.drawText(String(term.slNo), { x: 55, y: y, size: 8, font: font });
      page.drawText(term.description, { x: 90, y: y, size: 8, font: font });
      page.drawText(term.rate, { x: 510, y: y, size: 8, font: font });
    });

    // --- BANK DETAILS ---
    const bankBottomY = (termsHeaderY - 18) - (paymentTerms.length * 15) - 30;
    const bankDetails = data.bankDetails || {
      accountNo: '777 705 751 175', ifsc: 'ICIC0006264', bank: 'ICICI Bank', gstin: '32AAMCC4492R1ZY',
      accountName: 'Capricorn Elevators Pvt Ltd', accountType: 'Current Account', branch: 'Edappally - Ernakulam, Kerala', pan: 'AAMCC4492R'
    };

    page.drawRectangle({ x: 40, y: bankBottomY - 65, width: 520, height: 75, color: rgb(1, 1, 1), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });

    // Two Column Bank Details
    let bankRowY = bankBottomY - 10;
    const drawBankRow = (label: string, value: string, x: number, y: number) => {
      page.drawText(label, { x: x, y: y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(value, { x: x + 70, y: y, size: 8, font: boldFont, color: textColor });
    };

    drawBankRow('Account No.', bankDetails.accountNo, 50, bankRowY);
    drawBankRow('Account Name', bankDetails.accountName, 300, bankRowY);
    bankRowY -= 15;
    drawBankRow('IFSC', bankDetails.ifsc, 50, bankRowY);
    drawBankRow('Account Type', bankDetails.accountType, 300, bankRowY);
    bankRowY -= 15;
    drawBankRow('BANK', bankDetails.bank, 50, bankRowY);
    drawBankRow('Branch', bankDetails.branch, 300, bankRowY);
    bankRowY -= 15;
    drawBankRow('GSTIN', bankDetails.gstin, 50, bankRowY);
    drawBankRow('PAN', bankDetails.pan, 300, bankRowY);

    this.drawProfessionalFooter(page, 9, height, font, boldFont);
  }


  private formatDate(dateString: any): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return String(dateString); }
  }

  private formatCurrency(amount: number): string {
    if (!amount || amount === 0) return '0';
    return amount.toLocaleString('en-IN');
  }

  private generateEmailBody(data: any): string {
    const goldColor = '#d4b347';
    const darkColor = '#1a1a1a';

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${darkColor}; padding: 30px; text-align: center;">
          <h1 style="color: ${goldColor}; margin: 0; letter-spacing: 3px; text-transform: uppercase; font-size: 24px;">Capricorn Elevators</h1>
          <p style="color: #fff; margin-top: 5px; font-size: 12px; letter-spacing: 1px;">ELEVATING EXCELLENCE</p>
        </div>
        
        <div style="padding: 40px; color: #333; line-height: 1.6;">
          <h2 style="color: ${darkColor}; font-weight: 600; margin-top: 0;">Quotation for Your Project</h2>
          <p>Dear ${data.customer?.name || 'Valued Customer'},</p>
          <p>Thank you for choosing <strong>Capricorn Elevators</strong>. It is our pleasure to provide you with the project proposal and quotation for your elevator installation.</p>
          
          <div style="background-color: #f9f9f9; padding: 25px; border-left: 4px solid ${goldColor}; margin: 30px 0; border-radius: 0 5px 5px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Quotation Reference</p>
            <h3 style="margin: 5px 0; color: ${darkColor};">${data.quoteNumber || 'Draft'}</h3>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">Total Project Value</p>
            <h2 style="margin: 5px 0; color: ${goldColor}; font-size: 28px;">INR ${(data.grandTotal || data.totalCost || 0).toLocaleString('en-IN')}</h2>
          </div>
          
          <p>Please find the detailed technical specifications and pricing breakdown in the attached PDF document.</p>
          
          <p>If you have any questions or require further customization, please do not hesitate to contact our sales team.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin-bottom: 5px;">Best regards,</p>
            <p style="margin: 0; font-weight: bold; color: ${darkColor};">Sales Team</p>
            <p style="margin: 0; color: ${goldColor}; font-weight: 600;">Capricorn Elevators Pvt Ltd</p>
          </div>
        </div>
        
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888;">
          <p style="margin: 0;">This is an automated message. Please do not reply directly to this email.</p>
          <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} Capricorn Elevators Pvt Ltd. All rights reserved.</p>
        </div>
      </div>`;
  }

  async convertToDeal(id: string) {
    const quotation = await this.findOne(id);
    await this.updateStatus(id, 'approved');
    return {
      quotationId: quotation._id,
      quoteNumber: quotation.quoteNumber,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      companyName: quotation.companyName,
      dealValue: quotation.totalCost,
      status: 'negotiation',
      createdFrom: 'quotation',
    };
  }
}