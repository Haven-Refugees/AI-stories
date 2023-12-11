import {
  Assistant,
  AssistantCreateParams,
  AssistantsPage,
} from 'openai/resources/beta/assistants/assistants';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { openai_key } from 'src/shared/constants';
import OpenAI from 'openai';

@Injectable()
export class OpenaiAssistantsService {
  private openai: OpenAI = new OpenAI({
    apiKey: this.configService.get<string>(openai_key),
  });

  constructor(private readonly configService: ConfigService) {}

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
}
