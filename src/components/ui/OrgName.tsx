/**
 * The association's name. <bdi> isolates it from the surrounding text direction,
 * so in Arabic (RTL) text the full stop of "e.V." stays at the end instead of jumping to the front.
 */
export function OrgName() {
  return <bdi>Youth of Peace e.V.</bdi>
}
