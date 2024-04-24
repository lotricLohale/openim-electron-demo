import request from 'umi-request';

export function picture(getUrl: string, rawBody: any) {
  return request.post(getUrl, { data: rawBody });
}

export function check(checkUrl: string, rawBody: any) {
  return request.post(checkUrl, { data: rawBody });
}
