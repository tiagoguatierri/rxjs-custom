import 'bootstrap/dist/css/bootstrap.min.css';

import { people, Person } from './data';
import {
  combineLatest,
  distinctUntilChanged,
  fromEvent,
  map,
  of,
  startWith,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { filterArray } from './functions';

const data$ = of<Person[]>(people);

const fields = [
  { value: 'id', text: 'ID' },
  { value: 'name', text: 'Nome' },
  { value: 'email', text: 'Email' },
  { value: 'age', text: 'Idade' },
];

const tokens = [
  { value: '*', text: 'Qualquer ocorrência' },
  { value: '^', text: 'Que inicia com:' },
  { value: '==', text: 'Igual à:' },
  { value: '!=', text: 'Diferente de:' },
  { value: '>', text: 'Maior que:' },
  { value: '>=', text: 'Maior ou igual à:' },
  { value: '<', text: 'Menor que:' },
  { value: '<=', text: 'Menor ou igual à:' },
];

const inputField = document.querySelector('#inputField') as HTMLSelectElement;
const inputToken = document.querySelector('#inputToken') as HTMLSelectElement;
const inputTerm = document.querySelector('#inputTerm') as HTMLInputElement;

const addOptionsToSelect = (
  el: HTMLSelectElement,
  data: Array<{ text: string; value: string }>
) => {
  for (const { text, value } of data) {
    const opt = document.createElement('option');
    opt.text = text;
    opt.value = value;
    el.add(opt);
  }
  const opt = document.createElement('option');
  opt.text = 'Selecione uma opção';
  opt.value = null;
  el.remove(0);
  el.add(opt, 0);
  el.selectedIndex = 0;
};

const handler = () => {
  function write(ctx: any) {
    document.querySelector('#view').innerHTML = `<pre>${JSON.stringify(
      ctx,
      null,
      2
    )}</pre>`;
  }

  const field$ = fromEvent(inputField, 'change').pipe(
    map((evt: Event) => evt.target as HTMLSelectElement),
    map((el) => el.value),
    startWith('')
  );

  const token$ = fromEvent(inputToken, 'change').pipe(
    map((evt: Event) => evt.target as HTMLSelectElement),
    map((el) => el.value),
    startWith('')
  );

  const term$ = fromEvent(inputTerm, 'input').pipe(
    map((evt: InputEvent) => evt.target as HTMLInputElement),
    map((el) => el.value),
    startWith('')
  );

  const params$ = combineLatest([field$, token$, term$]).pipe(
    distinctUntilChanged(),
    debounceTime(500)
  );

  /*   combineLatest([search$, data$])
    .pipe(
      filterArray(
        ([name]) => ({ name }),
        ([, items]) => items,
        (data, filtered) => filtered
      )
    )
    .subscribe(write); */
};

addOptionsToSelect(inputField, fields);
addOptionsToSelect(inputToken, tokens);
handler();
