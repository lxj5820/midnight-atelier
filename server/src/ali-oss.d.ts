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

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer | string, options?: PutOptions): Promise<PutResult>;
  }

  export default OSS;
}
