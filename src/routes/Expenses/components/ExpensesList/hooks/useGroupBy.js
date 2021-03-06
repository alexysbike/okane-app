import {
  compose, map, reduce, reverse, sort, toPairs,
} from 'ramda';
import { useMemo } from 'react';

const groupReduce = key => reduce((acum, expense) => {
  if (!acum[expense[key]]) {
    return { ...acum, [expense[key]]: [expense] };
  }
  return { ...acum, [expense[key]]: [...acum[expense[key]], expense] };
}, {});

const dateSorter = (key, sortDir = 'asc') => compose(
  sortDir === 'desc' ? reverse : items => items,
  sort((aObj, bObj) => {
    const a = aObj[key];
    const b = bObj[key];
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }),
);

// if categories is passed need map teh categories
const categorySorter = (key, sortDir = 'asc', categories = null) => compose(
  sortDir === 'desc' ? reverse : items => items,
  sort((aObj, bObj) => {
    const categoryA = !categories ? aObj[key] : categories[aObj[key]];
    const categoryB = !categories ? bObj[key] : categories[bObj[key]];
    if (!categoryA || !categoryB) return 0;
    if (categoryA.name < categoryB.name) return -1;
    if (categoryA.name > categoryB.name) return 1;
    return 0;
  }),
);

const groupByDate = (expenses, categories, sortDir) => compose(
  dateSorter('title', sortDir),
  map(([date, expense]) => ({
    title: date,
    items: categorySorter('categoryId', sortDir, categories)(expense),
    key: date,
  })),
  toPairs,
  groupReduce('date'),
)(expenses);

const groupByCategory = (expenses, categories, sortDir) => compose(
  categorySorter('title', sortDir),
  map(([categoryId, expense]) => ({
    title: categories[categoryId],
    items: dateSorter('date', sortDir)(expense),
    key: categoryId,
  })),
  toPairs,
  groupReduce('categoryId'),
)(expenses);

// 0: By date; 1: By category;
const getGroupByFunc = sortIndex => (sortIndex === 0 ? groupByDate : groupByCategory);

export const useGroupBy = (expenses, categories, sortIndex, sortDir) => useMemo(
  () => getGroupByFunc(sortIndex)(expenses, categories, sortDir),
  [expenses, categories, sortIndex, sortDir],
);

const groupIncomesByDate = (incomes, sortDir) => compose(
  dateSorter('title', sortDir),
  map(([date, income]) => ({
    title: date,
    items: income,
    key: date,
  })),
  toPairs,
  groupReduce('date'),
)(incomes);

export const useIncomesGroupBy = (incomes, sortDir) => useMemo(
  () => groupIncomesByDate(incomes, sortDir),
  [incomes, sortDir],
);
