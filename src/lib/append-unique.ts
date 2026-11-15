/**
 * 다음 페이지를 이어 붙이되 이미 있는 id 는 빼고 넣는다.
 * 커서로 받아도 그사이 행이 수정돼 정렬 위치가 바뀔 수 있어서 둔다.
 */
export function appendUnique<T extends { id?: number }>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => item.id === undefined || !seen.has(item.id))];
}
