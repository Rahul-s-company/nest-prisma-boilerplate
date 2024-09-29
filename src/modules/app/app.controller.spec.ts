import { Test, TestingModule } from '@nestjs/testing';
import { response } from 'express';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let _app: TestingModule;

  beforeAll(async () => {
    _app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('root', () => {
    it('should return "true"', () => {
      const appController = _app.get<AppController>(AppController);
      expect(appController.healthCheck(response)).toBe({ success: true });
    });
  });
});
