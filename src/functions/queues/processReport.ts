import type { SQSEvent } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { getLeadsGenerator } from '../../db/getLeadsGenerator';
import { S3MPUManager } from '../../services/S3MPUManager';
import { mbToBytes } from '../../utils/mbToBytes';

const minChunkSize = mbToBytes(6);

export async function handler(event: SQSEvent) {
  const fileKey = `${new Date().toISOString()}-${randomUUID()}.csv`;
  const mpu = new S3MPUManager(
    env.REPORTS_BUCKET_NAME,
    fileKey,
  );

  await mpu.start();

  try {
    const header = 'Id,Nome,E-mail,Cargo\n';
    let currentChunk = header;

    for await (const { Items: leads = [] } of getLeadsGenerator()) {
      currentChunk += leads.map(lead => (
        `${lead.id}, ${lead.name}, ${lead.email}, ${lead.jobTitle}\n`
      )).join('');

      const currentChunkSize = Buffer.byteLength(currentChunk, 'utf-8');

      if (currentChunkSize < minChunkSize) {
        continue;
      }

      await mpu.uploadPart(Buffer.from(currentChunk, 'utf-8'));

      currentChunk = '';
    }

    if (currentChunk) {
      await mpu.uploadPart(Buffer.from(currentChunk, 'utf-8'));
    }

    await mpu.complete();
  } catch {
    await mpu.abort();
  }
}
