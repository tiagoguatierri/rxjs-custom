import {
  Observable,
  iif,
  of,
  combineLatest,
  fromEvent,
  distinctUntilChanged,
  startWith,
} from 'rxjs';
import { map, mergeMap, debounceTime } from 'rxjs/operators';
import { people, Person } from './data';

const data$ = of<Person[]>(people);
const initialData$ = data$.pipe(map((data) => data.slice(0, 5)));

type Fn = (...args: any[]) => any;

function filterArray<T>(
  query?: Record<keyof T, unknown> | Fn,
  inputMapFn?: Fn,
  outputMapFn?: Fn
) {
  function handler(token: string) {
    const _handler = {
      default: (...args: any[]) => {
        const [item, key, val] = args;
        return eval(item[key] + token + val);
      },
      '=': (...args: any[]) => {
        const [item, key, val] = args;
        return item[key] === val;
      },
      '^': (...args: any[]) => {
        const [item, key, val] = args;
        return normalize(item[key]).includes(normalize(val));
      },
    };

    const key = token in _handler ? token : 'default';
    return _handler[key];
  }

  function normalize(value: string) {
    return value
      ? value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase()
      : '';
  }

  function parametrize(value: any, token = '=') {
    value = value.toString();
    const ctx = normalize(value).split(/[^a-z\d]/i);
    const max = ctx.length - 1;
    const val = [...ctx].pop();
    return ctx.length > 1 ? [value.slice(0, max), val] : [token, val];
  }

  return (source: Observable<T[]>) =>
    source.pipe(
      map((data) => {
        const items = (inputMapFn ? inputMapFn(data) : data) as T[];
        const queryParams =
          query && typeof query === 'function' ? query(data) : query;
        const doFilter = items && !!Object.keys(queryParams).length;
        const filtered = doFilter
          ? items.filter((item: T) => {
              for (const [key, value] of Object.entries<any>(queryParams)) {
                const [token, val] = parametrize(value);
                return val ? handler(token)(item, key, val) : items;
              }
            })
          : items;
        return [data, filtered];
      }),
      map(
        ([data, items]) => (outputMapFn ? outputMapFn(data, items) : items) as T
      )
    );
}

function write(ctx: any) {
  document.querySelector('#app').innerHTML = `<pre>${JSON.stringify(
    ctx,
    null,
    2
  )}</pre>`;
}

const input = fromEvent(document.querySelector('#inputSearch'), 'input').pipe(
  distinctUntilChanged(),
  debounceTime(500),
  map((evt: InputEvent) => `^${evt.target['value']}`),
  startWith('')
);

combineLatest([input, data$])
  .pipe(
    filterArray(
      ([name]) => ({ name }),
      ([, items]) => items,
      (data, filtered) => filtered
    ),
    mergeMap((items) => iif(() => !!items.length, of(items), data$))
  )
  .subscribe(write);
