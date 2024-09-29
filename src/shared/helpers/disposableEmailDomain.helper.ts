import { arrDisposableEmails } from './disposableEmailDomain.data';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

export class DisposableEmailDomain {
  static async isDisposable(
    strDomain: string,
    validteEmail = false,
  ): Promise<boolean> {
    const isValidate = process.env.VALIDATE_DISPOSABLE_EMAIL;

    if (isValidate === 'true' || validteEmail) {
      const arrDomain = strDomain.split('@');
      const arrDomainLen = arrDomain.length;
      let index = 0;
      let domainName = '';

      if (arrDomain.length === 1) {
        return false;
      }
      if (arrDomainLen > 0) {
        index = arrDomainLen - 1;
        domainName = arrDomain[index];
      }
      return arrDisposableEmails.indexOf(domainName) > -1 ? false : true;
    }
    return true;
  }
}
