import {
  Observable,
  iif,
  of,
  combineLatest,
  fromEvent,
  distinctUntilChanged,
  startWith,
  merge,
  concat,
  race,
} from 'rxjs';
import { map, mergeMap, debounceTime } from 'rxjs/operators';
import { people, Person } from './data';

const data$ = of<Person[]>(people);
const initialData$ = data$.pipe(map((data) => data.slice(0, 5)));

type Fn = (...args: any[]) => any;

/**
 *
 * @param query
 * @param inputMapFn
 * @param outputMapFn
 * @returns
 */
export function filterArray<T>(
  query?: Record<string, unknown> | Fn,
  inputMapFn?: Fn,
  outputMapFn?: Fn
) {
  function handler(token: string) {
    const _handler = {
      default: (...args: any[]) => {
        const [item, key, val] = args;
        return eval(item[key] + token + val);
      },
      '^': (...args: any[]) => {
        const [item, key, val] = args;
        return normalize(item[key]).startsWith(normalize(val));
      },
      '*': (...args: any[]) => {
        const [item, key, val] = args;
        return normalize(item[key]).includes(normalize(val));
      },
    };

    const key = token in _handler ? token : 'default';
    console.log(key);
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

  function parametrize(input: unknown) {
    const value = input.toString();
    const pattern = /^[\^|\*|>|<|>=|<=|=|!=]{1,2}/i;
    const matcher = value.match(pattern);
    const cleanValue = value.replace(pattern, '');
    const token = matcher?.[0] || '==';
    return [cleanValue, token];
  }

  return (source: Observable<T>) =>
    source.pipe(
      map((data) => {
        const items = (inputMapFn ? inputMapFn(data) : data) as T[];
        const queryParams =
          query && typeof query === 'function' ? query(data) : query;
        const doFilter = items && !!Object.keys(queryParams).length;
        const filtered = doFilter
          ? items.filter((item: T) => {
              for (const [key, value] of Object.entries<any>(queryParams)) {
                const [val, token] = parametrize(value);
                //console.log(key, token, val);
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

const inputSearch = document.querySelector('#inputSearch') as HTMLInputElement;
const inputToken = document.querySelector('#inputToken') as HTMLInputElement;

const inputSearch$ = fromEvent(inputSearch, 'input').pipe(
  map((evt: InputEvent) => evt.target['value']),
  startWith('')
);
const inputToken$ = fromEvent(inputToken, 'input').pipe(
  map((evt: InputEvent) => evt.target['value']),
  startWith('*')
);

const search$ = combineLatest([inputSearch$, inputToken$]).pipe(
  map(([val, token]) => token + val),
  distinctUntilChanged(),
  debounceTime(500)
);

combineLatest([search$, data$])
  .pipe(
    filterArray(
      ([name]) => ({ name }),
      ([, items]) => items,
      (data, filtered) => filtered
    )
  )
  .subscribe(write);
