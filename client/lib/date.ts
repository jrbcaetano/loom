import { formatDistanceToNowStrict } from "date-fns";

export function formatRelativeDate(dateIso: string) {
  return formatDistanceToNowStrict(new Date(dateIso), { addSuffix: true });
}
