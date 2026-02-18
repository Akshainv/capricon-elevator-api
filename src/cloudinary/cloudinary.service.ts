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
                (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                    if (error) {
                        this.logger.error('Cloudinary upload error:', error.message);
                        return reject(error);
                    }
                    if (result) {
                        this.logger.log(`Photo uploaded to Cloudinary: ${result.secure_url}`);
                        return resolve(result.secure_url);
                    }
                    reject(new Error('Unknown Cloudinary upload error'));
                },
            );

            uploadStream.end(file.buffer);
        });
    }
}
