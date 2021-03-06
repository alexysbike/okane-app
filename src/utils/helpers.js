/* eslint-disable no-unused-vars,no-console,no-param-reassign */
import {
  reduce, map, curry, prop, sort, join, compose, filter,
} from 'ramda';
import errorMessages from './errorMessages';

export const padStart = number => number.toString().padStart(2, '0');
export const formatCurrency = (number, decimals = 2) => number.toFixed(decimals).replace(/\d(?=(\d{3})+\.)/g, '$&,');

export const axiosResolver = async (func) => {
  try {
    const response = await func();
    return response.data.data;
  } catch (err) {
    console.log('Error on call:', err);
    throw err;
  }
};

export const filterByKey = (query = '') => (value) => {
  const blackList = ['_id'];
  if (typeof value === 'string') {
    return value.toLowerCase().includes(query.toLowerCase());
  } if (typeof value === 'number') {
    return value.toString().toLowerCase().includes(query.toLowerCase());
  } if (Array.isArray(value)) {
    return value.filter(filterByKey(query)).length > 0;
  } if (typeof value === 'object' && value !== null) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, val] of Object.entries(value)) {
      if (!blackList.includes(key) && filterByKey(query)(val)) {
        return true;
      }
    }
    return false;
  }
  return false;
};

export const sortByKey = key => sort((a, b) => {
  if (typeof a[key] === 'undefined' || typeof b[key] === 'undefined') {
    return 0;
  }

  let varA = a[key];
  let varB = b[key];

  if (Number.isInteger(+varA) && Number.isInteger(+varB)) {
    varA = +varA;
    varB = +varB;
  }

  if (typeof varA === 'string') {
    varA = a[key].toUpperCase();
    varB = b[key].toUpperCase();
  }
  // eslint-disable-next-line no-nested-ternary
  return varA > varB ? 1 : varA < varB ? -1 : 0;
});

export const capitalizeString = (string) => {
  if (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  return string;
};
export const authorizationHeaderMaker = prefix => token => ({ Authorization: `${prefix} ${token}` });
export const phoenixApiAuthorization = authorizationHeaderMaker('JWT');

export const normalizatorMaker = key => reduce(
  (acum, item) => ({ ...acum, [item[key]]: item }),
  {},
);
export const normalizatorById = normalizatorMaker('id');
export const normalizatorByIdMongo = normalizatorMaker('_id');

export const keyMapperMaker = key => map(prop(key));
export const idMapper = keyMapperMaker('id');
export const idMapperMongo = keyMapperMaker('_id');

// propertyExtractor(obj, [paths])
export const propertyExtractor = reduce((acum, path) => acum[path]);

export const checkRequiredProperties = curry((requiredFields, item) => requiredFields.reduce((errors, requiredField) => (item[requiredField] === undefined || item[requiredField] === null || item[requiredField] === '' ? {
  ...errors,
  [requiredField]: '(Required field)',
} : errors), {}));

export const dataClickHandler = (prefix, dataKey = 'data') => ({
  [`${prefix}Click`]: props => (event) => {
    event.stopPropagation();
    if (props[prefix]) {
      props[prefix](props[dataKey], event);
    }
  },
});

export const customDataClickHandlerReduce = dataKey => reduce(
  (acum, prefix) => ({ ...acum, ...dataClickHandler(prefix, dataKey) }),
  {},
);

export const isFloat = (val) => {
  const floatRegex = /^-?\d+(?:[.,]\d*?)?$/;
  if (!floatRegex.test(val)) {
    return false;
  }
  return !Number.isNaN(parseFloat(val));
};

export const dataClickHandlerReduce = customDataClickHandlerReduce('data');

export const formatFromTo = (from, to) => {
  const fromFormat = `${from.substr(0, 2)}:${from.substr(2)}`;
  const toFormat = `${to.substr(0, 2)}:${to.substr(2)}`;
  return `${fromFormat} - ${toFormat}`;
};

const entriesJoiner = compose(
  join('&'),
  map(([key, value]) => `${key}=${value}`),
  filter(([key, value]) => value !== undefined),
);

export const objectToQueryParams = (params = {}) => {
  const entries = Object.entries(params);
  if (!entries.length) {
    return '';
  }
  return `?${entriesJoiner(entries)}`;
};

export const getFromLocalStorage = (key) => {
  const items = localStorage.getItem(key);
  return items ? JSON.parse(items) : [];
};
export const setToLocalStorage = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
  return true;
};

export const makeValidator = rules => values => rules.reduce((errors, { key, validators }) => {
  const error = validators.find((validator) => {
    switch (validator) {
      case 'required': {
        return !values[key];
      }
      case 'number': {
        return Number.isNaN(+values[key]);
      }
      case 'positive': {
        return Number.isNaN(+values[key]) || +values[key] <= 0;
      }
      default:
        return false;
    }
  });
  if (error) {
    return { ...errors, [key]: errorMessages[error] || error };
  }
  return errors;
}, {});

export const downloadFileBlob = (filename, blob) => {
  const a = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const downloadFileText = (filename, text, resolve, reject) => {
  try {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    resolve();
  } catch (e) {
    console.log('Error on download', e);
    reject(e);
  }
};

function moveFile(fileEntry, resolve, errorCallback) {
  window.resolveLocalFileSystemURL('file:///storage/emulated/0/',
    (fileSystem) => {
      fileSystem.getDirectory('Download', {
        create: true,
        exclusive: false,
      },
      (directory) => {
        fileEntry.moveTo(
          directory,
          fileEntry.name,
          resolve,
          errorCallback,
        );
      }, errorCallback);
    }, errorCallback);
}

function writeFile(fileEntry, text, resolve, errorCallback) {
  // Create a FileWriter object for our FileEntry (log.txt).
  fileEntry.createWriter((fileWriter) => {
    fileWriter.onwriteend = () => {
      moveFile(fileEntry, resolve, errorCallback);
    };

    fileWriter.onerror = errorCallback;

    // create a new Blob instead.
    const dataObj = new Blob([text], { type: 'text/plain' });

    fileWriter.write(dataObj);
  });
}

export const downloadFileCordova = (filename, text, resolve, reject) => {
  const errorCallback = (error) => { console.log(error); reject(error); };
  window.requestFileSystem(window.LocalFileSystem.PERSISTENT, 0, (fs) => {
    console.log(`file system open: ${fs.name}`);
    fs.root.getFile(filename, { create: true, exclusive: false }, (fileEntry) => {
      console.log(`fileEntry is file?${fileEntry.isFile.toString()}`);
      writeFile(fileEntry, text, resolve, errorCallback);
    }, errorCallback);
  }, errorCallback);
};

const dummyFunc = () => {};
export const downloadFile = (filename, text, resolve = dummyFunc, reject = dummyFunc) => {
  console.log(window.cordova);
  if (window.cordova) {
    downloadFileCordova(filename, text, resolve, reject);
  } else {
    downloadFileText(filename, text, resolve, reject);
  }
};

export const getQueryVariable = (key) => {
  const query = window.location.search.substring(1);
  const vars = query.split('&');
  for (let i = 0; i < vars.length; i += 1) {
    const pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === key) {
      return decodeURIComponent(pair[1]);
    }
  }
  return undefined;
};
