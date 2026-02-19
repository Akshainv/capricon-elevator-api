import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'employee-photos',
    ): Promise<string> {
        this.logger.log(`Starting upload for file: ${file.originalname}`);
        this.logger.log(`File size: ${file.size}, mimetype: ${file.mimetype}`);
        this.logger.log(`Buffer exists: ${!!file.buffer}, Buffer length: ${file.buffer?.length}`);

        // Verify Cloudinary is configured
        const config = cloudinary.config();
        this.logger.log(`Cloudinary cloud_name: ${config.cloud_name || 'MISSING'}`);
        this.logger.log(`Cloudinary api_key: ${config.api_key ? 'SET' : 'MISSING'}`);
        this.logger.log(`Cloudinary api_secret: ${config.api_secret ? 'SET' : 'MISSING'}`);

        if (!config.cloud_name || !config.api_key || !config.api_secret) {
            this.logger.error('Cloudinary credentials are missing!');
            throw new Error('Cloudinary credentials are not configured');
        }

        if (!file.buffer || file.buffer.length === 0) {
            this.logger.error('File buffer is empty or missing');
            throw new Error('File buffer is empty');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                    transformation: [
                        { width: 500, height: 500, crop: 'limit' },
                        { quality: 'auto' },
                        { fetch_format: 'auto' },
                    ],
                },
                (
                    error: UploadApiErrorResponse | undefined,
                    result: UploadApiResponse | undefined,
                ) => {
                    if (error) {
                        this.logger.error('Cloudinary upload error:', error.message);
                        this.logger.error('Full error:', JSON.stringify(error));
                        return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    }

                    if (!result) {
                        this.logger.error('Cloudinary returned no result');
                        return reject(new Error('Cloudinary returned no result'));
                    }

                    if (!result.secure_url) {
                        this.logger.error('Cloudinary result has no secure_url:', JSON.stringify(result));
                        return reject(new Error('Cloudinary result missing secure_url'));
                    }

                    this.logger.log(`✅ Upload successful: ${result.secure_url}`);
                    return resolve(result.secure_url);
                },
            );

            uploadStream.on('error', (streamError) => {
                this.logger.error('Upload stream error:', streamError.message);
                reject(new Error(`Stream error: ${streamError.message}`));
            });

            uploadStream.end(file.buffer);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            this.logger.log(`Image deleted from Cloudinary: ${publicId}`, result);
        } catch (error) {
            this.logger.error(`Failed to delete image from Cloudinary: ${publicId}`, error.message);
            throw error;
        }
    }
}