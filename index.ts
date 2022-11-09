import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { people, Person } from './data';

const data$ = of<Person[]>(people);
const initialData$ = data$.pipe(map((data) => data.slice(0, 5)));

function filterArray<T>(query: Record<keyof T, unknown>) {
  const handler = (token: string) => {
    const _handler = {
      default: (...args: any[]) => {
        const [item, key, val] = args;
        return eval(val + token + item[key]);
      },
      '=': (...args: any[]) => {
        const [item, key, val] = args;
        return val === item[key];
      },
      '^': (...args: any[]) => {
        const [item, key, val] = args;
        return normalize(item[key]).includes(normalize(val));
      },
    };

    token = token in _handler ? token : 'default';

    return _handler[token]()
  };

  return (source: Observable<T[]>) =>
    source.pipe(
      map((items) => {
        console.log(
          items.filter((item) => {
            for (const [key, value] of Object.entries<any>(query)) {
              const [token, val] = parametrize(value);
              handler(token)
              // return handler[token](item, key, val)
            }
          })
        );
        return items;
      })
    );
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function parametrize(value: any, token = '=') {
  value = value.toString();
  const ctx = normalize(value).split(/[^a-z\d]/i);
  const max = ctx.length - 1;
  const val = [...ctx].pop();
  return ctx.length > 1 ? [value.slice(0, max), val] : [token, val];
}

function write<T>(items: T[]) {
  const app = document.querySelector('#app');
  app.innerHTML = `
    <table>
      <thead>
        <tr>
          ${Object.keys(items[0])
            .map((key) => `<th>${key}</th>`)
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            ${Object.keys(item)
              .map(
                (key) => `
              <td>${item[key]}</td>
            `
              )
              .join('')}
          </tr>
          `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

data$.pipe(filterArray({ age: '>=10' })).subscribe(write);
