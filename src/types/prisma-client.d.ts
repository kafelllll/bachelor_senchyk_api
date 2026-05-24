declare module '@prisma/client' {
  export class PrismaClient {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export namespace Prisma {
    export type AnnouncementCreateInput = any;
    export type AnnouncementUpdateInput = any;
    export type UserCreateInput = any;
    export type UserUpdateInput = any;
  }
}

