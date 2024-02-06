import { APP_PIPE } from '@nestjs/core';
import { AppModule } from './../src/app.module';
import { AssistantsRefugeeService } from 'src/modules/assistants/services/refugee/assistants.refugee.service';
import { ImageNotTextException } from 'src/shared/exceptions/image-not-text.exception';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OpenaiMessagesService } from 'src/modules/openai/services/messages/openai.messages.service';
import { OpenaiRunsService } from 'src/modules/openai/services/runs/openai.runs.service';
import { OpenaiThreadsService } from 'src/modules/openai/services/threads/openai.threads.service';
import { Run } from 'openai/resources/beta/threads/runs/runs';
import { Test, TestingModule } from '@nestjs/testing';
import { Thread } from 'openai/resources/beta/threads/threads';
import { ukrain_Olena } from './__mocks__/refugees/ukrain/refugees.ukrain.mock';
import * as request from 'supertest';
import { GenerateFollowUpQuestionDto } from 'src/modules/haven-ai-agent/dto/generate-followUp-question.dto';
import { ResponseObject } from 'src/modules/haven-ai-agent/dto/response-object.dto';
import { ConfigService } from '@nestjs/config';
import { bearer_token } from 'src/shared/constants';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let openaiThreadsService: OpenaiThreadsService;
  let openaiMessagesService: OpenaiMessagesService;
  let openaiRunsService: OpenaiRunsService;
  let assistantsRefugeeService: AssistantsRefugeeService;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [{ provide: APP_PIPE, useValue: new ValidationPipe() }],
    }).compile();

    openaiThreadsService =
      moduleFixture.get<OpenaiThreadsService>(OpenaiThreadsService);
    openaiMessagesService = moduleFixture.get<OpenaiMessagesService>(
      OpenaiMessagesService,
    );
    openaiRunsService = moduleFixture.get<OpenaiRunsService>(OpenaiRunsService);
    assistantsRefugeeService = moduleFixture.get<AssistantsRefugeeService>(
      AssistantsRefugeeService,
    );
    configService = moduleFixture.get<ConfigService>(ConfigService);

    app = moduleFixture.createNestApplication();
    httpServer = app.getHttpServer();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('services should be defined', () => {
    expect(openaiThreadsService).toBeDefined();
    expect(openaiMessagesService).toBeDefined();
    expect(openaiRunsService).toBeDefined();
  });

  describe('first question', () => {
    it('/api/v1/haven-ai-agent/generate-first-question (POST)', async () => {
      const secretToken = configService.get<string>(bearer_token);
      const response = await request(httpServer)
        .post('/api/v1/haven-ai-agent/generate-first-question')
        .set('Authorization', `Bearer ${secretToken}`)
        .send(ukrain_Olena);

      await loopUntilStoryIsGoodEnough(response.body, secretToken);
    }, 600000);
  });

  describe('BearerTokenGuard', () => {
    it('should grant access with a valid bearer token', async () => {
      const secretToken = configService.get<string>(bearer_token); // Replace YOUR_VALID_TOKEN with the actual token
      const response = await request(httpServer)
        .post('/api/v1/haven-ai-agent/generate-first-question') // Use the correct endpoint
        .set('Authorization', `Bearer ${secretToken}`)
        .send(ukrain_Olena);

      expect(response.statusCode).not.toBe(401); // Assuming a successful request does not return 401
    });

    it('should deny access without a bearer token', async () => {
      const response = await request(httpServer)
        .post('/api/v1/haven-ai-agent/generate-first-question') // Use the correct endpoint
        .send(ukrain_Olena);

      expect(response.statusCode).toBe(401); // Expecting a 401 Unauthorized response
    });
  });

  async function loopUntilStoryIsGoodEnough(
    responseObject: ResponseObject,
    secretToken: string,
  ) {
    const { threadId, isStoryGoodEnough } = responseObject;

    if (isStoryGoodEnough) {
      console.log('STORY FINISHED');
    } else {
      console.log(`interview question:
      ${responseObject.response}`);
      const refugeeResponse: string = await refugeeAnswering(
        responseObject.response,
      );
      console.log(`user response:
      ${refugeeResponse}`);

      const generateFollowUpQuestionDto: GenerateFollowUpQuestionDto = {
        refugeeResponse,
        threadId,
      };

      const nextResponse = await request(httpServer)
        .post('/api/v1/haven-ai-agent/generate-follow-up-question')
        .set('Authorization', `Bearer ${secretToken}`)
        .send(generateFollowUpQuestionDto);

      await loopUntilStoryIsGoodEnough(nextResponse.body, secretToken);
    }
  }

  async function refugeeAnswering(generatedQuestion: string): Promise<string> {
    const newThread: Thread = await openaiThreadsService.createThread();
    await openaiMessagesService.createMessage(newThread.id, {
      role: 'user',
      content: generatedQuestion,
    });

    const run: Run = await openaiRunsService.createRun(
      newThread.id,
      assistantsRefugeeService.getAssistant().id,
    );

    await openaiRunsService.retrieveRun(newThread.id, run.id);
    const data = await openaiMessagesService.listMessages(newThread.id);

    let responseText: string;
    if ('text' in data[0].content[0]) {
      responseText = data[0].content[0].text.value;
    } else {
      throw new ImageNotTextException();
    }

    return responseText;
  }
});
