declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
  }

  interface PutOptions {
    contentType?: string;
  }

  interface PutResult {
    url: string;
    name: string;
  }

  interface HeadResult {
    status: number;
    meta?: Record<string, string>;
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer | string, options?: PutOptions): Promise<PutResult>;
    head(name: string): Promise<HeadResult>;
  }

  export default OSS;
}
