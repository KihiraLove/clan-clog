import * as appText from '@clog/domain';
/** Compact local ranges keep years and UTC offsets only where they disambiguate. */
export function activityRange(
  startsAt: string,
  endsAt: string,
  timeZone?: string,
) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...(timeZone ? { timeZone } : {}),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const parts = (value: string) =>
    new Map(
      formatter
        .formatToParts(new Date(value))
        .map((part) => [part.type, part.value]),
    );
  const start = parts(startsAt),
    end = parts(endsAt);
  const years = start.get('year') !== end.get('year');
  const offset = (value: typeof start) =>
    value.get('timeZoneName')!.replace(/^GMT/u, '') || '+00:00';
  const differentOffsets = offset(start) !== offset(end);
  const months = [
    appText.webActivityRangeJan,
    appText.webActivityRangeFeb,
    appText.webActivityRangeMar,
    appText.webActivityRangeApr,
    appText.webActivityRangeMay,
    appText.webActivityRangeJun,
    appText.webActivityRangeJul,
    appText.webActivityRangeAug,
    appText.webActivityRangeSep,
    appText.webActivityRangeOct,
    appText.webActivityRangeNov,
    appText.webActivityRangeDec,
  ];
  const label = (value: typeof start, includeOffset: boolean) =>
    `${value.get('day')}/${months[Number(value.get('month')) - 1]}${years ? '/' + value.get('year')!.slice(-2) : ''} ${value.get('hour')}:${value.get('minute')}${includeOffset ? ' ' + offset(value) : ''}`;
  return { start: label(start, differentOffsets), end: label(end, true) };
}
