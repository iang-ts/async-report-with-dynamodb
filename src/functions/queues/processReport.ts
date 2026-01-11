import type { SQSEvent } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { getLeadsGenerator } from '../../db/getLeadsGenerator';
import { S3MPUManager } from '../../services/S3MPUManager';
import { getPresignedUrl } from '../../utils/getPresignedUrl';
import { mbToBytes } from '../../utils/mbToBytes';
import { sendEmail } from '../../utils/sendEmail';

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

  const presignedUrl = await getPresignedUrl({
    bucketName: env.REPORTS_BUCKET_NAME,
    fileKey
  });

  await sendEmail({
    from: 'Acme <onboarding@resend.dev>',
    to: ['ian.dev.empresarial@gmail.com'],
    subject: 'O seu relatório já está pronto!',
    text: `Aqui está o seu relatório ( a URL é valida por apenas 24h): ${presignedUrl}`,
    html: `
      <h1 style="font-size:32px;font-weight:bold;">O seu relatório já está pronto!</h1>
      <br />
      Clique <a href="${presignedUrl}">Aqui</a> para baixar ou acesse a URL: ${presignedUrl}
      <br /> <br />
      <small>Este link é válido por apenas 24 horas.</small>
    `
  });
}
