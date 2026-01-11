import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../clients/s3Client';

interface IGetPresignedUrlParams {
  bucketName: string;
  fileKey: string;
}

export async function getPresignedUrl({ bucketName, fileKey }: IGetPresignedUrlParams) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 24 * 60 *60 });


  return url;
}
