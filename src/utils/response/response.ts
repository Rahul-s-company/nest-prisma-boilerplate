import { ResponseInterface } from './response.interface';

export class ResponseSuccess implements ResponseInterface {
  message: string;
  data: any[];
  meta: any;
  error_message: any;
  error: any;
  success: boolean;

  constructor(infoMessage: string, data?: any, meta?: any, notLog?: boolean) {
    this.success = true;
    this.message = infoMessage;
    this.data = data;
    this.meta = meta;
    if (!notLog) {
      try {
        const request = JSON.parse(JSON.stringify(data));

        if (request && request.token) request.token = '*******';
        console.log(
          new Date().toString() + ' - [Response]: ' + JSON.stringify(request),
        );
      } catch (error) {}
    }
  }
}
