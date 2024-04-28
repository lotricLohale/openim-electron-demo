import { myPost } from '../../../utils/request';

export function picture(getUrl: string, rawBody: any) {
  return myPost(getUrl, { data: rawBody });
}

export function check(checkUrl: string, rawBody: any) {
  return myPost(checkUrl, { data: rawBody });
}
