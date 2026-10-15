/**
 * 다음 페이지를 이어 붙이되, 이미 화면에 있는 id 는 다시 넣지 않는다.
 *
 * <p>목록은 받아 오는 사이에도 바뀐다. offset 으로 받던 때는 다른 곳에서 한 건이 앞에 추가되면 다음
 * 페이지의 첫 행이 이미 본 행이었고, 그대로 붙이면 같은 항목이 두 번 보이며 React key 도 겹쳤다.
 * 이제 두 목록 모두 커서로 받아 경계가 밀리지 않는다. 이것은 그 위에 남겨 둔 두 번째 안전장치다 —
 * 커서 행이 그사이 수정돼 정렬 자리가 바뀌는 것까지 막지는 못하기 때문이다.
 */
export function appendUnique<T extends { id?: number }>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => item.id === undefined || !seen.has(item.id))];
}
