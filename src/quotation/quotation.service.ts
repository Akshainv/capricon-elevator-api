// src/quotation/quotation.service.ts (BACKEND)
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Quotation, QuotationDocument } from './schemas/quotation.schema';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';
import * as net from 'net';

@Injectable()
export class QuotationService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Quotation.name)
    private quotationModel: Model<QuotationDocument>,
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

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotationData = {
      ...createQuotationDto,
      quoteNumber,
      validUntil,
      status: createQuotationDto.status || 'draft',
      createdBy,
    };

    console.log('📝 Creating quotation with createdBy:', createdBy);
    const createQuotation = await this.quotationModel.create(quotationData);
    return createQuotation;
  }

  async findAll(status?: string, search?: string, createdBy?: string) {
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (createdBy) {
      query.createdBy = createdBy;
      console.log('🔍 Filtering quotations by createdBy:', createdBy);
    } else {
      console.log('👀 Fetching all quotations (no filter)');
    }

    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') },
        { quoteNumber: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
      ];
    }

    const quotations = await this.quotationModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    console.log(`📊 Found ${quotations.length} quotation(s)`);
    return quotations;
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
    return quotation;
  }

  async update(id: string, updateQuotationDto: UpdateQuotationDto) {
    const updatedQuotation = await this.quotationModel
      .findByIdAndUpdate(id, updateQuotationDto, { new: true })
      .exec();
    if (!updatedQuotation) {
      throw new HttpException(
        'Quotation not found or could not be updated',
        HttpStatus.NOT_FOUND,
      );
    }
    return updatedQuotation;
  }

  async updateStatus(id: string, status: string) {
    const updatedQuotation = await this.quotationModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!updatedQuotation) {
      throw new HttpException(
        'Quotation not found or status could not be updated',
        HttpStatus.NOT_FOUND,
      );
    }
    return updatedQuotation;
  }

  async remove(id: string) {
    const deletedQuotation = await this.quotationModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedQuotation) {
      throw new HttpException(
        'Quotation not found or could not be deleted',
        HttpStatus.NOT_FOUND,
      );
    }
    return { message: 'Quotation successfully deleted' };
  }

  // ==========================================
  // EMAIL VERIFICATION METHODS
  // ==========================================

  // Validate email format
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if domain has valid MX records (can receive emails)
  private async verifyDomainMX(domain: string): Promise<{ valid: boolean; mxRecords?: dns.MxRecord[]; error?: string }> {
    return new Promise((resolve) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err) {
          console.log(`❌ MX lookup failed for ${domain}:`, err.code);
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve({ valid: false, error: `Domain "${domain}" does not exist or cannot receive emails` });
          } else {
            // Leniency: Allow send if the DNS server itself is unreachable (like ECONNREFUSED)
            console.log(`⚠️ DNS system error (${err.code}) - proceeding with send anyway`);
            resolve({ valid: true, error: `Unable to verify domain: ${err.message}` });
          }
        } else if (!addresses || addresses.length === 0) {
          // Leniency: Proceed even if no MX records, as mail servers might fallback to A records
          console.log(`⚠️ No MX records for ${domain} - proceeding with send anyway`);
          resolve({ valid: true });
        } else {
          console.log(`✅ MX records found for ${domain}:`, addresses.map(a => a.exchange).join(', '));
          resolve({ valid: true, mxRecords: addresses });
        }
      });
    });
  }

  // SMTP verification to check if mailbox exists
  private async verifyMailboxExists(email: string, mxHost: string): Promise<{ exists: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeout = 10000; // 10 second timeout
      const socket = new net.Socket();
      let step = 0;
      let response = '';

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(timeout);

      socket.on('timeout', () => {
        console.log('⏱️ SMTP verification timeout');
        cleanup();
        // On timeout, assume email might be valid (don't block sending)
        resolve({ exists: true, error: 'Verification timeout - proceeding with send' });
      });

      socket.on('error', (err: any) => {
        console.log('❌ SMTP socket error:', err.message);
        cleanup();
        // On error, assume email might be valid (don't block sending)
        resolve({ exists: true, error: 'Verification error - proceeding with send' });
      });

      socket.on('data', (data: Buffer) => {
        response += data.toString();
        const lines = response.split('\r\n');

        for (const line of lines) {
          if (line.length < 3) continue;
          const code = parseInt(line.substring(0, 3), 10);

          if (step === 0 && code === 220) {
            // Server ready, send HELO
            step = 1;
            socket.write('HELO verify.local\r\n');
          } else if (step === 1 && code === 250) {
            // HELO accepted, send MAIL FROM
            step = 2;
            socket.write('MAIL FROM:<verify@verify.local>\r\n');
          } else if (step === 2 && code === 250) {
            // MAIL FROM accepted, send RCPT TO (this is where we verify)
            step = 3;
            socket.write(`RCPT TO:<${email}>\r\n`);
          } else if (step === 3) {
            // Check RCPT TO response
            socket.write('QUIT\r\n');
            cleanup();

            if (code === 250 || code === 251) {
              console.log(`✅ Mailbox verified: ${email} exists`);
              resolve({ exists: true });
            } else if (code === 550 || code === 551 || code === 552 || code === 553 || code === 554) {
              console.log(`❌ Mailbox rejected (${code}): ${email} does not exist`);
              resolve({ exists: false, error: `Email address "${email}" does not exist on the mail server` });
            } else if (code === 450 || code === 451 || code === 452) {
              // Temporary failure - assume valid
              console.log(`⚠️ Temporary response (${code}) - assuming valid`);
              resolve({ exists: true });
            } else {
              // Unknown response - assume valid to not block
              console.log(`⚠️ Unknown response (${code}) - assuming valid`);
              resolve({ exists: true });
            }
            return;
          }
        }
        response = lines[lines.length - 1]; // Keep incomplete line
      });

      socket.on('close', () => {
        if (step < 3) {
          // Connection closed before verification complete
          resolve({ exists: true, error: 'Connection closed early - proceeding with send' });
        }
      });

      // Connect to MX server on port 25
      console.log(`🔌 Connecting to ${mxHost}:25 to verify ${email}...`);
      socket.connect(25, mxHost);
    });
  }

  // Main email verification method
  async verifyEmail(email: string): Promise<{ valid: boolean; error?: string }> {
    // Step 1: Check email format
    if (!this.isValidEmailFormat(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Step 2: Extract domain
    const domain = email.split('@')[1];
    if (!domain) {
      return { valid: false, error: 'Invalid email format - no domain found' };
    }

    // Step 3: Check MX records
    const mxResult = await this.verifyDomainMX(domain);
    if (!mxResult.valid) {
      return { valid: false, error: mxResult.error };
    }

    // Step 4: SMTP verification (optional - may fail due to firewalls/greylisting)
    try {
      const mxHost = mxResult.mxRecords![0].exchange;
      const mailboxResult = await this.verifyMailboxExists(email, mxHost);

      if (!mailboxResult.exists) {
        return { valid: false, error: mailboxResult.error };
      }
    } catch (smtpError: any) {
      // If SMTP verification fails, fall back to just MX check (which passed)
      console.log('⚠️ SMTP verification failed, proceeding with MX-verified domain');
    }

    return { valid: true };
  }

  // MODIFIED: Generate PDF from quotation data and send via email with verification
  async sendQuotationWithPDF(id: string, email: string, quotationData: any) {
    const quotation = await this.findOne(id);

    try {
      console.log('📧 Starting email send process for quotation:', quotation.quoteNumber);

      // ==========================================
      // EMAIL VERIFICATION (NON-BLOCKING)
      // ==========================================
      try {
        console.log('🔍 Verifying email address:', email);
        const verificationResult = await this.verifyEmail(email);
        if (!verificationResult.valid) {
          console.warn('⚠️ Email verification warning:', verificationResult.error);
          // We proceed anyway to handle local DNS/network issues gracefully
        } else {
          console.log('✅ Email verification passed for:', email);
        }
      } catch (verifyError: any) {
        console.warn('⚠️ Email verification process failed, skipping check:', verifyError.message);
      }

      // Generate 13-page PDF using pdf-lib and template
      const pdfBuffer = await this.generateQuotationPDF(quotationData);
      console.log('✅ 13-page PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      // Send email with PDF attachment
      const fromAddress = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@capricornelevators.com';

      if (!fromAddress) {
        console.error('❌ No email sender configured in environment variables');
        throw new HttpException('Email configuration missing - EMAIL_USER not set', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Use provided email or fallback to database fields
      const q = quotation as any;
      const recipientEmail = email || q.customerEmail || (q.customer && q.customer.email);

      if (!recipientEmail) {
        throw new HttpException('Recipient email is missing and not found in database', HttpStatus.BAD_REQUEST);
      }

      const mailOptions = {
        from: `Capricorn Elevators <${fromAddress}>`,
        to: recipientEmail,
        subject: `Quotation ${quotation.quoteNumber} from Capricorn Elevators`,
        html: this.generateEmailBody(quotationData),
        attachments: [
          {
            filename: `Quotation_${quotation.quoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      console.log('📤 Sending email to:', recipientEmail);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully! Message ID:', info?.messageId);

      // Update status to 'sent' only after successful email
      await this.updateStatus(id, 'sent');
      console.log('✅ Quotation status updated to "sent"');

      return {
        message: 'Quotation sent successfully with PDF attachment',
        quotation,
        messageId: info?.messageId
      };
    } catch (error: any) {
      console.error('❌ Email send error:', error);

      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
        response: error?.response
      });

      throw new HttpException(
        'Failed to send email: ' + (error?.message || 'Unknown error. Please check SMTP configuration.'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GENERATE 13-PAGE PDF using template and pdf-lib
  private async generateQuotationPDF(data: any): Promise<Buffer> {
    try {
      console.log('📄 Generating 13-page PDF using template...');
      const templatePath = path.join(process.cwd(), 'src', 'assets', 'templates', 'capricon.pdf');

      if (!fs.existsSync(templatePath)) {
        throw new Error(`PDF template not found at ${templatePath}`);
      }

      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { height } = pages[0].getSize();

      // --- PAGE 1: COVER PAGE (TEXT INJECTION) ---
      if (pages.length >= 1) {
        const page1 = pages[0];
        await this.drawPage1Details(page1, data, font, boldFont, height);
      }

      // Note: Page 4 and Page 9 are currently dynamic in frontend via images.
      // For backend, we will draw the text details manually since we don't have the canvas images.

      // --- PAGE 4: TECHNICAL SPECIFICATIONS ---
      if (pages.length >= 4) {
        const page4 = pages[3];
        await this.drawPage4Details(page4, data, font, boldFont, height);
      }

      // --- PAGE 9: PRICING ---
      if (pages.length >= 9) {
        const page9 = pages[8];
        await this.drawPage9Manually(page9, data, font, boldFont, height);
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      throw new HttpException(
        'Failed to generate PDF: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async drawPage4Details(page: any, data: any, font: any, boldFont: any, height: number): Promise<void> {
    const textColor = rgb(0, 0, 0);
    const fontSize = 10;
    const startX = 260;
    const startY = height - 235;
    const rowHeight = 20.8;

    const specs = [
      data.model || '',
      data.quantity || '1',
      data.noOfStops || '2',
      data.elevatorType || '',
      data.ratedLoad || '',
      data.maximumSpeed || '',
      data.travelHeight || '',
      data.driveSystem || '',
      data.controlSystem || '',
      data.cabinWalls || '',
      data.cabinDoors || '',
      data.doorType || '',
      data.doorOpening || '',
      data.copLopScreen || '',
      data.cabinCeiling || '',
      data.cabinFloor || '',
      data.handrails || '1'
    ];

    specs.forEach((spec, index) => {
      const y = startY - (index * rowHeight);
      const text = String(spec);

      // Basic text wrapping if too long
      if (font.widthOfTextAtSize(text, fontSize) > 280) {
        const words = text.split(' ');
        let line1 = '';
        let line2 = '';
        for (const word of words) {
          if (font.widthOfTextAtSize(line1 + word, fontSize) < 280) {
            line1 += word + ' ';
          } else {
            line2 += word + ' ';
          }
        }
        page.drawText(line1.trim(), { x: startX, y: y + 5, size: 9, font: font, color: textColor });
        if (line2) {
          page.drawText(line2.trim(), { x: startX, y: y - 5, size: 9, font: font, color: textColor });
        }
      } else {
        page.drawText(text, { x: startX, y: y, size: fontSize, font: font, color: textColor });
      }
    });
  }

  private async drawPage1Details(page: any, data: any, font: any, boldFont: any, height: number): Promise<void> {
    const customer = data.customer || {};
    const textColor = rgb(0.1, 0.1, 0.1);
    const footerY = 140;
    const leftX = 75;
    const rightX = 360;
    const lineSpacing = 15;
    const labelSize = 8;
    let currentLeftY = footerY;
    let currentRightY = footerY;

    // PREPARED FOR
    page.drawText('PREPARED FOR', { x: leftX, y: currentLeftY + 15, size: labelSize, font: boldFont, color: textColor });
    page.drawText(String(customer.name || '').toUpperCase(), { x: leftX, y: currentLeftY, size: 11, font: boldFont, color: textColor });
    currentLeftY -= lineSpacing + 2;

    if (customer.company) {
      page.drawText(customer.company, { x: leftX, y: currentLeftY, size: 10, font: font, color: textColor });
      currentLeftY -= lineSpacing;
    }

    page.drawText(`Email: ${customer.email || 'N/A'}`, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
    currentLeftY -= lineSpacing;

    page.drawText(`Phone: ${customer.phone || 'N/A'}`, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
    currentLeftY -= lineSpacing + 5;

    // SITE ADDRESS
    const address = customer.address || data.customerAddress || data.address || '';
    if (address) {
      page.drawText('SITE ADDRESS:', { x: leftX, y: currentLeftY, size: labelSize, font: boldFont, color: textColor });
      currentLeftY -= lineSpacing - 2;

      const maxWidth = 250;
      const words = String(address).split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + word + ' ';
        const width = font.widthOfTextAtSize(testLine, 9);
        if (width > maxWidth && line !== '') {
          page.drawText(line, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
          line = word + ' ';
          currentLeftY -= 12;
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        page.drawText(line, { x: leftX, y: currentLeftY, size: 9, font: font, color: textColor });
      }
    }

    // QUOTATION DETAILS
    page.drawText('QUOTATION DETAILS', { x: rightX, y: currentRightY + 15, size: labelSize, font: boldFont, color: textColor });

    page.drawText('REFERENCE NO:', { x: rightX, y: currentRightY, size: labelSize, font: boldFont, color: textColor });
    page.drawText(data.quoteNumber || 'Draft', { x: rightX + 85, y: currentRightY, size: 10, font: font, color: textColor });
    currentRightY -= lineSpacing;

    page.drawText('DATE:', { x: rightX, y: currentRightY, size: labelSize, font: boldFont, color: textColor });
    page.drawText(this.formatDate(data.quoteDate), { x: rightX + 85, y: currentRightY, size: 10, font: font, color: textColor });
    currentRightY -= lineSpacing;

    page.drawText('VALID UNTIL:', { x: rightX, y: currentRightY, size: labelSize, font: boldFont, color: textColor });
    page.drawText(this.formatDate(data.validUntil), { x: rightX + 85, y: currentRightY, size: 10, font: font, color: textColor });
  }

  private async drawPage9Manually(page: any, data: any, font: any, boldFont: any, height: number): Promise<void> {
    const pricingItems = data.pricingItems || [];
    const startY = height - 310;
    const rowSpacing = 18.5;

    pricingItems.forEach((item: any, index: number) => {
      const y = startY - (index * rowSpacing);
      const stdText = item.isNA ? 'NA' : this.formatCurrency(item.standard || 0);
      page.drawText(stdText, { x: 350, y: y, size: 9, font: font });

      let launchText = '';
      if (item.isNA) launchText = 'NA';
      else if (item.isComplimentary) launchText = 'Complimentary';
      else launchText = this.formatCurrency(item.launch || 0);

      page.drawText(launchText, {
        x: 480,
        y: y,
        size: 9,
        font: item.isComplimentary ? boldFont : font,
        color: item.isComplimentary ? rgb(0.1, 0.5, 0.1) : rgb(0, 0, 0)
      });
    });

    const totalY = startY - (11 * rowSpacing);
    page.drawText(this.formatCurrency(data.standardSubtotal || 0), { x: 350, y: totalY, size: 10, font: boldFont });
    page.drawText(this.formatCurrency(data.launchSubtotal || 0), { x: 480, y: totalY, size: 10, font: boldFont });

    const gstY = startY - (12 * rowSpacing);
    page.drawText(this.formatCurrency(data.standardTax || 0), { x: 350, y: gstY, size: 10, font: font });
    page.drawText(this.formatCurrency(data.launchTax || 0), { x: 480, y: gstY, size: 10, font: font });

    const grandY = startY - (13 * rowSpacing);
    page.drawText(this.formatCurrency(data.standardGrandTotal || 0), { x: 350, y: grandY, size: 11, font: boldFont });
    page.drawText(this.formatCurrency(data.launchGrandTotal || 0), { x: 480, y: grandY, size: 11, font: boldFont });

    const amountInWords = data.launchGrandTotalInWords || '';
    page.drawText(amountInWords, { x: 100, y: height - 565, size: 10, font: boldFont });
  }

  private formatDate(dateString: any): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return String(dateString);
    }
  }

  private formatCurrency(amount: number): string {
    if (!amount || amount === 0) return '0';
    return amount.toLocaleString('en-IN');
  }

  // Generate simple email body
  private generateEmailBody(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #d4b347;">Capricorn Elevators</h2>
        <p>Dear ${data.customer?.name || 'Customer'},</p>
        <p>Please find attached the quotation <strong>${data.quoteNumber}</strong> as requested.</p>
        <p><strong>Total Amount: ₹${(data.grandTotal || 0).toLocaleString('en-IN')}</strong></p>
        <p>If you have any questions or need clarification, please don't hesitate to contact us.</p>
        <br>
        <p>Best regards,<br>
        <strong>Capricorn Elevators</strong><br>
        Phone: 075930 00222<br>
        Website: capricornelevators.com</p>
      </div>
    `;
  }

  async convertToDeal(id: string) {
    const quotation = await this.findOne(id);
    await this.updateStatus(id, 'approved');

    const dealData = {
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

    return dealData;
  }
}