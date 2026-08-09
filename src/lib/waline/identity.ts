import type { User } from "@prisma/client";
import { defaultAvatar } from "@/lib/waline/serialize";
import type { WalineIdentity } from "@/lib/waline/types";

export const COMMENT_LEVELS = [2, 5, 10, 20, 50] as const;

export function commentLevel(count: number): number {
  if (count <= 0) return 0;
  let level = 0;
  for (let index = 0; index < COMMENT_LEVELS.length; index += 1) {
    if (COMMENT_LEVELS[index] <= count) level = index;
  }
  return level;
}

export function identityFromUser(
  user: User,
  instanceOwnerId: string,
): WalineIdentity {
  const nick = user.name || (user.email ? user.email.split("@")[0] : "用户");
  return {
    objectId: user.objectId,
    nick,
    link: user.url || "",
    avatar: user.avatar || defaultAvatar(nick, user.email),
    type: instanceOwnerId === user.id ? "administrator" : "guest",
    ...(user.isAdmin ? { label: "平台管理员" } : {}),
  };
}
