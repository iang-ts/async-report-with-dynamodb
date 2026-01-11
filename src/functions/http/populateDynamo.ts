
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '../../clients/dynamoClient';
import { env } from '../../config/env';
import { response } from '../../utils/response';

export async function handler() {
  const total = 5000;

  const responses = await Promise.allSettled(
    Array.from({ length: total }, async () => {
      const command = new PutCommand({
        TableName: env.DYNAMO_LEADS_TABLE,
        Item: {
          id: randomUUID(),
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          jobTitle: faker.person.jobTitle(),
        },
      });

      await dynamoClient.send(command);
    })
  );

  const totalCreatedLeads = responses.filter(
    result => result.status === 'fulfilled',
  ).length;

  return response(201, { totalCreatedLeads });
}
