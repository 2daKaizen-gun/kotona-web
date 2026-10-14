/**
 * 다음 페이지를 이어 붙이되, 이미 화면에 있는 id 는 다시 넣지 않는다.
 *
 * <p>목록은 받아 오는 사이에도 바뀐다. 다른 곳에서 한 건이 앞에 추가되면 offset 으로 받은 다음
 * 페이지의 첫 행은 이미 본 행이고, 그대로 붙이면 같은 항목이 두 번 보이며 React key 도 겹친다.
 * 이력은 커서로 바꿔 경계가 밀리지 않지만, 사전은 정렬(정중도 순) 때문에 아직 offset 이라 여기서 막는다.
 */
export function appendUnique<T extends { id?: number }>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => item.id === undefined || !seen.has(item.id))];
}
