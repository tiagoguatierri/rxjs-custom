import {
  Observable,
  iif,
  of,
  BehaviorSubject,
  combineLatest,
  ObservableInput,
  fromEvent,
  distinctUntilChanged,
  startWith,
} from 'rxjs';
import { map, mergeMap, debounceTime } from 'rxjs/operators';
import { people, Person } from './data';

const data$ = of<Person[]>(people);
const initialData$ = data$.pipe(map((data) => data.slice(0, 5)));

type Fn = <T>(...args: any[]) => unknown;

function filterArray<T>(
  query?: Record<string, unknown> | Fn,
  inputMapFn?: Fn,
  outputMapFn?: Fn,
  defaultData?: ObservableInput<any>
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
      mergeMap(([data, items]) => {
        const defaultData$ = (defaultData ||
          of([data, items])) as Observable<any>;
        return iif(() => !!items.length, of([data, items]), defaultData$);
      }),
      map(([data, items]) => (outputMapFn ? outputMapFn(data, items) : items))
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

combineLatest([input, initialData$])
  .pipe(
    filterArray(
      ([name]) => ({ name }),
      ([, items]) => items,
      (data, filtered) => data,
      data$
    )
  )
  .subscribe(console.log);
