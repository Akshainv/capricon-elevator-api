// src/quotation/quotation.service.ts (BACKEND)
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Quotation, QuotationDocument } from './schemas/quotation.schema';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import * as puppeteer from 'puppeteer';

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

  // MODIFIED: Generate PDF from quotation data and send via email
  async sendQuotationWithPDF(id: string, email: string, quotationData: any) {
    const quotation = await this.findOne(id);
    
    try {
      console.log('📧 Starting email send process for quotation:', quotation.quoteNumber);
      
      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generateQuotationPDF(quotationData);
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Send email with PDF attachment
      const fromAddress = process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@capricornelevators.com';
      
      if (!fromAddress) {
        console.error('❌ No email sender configured in environment variables');
        throw new HttpException('Email configuration missing - EMAIL_USER not set', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const mailOptions = {
        from: `Capricorn Elevators <${fromAddress}>`,
        to: email,
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

      console.log('📤 Sending email to:', email);
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

  // MODIFIED: Generate PDF from quotation data using Puppeteer with better error handling
  private async generateQuotationPDF(quotationData: any): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    
    try {
      console.log('🚀 Launching Puppeteer browser...');
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      console.log('📄 Browser page created');
      
      // Generate HTML for the quotation
      const html = this.generateQuotationHTML(quotationData);
      console.log('📝 HTML content generated, length:', html.length);
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      console.log('✅ HTML content loaded in browser');
      
      // Generate PDF with proper page settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: false
      });

      console.log('✅ PDF generated successfully');
      return Buffer.from(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      throw new HttpException(
        'Failed to generate PDF: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } finally {
      if (browser !== null) {
        await browser.close();
        console.log('🔒 Browser closed');
      }
    }
  }

  // ENHANCED: Generate complete HTML for quotation matching preview page design
  private generateQuotationHTML(data: any): string {
    const itemsHtml = (data.items || []).map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong style="display: block; color: #111827; font-size: 14px;">${item.product?.name || ''}</strong>
          <span style="display: block; color: #6b7280; font-size: 12px; margin-top: 2px;">${item.product?.category || ''}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">₹${item.price.toLocaleString('en-IN')}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.discount}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.tax}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 600;">₹${item.total.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation ${data.quoteNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background: #ffffff;
            padding: 40px;
          }
          .quotation-document { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px;
          }
          .doc-header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 40px; 
            padding-bottom: 20px; 
            border-bottom: 3px solid #d4b347; 
          }
          .company-name { 
            font-size: 28px; 
            font-weight: 700; 
            color: #d4b347; 
            margin-bottom: 8px; 
          }
          .company-detail { 
            font-size: 12px; 
            color: #6b7280; 
            margin: 3px 0; 
          }
          .quote-header { 
            font-size: 24px; 
            font-weight: 700; 
            color: #111827; 
            margin-bottom: 12px; 
          }
          .quote-detail { 
            font-size: 13px; 
            color: #374151; 
            margin: 4px 0; 
          }
          .section-heading { 
            font-size: 14px; 
            font-weight: 600; 
            color: #111827; 
            margin-bottom: 12px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          .bill-to-section { 
            margin-bottom: 30px; 
            padding: 20px; 
            background: #f9fafb; 
            border-left: 4px solid #d4b347; 
          }
          .customer-name { 
            font-size: 16px; 
            font-weight: 600; 
            color: #111827; 
            margin: 8px 0; 
          }
          .customer-detail { 
            font-size: 13px; 
            color: #4b5563; 
            margin: 4px 0; 
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0; 
          }
          .items-table thead { 
            background: #f3f4f6; 
          }
          .items-table th { 
            padding: 12px; 
            text-align: left; 
            font-size: 12px; 
            font-weight: 600; 
            color: #374151; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            border-bottom: 2px solid #e5e7eb; 
          }
          .items-table th.col-qty, 
          .items-table th.col-discount, 
          .items-table th.col-tax { 
            text-align: center; 
          }
          .items-table th.col-rate, 
          .items-table th.col-amount { 
            text-align: right; 
          }
          .totals-section { 
            display: flex; 
            justify-content: flex-end; 
            margin: 30px 0; 
          }
          .totals-table { 
            width: 350px; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 10px 0; 
            font-size: 14px; 
          }
          .total-row.discount .total-value { 
            color: #dc2626; 
          }
          .total-row.tax .total-value { 
            color: #059669; 
          }
          .total-divider { 
            border-top: 1px solid #e5e7eb; 
            margin: 10px 0; 
          }
          .total-row.grand-total { 
            font-size: 18px; 
            font-weight: 700; 
            color: #111827; 
            padding-top: 15px; 
            border-top: 2px solid #d4b347; 
          }
          .terms-section, .notes-section { 
            margin: 30px 0; 
            padding: 20px; 
            background: #f9fafb; 
            border-radius: 8px; 
          }
          .terms-heading, .notes-heading { 
            font-size: 14px; 
            font-weight: 600; 
            color: #111827; 
            margin-bottom: 12px; 
          }
          .terms-content, .notes-content { 
            font-size: 13px; 
            color: #4b5563; 
            white-space: pre-wrap; 
            line-height: 1.8; 
          }
          .doc-footer { 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 2px solid #e5e7eb; 
            text-align: center; 
          }
          .footer-text { 
            font-size: 14px; 
            color: #6b7280; 
            margin-bottom: 20px; 
          }
          .footer-signature { 
            font-size: 13px; 
            color: #374151; 
          }
        </style>
      </head>
      <body>
        <div class="quotation-document">
          <div class="doc-header">
            <div class="company-info">
              <h2 class="company-name">Capricorn Elevators</h2>
              <p class="company-detail">11th floor, Jomer Symphony, Unit 03, Ponnurunni East, Vyttila</p>
              <p class="company-detail">Ernakulam, Kerala 682019</p>
              <p class="company-detail">Phone: 075930 00222</p>
              <p class="company-detail">Website: capricornelevators.com</p>
              <p class="company-detail">GST: GST123456789</p>
            </div>
            
            <div class="quote-info">
              <h3 class="quote-header">QUOTATION</h3>
              <p class="quote-detail"><strong>Quote #:</strong> ${data.quoteNumber}</p>
              <p class="quote-detail"><strong>Date:</strong> ${new Date(data.quoteDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p class="quote-detail"><strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div class="bill-to-section">
            <h4 class="section-heading">Bill To:</h4>
            <p class="customer-name">${data.customer?.name || ''}</p>
            ${data.customer?.company ? `<p class="customer-detail">${data.customer.company}</p>` : ''}
            <p class="customer-detail">${data.customer?.email || ''}</p>
            <p class="customer-detail">${data.customer?.phone || ''}</p>
            ${data.customer?.address ? `<p class="customer-detail">${data.customer.address}</p>` : ''}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="col-description">Description</th>
                <th class="col-qty">Qty</th>
                <th class="col-rate">Rate</th>
                <th class="col-discount">Discount</th>
                <th class="col-tax">Tax</th>
                <th class="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-table">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">₹${(data.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              ${data.totalDiscount > 0 ? `
              <div class="total-row discount">
                <span class="total-label">Total Discount:</span>
                <span class="total-value">- ₹${data.totalDiscount.toLocaleString('en-IN')}</span>
              </div>
              ` : ''}
              <div class="total-row tax">
                <span class="total-label">Total Tax:</span>
                <span class="total-value">+ ₹${(data.totalTax || 0).toLocaleString('en-IN')}</span>
              </div>
              <div class="total-divider"></div>
              <div class="total-row grand-total">
                <span class="total-label">Grand Total:</span>
                <span class="total-value">₹${(data.grandTotal || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          ${data.termsAndConditions ? `
          <div class="terms-section">
            <h4 class="terms-heading">Terms & Conditions:</h4>
            <div class="terms-content">${data.termsAndConditions}</div>
          </div>
          ` : ''}

          ${data.notes ? `
          <div class="notes-section">
            <h4 class="notes-heading">Additional Notes:</h4>
            <div class="notes-content">${data.notes}</div>
          </div>
          ` : ''}

          <div class="doc-footer">
            <p class="footer-text">Thank you for your business!</p>
            <p class="footer-signature">
              <strong>Authorized Signature</strong><br>
              Capricorn Elevators
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
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