import {
  AssistantsPage,
  AssistantCreateParams,
  Assistant,
  AssistantDeleted,
} from 'openai/resources/beta/assistants/assistants';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OpenaiAbstractService } from '../openai.abstract.service';

/**
 * This service is responsible for interacting with the OpenAI assistants API
 * https://platform.openai.com/docs/api-reference/assistants
 */
@Injectable()
export class OpenaiAssistantsService extends OpenaiAbstractService {
  /**
   * This method is responsible for listing all the assistants
   * @returns - an array of assistants
   */
  async listAllAssistants(): Promise<AssistantsPage> {
    try {
      return this.openai.beta.assistants.list();
    } catch (error) {
      throw new HttpException(
        {
          message: 'Something went wrong listing all the assistants',
          error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * This method is responsible for creating a new assistant
   * @param assistantCreateParams - the assistant create params
   * @returns - the assistant object
   */
  async createAssistant(
    assistantCreateParams: AssistantCreateParams,
  ): Promise<Assistant> {
    try {
      return this.openai.beta.assistants.create(assistantCreateParams);
    } catch (error) {
      throw new HttpException(
        {
          message: `Something went wrong creating the assistant ${assistantCreateParams.name}`,
          error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * This method is responsible for deleting an assistant
   * @param assistantId - the assistant id
   * @returns - the assistant deleted object
   */
  async deleteAssistant(assistantId: string): Promise<AssistantDeleted> {
    return this.openai.beta.assistants.del(assistantId);
  }
}
