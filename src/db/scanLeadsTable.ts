import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '../clients/dynamoClient';
import { env } from '../config/env';


export async function scanLeadsTable() {
  let lastEvaluatedKey: Record<string, any> | undefined;

  const items = [];

  do {
    const command = new ScanCommand({
      TableName: env.DYNAMO_LEADS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

    lastEvaluatedKey = LastEvaluatedKey;
    items.push(...Items);
  } while(lastEvaluatedKey);

  console.log(items.length);

}
