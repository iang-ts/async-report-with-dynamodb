import type { SQSEvent } from 'aws-lambda';
import { scanLeadsTable } from '../../db/scanLeadsTable';

export async function handler(event: SQSEvent) {
  await scanLeadsTable();
}
