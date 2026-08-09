export type WalineCommentStatus = "approved" | "waiting" | "spam";

export interface WalineCommentData {
  nick: string;
  mail?: string;
  link?: string;
  comment: string;
  ua: string;
  url: string;
  pid?: number;
  rid?: number;
  at?: string;
  capToken?: string;
  capSolutions?: number[];
}

export interface WalineBaseComment {
  objectId: number;
  time: number;
  comment: string;
  orig?: string;
  like: number;
  nick: string;
  link: string;
  avatar: string;
  type?: "administrator" | "guest";
  status?: WalineCommentStatus;
  addr?: string;
  browser?: string;
  os?: string;
  label?: string;
}

export interface WalineChildComment extends WalineBaseComment {
  pid: number;
  rid: number;
  at?: string;
  reply_user?: {
    nick: string;
    link: string;
    avatar: string;
  };
}

export interface WalineRootComment extends WalineBaseComment {
  sticky: boolean;
  children: WalineChildComment[];
}

export interface WalineUser {
  count: number;
  nick: string;
  link: string;
  avatar: string;
  label?: string;
}

export interface WalineSuccess<T> {
  errno: 0;
  errmsg?: string;
  data: T;
}

export interface WalineError {
  errno: number;
  errmsg: string;
}
